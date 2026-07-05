/**
 * Settings module — types (screen S-70/Settings, 01_System_Workflow.md §7).
 *
 * v1 scope: the **company profile** used on printed documents (P21) — real
 * user data, not a business decision. Currency (BDD-006), numbering (BDD-005),
 * and display format (BDR-17 Latin digits / BDR-18 DD/MM/YYYY) are fixed
 * approved constants shown read-only. The attachment-limits (BDR-08) and
 * backup (BDR-12) sections remain pending owner decisions and are not editable
 * here yet.
 */
export interface CompanyProfile {
  readonly companyName: string;
  readonly address: string;
  readonly phone: string;
  readonly taxReference: string;
  /** Logo as a data URL for print headers; empty when none. */
  readonly logoDataUrl: string;
}

/** Persisted settings record (single row, fixed id). */
export interface AppSettingsRecord extends CompanyProfile {
  readonly id: string;
}

export const SETTINGS_RECORD_ID = 'app';

export const EMPTY_COMPANY_PROFILE: CompanyProfile = {
  companyName: '',
  address: '',
  phone: '',
  taxReference: '',
  logoDataUrl: '',
};
