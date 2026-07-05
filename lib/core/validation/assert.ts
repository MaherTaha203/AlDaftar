import { AppError, ErrorCategory, ErrorCode, type ErrorContext } from '../errors';

/*
 * Assertion helpers. `assert` guards expected runtime conditions (categorized
 * as validation failures); `invariant` guards conditions that indicate a
 * programming bug when violated (categorized as internal).
 */

/** Throws a validation AppError when `condition` is falsy; narrows on success. */
export function assert(
  condition: unknown,
  message = 'Assertion failed',
  context?: ErrorContext,
): asserts condition {
  if (!condition) {
    throw new AppError(message, {
      code: ErrorCode.AssertionFailed,
      category: ErrorCategory.Validation,
      context,
    });
  }
}

/** Throws an internal AppError when `condition` is falsy; narrows on success. */
export function invariant(
  condition: unknown,
  message = 'Invariant violation',
  context?: ErrorContext,
): asserts condition {
  if (!condition) {
    throw new AppError(message, {
      code: ErrorCode.InvariantViolation,
      category: ErrorCategory.Internal,
      context,
    });
  }
}

/** Throws when `value` is null or undefined; narrows to the defined type. */
export function assertDefined<T>(
  value: T | null | undefined,
  message = 'Expected value to be defined',
  context?: ErrorContext,
): asserts value is T {
  invariant(value !== null && value !== undefined, message, context);
}
