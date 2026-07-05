/*
 * lib/core — shared engineering infrastructure.
 *
 * Reusable, framework-level building blocks only: errors, result pattern,
 * logging, validation, utilities, and technical types. Nothing in this tree
 * may contain business logic, domain types, or knowledge of specific features.
 */

export * from './errors';
export * from './logging';
export * from './result';
export * from './types';
export * from './utils';
export * from './validation';
