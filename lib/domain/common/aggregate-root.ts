import type { IdentifierValue } from '../types';
import { Entity } from './entity';
import type { Identifier } from './identifier';

/*
 * Marks an entity as the root of an aggregate: the consistency boundary
 * through which all changes to the aggregate's members must flow, and the
 * only member repositories load and persist.
 *
 * Deliberately adds no machinery (per ADR-0001) — no domain-event collection
 * or dispatch until a concrete need appears. The class exists so aggregate
 * boundaries are explicit in the type system from day one.
 */
export abstract class AggregateRoot<TId extends Identifier<IdentifierValue>> extends Entity<TId> {}
