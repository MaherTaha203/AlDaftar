// Shared error system — technical infrastructure only, no domain errors.

export { ErrorCategory } from './error-category';
export { ErrorCode } from './error-code';
export {
  BaseApplicationError,
  type BaseApplicationErrorArgs,
  type ErrorContext,
  type SerializedError,
} from './base-application-error';
export { AppError, type AppErrorOptions } from './app-error';
export { ErrorFactory } from './error-factory';
