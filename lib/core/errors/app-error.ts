import { BaseApplicationError, type ErrorContext } from './base-application-error';
import { ErrorCategory } from './error-category';
import { ErrorCode } from './error-code';

export interface AppErrorOptions {
  readonly code?: ErrorCode;
  readonly category?: ErrorCategory;
  readonly context?: ErrorContext;
  readonly cause?: unknown;
}

/*
 * General-purpose concrete application error. Instances are frozen at
 * construction and therefore fully immutable.
 */
export class AppError extends BaseApplicationError {
  constructor(message: string, options: AppErrorOptions = {}) {
    super({
      message,
      code: options.code ?? ErrorCode.Unknown,
      category: options.category ?? ErrorCategory.Internal,
      context: options.context,
      cause: options.cause,
    });
    Object.freeze(this);
  }

  /** Type guard for narrowing unknown thrown values. */
  static isAppError(value: unknown): value is AppError {
    return value instanceof AppError;
  }
}
