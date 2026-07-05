import { BaseApplicationError, ErrorCategory, ErrorCode, type ErrorContext } from '@/lib/core';

export interface DomainErrorOptions {
  readonly code?: ErrorCode;
  readonly category?: ErrorCategory;
  readonly context?: ErrorContext;
}

/*
 * Root of the domain error hierarchy. A DomainError means a business-level
 * condition was violated — it is expected, typed, and safe to surface, as
 * opposed to an infrastructure fault. Generic only; accounting-specific
 * errors belong to later phases.
 */
export class DomainError extends BaseApplicationError {
  constructor(message: string, options: DomainErrorOptions = {}) {
    super({
      message,
      code: options.code ?? ErrorCode.ValidationFailed,
      category: options.category ?? ErrorCategory.Validation,
      context: options.context,
    });
    if (new.target === DomainError) {
      Object.freeze(this);
    }
  }

  static isDomainError(value: unknown): value is DomainError {
    return value instanceof DomainError;
  }
}
