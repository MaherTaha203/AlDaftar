'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  computeSupplierBalances,
  getReportingService,
  paymentsReport,
  purchasesByPeriod,
  type ReportingSnapshot,
} from '@/lib/modules/reporting';
import { purchaseTotal } from '@/lib/modules/purchases';
import { returnTotal } from '@/lib/modules/purchase-returns';
import { BOOK_CURRENCY, sumAmounts } from '@/lib/modules/shared/money';
import { PageLayout } from '@/components/app';
import { useOperation } from '@/components/framework';
import {
  EmptyState,
  ErrorState,
  formatDate,
  MoneyDisplay,
  Spinner,
  StatCard,
  Button,
} from '@/components/ui';

/**
 * DashboardScreen — the home surface (R-01, 01 §8). Calculated tiles from
 * posted documents: total payable, suppliers with balance, this month's
 * purchases and payments, drafts pending, and the most recent documents. Every
 * tile navigates to its module. Read-only; writes nothing.
 */
interface RecentDoc {
  readonly key: string;
  readonly type: string;
  readonly href: string;
  readonly number: number | null;
  readonly date: string;
  readonly supplier: string;
  readonly amount: number;
}

function currentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return { from: `${year}-${month}-01`, to: `${year}-${month}-31` };
}

export function DashboardScreen() {
  const [snapshot, setSnapshot] = useState<ReportingSnapshot | null>(null);
  const { run: load, pending, error } = useOperation(() => getReportingService().loadSnapshot());

  useEffect(() => {
    void load().then((r) => r.ok && setSnapshot(r.value));
  }, [load]);

  const view = useMemo(() => {
    if (!snapshot) {
      return null;
    }
    const month = currentMonthRange();
    const balances = computeSupplierBalances(snapshot);
    const totalPayable = sumAmounts(balances.map((b) => b.balance));
    const suppliersWithBalance = balances.filter((b) => b.balance !== 0).length;
    const purchasesThisMonth = purchasesByPeriod(snapshot, month).total;
    const paymentsThisMonth = paymentsReport(snapshot, month).totalAmount;

    const draftsCount =
      snapshot.purchases.filter((p) => p.status === 'draft').length +
      snapshot.payments.filter((p) => p.status === 'draft').length +
      snapshot.returns.filter((r) => r.status === 'draft').length;

    const supplierName = new Map(snapshot.suppliers.map((s) => [s.id, s.name]));
    const recent: RecentDoc[] = [
      ...snapshot.purchases
        .filter((p) => p.status === 'posted')
        .map((p) => ({
          key: `p-${p.id}`,
          type: 'شراء',
          href: `/purchases/${p.id}`,
          number: p.number,
          date: p.date,
          supplier: supplierName.get(p.supplierId) ?? '—',
          amount: purchaseTotal(p.lines),
        })),
      ...snapshot.payments
        .filter((p) => p.status === 'posted')
        .map((p) => ({
          key: `m-${p.id}`,
          type: 'دفعة',
          href: `/payments/${p.id}`,
          number: p.number,
          date: p.date,
          supplier: supplierName.get(p.supplierId) ?? '—',
          amount: p.amount,
        })),
      ...snapshot.returns
        .filter((r) => r.status === 'posted')
        .map((r) => ({
          key: `r-${r.id}`,
          type: 'مرتجع',
          href: `/purchase-returns/${r.id}`,
          number: r.number,
          date: r.date,
          supplier: supplierName.get(r.supplierId) ?? '—',
          amount: returnTotal(r.lines),
        })),
    ]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10);

    const isEmpty = snapshot.suppliers.length === 0 && recent.length === 0 && draftsCount === 0;

    return {
      totalPayable,
      suppliersWithBalance,
      purchasesThisMonth,
      paymentsThisMonth,
      draftsCount,
      recent,
      isEmpty,
    };
  }, [snapshot]);

  return (
    <PageLayout title="لوحة التحكم">
      {pending && !snapshot ? (
        <div className="flex justify-center py-2xl">
          <Spinner />
        </div>
      ) : error ? (
        <ErrorState
          message={error ?? 'تعذّر تحميل لوحة التحكم'}
          onRetry={() => void load().then((r) => r.ok && setSnapshot(r.value))}
        />
      ) : view?.isEmpty ? (
        <EmptyState
          message="ابدأ بإضافة مورد ثم تسجيل أول فاتورة شراء."
          action={
            <Link href="/suppliers/new">
              <Button>إضافة مورد</Button>
            </Link>
          }
        />
      ) : view ? (
        <div className="flex flex-col gap-lg">
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="إجمالي المستحق للموردين"
              value={
                <MoneyDisplay value={view.totalPayable} currencyLabel={BOOK_CURRENCY.symbol} />
              }
              href="/reports/supplier-balances"
            />
            <StatCard label="موردون برصيد" value={view.suppliersWithBalance} href="/suppliers" />
            <StatCard
              label="مشتريات هذا الشهر"
              value={
                <MoneyDisplay
                  value={view.purchasesThisMonth}
                  currencyLabel={BOOK_CURRENCY.symbol}
                />
              }
              href="/purchases"
            />
            <StatCard
              label="مدفوعات هذا الشهر"
              value={
                <MoneyDisplay value={view.paymentsThisMonth} currencyLabel={BOOK_CURRENCY.symbol} />
              }
              href="/payments"
            />
            <StatCard label="مسودات بانتظار الترحيل" value={view.draftsCount} href="/purchases" />
          </div>

          <section className="rounded-lg border border-neutral-200 bg-white shadow-sm">
            <h2 className="border-b border-neutral-200 px-lg py-md text-sm font-semibold text-neutral-500">
              أحدث المستندات
            </h2>
            {view.recent.length === 0 ? (
              <EmptyState message="لا توجد مستندات مرحّلة بعد." />
            ) : (
              <div className="overflow-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-100 text-neutral-500">
                      <th className="px-md py-sm text-start font-medium">النوع</th>
                      <th className="px-md py-sm text-left font-medium">الرقم</th>
                      <th className="px-md py-sm text-left font-medium">التاريخ</th>
                      <th className="px-md py-sm text-start font-medium">المورد</th>
                      <th className="px-md py-sm text-left font-medium">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.recent.map((doc) => (
                      <tr key={doc.key} className="border-b border-neutral-100 last:border-b-0">
                        <td className="px-md py-sm">
                          <Link href={doc.href} className="text-primary hover:underline">
                            {doc.type}
                          </Link>
                        </td>
                        <td className="px-md py-sm text-left tabular-nums">
                          <bdi dir="ltr">{doc.number ?? '—'}</bdi>
                        </td>
                        <td className="px-md py-sm text-left tabular-nums">
                          <bdi dir="ltr">{formatDate(doc.date)}</bdi>
                        </td>
                        <td className="px-md py-sm">{doc.supplier}</td>
                        <td className="px-md py-sm text-left tabular-nums">
                          <MoneyDisplay value={doc.amount} currencyLabel={BOOK_CURRENCY.symbol} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </PageLayout>
  );
}
