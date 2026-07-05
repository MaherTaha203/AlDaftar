import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { infrastructureConfig } from '../config';
import type { IDatabaseClient } from './database-client';
import { DatabaseProvider } from './database-provider';

/*
 * Creates and caches the database connection for the infrastructure layer.
 * The client is constructed lazily on first use (unlike a module-level
 * createClient call, importing this file costs nothing), and configuration
 * comes only from infrastructureConfig.
 */

class SupabaseDatabaseClient implements IDatabaseClient {
  readonly provider = DatabaseProvider.Supabase;
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
    Object.freeze(this);
  }

  unwrap<TClient>(): TClient {
    return this.client as unknown as TClient;
  }
}

let cached: IDatabaseClient | undefined;

export const ConnectionFactory = Object.freeze({
  /** Returns the shared database client, creating it on first call. */
  getClient(): IDatabaseClient {
    if (cached === undefined) {
      const { url, anonKey } = infrastructureConfig.database;
      cached = new SupabaseDatabaseClient(createClient(url, anonKey));
    }
    return cached;
  },

  /** Test seam: substitute a fake client (e.g. an in-memory double). */
  setClient(client: IDatabaseClient): void {
    cached = client;
  },

  /** Test seam: drop the cached client so the next getClient() recreates it. */
  reset(): void {
    cached = undefined;
  },
});
