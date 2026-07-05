/*
 * Centralized technical shared types. Purely structural/utility types used
 * across the codebase — domain types are defined in later phases, never here.
 */

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type Maybe<T> = T | null | undefined;

/** A value that may or may not be wrapped in a Promise. */
export type Awaitable<T> = T | Promise<T>;

/** An array guaranteed by the type system to hold at least one element. */
export type NonEmptyArray<T> = readonly [T, ...T[]];

/** Union of the value types of an object type (typeof-enum pattern). */
export type ValueOf<T> = T[keyof T];

/** Recursively marks every property, element, and nested object readonly. */
export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer U)[]
    ? readonly DeepReadonly<U>[]
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;

/** Recursively marks every property optional. */
export type DeepPartial<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer U)[]
    ? DeepPartial<U>[]
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T;

/*
 * JSON-safe value types, for data that crosses a serialization boundary
 * (logs, API payloads, storage).
 */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];

/**
 * Nominal typing helper: `Brand<string, 'UserId'>` is assignable to string but
 * not interchangeable with other branded strings.
 */
export type Brand<T, B extends string> = T & { readonly __brand: B };
