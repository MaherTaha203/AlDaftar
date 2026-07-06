import { failure, success, ErrorFactory, type AsyncResult } from '@/lib/core';
import { getSupabaseClient, SupabaseFileStorage } from '@/lib/infrastructure';
import { LocalRecordStore, type StoredRecord } from './local-record-store';
import { createLocalFileStore } from './local-file-store';
import { SupabaseRecordStore } from './supabase-record-store';
import { SupabaseFileStore } from './supabase-file-store';
import { ATTACHMENTS_BUCKET } from './supabase-provider';

/**
 * One-time import of pre-cutover browser data into Supabase (GA / Database
 * Integration). Business-blind data portability: reads what the interim
 * adapters stored (localStorage records + IndexedDB attachment binaries) and
 * writes it through the Supabase adapters. Idempotent: records whose id
 * already exists in Supabase are skipped, so re-running never duplicates.
 *
 * Exposed on `window.aldaftarMigrateLocalData` by the persistence bootstrap —
 * run it once from the browser devtools console on the device that holds the
 * old data, then verify counts in the report it returns. Local data is NOT
 * deleted; it simply stops being read after cutover.
 */
const COLLECTIONS = [
  'aldaftar.suppliers',
  'aldaftar.categories',
  'aldaftar.units',
  'aldaftar.currencies',
  'aldaftar.products',
  'aldaftar.purchases',
  'aldaftar.purchase-returns',
  'aldaftar.payments',
  'aldaftar.attachments',
  'aldaftar.audit',
  'aldaftar.settings',
] as const;

export interface MigrationReport {
  readonly records: Record<string, { migrated: number; skipped: number }>;
  readonly files: { migrated: number; skipped: number; failed: readonly string[] };
}

interface AttachmentRow extends StoredRecord {
  readonly storageKey: string;
}

export async function migrateLocalDataToSupabase(): AsyncResult<MigrationReport> {
  try {
    const client = getSupabaseClient();
    const records: Record<string, { migrated: number; skipped: number }> = {};

    for (const collection of COLLECTIONS) {
      const local = new LocalRecordStore<StoredRecord>(collection);
      const remote = new SupabaseRecordStore<StoredRecord>(client, collection);

      const localAll = await local.findAll();
      if (!localAll.ok) {
        return failure(localAll.error);
      }
      const remoteAll = await remote.findAll();
      if (!remoteAll.ok) {
        return failure(remoteAll.error);
      }
      const existing = new Set(remoteAll.value.map((record) => record.id));

      let migrated = 0;
      let skipped = 0;
      for (const record of localAll.value) {
        if (existing.has(record.id)) {
          skipped += 1;
          continue;
        }
        const inserted = await remote.create(record);
        if (!inserted.ok) {
          return failure(
            ErrorFactory.fromUnknown(
              inserted.error,
              `Migration stopped at '${collection}' record '${record.id}'`,
            ),
          );
        }
        migrated += 1;
      }
      records[collection] = { migrated, skipped };
    }

    // Attachment binaries: IndexedDB → Storage bucket, keyed identically.
    // createLocalFileStore() reads the LOCAL store explicitly — getFileStore()
    // already returns the Supabase implementation after cutover.
    const localFiles = createLocalFileStore();
    const remoteFiles = new SupabaseFileStore(new SupabaseFileStorage(ATTACHMENTS_BUCKET));

    const attachmentRows = await new SupabaseRecordStore<AttachmentRow>(
      client,
      'aldaftar.attachments',
    ).findAll();
    if (!attachmentRows.ok) {
      return failure(attachmentRows.error);
    }

    let filesMigrated = 0;
    let filesSkipped = 0;
    const failedKeys: string[] = [];
    for (const row of attachmentRows.value) {
      const existing = await remoteFiles.load(row.storageKey);
      if (existing.ok) {
        filesSkipped += 1;
        continue;
      }
      const blob = await localFiles.load(row.storageKey);
      if (!blob.ok) {
        failedKeys.push(row.storageKey);
        continue;
      }
      const saved = await remoteFiles.save(row.storageKey, blob.value);
      if (saved.ok) {
        filesMigrated += 1;
      } else {
        failedKeys.push(row.storageKey);
      }
    }

    return success({
      records,
      files: { migrated: filesMigrated, skipped: filesSkipped, failed: failedKeys },
    });
  } catch (error) {
    return failure(ErrorFactory.fromUnknown(error, 'Local data migration failed'));
  }
}
