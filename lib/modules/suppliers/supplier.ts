import type { MasterInput, MasterRecord } from '../shared/master-data';

/**
 * Supplier module — types (Suppliers, business-architecture M2), built on
 * the shared master-data kit.
 *
 * Fields are exactly the approved S-12 form fields (02_Screen_Flow.md):
 * name (required), phone, address, tax/registration reference, notes, plus
 * the active/archived lifecycle (01_System_Workflow.md §1.3). Opening
 * balance is deliberately absent pending BDR-06. Supplier balance is never
 * stored (approved: balances are calculated from posted documents).
 */
// Carries both the value (const object) and type (union) meanings.
export { MasterStatus as SupplierStatus } from '../shared/master-data';

export interface Supplier extends MasterRecord {
  readonly phone: string;
  readonly address: string;
  readonly taxReference: string;
  readonly notes: string;
}

/** Input for creating/updating a supplier (S-12 / S-13 form payload). */
export interface SupplierInput extends MasterInput {
  readonly phone?: string;
  readonly address?: string;
  readonly taxReference?: string;
  readonly notes?: string;
}
