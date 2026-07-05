import type { ReportingSnapshot } from '@/lib/modules/reporting';

/**
 * Report model — the data-driven contract behind every report screen. A
 * report DEFINITION declares which parameters it takes and a pure `run` that
 * turns the loaded snapshot into a RESULT (columns + rows + optional totals).
 * The generic ReportView renders the result; CSV/print reuse the same result.
 * This keeps the approved BDR-10 catalog (07_Report_Catalog.md) as data, not
 * bespoke screens, so every report obeys the same chrome and export rules.
 */
export type CellKind = 'text' | 'amount' | 'qty' | 'date' | 'number';

export interface ReportColumn {
  readonly key: string;
  readonly header: string;
  /** Rendering/formatting hint; defaults to 'text'. */
  readonly kind?: CellKind;
}

export type ReportCell = string | number | boolean | null;
export type ReportRow = Record<string, ReportCell>;

export interface ReportMeta {
  readonly label: string;
  readonly value: string;
}

export interface ReportResult {
  readonly columns: readonly ReportColumn[];
  readonly rows: readonly ReportRow[];
  /** Single totals row (partial keys) rendered as a table footer. */
  readonly footer?: ReportRow | null;
  /** Parameter/summary lines shown on the print header. */
  readonly meta?: readonly ReportMeta[];
  /** A neutral message shown instead of a table (e.g. "choose a supplier"). */
  readonly notice?: string | null;
}

export type ParamKey =
  | 'from'
  | 'to'
  | 'asOf'
  | 'supplierId'
  | 'categoryId'
  | 'productId'
  | 'method'
  | 'ownerType'
  | 'withoutInvoiceOnly'
  | 'includeZero';

export interface ReportParams {
  from?: string;
  to?: string;
  asOf?: string;
  supplierId?: string;
  categoryId?: string;
  productId?: string;
  method?: string;
  ownerType?: string;
  withoutInvoiceOnly?: boolean;
  includeZero?: boolean;
}

export interface ReportDefinition {
  /** Slug — the `[report]` route segment. */
  readonly id: string;
  readonly title: string;
  readonly group: string;
  readonly orientation: 'portrait' | 'landscape';
  readonly params: readonly ParamKey[];
  /**
   * Deferred reports are listed in the catalog for completeness but have no
   * screen (a pending business decision owns their contents). `run` returns a
   * notice explaining what is awaited — it never invents the report.
   */
  readonly deferred?: boolean;
  readonly run: (snap: ReportingSnapshot, params: ReportParams) => ReportResult;
}

/** Owner-type labels (Arabic) for attachment/owner reports. */
export const OWNER_TYPE_LABEL: Record<string, string> = {
  supplier: 'مورد',
  purchase: 'فاتورة شراء',
  'purchase-return': 'مرتجع شراء',
  payment: 'دفعة',
};

/** Ledger-kind labels (Arabic) for the supplier statement. */
export const LEDGER_KIND_LABEL: Record<string, string> = {
  purchase: 'فاتورة شراء',
  return: 'مرتجع',
  payment: 'دفعة',
  discount: 'خصم',
};
