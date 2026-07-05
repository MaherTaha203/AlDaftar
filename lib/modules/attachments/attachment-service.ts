import { ApplicationService } from '@/lib/application';
import { ErrorFactory, type AsyncResult, type Result } from '@/lib/core';
import { newRecordId, nowIso, type LocalRecordStore } from '../shared/local-record-store';
import { getFileStore } from '../shared/local-file-store';
import { RepositoryFactory } from '../shared/repository-factory';
import { AuditAction, getAuditService } from '../audit';
import { ATTACHMENT_MAX_SIZE_BYTES, type Attachment, type AttachmentOwner } from './attachment';

/**
 * AttachmentService — the generic archive service (M7). Metadata rows go
 * through the standard RepositoryFactory; binaries through the single file
 * store (interim IndexedDB; Supabase Storage swap seam). Upload+metadata are
 * kept consistent: a failed file save leaves no metadata row; a failed
 * metadata insert removes the saved file (best-effort compensation).
 *
 * Business-blind: owners are opaque (type, id) pairs; whether deletion is
 * offered for a given owner is the calling module's policy (BDR-08 interim).
 */
export type AttachmentRepository = Pick<
  LocalRecordStore<Attachment>,
  'findAll' | 'findById' | 'create' | 'remove'
>;

export function getAttachmentRepository(): AttachmentRepository {
  return RepositoryFactory.get<Attachment>('aldaftar.attachments');
}

export class AttachmentService extends ApplicationService {
  private readonly repository: AttachmentRepository;

  constructor(repository: AttachmentRepository = getAttachmentRepository()) {
    super('attachments');
    this.repository = repository;
  }

  /** Every attachment, newest first (S-70 library). */
  listAll(): AsyncResult<readonly Attachment[]> {
    return this.execute('attachments.listAll', async () => {
      const all = this.unwrap(await this.repository.findAll());
      return [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    });
  }

  /** Attachments of one owning record, newest first. */
  listByOwner(owner: AttachmentOwner): AsyncResult<readonly Attachment[]> {
    return this.execute('attachments.listByOwner', async () => {
      const all = this.unwrap(await this.repository.findAll());
      return all
        .filter((a) => a.ownerType === owner.type && a.ownerId === owner.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    });
  }

  /** Stores the file and its metadata row (title = original file name). */
  upload(owner: AttachmentOwner, file: File): AsyncResult<Attachment> {
    return this.execute('attachments.upload', async () => {
      if (file.size > ATTACHMENT_MAX_SIZE_BYTES) {
        throw ErrorFactory.validation('File exceeds the allowed size', {
          size: file.size,
          max: ATTACHMENT_MAX_SIZE_BYTES,
        });
      }
      const id = newRecordId();
      const storageKey = `attachments/${id}`;
      this.unwrap(await getFileStore().save(storageKey, file));
      const record: Attachment = {
        id,
        ownerType: owner.type,
        ownerId: owner.id,
        title: file.name,
        contentType: file.type,
        size: file.size,
        storageKey,
        createdAt: nowIso(),
      };
      const inserted = await this.repository.create(record);
      if (!inserted.ok) {
        // Compensation: never leave an orphan binary behind.
        await getFileStore().remove(storageKey);
        throw inserted.error;
      }
      await getAuditService().record({
        action: AuditAction.Create,
        entityType: 'attachments',
        entityId: inserted.value.id,
        entityLabel: inserted.value.title,
        summary: `إرفاق ملف «${inserted.value.title}»`,
        after: inserted.value,
      });
      return inserted.value;
    });
  }

  /** Loads the binary for viewing/downloading. */
  loadFile(attachment: Attachment): AsyncResult<Blob> {
    return this.execute('attachments.loadFile', async () =>
      this.unwrap(await getFileStore().load(attachment.storageKey)),
    );
  }

  /**
   * Removes an attachment (file + metadata). Whether removal is offered for
   * a given owner is the calling module's decision (BDR-08 interim: drafts
   * only); the service performs it when asked.
   */
  remove(id: string): AsyncResult<void> {
    return this.execute('attachments.remove', async () => {
      const attachment = this.unwrap(await this.repository.findById(id));
      if (attachment === null) {
        throw ErrorFactory.notFound(`Attachment '${id}' was not found`, { id });
      }
      this.unwrap(await getFileStore().remove(attachment.storageKey));
      this.unwrap(await this.repository.remove(id));
      await getAuditService().record({
        action: AuditAction.Delete,
        entityType: 'attachments',
        entityId: attachment.id,
        entityLabel: attachment.title,
        summary: `حذف مرفق «${attachment.title}»`,
        before: attachment,
      });
    });
  }

  private unwrap<T>(result: Result<T>): T {
    if (!result.ok) {
      throw result.error;
    }
    return result.value;
  }
}

let service: AttachmentService | undefined;

/** Module singleton used by attachment UI. */
export function getAttachmentService(): AttachmentService {
  if (service === undefined) {
    service = new AttachmentService();
  }
  return service;
}
