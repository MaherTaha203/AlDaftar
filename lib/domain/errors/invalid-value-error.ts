import { ErrorCategory, ErrorCode, type ErrorContext } from '@/lib/core';
import { DomainError } from './domain-error';

/*
 * Raised when a value object (or other domain value) cannot be constructed
 * from the given input — e.g. a malformed identifier or an out-of-range
 * primitive. Generic; carries no business meaning of its own.
 */
export class InvalidValueError extends DomainError {
  constructor(message: string, context?: ErrorContext) {
    super(message, {
      code: ErrorCode.ValidationFailed,
      category: ErrorCategory.Validation,
      context,
    });
    if (new.target === InvalidValueError) {
      Object.freeze(this);
    }
  }
}
