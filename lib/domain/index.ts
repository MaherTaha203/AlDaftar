/*
 * lib/domain — business concepts only.
 *
 * Foundation phase: generic abstractions (Entity, AggregateRoot, ValueObject,
 * Identifier, domain rules), generic domain errors, and domain-level types.
 * Concrete business entities and value objects arrive in later phases.
 *
 * Dependency rule: this layer depends ONLY on lib/core. No persistence, no
 * Supabase, no SQL, no React, no UI.
 */

export * from './common';
export * from './entities';
export * from './errors';
export * from './types';
export * from './value-objects';
