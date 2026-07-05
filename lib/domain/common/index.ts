// Generic domain abstractions — bases for entities, value objects, identifiers, and rules.

export { Identifier } from './identifier';
export { ValueObject } from './value-object';
export { Entity } from './entity';
export { AggregateRoot } from './aggregate-root';
export { checkRule, checkRules, type IDomainRule } from './domain-rule';
