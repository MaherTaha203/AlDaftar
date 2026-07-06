// Database boundary — provider abstraction only. No tables, queries, or SQL.

export { DatabaseProvider } from './database-provider';
export type { IDatabaseClient } from './database-client';
export { ConnectionFactory, getSupabaseClient } from './connection-factory';
