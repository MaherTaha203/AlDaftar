'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  getPaymentRefundService,
  PaymentRefundStatus,
  PAYMENT_REFUND_REASON_LABELS,
  refundTotalDebit,
  type PaymentRefund,
} from '@/lib/modules/payment-refunds';
import { BOOK_CURRENCY } from '@/lib/modules/shared/money';
import { getSupplierService, type Supplier } from '@/lib/modules/suppliers';
import { SupplierReference } from '../suppliers/supplier-preview';
import { AdjustmentsTabs } from '../adjustments/adjustments-tabs';
import { ListPage, useOperation } from '../../framework';
import {
  Button,
  DocumentStatus,
  EyeIcon,
  MoneyDisplay,
  PencilIcon,
  PlusIcon,
  PrinterIcon,
  RowActions,
  formatDate,
  type DataTableColumn,
  type RowAction,
} from '../../ui';

/**
 * RefundsList — «سندات استرداد الدفعات» (BDD-011). Number (or «مسودة»),
 * date, supplier, reason, total debit (cash + discount reversal), status.
 * Lives behind the «التسويات» tabs with the credit-notes list.
 */
const PAGE_SIZE = 25;

export function RefundsList() {
  const router = useRouter();
  const [refunds, setRefunds] = useState<readonly PaymentRefund[]>([]);
  const [suppliers, setSuppliers] = useState<readonly Supplier[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const { run: load, pending, error } = useOperation(() => getPaymentRefundService().list());
  const { run: loadSuppliers } = useOperation(() => getSupplierService().list());

  useEffect(() => {
    void load().then((r) => r.ok && setRefunds(r.value));
    void loadSuppliers().then((r) => r.ok && setSuppliers(r.value));
  }, [load, loadSuppliers]);

  const supplierName = useMemo(() => new Map(suppliers.map((s) => [s.id, s.name])), [suppliers]);
  const supplierById = useMemo(() => new Map(suppliers.map((s) => [s.id, s])), [suppliers]);

  const columns = useMemo<readonly DataTableColumn<PaymentRefund>[]>(
    () => [
      {
        key: 'number',
        header: 'الرقم',
        render: (row) => (row.number === null ? '—' : <bdi dir="ltr">{row.number}</bdi>),
      },
      {
        key: 'date',
        header: 'التاريخ',
        render: (row) => <bdi dir="ltr">{formatDate(row.date)}</bdi>,
      },
      {
        key: 'supplier',
        header: 'المورد',
        render: (row) => <SupplierReference supplier={supplierById.get(row.supplierId)} />,
      },
      {
        key: 'reason',
        header: 'السبب',
        render: (row) => PAYMENT_REFUND_REASON_LABELS[row.reasonType],
      },
      {
        key: 'total',
        header: 'الإجمالي',
        align: 'left',
        render: (row) => (
          <MoneyDisplay value={refundTotalDebit(row)} currencyLabel={BOOK_CURRENCY.symbol} />
        ),
      },
      { key: 'status', header: 'الحالة', render: (row) => <DocumentStatus state={row.status} /> },
    ],
    [supplierById],
  );

  const filtered = useMemo(() => {
    const text = query.trim();
    if (text === '') {
      return refunds;
    }
    return refunds.filter((r) => {
      const name = supplierName.get(r.supplierId) ?? '';
      return String(r.number ?? '').includes(text) || name.includes(text);
    });
  }, [refunds, query, supplierName]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <ListPage
      description="أموال أعادها الموردون مقابل دفعات مرحّلة — الدفعة الأصلية لا تُعدَّل أبدًا."
      onNew={() => router.push('/payment-refunds/new')}
      primaryAction={
        <Link href="/payment-refunds/new">
          <Button icon={<PlusIcon />}>سند استرداد جديد</Button>
        </Link>
      }
      search={{
        placeholder: 'بحث بالرقم أو المورد…',
        onQueryChange: (value) => {
          setQuery(value);
          setPage(1);
        },
      }}
      filters={<AdjustmentsTabs />}
      columns={columns}
      rows={pageRows}
      rowKey={(row) => row.id}
      onRowClick={(row) =>
        router.push(
          row.status === PaymentRefundStatus.Draft
            ? `/payment-refunds/${row.id}/edit`
            : `/payment-refunds/${row.id}`,
        )
      }
      rowActions={(row) => {
        const isDraft = row.status === PaymentRefundStatus.Draft;
        const actions: RowAction[] = [
          {
            key: 'view',
            label: 'عرض',
            icon: <EyeIcon />,
            onSelect: () => router.push(`/payment-refunds/${row.id}`),
          },
        ];
        if (isDraft) {
          actions.push({
            key: 'edit',
            label: 'تعديل',
            icon: <PencilIcon />,
            onSelect: () => router.push(`/payment-refunds/${row.id}/edit`),
          });
        }
        actions.push({
          key: 'print',
          label: 'طباعة',
          icon: <PrinterIcon />,
          onSelect: () => router.push(`/payment-refunds/${row.id}/print`),
        });
        return <RowActions actions={actions} />;
      }}
      loading={pending && refunds.length === 0}
      error={error}
      onRetry={() => void load().then((r) => r.ok && setRefunds(r.value))}
      emptyMessage={query.trim() !== '' ? 'لا توجد نتائج مطابقة' : 'لا توجد سندات استرداد بعد'}
      pagination={{ page, pageSize: PAGE_SIZE, total: filtered.length, onPageChange: setPage }}
    />
  );
}
