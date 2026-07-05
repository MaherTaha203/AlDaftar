/*
 * Identifies which external database provider backs a client. Only Supabase
 * exists today; the type keeps call sites honest if a second provider (e.g.
 * an in-memory test double) is ever added.
 */

export const DatabaseProvider = {
  Supabase: 'supabase',
} as const;

export type DatabaseProvider = (typeof DatabaseProvider)[keyof typeof DatabaseProvider];
