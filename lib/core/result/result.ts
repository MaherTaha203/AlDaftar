import { AppError, ErrorFactory } from '../errors';

/*
 * Result pattern — explicit, typed success/failure without thrown exceptions.
 *
 * A Result is a frozen discriminated union narrowed via the `ok` flag or the
 * isSuccess / isFailure guards. The error channel defaults to AppError but any
 * error type can be carried. Naming follows TypeScript convention: the spec
 * names Success()/Failure()/Map()/FlatMap()/Match() map to success()/failure()/
 * map()/flatMap()/match().
 */

export interface Success<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Failure<E> {
  readonly ok: false;
  readonly error: E;
}

export type Result<T, E = AppError> = Success<T> | Failure<E>;

/** A promise resolving to a Result — the return type of async fallible operations. */
export type AsyncResult<T, E = AppError> = Promise<Result<T, E>>;

/** Creates an immutable success Result carrying `value`. */
export function success<T>(value: T): Success<T> {
  return Object.freeze({ ok: true as const, value });
}

/** Creates an immutable failure Result carrying `error`. */
export function failure<E>(error: E): Failure<E> {
  return Object.freeze({ ok: false as const, error });
}

export function isSuccess<T, E>(result: Result<T, E>): result is Success<T> {
  return result.ok;
}

export function isFailure<T, E>(result: Result<T, E>): result is Failure<E> {
  return !result.ok;
}

/** Transforms the success value; failures pass through untouched. */
export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return result.ok ? success(fn(result.value)) : result;
}

/** Transforms the error; successes pass through untouched. */
export function mapError<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  return result.ok ? result : failure(fn(result.error));
}

/** Chains a fallible operation onto a success; failures short-circuit. */
export function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> {
  return result.ok ? fn(result.value) : result;
}

/** Exhaustively handles both branches and collapses to a single value. */
export function match<T, E, U>(
  result: Result<T, E>,
  handlers: { readonly onSuccess: (value: T) => U; readonly onFailure: (error: E) => U },
): U {
  return result.ok ? handlers.onSuccess(result.value) : handlers.onFailure(result.error);
}

/** Returns the success value, or `fallback` when the Result is a failure. */
export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  return result.ok ? result.value : fallback;
}

/** Collapses a list of Results into one; the first failure short-circuits. */
export function combine<T, E>(results: readonly Result<T, E>[]): Result<readonly T[], E> {
  const values: T[] = [];
  for (const result of results) {
    if (!result.ok) {
      return result;
    }
    values.push(result.value);
  }
  return success(values);
}

/** Runs a throwing function and captures the outcome as a Result. */
export function fromThrowable<T>(
  fn: () => T,
  onError: (error: unknown) => AppError = (error) => ErrorFactory.fromUnknown(error),
): Result<T, AppError> {
  try {
    return success(fn());
  } catch (error) {
    return failure(onError(error));
  }
}

/** Awaits a promise and captures resolution/rejection as a Result. */
export async function fromPromise<T>(
  promise: Promise<T>,
  onError: (error: unknown) => AppError = (error) => ErrorFactory.fromUnknown(error),
): AsyncResult<T> {
  try {
    return success(await promise);
  } catch (error) {
    return failure(onError(error));
  }
}

/** Async variant of map; awaits the transform before wrapping. */
export async function mapAsync<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Promise<U>,
): AsyncResult<U, E> {
  return result.ok ? success(await fn(result.value)) : result;
}

/** Async variant of flatMap; the chained operation itself returns an AsyncResult. */
export async function flatMapAsync<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => AsyncResult<U, E>,
): AsyncResult<U, E> {
  return result.ok ? fn(result.value) : result;
}
