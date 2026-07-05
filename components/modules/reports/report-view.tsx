'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { getReportingService, type ReportingSnapshot } from '@/lib/modules/reporting';
import { BOOK_CURRENCY } from '@/lib/modules/shared/money';
import { PageLayout } from '@/components/app';
import { useOperation } from '@/components/framework';
import { PrintLayout } from '@/components/layout';
import {
  Button,
  cn,
  DatePicker,
  EmptyState,
  ErrorState,
  Input,
  MoneyDisplay,
  Select,
  Spinner,
  formatDate,
} from '@/components/ui';
import { findReport } from './report-registry';
import type { ReportColumn, ReportParams, ReportResult, ParamKey } from './report-model';
import { buildReportCsv, downloadCsv } from './report-export';

const OWNER_TYPE_OPTIONS: readonly { value: string; label: string }[] = [
  { value: 'purchase', label: 'فواتير الشراء' },
  { value: 'purchase-return', label: 'المرتجعات' },
  { value: 'payment', label: 'المدفوعات' },
];

function isNumericKind(kind: ReportColumn['kind']): boolean {
  return kind === 'amount' || kind === 'number' || kind === 'qty' || kind === 'date';
}

function renderCell(value: ReportResult['rows'][number][string], kind: ReportColumn['kind']) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-neutral-400">—</span>;
  }
  if (kind === 'amount') {
    return (
      <MoneyDisplay
        value={typeof value === 'number' ? value : null}
        currencyLabel={BOOK_CURRENCY.symbol}
      />
    );
  }
  if (kind === 'date') {
    return <bdi dir="ltr">{formatDate(String(value))}</bdi>;
  }
  if (kind === 'number' || kind === 'qty') {
    return <bdi dir="ltr">{String(value)}</bdi>;
  }
  return String(value);
}

/** Read-only report table with an optional totals footer; used on screen and print. */
function ReportTable({ result }: { result: ReportResult }) {
  return (
    <div className="overflow-auto rounded-lg border border-neutral-200">
      <table className="w-full border-collapse bg-white text-sm">
        <thead className="print-repeat-head">
          <tr className="border-b border-neutral-200 bg-neutral-100">
            {result.columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'px-md py-sm font-medium text-neutral-500',
                  isNumericKind(column.kind) ? 'text-left' : 'text-start',
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, index) => (
            <tr key={index} className="border-b border-neutral-100 last:border-b-0">
              {result.columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'px-md py-sm',
                    isNumericKind(column.kind) ? 'text-left tabular-nums' : 'text-start',
                  )}
                >
                  {renderCell(row[column.key], column.kind)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {result.footer ? (
          <tfoot>
            <tr className="border-t-2 border-neutral-300 bg-neutral-100 font-semibold">
              {result.columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'px-md py-sm',
                    isNumericKind(column.kind) ? 'text-left tabular-nums' : 'text-start',
                  )}
                >
                  {renderCell(result.footer?.[column.key] ?? null, column.kind)}
                </td>
              ))}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}

