/**
 * Audit module — types (BDD-010, BDR-11 / DL-021). The business audit trail is
 * immutable and append-only: entries are created, never edited or deleted. It
 * is a separate record from operational logging (R7).
 *
 * Recorded actions are exactly the approved set. `Unpost`, `Login`, and
 * `Logout` are part of the vocabulary but have no producer yet (Unpost awaits
 * the reversal policy BDR-07; Login/Logout await an authentication phase) —
 * they are reserved so the trail is complete when those features arrive.
 */
export const AuditAction = {
  Create: 'create',
  Update: 'update',
  Delete: 'delete',
  Post: 'post',
  Unpost: 'unpost',
  Login: 'login',
  Logout: 'logout',
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export interface AuditEntry {
  readonly id: string;
  /** ISO timestamp of the action. */
  readonly timestamp: string;
  /** Single-owner system: a constant owner identity (PD-18). */
  readonly user: string;
  /** Capturing client (user agent); may be empty. */
  readonly device: string;
  readonly action: AuditAction;
  /** Module/entity kind, e.g. 'suppliers' | 'purchases' | 'attachments'. */
  readonly entityType: string;
  readonly entityId: string;
  /** Human reference — document number or record name. */
  readonly entityLabel: string;
  /** Short Arabic summary of what happened. */
  readonly summary: string;
  /** JSON snapshot before the change (null for creates). */
  readonly before: string | null;
  /** JSON snapshot after the change (null for deletes). */
  readonly after: string | null;
}

/** Arabic labels for the recorded actions. */
export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  create: 'إنشاء',
  update: 'تعديل',
  delete: 'حذف',
  post: 'ترحيل',
  unpost: 'إلغاء ترحيل',
  login: 'دخول',
  logout: 'خروج',
};

/** Arabic labels for the audited entity/module types. */
export const AUDIT_ENTITY_LABEL: Record<string, string> = {
  suppliers: 'الموردون',
  products: 'المنتجات',
  categories: 'التصنيفات',
  units: 'الوحدات',
  currencies: 'العملات',
  purchases: 'المشتريات',
  'purchase-returns': 'مرتجعات الشراء',
  payments: 'المدفوعات',
  custody: 'سندات العهدة',
  'custody-returns': 'إرجاعات العهدة',
  attachments: 'المرفقات',
  settings: 'الإعدادات',
  auth: 'الدخول والخروج',
};
