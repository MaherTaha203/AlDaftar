import { AppError } from './app-error';
import type { ErrorContext } from './base-application-error';
import { ErrorCategory } from './error-category';
import { ErrorCode } from './error-code';

/*
 * Convenience constructors for the common technical error shapes, so call
 * sites never hand-assemble code/category pairs. Purely technical — factories
 * for domain errors belong to later phases.
 */
export const ErrorFactory = Object.freeze({
  validation(message: string, context?: ErrorContext): AppError {
    return new AppError(message, {
      code: ErrorCode.ValidationFailed,
      category: ErrorCategory.Validation,
      context,
    });
  },

  notFound(message: string, context?: ErrorContext): AppError {
    return new AppError(message, {
      code: ErrorCode.NotFound,
      category: ErrorCategory.NotFound,
      context,
    });
  },

  conflict(message: string, context?: ErrorContext): AppError {
    return new AppError(message, {
      code: ErrorCode.Conflict,
      category: ErrorCategory.Conflict,
      context,
    });
  },

  unauthorized(message: string, context?: ErrorContext): AppError {
    return new AppError(message, {
      code: ErrorCode.Unauthorized,
      category: ErrorCategory.Unauthorized,
      context,
    });
  },

  forbidden(message: string, context?: ErrorContext): AppError {
    return new AppError(message, {
      code: ErrorCode.Forbidden,
      category: ErrorCategory.Forbidden,
      context,
    });
  },

  timeout(message: string, context?: ErrorContext): AppError {
    return new AppError(message, {
      code: ErrorCode.Timeout,
      category: ErrorCategory.Unavailable,
      context,
    });
  },

  external(message: string, context?: ErrorContext, cause?: unknown): AppError {
    return new AppError(message, {
      code: ErrorCode.ExternalService,
      category: ErrorCategory.External,
      context,
      cause,
    });
  },

  internal(message: string, context?: ErrorContext, cause?: unknown): AppError {
    return new AppError(message, {
      code: ErrorCode.Internal,
      category: ErrorCategory.Internal,
      context,
      cause,
    });
  },

  notImplemented(message: string, context?: ErrorContext): AppError {
    return new AppError(message, {
      code: ErrorCode.NotImplemented,
      category: ErrorCategory.Internal,
      context,
    });
  },

  /**
   * Normalizes an unknown thrown value (from `catch`) into an AppError.
   * Existing AppError instances pass through unchanged; native Errors are
   * wrapped preserving message and cause chain.
   */
  fromUnknown(value: unknown, fallbackMessage = 'An unknown error occurred'): AppError {
    if (AppError.isAppError(value)) {
      return value;
    }
    if (value instanceof Error) {
      return new AppError(value.message || fallbackMessage, {
        code: ErrorCode.Unknown,
        category: ErrorCategory.Internal,
        cause: value,
      });
    }
    return new AppError(fallbackMessage, {
      code: ErrorCode.Unknown,
      category: ErrorCategory.Internal,
      ...(value !== undefined ? { context: { thrown: String(value) } } : {}),
    });
  },
});
