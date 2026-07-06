/*
 * lib/infrastructure — boundary between the application and external systems.
 *
 * Provider abstractions and generic contracts only: configuration, database
 * client/factory, repository contracts, storage contracts, and telemetry.
 * Allowed dependencies: lib/core, lib/application, lib/config. Never UI,
 * React, pages, or business modules. No business logic, no schema, no SQL.
 */

export * from './auth';
export * from './config';
export * from './database';
export * from './repositories';
export * from './storage';
export * from './telemetry';
