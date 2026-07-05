import { failure, success, type Result } from '@/lib/core';
import { DomainRuleViolationError } from '../errors';

/*
 * Domain rule abstraction. A rule is a named, self-contained business
 * condition that either holds or does not. Concrete rules arrive with the
 * business phases — this file defines only the mechanism.
 */

export interface IDomainRule {
  /** Stable identifier for logs and error context, e.g. 'invoice.not-empty'. */
  readonly name: string;
  /** Human-readable description of what the rule requires. */
  readonly message: string;
  isSatisfied(): boolean;
}

/**
 * Evaluates a rule and returns the outcome as a Result: success when the rule
 * holds, otherwise a failure carrying a DomainRuleViolationError.
 */
export function checkRule(rule: IDomainRule): Result<void, DomainRuleViolationError> {
  return rule.isSatisfied()
    ? success(undefined)
    : failure(new DomainRuleViolationError(rule.name, rule.message));
}

/** Evaluates rules in order and fails on the first violation. */
export function checkRules(rules: readonly IDomainRule[]): Result<void, DomainRuleViolationError> {
  for (const rule of rules) {
    const result = checkRule(rule);
    if (!result.ok) {
      return result;
    }
  }
  return success(undefined);
}
