'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AUDIT_ACTION_LABEL,
  AUDIT_ENTITY_LABEL,
  AuditAction,
  getAuditService,
  type AuditEntry,
} from '@/lib/modules/audit';
import { PageLayout } from '@/components/app';
import { useOperation } from '@/components/framework';
import {
  cn,
  DatePicker,
  Dialog,
  EmptyState,
  ErrorState,
  formatDateTime,
  Select,
  TableSkeleton,
} from '@/components/ui';

/**
 * AuditLog — screen S-90 (BDD-010 / DL-021). Read-only view of the immutable
 * audit trail: filter by period / module / action, inspect an entry's
 * before/after. No edit, no delete — the trail can never be changed here.
 */
function prettyJson(value: string | null): string {
  if (!value) {
    return '—';
  }
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export function AuditLog() {
  const [entries, setEntries] = useState<readonly AuditEntry[]>([]);
  const [action, setAction] = useState('');
  const [module, setModule] = useState('');
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [selected, setSelected] = useState<AuditEntry | null>(null);

  const { run: load, pending, error } = useOperation(() => getAuditService().list());

  useEffect(() => {
    void load().then((r) => r.ok && setEntries(r.value));
  }, [load]);

  const modules = useMemo(() => Array.from(new Set(entries.map((e) => e.entityType))), [entries]);

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      const date = entry.timestamp.slice(0, 10);
      if (from && date < from) {
        return false;
      }
      if (to && date > to) {
        return false;
      }
      if (action && entry.action !== action) {
        return false;
      }
      if (module && entry.entityType !== module) {
        return false;
      }
      return true;
    });
  }, [entries, from, to, action, module]);

  return (
    <PageLayout title="سجل التدقيق">
      <div className="mb-md flex flex-wrap items-end gap-md rounded-lg border border-neutral-200 bg-white p-md">
        <label className="flex flex-col gap-xs text-sm text-neutral-500">
          من تاريخ
          <DatePicker value={from} onValueChange={setFrom} />
        </label>
        <label className="flex flex-col gap-xs text-sm text-neutral-500">
          إلى تاريخ
          <DatePicker value={to} onValueChange={setTo} />
        </label>
        <label className="flex flex-col gap-xs text-sm text-neutral-500">
          الإجراء
          <Select value={action} onChange={(e) => setAction(e.target.value)} className="w-40">
            <option value="">الكل</option>
            {Object.values(AuditAction).map((a) => (
              <option key={a} value={a}>
                {AUDIT_ACTION_LABEL[a]}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-xs text-sm text-neutral-500">
          الوحدة
          <Select value={module} onChange={(e) => setModule(e.target.value)} className="w-44">
            <option value="">الكل</option>
            {modules.map((m) => (
              <option key={m} value={m}>
                {AUDIT_ENTITY_LABEL[m] ?? m}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {pending && entries.length === 0 ? (
        <TableSkeleton />
      ) : error ? (
        <ErrorState
          message={error ?? 'تعذّر تحميل السجل'}
          onRetry={() => void load().then((r) => r.ok && setEntries(r.value))}
        />
      ) : filtered.length === 0 ? (
        <EmptyState message="لا توجد سجلات مطابقة." />
      ) : (
        <div className="overflow-auto rounded-lg border border-neutral-200">
          <table className="w-full border-collapse bg-white text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-100 text-neutral-500">
                <th className="px-md py-sm text-left font-medium">التاريخ</th>
                <th className="px-md py-sm text-start font-medium">الإجراء</th>
                <th className="px-md py-sm text-start font-medium">الوحدة</th>
                <th className="px-md py-sm text-start font-medium">المرجع</th>
                <th className="px-md py-sm text-start font-medium">الوصف</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr
                  key={entry.id}
                  onClick={() => setSelected(entry)}
                  className={cn(
                    'cursor-pointer border-b border-neutral-100 last:border-b-0',
                    'transition-colors hover:bg-neutral-100',
                  )}
                >
                  <td className="px-md py-sm text-left tabular-nums">
                    <bdi dir="ltr">{formatDateTime(entry.timestamp)}</bdi>
                  </td>
                  <td className="px-md py-sm">{AUDIT_ACTION_LABEL[entry.action]}</td>
                  <td className="px-md py-sm">
                    {AUDIT_ENTITY_LABEL[entry.entityType] ?? entry.entityType}
                  </td>
                  <td className="px-md py-sm">{entry.entityLabel}</td>
                  <td className="px-md py-sm">{entry.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={selected !== null}
        onClose={() => setSelected(null)}
        title="تفاصيل الحركة"
        size="md"
      >
        {selected ? (
          <div className="flex flex-col gap-md text-sm">
            <div className="flex flex-wrap gap-lg text-neutral-500">
              <span>
                الإجراء:{' '}
                <span className="font-medium text-neutral-700">
                  {AUDIT_ACTION_LABEL[selected.action]}
                </span>
              </span>
              <span>
                التاريخ:{' '}
                <bdi dir="ltr" className="font-medium text-neutral-700">
                  {formatDateTime(selected.timestamp)}
                </bdi>
              </span>
              <span>
                المستخدم: <span className="font-medium text-neutral-700">{selected.user}</span>
              </span>
            </div>
            <div className="grid grid-cols-1 gap-md md:grid-cols-2">
              <div>
                <h3 className="mb-xs font-medium text-neutral-500">قبل</h3>
                <pre className="max-h-64 overflow-auto rounded-md bg-neutral-100 p-sm text-xs">
                  {prettyJson(selected.before)}
                </pre>
              </div>
              <div>
                <h3 className="mb-xs font-medium text-neutral-500">بعد</h3>
                <pre className="max-h-64 overflow-auto rounded-md bg-neutral-100 p-sm text-xs">
                  {prettyJson(selected.after)}
                </pre>
              </div>
            </div>
          </div>
        ) : null}
      </Dialog>
    </PageLayout>
  );
}
