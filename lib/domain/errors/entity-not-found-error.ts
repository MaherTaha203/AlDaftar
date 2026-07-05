import { ErrorCategory, ErrorCode } from '@/lib/core';
import type { IdentifierValue } from '../types';
import { DomainError } from './domain-error';

/*
 * Raised when an entity referenced by identifier does not exist. Generic over
 * the entity name — concrete lookups arrive with the business phases.
 */
export class EntityNotFoundError extends DomainError {
  constructor(entityName: string, id: IdentifierValue) {
    super(`${entityName} with id '${String(id)}' was not found`, {
      code: ErrorCode.NotFound,
      category: ErrorCategory.NotFound,
      context: { entityName, id },
    });
    if (new.target === EntityNotFoundError) {
      Object.freeze(this);
    }
  }
}
