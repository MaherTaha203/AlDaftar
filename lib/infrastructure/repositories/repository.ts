import type { AsyncResult } from '@/lib/core';

/*
 * Generic repository contracts. These define the shape every concrete
 * repository (later phases) implements — no business repositories exist here.
 * All operations are asynchronous and return the shared Result pattern, so
 * data-access failures are values, never exceptions.
 */

/** Default identifier type; Supabase primary keys are UUIDs (strings). */
export type EntityId = string;

/** Provider-agnostic pagination and ordering for list reads. */
export interface QueryOptions {
  readonly limit?: number;
  readonly offset?: number;
  readonly orderBy?: string;
  readonly ascending?: boolean;
}

export interface IReadRepository<TEntity, TId = EntityId> {
  /** Resolves null (inside a success Result) when no entity matches. */
  findById(id: TId): AsyncResult<TEntity | null>;
  findMany(options?: QueryOptions): AsyncResult<readonly TEntity[]>;
  count(): AsyncResult<number>;
}

export interface IWriteRepository<TEntity, TCreate, TId = EntityId> {
  create(data: TCreate): AsyncResult<TEntity>;
  update(id: TId, changes: Partial<TCreate>): AsyncResult<TEntity>;
  remove(id: TId): AsyncResult<void>;
}

/** Full read/write repository contract. */
export type IRepository<TEntity, TCreate, TId = EntityId> = IReadRepository<TEntity, TId> &
  IWriteRepository<TEntity, TCreate, TId>;
