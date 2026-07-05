/*
 * Domain-level technical types. Structural only — business/domain concepts
 * (suppliers, invoices, accounts, ...) are defined in later phases, never here.
 */

/** Primitive types an Identifier may wrap. */
export type IdentifierValue = string | number;
