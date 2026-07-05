import type { DatabaseProvider } from './database-provider';

/*
 * Provider-agnostic handle to the external database. This phase defines only
 * the boundary — no tables, queries, or SQL. Business repositories (later
 * phases) receive an IDatabaseClient and unwrap the provider SDK internally,
 * so provider knowledge never leaks above the infrastructure layer.
 */
export interface IDatabaseClient {
  readonly provider: DatabaseProvider;
  /**
   * Escape hatch to the underlying provider SDK client (e.g. SupabaseClient).
   * Intended for infrastructure code only; the caller names the type.
   */
  unwrap<TClient>(): TClient;
}
