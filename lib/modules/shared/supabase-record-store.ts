import type { SupabaseClient } from '@supabase/supabase-js';
import { failure, success, ErrorFactory, type AsyncResult } from '@/lib/core';
import type { StoredRecord } from './local-record-store';
import type { RecordStore } from './record-store';

/**
 * SupabaseRecordStore — the Supabase implementation of the RecordStore
 * contract (GA Foundation phase).
 *
 * The client is INJECTED (constructor parameter, type-only import) so this
 * module has no import-time dependency on configuration/environment — tests
 * and the local provider are untouched by its existence. Wiring lives in
 * `supabase-provider.ts`, which nothing imports until the migration phase
 * flips the seam.
 *
 * Mapping: collection 'aldaftar.<name>' → table '<name>' with '-' → '_'
 * (e.g. 'aldaftar.purchase-returns' → 'purchase_returns'). Row columns match
 * the record fields verbatim; the schema phase creates them accordingly, so
 * no field-mapping layer exists to drift.
 */
export function collectionToTable(collection: string): string {
  return collection.replace(/^aldaftar\./, '').replace(/-/g, '_');
}

export class SupabaseRecordStore<T extends StoredRecord> implements RecordStore<T> {
  private readonly client: SupabaseClient;
  private readonly table: string;

  constructor(client: SupabaseClient, collection: string) {
    this.client = client;
    this.table = collectionToTable(collection);
  }

  /**
   * Reads the whole collection. PostgREST caps a single response at the
   * project's "Max Rows" setting (Supabase default 1000), so a plain
   * `select('*')` would SILENTLY truncate once a table passes that many rows —
   * corrupting balances, statements, and `nextNumber()`. We therefore page
   * through the table in windows and stop only when a short page proves the
   * end was reached, guaranteeing the complete set regardless of table size.
   * The page size stays at or below the default cap so each window returns in
   * full.
   */
  async findAll(): AsyncResult<readonly T[]> {
    const pageSize = 1000;
    const all: T[] = [];
    try {
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await this.client
          .from(this.table)
          .select('*')
          .range(from, from + pageSize - 1);
        if (error) {
          return failure(ErrorFactory.fromUnknown(error, `Reading '${this.table}' failed`));
        }
        const page = (data ?? []) as T[];
        all.push(...page);
        if (page.length < pageSize) {
          break;
        }
      }
      return success(all);
    } catch (error) {
      return failure(ErrorFactory.fromUnknown(error, `Reading '${this.table}' failed`));
    }
  }

  async findById(id: string): AsyncResult<T | null> {
    try {
      const { data, error } = await this.client
        .from(this.table)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) {
        return failure(ErrorFactory.fromUnknown(error, `Reading '${this.table}' failed`));
      }
      return success((data as T | null) ?? null);
    } catch (error) {
      return failure(ErrorFactory.fromUnknown(error, `Reading '${this.table}' failed`));
    }
  }

  async create(record: T): AsyncResult<T> {
    try {
      const { data, error } = await this.client.from(this.table).insert(record).select().single();
      if (error) {
        return failure(ErrorFactory.fromUnknown(error, `Insert into '${this.table}' failed`));
      }
      return success(data as T);
    } catch (error) {
      return failure(ErrorFactory.fromUnknown(error, `Insert into '${this.table}' failed`));
    }
  }

  async update(id: string, changes: Partial<T>): AsyncResult<T> {
    try {
      const { data, error } = await this.client
        .from(this.table)
        .update({ ...changes, id })
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) {
        return failure(ErrorFactory.fromUnknown(error, `Update of '${this.table}' failed`));
      }
      if (data === null) {
        return failure(ErrorFactory.notFound(`Record '${id}' was not found`, { id }));
      }
      return success(data as T);
    } catch (error) {
      return failure(ErrorFactory.fromUnknown(error, `Update of '${this.table}' failed`));
    }
  }

  async remove(id: string): AsyncResult<void> {
    try {
      const { error } = await this.client.from(this.table).delete().eq('id', id);
      if (error) {
        return failure(ErrorFactory.fromUnknown(error, `Delete from '${this.table}' failed`));
      }
      return success(undefined);
    } catch (error) {
      return failure(ErrorFactory.fromUnknown(error, `Delete from '${this.table}' failed`));
    }
  }
}
