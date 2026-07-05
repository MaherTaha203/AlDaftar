import type { MasterInput, MasterRecord } from '../shared/master-data';

/**
 * Currencies module — types (screen S-62). Master list of currencies only:
 * name plus an optional short code (e.g. SAR), stored uppercase. Which
 * currency the books use, precision, and rounding are pending BDR-02 and
 * deliberately not modeled here. Archive instead of delete.
 */
export interface Currency extends MasterRecord {
  /** Short currency code, uppercase (e.g. 'SAR'); may be empty. */
  readonly code: string;
}

export interface CurrencyInput extends MasterInput {
  readonly code?: string;
}

export { MasterStatus as CurrencyStatus } from '../shared/master-data';
