/*
 * Technical error codes. Codes are stable string identifiers safe to log,
 * serialize, and match on. Domain-specific codes belong to later phases and
 * must not be added here.
 */

export const ErrorCode = {
  Unknown: 'UNKNOWN',
  ValidationFailed: 'VALIDATION_FAILED',
  AssertionFailed: 'ASSERTION_FAILED',
  InvariantViolation: 'INVARIANT_VIOLATION',
  NotFound: 'NOT_FOUND',
  Conflict: 'CONFLICT',
  Unauthorized: 'UNAUTHORIZED',
  Forbidden: 'FORBIDDEN',
  Timeout: 'TIMEOUT',
  ExternalService: 'EXTERNAL_SERVICE_ERROR',
  Unavailable: 'SERVICE_UNAVAILABLE',
  NotImplemented: 'NOT_IMPLEMENTED',
  Internal: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
