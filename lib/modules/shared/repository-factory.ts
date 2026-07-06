import { LocalRecordStore, type StoredRecord } from './local-record-store';
import type { RecordStore } from './record-store';

/**
 * RepositoryFactory — the single persistence entry point for every business
 * module (execution-contract Single Local Repository rule).
 *
 * Modules never instantiate a storage implementation themselves; they ask
 * the factory for their collection's repository, typed by their own
 * repository contract. Instances are cached per collection.
 *
 * THE SUPABASE SWAP POINT (GA Foundation): the factory is provider-aware.
 * By default (no provider registered) it returns the LocalRecordStore —
 * behavior identical to before. The migration phase activates Supabase by
 * calling `setPersistenceProvider` with the wiring from
 * `supabase-provider.ts`; per the contract's Supabase Replacement Rule that
 * registration is the ONLY change — domain, application, services,
 * validation, pages, and components remain untouched.
 */
export type PersistenceProvider = (collection: string) => RecordStore<StoredRecord>;

let provider: PersistenceProvider | null = null;
const cache = new Map<string, RecordStore<StoredRecord>>();

export const RepositoryFactory = {
  /** Repository for a named collection (e.g. 'aldaftar.suppliers'). */
  get<T extends StoredRecord>(collection: string): RecordStore<T> {
    let store = cache.get(collection);
    if (store === undefined) {
      store = provider ? provider(collection) : new LocalRecordStore<StoredRecord>(collection);
      cache.set(collection, store);
    }
    return store as RecordStore<T>;
  },
} as const;

/**
 * Registers (or clears, with null) the persistence provider. Clears the
 * per-collection cache so subsequent `get` calls use the new provider.
 * Called exactly once at cutover (and by tests); never by business modules.
 */
export function setPersistenceProvider(next: PersistenceProvider | null): void {
  provider = next;
  cache.clear();
}
