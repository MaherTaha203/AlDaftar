import { ErrorCategory, ErrorCode } from '@/lib/core';
import { DomainError } from './domain-error';

/*
 * Raised when a domain rule (IDomainRule) is not satisfied. Carries the rule
 * name in the error context so violations are identifiable in logs and at API
 * boundaries without parsing messages.
 */
export class DomainRuleViolationError extends DomainError {
  constructor(ruleName: string, message: string) {
    super(message, {
      code: ErrorCode.InvariantViolation,
      category: ErrorCategory.Validation,
      context: { rule: ruleName },
    });
    if (new.target === DomainRuleViolationError) {
      Object.freeze(this);
    }
  }
}
