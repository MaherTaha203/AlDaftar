import type { MasterInput, MasterRecord } from '../shared/master-data';

/**
 * Units module — types (screen S-61). A unit of measure for products
 * (piece, box, kilogram…). Name + optional notes only; further unit
 * behavior (multi-unit items, conversions) is pending BDD-008 answers and
 * deliberately not modeled. Archive instead of delete (managed-list rule).
 */
export interface Unit extends MasterRecord {
  readonly notes: string;
}

export interface UnitInput extends MasterInput {
  readonly notes?: string;
}

export { MasterStatus as UnitStatus } from '../shared/master-data';
