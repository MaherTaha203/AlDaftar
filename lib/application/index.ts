/*
 * lib/application — application infrastructure (simplified per ADR-0001).
 *
 * One abstraction: ApplicationService. Entry points call concrete services
 * directly; services return Results from lib/core. Allowed dependencies:
 * lib/core and lib/config only — never Supabase, Next.js, React, UI, or the
 * database. No business logic.
 */

export * from './services';
