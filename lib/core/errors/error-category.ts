/*
 * Technical error categories. A category describes the class of failure at the
 * infrastructure level (how callers should react), never the business domain.
 */

export const ErrorCategory = {
  Validation: 'validation',
  NotFound: 'not_found',
  Conflict: 'conflict',
  Unauthorized: 'unauthorized',
  Forbidden: 'forbidden',
  External: 'external',
  Unavailable: 'unavailable',
  Internal: 'internal',
} as const;

export type ErrorCategory = (typeof ErrorCategory)[keyof typeof ErrorCategory];
