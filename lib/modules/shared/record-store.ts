import type { AsyncResult } from '@/lib/core';
import type { StoredRecord } from './local-record-store';

/**
 * RecordStore — the persistence contract behind RepositoryFactory (GA
 * Foundation). Extracted 1:1 from the LocalRecordStore surface so both the
 * local adapter (TD-004 interim) and the Supabase adapter satisfy the same
 * shape; module repository types (`Pick<LocalRecordStore<T>, …>`) remain
 * structurally compatible. Contract only — no behavior lives here.
 */
export interface RecordStore<T extends StoredRecord> {
  findAll(): AsyncResult<readonly T[]>;
  findById(id: string): AsyncResult<T | null>;
  create(record: T): AsyncResult<T>;
  update(id: string, changes: Partial<T>): AsyncResult<T>;
  remove(id: string): AsyncResult<void>;
}
