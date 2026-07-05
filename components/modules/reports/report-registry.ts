import {
  attachmentsReport,
  auditLogReport,
  buildSupplierStatement,
  computeSupplierBalances,
  inactiveProducts,
  lastPurchasePrice,
  missingAttachments,
  paymentDiscounts,
  paymentsBySupplier,
  paymentsReport,
  productMovement,
  purchasesByCategory,
  purchasesByPeriod,
  purchasesByProduct,
  purchasesBySupplier,
  returnsReport,
  type ReportingSnapshot,
} from '@/lib/modules/reporting';
import { formatFileSize } from '@/lib/modules/attachments';
import { AUDIT_ACTION_LABEL, AUDIT_ENTITY_LABEL, type AuditAction } from '@/lib/modules/audit';
import { LEDGER_KIND_LABEL, OWNER_TYPE_LABEL, type ReportDefinition } from './report-model';

/**
 * Report registry — the approved BDR-10 catalog (07_Report_Catalog.md, BDD-009)
 * expressed as data. Each entry maps a catalog report to the pure reporting
 * aggregations. Supplier Aging is present but DEFERRED (its buckets/method are
 * a pending decision, BDD-009); the Audit Log Report is added by the Audit
 * phase. No report invents behavior — every figure is a documented aggregation.
 */
function supplierName(snap: ReportingSnapshot, id: string): string {
  return snap.suppliers.find((s) => s.id === id)?.name ?? id;
}

export const REPORT_GROUPS: readonly string[] = [
  'الموردون',
  'المشتريات',
  'المدفوعات',
  'المرتجعات',
  'المنتجات',
  'المرفقات',
  'النظام',
];

