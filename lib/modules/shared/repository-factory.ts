import { LocalRecordStore, type StoredRecord } from './local-record-store';

/**
 * RepositoryFactory — the single persistence entry point for every business
 * module (execution-contract Single Local Repository rule).
 *
 * Modules never instantiate a storage implementation themselves; they ask
 * the factory for their collection's repository, typed by their own
 * repository contract. Instances are cached per collection.
 *
 * THE SUPABASE SWAP POINT: when the Supabase project is connected, this
 * factory returns Supabase-backed repositories instead of the local store.
 * Per the contract's Supabase Replacement Rule, that is the ONLY change —
 * domain, application, services, validation, pages, and components remain
 * untouched.
 */
const cache = new Map<string, LocalRecordStore<StoredRecord>>();

export const RepositoryFactory = {
  /** Repository for a named collection (e.g. 'aldaftar.suppliers'). */
  get<T extends StoredRecord>(collection: string): LocalRecordStore<T> {
    let store = cache.get(collection);
    if (store === undefined) {
      store = new LocalRecordStore<StoredRecord>(collection);
      cache.set(collection, store);
    }
    return store as LocalRecordStore<T>;
  },
} as const;
