// Generic domain errors — business-condition failures as typed values. No accounting errors.

export { DomainError, type DomainErrorOptions } from './domain-error';
export { DomainRuleViolationError } from './rule-violation-error';
export { InvalidValueError } from './invalid-value-error';
export { EntityNotFoundError } from './entity-not-found-error';
