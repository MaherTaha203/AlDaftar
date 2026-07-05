import type { DeepReadonly } from '../types';

/*
 * Reusable technical utilities. Framework- and domain-agnostic by design.
 */

/** Resolves after `ms` milliseconds. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Does nothing. Useful as a default callback. */
export function noop(): void {
  // intentionally empty
}

/** Returns its argument unchanged. Useful as a default transform. */
export function identity<T>(value: T): T {
  return value;
}

/** True when running in a browser (a `window` global exists). */
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/** True when running on the server (no `window` global). */
export function isServer(): boolean {
  return !isBrowser();
}

/**
 * Recursively freezes an object and everything reachable from it, returning
 * it typed as DeepReadonly. Already-frozen branches are skipped, which also
 * guards against cycles.
 */
export function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
    return value as DeepReadonly<T>;
  }
  for (const key of Object.getOwnPropertyNames(value)) {
    const property = (value as Record<string, unknown>)[key];
    if (property !== null && typeof property === 'object' && !Object.isFrozen(property)) {
      deepFreeze(property);
    }
  }
  return Object.freeze(value) as DeepReadonly<T>;
}
