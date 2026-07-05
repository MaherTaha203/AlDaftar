import type { IdentifierValue } from '../types';
import type { Identifier } from './identifier';

/*
 * Reusable entity base.
 *
 * Entities are defined by identity, not attributes: two instances are the
 * same entity when they are the same class carrying the same identifier,
 * regardless of their current state. The identifier is readonly for the
 * lifetime of the entity; other state may evolve through domain methods
 * defined by subclasses in later phases.
 */
export abstract class Entity<TId extends Identifier<IdentifierValue>> {
  readonly id: TId;

  protected constructor(id: TId) {
    this.id = id;
  }

  /** Identity equality: same subclass, same identifier. */
  equals(other: Entity<TId> | null | undefined): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    if (other === this) {
      return true;
    }
    return other.constructor === this.constructor && this.id.equals(other.id);
  }
}