export function ReportView({ reportId }: { reportId: string }) {
  const report = findReport(reportId);
  const [snapshot, setSnapshot] = useState<ReportingSnapshot | null>(null);
  const [params, setParams] = useState<ReportParams>({});

  const { run: load, pending, error } = useOperation(() => getReportingService().loadSnapshot());

  useEffect(() => {
    void load().then((r) => r.ok && setSnapshot(r.value));
  }, [load]);

  const result = useMemo<ReportResult | null>(() => {
    if (!report || !snapshot) {
      return null;
    }
    return report.run(snapshot, params);
  }, [report, snapshot, params]);

  if (!report) {
    return (
      <PageLayout title="تقرير غير معروف">
        <EmptyState message="لا يوجد تقرير بهذا المعرّف." />
      </PageLayout>
    );
  }

  const set = (key: keyof ReportParams, value: string | boolean | undefined) =>
    setParams((prev) => ({ ...prev, [key]: value === '' ? undefined : value }));

  const supplierOptions = snapshot?.suppliers ?? [];
  const categoryOptions = snapshot?.categories ?? [];

  const hasParam = (key: ParamKey) => report.params.includes(key);

  const printedOn = formatDate(new Date().toISOString().slice(0, 10));
  const canExport = !report.deferred && result !== null && result.rows.length > 0;

  return (
    <>
      <div className="screen-only">
        <PageLayout
          title={report.title}
          actions={
            <div className="flex gap-sm">
              <Button
                variant="secondary"
                disabled={!canExport}
                onClick={() =>
                  result &&
                  downloadCsv(report.id, buildReportCsv(result.columns, result.rows, result.footer))
                }
              >
                تصدير Excel
              </Button>
              <Button
                variant="secondary"
                disabled={report.deferred}
                onClick={() => typeof window !== 'undefined' && window.print()}
              >
                طباعة / PDF
              </Button>
            </div>
          }
        >
          {report.params.length > 0 ? (
            <div className="mb-md flex flex-wrap items-end gap-md rounded-lg border border-neutral-200 bg-white p-md">
              {hasParam('from') ? (
                <Field label="من تاريخ">
                  <DatePicker
                    value={params.from ?? null}
                    onValueChange={(v) => set('from', v ?? undefined)}
                  />
                </Field>
              ) : null}
              {hasParam('to') ? (
                <Field label="إلى تاريخ">
                  <DatePicker
                    value={params.to ?? null}
                    onValueChange={(v) => set('to', v ?? undefined)}
                  />
                </Field>
              ) : null}
              {hasParam('asOf') ? (
                <Field label="حتى تاريخ">
                  <DatePicker
                    value={params.asOf ?? null}
                    onValueChange={(v) => set('asOf', v ?? undefined)}
                  />
                </Field>
              ) : null}
              {hasParam('supplierId') ? (
                <Field label="المورد">
                  <Select
                    value={params.supplierId ?? ''}
                    onChange={(e) => set('supplierId', e.target.value)}
                    className="w-48"
                  >
                    <option value="">كل الموردين</option>
                    {supplierOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}
              {hasParam('categoryId') ? (
                <Field label="التصنيف">
                  <Select
                    value={params.categoryId ?? ''}
                    onChange={(e) => set('categoryId', e.target.value)}
                    className="w-48"
                  >
                    <option value="">كل التصنيفات</option>
                    {categoryOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}
              {hasParam('method') ? (
                <Field label="الطريقة">
                  <Input
                    value={params.method ?? ''}
                    onChange={(e) => set('method', e.target.value)}
                    placeholder="نقدًا / تحويل…"
                    className="w-40"
                  />
                </Field>
              ) : null}
              {hasParam('ownerType') ? (
                <Field label="النوع">
                  <Select
                    value={params.ownerType ?? ''}
                    onChange={(e) => set('ownerType', e.target.value)}
                    className="w-40"
                  >
                    <option value="">الكل</option>
                    {OWNER_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}
              {hasParam('withoutInvoiceOnly') ? (
                <label className="flex items-center gap-sm text-sm text-neutral-500">
                  <input
                    type="checkbox"
                    checked={params.withoutInvoiceOnly ?? false}
                    onChange={(e) => set('withoutInvoiceOnly', e.target.checked)}
                  />
                  بدون فاتورة مورد فقط
                </label>
              ) : null}
              {hasParam('includeZero') ? (
                <label className="flex items-center gap-sm text-sm text-neutral-500">
                  <input
                    type="checkbox"
                    checked={params.includeZero ?? false}
                    onChange={(e) => set('includeZero', e.target.checked)}
                  />
                  إظهار الأرصدة الصفرية
                </label>
              ) : null}
            </div>
          ) : null}

          {pending && !snapshot ? (
            <div className="flex justify-center py-2xl">
              <Spinner />
            </div>
          ) : error ? (
            <ErrorState
              message={error ?? 'تعذّر تحميل التقرير'}
              onRetry={() => void load().then((r) => r.ok && setSnapshot(r.value))}
            />
          ) : result?.notice ? (
            <EmptyState message={result.notice} />
          ) : result && result.rows.length === 0 ? (
            <EmptyState message="لا توجد سجلات مطابقة لهذه المعايير." />
          ) : result ? (
            <div className="flex flex-col gap-md">
              {result.meta && result.meta.length > 0 ? (
                <div className="flex flex-wrap gap-lg text-sm text-neutral-500">
                  {result.meta.map((m) => (
                    <span key={m.label}>
                      {m.label}: <span className="font-medium text-neutral-700">{m.value}</span>
                    </span>
                  ))}
                </div>
              ) : null}
              <ReportTable result={result} />
            </div>
          ) : null}
        </PageLayout>
      </div>

      {/* Print sheet — only rendered on paper (05_Printing_Specification.md §6). */}
      {result && !result.notice && result.rows.length > 0 ? (
        <div className="print-only">
          <PrintLayout
            title={report.title}
            orientation={report.orientation}
            meta={
              result.meta && result.meta.length > 0
                ? result.meta.map((m) => `${m.label}: ${m.value}`).join(' — ')
                : undefined
            }
            printedOn={`طُبع في ${printedOn}`}
          >
            <ReportTable result={result} />
          </PrintLayout>
        </div>
      ) : null}
    </>
  );
}

/** Small labeled control wrapper for the parameter bar. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-xs text-sm text-neutral-500">
      {label}
      {children}
    </label>
  );
}
