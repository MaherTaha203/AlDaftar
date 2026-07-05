import { deepFreeze } from '@/lib/core';

/*
 * Reusable value-object base.
 *
 * Value objects are defined entirely by their attributes: two instances of
 * the same class with equal props are the same value (structural equality).
 * Props are defensively copied and deep-frozen at construction, so every
 * value object is immutable.
 */
export abstract class ValueObject<TProps extends Record<string, unknown>> {
  protected readonly props: Readonly<TProps>;

  protected constructor(props: TProps) {
    this.props = deepFreeze({ ...props }) as Readonly<TProps>;
    Object.freeze(this);
  }

  /** Equal when both are the same subclass and their props are deeply equal. */
  equals(other: ValueObject<TProps> | null | undefined): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    if (other === this) {
      return true;
    }
    return other.constructor === this.constructor && structuralEquals(this.props, other.props);
  }
}

/** Deep equality over the JSON-like shapes value-object props are made of. */
function structuralEquals(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true;
  }
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  if (a instanceof Date || b instanceof Date) {
    return false;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => structuralEquals(item, b[index]));
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    return false;
  }
  if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) {
      return false;
    }
    return keysA.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(b, key) &&
        structuralEquals((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
    );
  }
  return false;
}
