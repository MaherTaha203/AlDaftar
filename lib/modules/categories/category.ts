import type { MasterInput, MasterRecord } from '../shared/master-data';

/**
 * Categories module — types (business-architecture M3 support data;
 * screen S-60). A category is a named classification for products.
 * Flat list — hierarchy is pending BDR-13 and deliberately not modeled.
 * Archive instead of delete (managed-list rule, 02 §S-60); the
 * delete-when-unreferenced option becomes implementable when Products
 * (the referencing module) exists.
 */
export interface Category extends MasterRecord {
  readonly notes: string;
}

export interface CategoryInput extends MasterInput {
  readonly notes?: string;
}

export { MasterStatus as CategoryStatus } from '../shared/master-data';
