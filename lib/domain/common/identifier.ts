import type { IdentifierValue } from '../types';

/*
 * Strongly typed entity identifier.
 *
 * Abstract by design: each entity type declares its own subclass (e.g.
 * `class SupplierId extends Identifier<string>` in a later phase), so ids of
 * different entity types are never interchangeable even when they wrap the
 * same primitive. Instances are frozen and therefore immutable.
 */
export abstract class Identifier<TValue extends IdentifierValue = string> {
  readonly value: TValue;

  protected constructor(value: TValue) {
    this.value = value;
    Object.freeze(this);
  }

  /** Equal when both ids are the same subclass and wrap the same value. */
  equals(other: Identifier<TValue> | null | undefined): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    return other.constructor === this.constructor && other.value === this.value;
  }

  toString(): string {
    return String(this.value);
  }

  /** Serializes to the wrapped primitive; picked up by JSON.stringify. */
  toJSON(): TValue {
    return this.value;
  }
}
