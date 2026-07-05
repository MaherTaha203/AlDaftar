/*
 * Reusable runtime type guards. Each guard narrows `unknown` to a technical
 * type — no business validation belongs here.
 */

/** Narrows away null and undefined. */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/** True for finite numbers only — NaN and ±Infinity are rejected. */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/** True for non-null objects, excluding arrays. */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

export function isFunction(value: unknown): value is (...args: never[]) => unknown {
  return typeof value === 'function';
}

/** True for Date instances holding a valid (non-NaN) date. */
export function isDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

/** True for strings with at least one non-whitespace character. */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
