import { getSupabaseClient, SupabaseFileStorage } from '@/lib/infrastructure';
import type { StoredRecord } from './local-record-store';
import { setFileStore } from './local-file-store';
import type { RecordStore } from './record-store';
import { setPersistenceProvider } from './repository-factory';
import { SupabaseFileStore } from './supabase-file-store';
import { SupabaseRecordStore } from './supabase-record-store';

/**
 * Supabase persistence wiring (GA / Database Integration phase).
 *
 * IMPORTANT: importing this module pulls in the environment-validated
 * infrastructure configuration — it is imported ONLY by the composition-root
 * bootstrap (`components/app/persistence-bootstrap.ts`), never by business
 * modules or tests.
 *
 * `enableSupabasePersistence()` is the ENTIRE cutover: record repositories
 * switch to the Supabase tables and attachment binaries to the 'attachments'
 * Storage bucket. Everything above the two seams (services, screens,
 * reports, dashboard, audit) is untouched — the Supabase Replacement Rule.
 */
export const ATTACHMENTS_BUCKET = 'attachments';

export function enableSupabasePersistence(): void {
  setPersistenceProvider(
    (collection): RecordStore<StoredRecord> =>
      new SupabaseRecordStore<StoredRecord>(getSupabaseClient(), collection),
  );
  setFileStore(new SupabaseFileStore(new SupabaseFileStorage(ATTACHMENTS_BUCKET)));
}