export const REPORTS: readonly ReportDefinition[] = [
  // ── Suppliers ──────────────────────────────────────────────────────────
  {
    id: 'supplier-statement',
    title: 'كشف حساب مورد',
    group: 'الموردون',
    orientation: 'portrait',
    params: ['supplierId', 'from', 'to'],
    run: (snap, params) => {
      if (!params.supplierId) {
        return { columns: [], rows: [], notice: 'اختر موردًا لعرض كشف الحساب.' };
      }
      const statement = buildSupplierStatement(params.supplierId, snap, {
        from: params.from,
        to: params.to,
      });
      return {
        columns: [
          { key: 'date', header: 'التاريخ', kind: 'date' },
          { key: 'number', header: 'الرقم', kind: 'number' },
          { key: 'type', header: 'النوع', kind: 'text' },
          { key: 'debit', header: 'مدين', kind: 'amount' },
          { key: 'credit', header: 'دائن', kind: 'amount' },
          { key: 'balance', header: 'الرصيد', kind: 'amount' },
        ],
        rows: statement.rows.map((row) => ({
          date: row.date,
          number: row.number,
          type: LEDGER_KIND_LABEL[row.kind] ?? row.kind,
          debit: row.debit || null,
          credit: row.credit || null,
          balance: row.balance,
        })),
        footer: {
          type: 'الإجمالي',
          debit: statement.totalDebit,
          credit: statement.totalCredit,
          balance: statement.closing,
        },
        meta: [
          { label: 'المورد', value: supplierName(snap, params.supplierId) },
          { label: 'الرصيد الافتتاحي', value: String(statement.opening) },
        ],
      };
    },
  },
  {
    id: 'supplier-balances',
    title: 'أرصدة الموردين',
    group: 'الموردون',
    orientation: 'portrait',
    params: ['asOf', 'includeZero'],
    run: (snap, params) => {
      const balances = computeSupplierBalances(snap, params.asOf).filter(
        (b) => params.includeZero || b.balance !== 0,
      );
      return {
        columns: [
          { key: 'name', header: 'المورد', kind: 'text' },
          { key: 'lastDate', header: 'آخر حركة', kind: 'date' },
          { key: 'balance', header: 'الرصيد', kind: 'amount' },
        ],
        rows: balances.map((b) => ({ name: b.name, lastDate: b.lastDate, balance: b.balance })),
        footer: {
          name: 'إجمالي المستحق',
          balance: balances.reduce((total, b) => total + b.balance, 0),
        },
      };
    },
  },
  {
    id: 'supplier-aging',
    title: 'أعمار الديون',
    group: 'الموردون',
    orientation: 'portrait',
    params: [],
    deferred: true,
    run: () => ({
      columns: [],
      rows: [],
      notice:
        'هذا التقرير معتمد ضمن القائمة، لكن شرائح التقادم وطريقة الاحتساب لم تُحدَّد بعد ' +
        '(قرار عمل معلّق — BDD-009). سيُبنى بمجرد اعتماد الشرائح والطريقة.',
    }),
  },

  // ── Purchases ──────────────────────────────────────────────────────────
  {
    id: 'purchases-by-period',
    title: 'المشتريات حسب الفترة',
    group: 'المشتريات',
    orientation: 'portrait',
    params: ['from', 'to', 'supplierId', 'withoutInvoiceOnly'],
    run: (snap, params) => {
      const result = purchasesByPeriod(
        snap,
        { from: params.from, to: params.to },
        { supplierId: params.supplierId, withoutInvoiceOnly: params.withoutInvoiceOnly },
      );
      return {
        columns: [
          { key: 'number', header: 'الرقم', kind: 'number' },
          { key: 'date', header: 'التاريخ', kind: 'date' },
          { key: 'supplierName', header: 'المورد', kind: 'text' },
          { key: 'invoice', header: 'فاتورة المورد', kind: 'text' },
          { key: 'total', header: 'الإجمالي', kind: 'amount' },
        ],
        rows: result.rows.map((row) => ({
          number: row.number,
          date: row.date,
          supplierName: row.supplierName,
          invoice: row.withoutSupplierInvoice ? 'بدون فاتورة' : row.supplierInvoiceRef || '—',
          total: row.total,
        })),
        footer: { supplierName: 'الإجمالي', total: result.total },
        meta: [
          { label: 'بفاتورة مورد', value: String(result.countWithInvoice) },
          { label: 'بدون فاتورة', value: String(result.countWithoutInvoice) },
        ],
      };
    },
  },
  {
    id: 'purchases-by-supplier',
    title: 'المشتريات حسب المورد',
    group: 'المشتريات',
    orientation: 'portrait',
    params: ['from', 'to'],
    run: (snap, params) => {
      const groups = purchasesBySupplier(snap, { from: params.from, to: params.to });
      return {
        columns: [
          { key: 'label', header: 'المورد', kind: 'text' },
          { key: 'count', header: 'عدد الفواتير', kind: 'number' },
          { key: 'amount', header: 'الإجمالي', kind: 'amount' },
        ],
        rows: groups.map((g) => ({ label: g.label, count: g.count, amount: g.amount })),
        footer: {
          label: 'الإجمالي',
          count: groups.reduce((total, g) => total + g.count, 0),
          amount: groups.reduce((total, g) => total + g.amount, 0),
        },
      };
    },
  },
  {
    id: 'purchases-by-product',
    title: 'المشتريات حسب المنتج',
    group: 'المشتريات',
    orientation: 'landscape',
    params: ['from', 'to'],
    run: (snap, params) => {
      const rows = purchasesByProduct(snap, { from: params.from, to: params.to });
      return {
        columns: [
          { key: 'categoryName', header: 'التصنيف', kind: 'text' },
          { key: 'productName', header: 'المنتج', kind: 'text' },
          { key: 'unitName', header: 'الوحدة', kind: 'text' },
          { key: 'quantity', header: 'الكمية', kind: 'qty' },
          { key: 'averagePrice', header: 'متوسط السعر', kind: 'amount' },
          { key: 'amount', header: 'الإجمالي', kind: 'amount' },
        ],
        rows: rows.map((row) => ({
          categoryName: row.categoryName || 'غير مصنّف',
          productName: row.productName,
          unitName: row.unitName,
          quantity: row.quantity,
          averagePrice: row.averagePrice,
          amount: row.amount,
        })),
        footer: {
          productName: 'الإجمالي',
          amount: rows.reduce((total, row) => total + row.amount, 0),
        },
      };
    },
  },
  {
    id: 'purchases-by-category',
    title: 'المشتريات حسب التصنيف',
    group: 'المشتريات',
    orientation: 'portrait',
    params: ['from', 'to'],
    run: (snap, params) => {
      const groups = purchasesByCategory(snap, { from: params.from, to: params.to });
      return {
        columns: [
          { key: 'label', header: 'التصنيف', kind: 'text' },
          { key: 'quantity', header: 'الكمية', kind: 'qty' },
          { key: 'amount', header: 'الإجمالي', kind: 'amount' },
        ],
        rows: groups.map((g) => ({ label: g.label, quantity: g.quantity, amount: g.amount })),
        footer: {
          label: 'الإجمالي',
          amount: groups.reduce((total, g) => total + g.amount, 0),
        },
      };
    },
  },

  // ── Payments ───────────────────────────────────────────────────────────
  {
    id: 'payments-report',
    title: 'المدفوعات',
    group: 'المدفوعات',
    orientation: 'portrait',
    params: ['from', 'to', 'supplierId', 'method'],
    run: (snap, params) => {
      const result = paymentsReport(
        snap,
        { from: params.from, to: params.to },
        { supplierId: params.supplierId, method: params.method },
      );
      return {
        columns: [
          { key: 'number', header: 'الرقم', kind: 'number' },
          { key: 'date', header: 'التاريخ', kind: 'date' },
          { key: 'supplierName', header: 'المورد', kind: 'text' },
          { key: 'method', header: 'الطريقة', kind: 'text' },
          { key: 'amount', header: 'المبلغ', kind: 'amount' },
          { key: 'discount', header: 'الخصم', kind: 'amount' },
        ],
        rows: result.rows.map((row) => ({
          number: row.number,
          date: row.date,
          supplierName: row.supplierName,
          method: row.method || '—',
          amount: row.amount,
          discount: row.discount || null,
        })),
        footer: {
          supplierName: 'الإجمالي',
          amount: result.totalAmount,
          discount: result.totalDiscount,
        },
      };
    },
  },
  {
    id: 'payments-by-supplier',
    title: 'المدفوعات حسب المورد',
    group: 'المدفوعات',
    orientation: 'portrait',
    params: ['from', 'to'],
    run: (snap, params) => {
      const groups = paymentsBySupplier(snap, { from: params.from, to: params.to });
      return {
        columns: [
          { key: 'label', header: 'المورد', kind: 'text' },
          { key: 'count', header: 'عدد الدفعات', kind: 'number' },
          { key: 'amount', header: 'الإجمالي', kind: 'amount' },
        ],
        rows: groups.map((g) => ({ label: g.label, count: g.count, amount: g.amount })),
        footer: {
          label: 'الإجمالي',
          count: groups.reduce((total, g) => total + g.count, 0),
          amount: groups.reduce((total, g) => total + g.amount, 0),
        },
      };
    },
  },
  {
    id: 'payment-discounts',
    title: 'خصومات الدفع',
    group: 'المدفوعات',
    orientation: 'portrait',
    params: ['from', 'to', 'supplierId'],
    run: (snap, params) => {
      const result = paymentDiscounts(
        snap,
        { from: params.from, to: params.to },
        { supplierId: params.supplierId },
      );
      return {
        columns: [
          { key: 'number', header: 'رقم الدفعة', kind: 'number' },
          { key: 'date', header: 'التاريخ', kind: 'date' },
          { key: 'supplierName', header: 'المورد', kind: 'text' },
          { key: 'discount', header: 'الخصم', kind: 'amount' },
        ],
        rows: result.rows.map((row) => ({
          number: row.number,
          date: row.date,
          supplierName: row.supplierName,
          discount: row.discount,
        })),
        footer: { supplierName: 'الإجمالي', discount: result.total },
      };
    },
  },

  // ── Purchase returns ─────────────────────────────────────────────────────
  {
    id: 'purchase-returns',
    title: 'مرتجعات الشراء',
    group: 'المرتجعات',
    orientation: 'portrait',
    params: ['from', 'to', 'supplierId'],
    run: (snap, params) => {
      const result = returnsReport(
        snap,
        { from: params.from, to: params.to },
        { supplierId: params.supplierId },
      );
      return {
        columns: [
          { key: 'number', header: 'الرقم', kind: 'number' },
          { key: 'date', header: 'التاريخ', kind: 'date' },
          { key: 'supplierName', header: 'المورد', kind: 'text' },
          { key: 'purchaseNumber', header: 'فاتورة الشراء', kind: 'number' },
          { key: 'total', header: 'الإجمالي', kind: 'amount' },
        ],
        rows: result.rows.map((row) => ({
          number: row.number,
          date: row.date,
          supplierName: row.supplierName,
          purchaseNumber: row.purchaseNumber,
          total: row.total,
        })),
        footer: { supplierName: 'الإجمالي', total: result.total },
      };
    },
  },

  // ── Products ───────────────────────────────────────────────────────────
  {
    id: 'product-movement',
    title: 'حركة المنتج',
    group: 'المنتجات',
    orientation: 'portrait',
    params: ['from', 'to'],
    run: (snap, params) => {
      const rows = productMovement(snap, { from: params.from, to: params.to });
      return {
        columns: [
          { key: 'categoryName', header: 'التصنيف', kind: 'text' },
          { key: 'productName', header: 'المنتج', kind: 'text' },
          { key: 'unitName', header: 'الوحدة', kind: 'text' },
          { key: 'quantityIn', header: 'وارد', kind: 'qty' },
          { key: 'quantityOut', header: 'مرتجع', kind: 'qty' },
          { key: 'net', header: 'الصافي', kind: 'qty' },
        ],
        rows: rows.map((row) => ({
          categoryName: row.categoryName || 'غير مصنّف',
          productName: row.productName,
          unitName: row.unitName,
          quantityIn: row.quantityIn,
          quantityOut: row.quantityOut,
          net: row.net,
        })),
      };
    },
  },
  {
    id: 'last-purchase-price',
    title: 'آخر سعر شراء',
    group: 'المنتجات',
    orientation: 'portrait',
    params: [],
    run: (snap) => {
      const rows = lastPurchasePrice(snap);
      return {
        columns: [
          { key: 'productName', header: 'المنتج', kind: 'text' },
          { key: 'code', header: 'الرمز', kind: 'text' },
          { key: 'unitName', header: 'الوحدة', kind: 'text' },
          { key: 'lastPrice', header: 'آخر سعر', kind: 'amount' },
          { key: 'lastDate', header: 'التاريخ', kind: 'date' },
          { key: 'supplierName', header: 'المورد', kind: 'text' },
        ],
        rows: rows.map((row) => ({
          productName: row.productName,
          code: row.code || '—',
          unitName: row.unitName,
          lastPrice: row.lastPrice,
          lastDate: row.lastDate,
          supplierName: row.supplierName ?? '—',
        })),
      };
    },
  },
  {
    id: 'inactive-products',
    title: 'المنتجات غير المتحركة',
    group: 'المنتجات',
    orientation: 'portrait',
    params: ['from', 'to'],
    run: (snap, params) => {
      const rows = inactiveProducts(snap, { from: params.from, to: params.to });
      return {
        columns: [
          { key: 'productName', header: 'المنتج', kind: 'text' },
          { key: 'code', header: 'الرمز', kind: 'text' },
          { key: 'lastMovement', header: 'آخر حركة', kind: 'date' },
        ],
        rows: rows.map((row) => ({
          productName: row.productName,
          code: row.code || '—',
          lastMovement: row.lastMovement,
        })),
      };
    },
  },

  // ── Attachments ──────────────────────────────────────────────────────────
  {
    id: 'missing-attachments',
    title: 'مستندات بلا مرفقات',
    group: 'المرفقات',
    orientation: 'portrait',
    params: ['from', 'to', 'ownerType'],
    run: (snap, params) => {
      const rows = missingAttachments(
        snap,
        { from: params.from, to: params.to },
        { ownerType: params.ownerType },
      );
      return {
        columns: [
          { key: 'type', header: 'النوع', kind: 'text' },
          { key: 'number', header: 'الرقم', kind: 'number' },
          { key: 'date', header: 'التاريخ', kind: 'date' },
          { key: 'supplierName', header: 'المورد', kind: 'text' },
        ],
        rows: rows.map((row) => ({
          type: OWNER_TYPE_LABEL[row.type] ?? row.type,
          number: row.number,
          date: row.date,
          supplierName: row.supplierName,
        })),
      };
    },
  },
  {
    id: 'attachments-report',
    title: 'تقرير المرفقات',
    group: 'المرفقات',
    orientation: 'landscape',
    params: ['from', 'to', 'ownerType'],
    run: (snap, params) => {
      const result = attachmentsReport(
        snap,
        { from: params.from, to: params.to },
        { ownerType: params.ownerType },
      );
      return {
        columns: [
          { key: 'title', header: 'العنوان', kind: 'text' },
          { key: 'ownerType', header: 'يخص', kind: 'text' },
          { key: 'contentType', header: 'النوع', kind: 'text' },
          { key: 'size', header: 'الحجم', kind: 'text' },
          { key: 'createdAt', header: 'تاريخ الرفع', kind: 'date' },
        ],
        rows: result.rows.map((row) => ({
          title: row.title,
          ownerType: OWNER_TYPE_LABEL[row.ownerType] ?? row.ownerType,
          contentType: row.contentType,
          size: formatFileSize(row.size),
          createdAt: row.createdAt.slice(0, 10),
        })),
      };
    },
  },

  // ── System ─────────────────────────────────────────────────────────────
  {
    id: 'audit-log-report',
    title: 'تقرير سجل التدقيق',
    group: 'النظام',
    orientation: 'landscape',
    params: ['from', 'to'],
    run: (snap, params) => {
      const rows = auditLogReport(snap, { from: params.from, to: params.to });
      return {
        columns: [
          { key: 'timestamp', header: 'التاريخ', kind: 'date' },
          { key: 'action', header: 'الإجراء', kind: 'text' },
          { key: 'entityType', header: 'الوحدة', kind: 'text' },
          { key: 'entityLabel', header: 'المرجع', kind: 'text' },
          { key: 'summary', header: 'الوصف', kind: 'text' },
          { key: 'user', header: 'المستخدم', kind: 'text' },
        ],
        rows: rows.map((row) => ({
          timestamp: row.timestamp,
          action: AUDIT_ACTION_LABEL[row.action as AuditAction] ?? row.action,
          entityType: AUDIT_ENTITY_LABEL[row.entityType] ?? row.entityType,
          entityLabel: row.entityLabel,
          summary: row.summary,
          user: row.user,
        })),
      };
    },
  },
];

export function findReport(id: string): ReportDefinition | undefined {
  return REPORTS.find((report) => report.id === id);
}
