import { failure, success, ErrorFactory, type AsyncResult } from '@/lib/core';

/**
 * LocalRecordStore — the ONE generic local repository implementation
 * (execution-contract Local Storage Policy: a temporary development enabler
 * only, never the final persistence layer, never to gain features).
 *
 * A real, working client-side store (browser localStorage, JSON, one key per
 * collection) exposing the same asynchronous Result-based surface as the
 * repository contracts, so the Repository Factory can swap it for the
 * Supabase implementation with zero changes above the seam. Consumed
 * exclusively through `repository-factory.ts` — no module may instantiate
 * or duplicate it. Tracked in docs/technical-debt.md (TD-004).
 *
 * Browser-only by nature; calls on the server fail with a typed error (all
 * module screens are client components, so this path is never exercised).
 */
export interface StoredRecord {
  readonly id: string;
}

export class LocalRecordStore<T extends StoredRecord> {
  private readonly storageKey: string;

  constructor(storageKey: string) {
    this.storageKey = storageKey;
  }

  private readAll(): T[] {
    if (typeof window === 'undefined') {
      throw ErrorFactory.internal('Local storage is unavailable on the server', {
        storageKey: this.storageKey,
      });
    }
    const raw = window.localStorage.getItem(this.storageKey);
    if (raw === null) {
      return [];
    }
    return JSON.parse(raw) as T[];
  }

  private writeAll(records: readonly T[]): void {
    window.localStorage.setItem(this.storageKey, JSON.stringify(records));
  }

  async findAll(): AsyncResult<readonly T[]> {
    try {
      return success(this.readAll());
    } catch (error) {
      return failure(ErrorFactory.fromUnknown(error));
    }
  }

  async findById(id: string): AsyncResult<T | null> {
    try {
      return success(this.readAll().find((record) => record.id === id) ?? null);
    } catch (error) {
      return failure(ErrorFactory.fromUnknown(error));
    }
  }

  async create(record: T): AsyncResult<T> {
    try {
      const records = this.readAll();
      records.push(record);
      this.writeAll(records);
      return success(record);
    } catch (error) {
      return failure(ErrorFactory.fromUnknown(error));
    }
  }

  async update(id: string, changes: Partial<T>): AsyncResult<T> {
    try {
      const records = this.readAll();
      const index = records.findIndex((record) => record.id === id);
      if (index === -1) {
        return failure(ErrorFactory.notFound(`Record '${id}' was not found`, { id }));
      }
      const updated = { ...records[index], ...changes, id } as T;
      records[index] = updated;
      this.writeAll(records);
      return success(updated);
    } catch (error) {
      return failure(ErrorFactory.fromUnknown(error));
    }
  }

  /**
   * Physical removal. Business records are archived, never removed — this
   * exists only for records whose modeled operation IS removal (attachment
   * metadata rows). Added at P15 under the single-repository rule so no
   * module ever bypasses this store.
   */
  async remove(id: string): AsyncResult<void> {
    try {
      this.writeAll(this.readAll().filter((record) => record.id !== id));
      return success(undefined);
    } catch (error) {
      return failure(ErrorFactory.fromUnknown(error));
    }
  }
}

/** New unique record id (UUID). */
export function newRecordId(): string {
  return crypto.randomUUID();
}

/** Current timestamp in ISO form, for createdAt/updatedAt fields. */
export function nowIso(): string {
  return new Date().toISOString();
}
