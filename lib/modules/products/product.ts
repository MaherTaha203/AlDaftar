import type { MasterInput, MasterRecord } from '../shared/master-data';

/**
 * Products module — types (screen S-50; prerequisite of Purchases). A
 * product references its category (optional) and unit of measure (required
 * — purchase lines default their unit from it, frozen purchase architecture
 * 03). Code is optional pending BDR-14. Stock is never stored (calculated
 * from posted documents). Archive instead of delete.
 */
export interface Product extends MasterRecord {
  /** Optional product code (BDR-14 pending mandatory-ness). */
  readonly code: string;
  /** Category reference; may be empty (uncategorized). */
  readonly categoryId: string;
  /** Unit of measure reference; required. */
  readonly unitId: string;
  readonly notes: string;
}

export interface ProductInput extends MasterInput {
  readonly code?: string;
  readonly categoryId?: string;
  readonly unitId: string;
  readonly notes?: string;
}

export { MasterStatus as ProductStatus } from '../shared/master-data';
