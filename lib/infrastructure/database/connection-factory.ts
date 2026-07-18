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

/**
 * "Remember me" preference key. The login screen sets it BEFORE sign-in via
 * `setRememberSession`; the storage adapter below reads it to decide where the
 * Supabase session token lives: localStorage (persists across browser restarts)
 * when remembered, sessionStorage (cleared when the browser/tab closes) when
 * not. Default (key absent) is remembered, preserving the prior behavior.
 */
const REMEMBER_KEY = 'aldaftar.remember-session';

/** Records the admin's "remember me" choice for the next sign-in. */
export function setRememberSession(remember: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(REMEMBER_KEY, remember ? 'true' : 'false');
}

/**
 * Storage adapter that honors the "remember me" choice. Reads fall back across
 * both stores so an in-progress session survives a page refresh either way;
 * writes go to localStorage when remembered and sessionStorage otherwise (and
 * clear the other store so a session never lingers in the wrong place).
 */
function rememberAwareStorage(): {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
} {
  return {
    getItem(key) {
      return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
    },
    setItem(key, value) {
      if (window.localStorage.getItem(REMEMBER_KEY) === 'false') {
        window.sessionStorage.setItem(key, value);
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, value);
        window.sessionStorage.removeItem(key);
      }
    },
    removeItem(key) {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    },
  };
}

export const ConnectionFactory = Object.freeze({
  /** Returns the shared database client, creating it on first call. */
  getClient(): IDatabaseClient {
    if (cached === undefined) {
      const { url, anonKey } = infrastructureConfig.database;
      // Single-administrator auth with a real "remember me" (owner decision,
      // 2026-07-05): the session refreshes itself and — per the admin's choice
      // at sign-in — either persists on the device (localStorage) or lasts only
      // until the browser closes (sessionStorage), via the storage adapter
      // above. RLS (migration 0002) requires this session for all data. On the
      // server there is no window, so the client uses its default storage.
      cached = new SupabaseDatabaseClient(
        createClient(url, anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            ...(typeof window === 'undefined' ? {} : { storage: rememberAwareStorage() }),
          },
        }),
      );
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

/**
 * The shared client with its native Supabase typing — the convenience form
 * infrastructure adapters use (record store, file storage). Same instance as
 * `ConnectionFactory.getClient()`, just unwrapped.
 */
export function getSupabaseClient(): SupabaseClient {
  return ConnectionFactory.getClient().unwrap<SupabaseClient>();
}
