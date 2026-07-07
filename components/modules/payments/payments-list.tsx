'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getPaymentService, PaymentStatus, type Payment } from '@/lib/modules/payments';
import { BOOK_CURRENCY } from '@/lib/modules/shared/money';
import { getSupplierService, type Supplier } from '@/lib/modules/suppliers';
import { ListPage, useOperation } from '../../framework';
import {
  Button,
  DocumentStatus,
  EyeIcon,
  FilterPanel,
  MoneyDisplay,
  PencilIcon,
  PlusIcon,
  PrinterIcon,
  RowActions,
  Select,
  formatDate,
  type DataTableColumn,
  type RowAction,
} from '../../ui';

/**
 * PaymentsList — screen S-40. Number (or «مسودة»), date, supplier, method,
 * amount (ILS), status. Row → detail (posted) or edit (draft). Status filter.
 */
type StatusFilter = 'all' | PaymentStatus;

const PAGE_SIZE = 25;

export function PaymentsList() {
  const router = useRouter();
  const [payments, setPayments] = useState<readonly Payment[]>([]);
  const [suppliers, setSuppliers] = useState<readonly Supplier[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);

  const { run: load, pending, error } = useOperation(() => getPaymentService().list());
  const { run: loadSuppliers } = useOperation(() => getSupplierService().list());

  useEffect(() => {
    void load().then((r) => r.ok && setPayments(r.value));
    void loadSuppliers().then((r) => r.ok && setSuppliers(r.value));
  }, [load, loadSuppliers]);

  const supplierName = useMemo(() => new Map(suppliers.map((s) => [s.id, s.name])), [suppliers]);

  const columns = useMemo<readonly DataTableColumn<Payment>[]>(
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
        render: (row) => supplierName.get(row.supplierId) ?? '—',
      },
      { key: 'method', header: 'الطريقة', priority: 2, render: (row) => row.method || '—' },
      {
        key: 'amount',
        header: 'المبلغ',
        align: 'left',
        render: (row) => <MoneyDisplay value={row.amount} currencyLabel={BOOK_CURRENCY.symbol} />,
      },
      { key: 'status', header: 'الحالة', render: (row) => <DocumentStatus state={row.status} /> },
    ],
    [supplierName],
  );

  const filtered = useMemo(() => {
    const text = query.trim();
    return payments.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) {
        return false;
      }
      if (text === '') {
        return true;
      }
      const name = supplierName.get(p.supplierId) ?? '';
      return (
        String(p.number ?? '').includes(text) || name.includes(text) || p.reference.includes(text)
      );
    });
  }, [payments, query, statusFilter, supplierName]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const isFiltered = query.trim() !== '' || statusFilter !== 'all';

  return (
    <ListPage
      onNew={() => router.push('/payments/new')}
      primaryAction={
        <Link href="/payments/new">
          <Button icon={<PlusIcon />}>دفعة جديدة</Button>
        </Link>
      }
      search={{
        placeholder: 'بحث بالرقم أو المورد أو المرجع…',
        onQueryChange: (value) => {
          setQuery(value);
          setPage(1);
        },
      }}
      toolbarActions={
        <Button variant="secondary" size="sm" onClick={() => setFiltersOpen((o) => !o)}>
          تصفية
        </Button>
      }
      filters={
        <FilterPanel
          open={filtersOpen}
          chips={
            statusFilter === 'all'
              ? []
              : [
                  {
                    key: 'status',
                    label: `الحالة: ${statusFilter === PaymentStatus.Draft ? 'مسودة' : 'مرحّل'}`,
                  },
                ]
          }
          onRemoveChip={() => {
            setStatusFilter('all');
            setPage(1);
          }}
        >
          <label className="flex items-center gap-sm text-sm text-neutral-500">
            الحالة
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                setPage(1);
              }}
              className="w-36"
            >
              <option value="all">الكل</option>
              <option value={PaymentStatus.Draft}>مسودة</option>
              <option value={PaymentStatus.Posted}>مرحّل</option>
            </Select>
          </label>
        </FilterPanel>
      }
      columns={columns}
      rows={pageRows}
      rowKey={(row) => row.id}
      onRowClick={(row) =>
        router.push(
          row.status === PaymentStatus.Draft ? `/payments/${row.id}/edit` : `/payments/${row.id}`,
        )
      }
      rowActions={(row) => {
        const isDraft = row.status === PaymentStatus.Draft;
        const actions: RowAction[] = [
          {
            key: 'view',
            label: 'عرض',
            icon: <EyeIcon />,
            onSelect: () => router.push(`/payments/${row.id}`),
          },
        ];
        if (isDraft) {
          actions.push({
            key: 'edit',
            label: 'تعديل',
            icon: <PencilIcon />,
            onSelect: () => router.push(`/payments/${row.id}/edit`),
          });
        }
        actions.push({
          key: 'print',
          label: 'طباعة',
          icon: <PrinterIcon />,
          onSelect: () => router.push(`/payments/${row.id}/print`),
        });
        return <RowActions actions={actions} />;
      }}
      loading={pending && payments.length === 0}
      error={error}
      onRetry={() => void load().then((r) => r.ok && setPayments(r.value))}
      emptyMessage={isFiltered ? 'لا توجد نتائج مطابقة' : 'لا توجد مدفوعات بعد'}
      emptyAction={
        isFiltered ? undefined : (
          <Link href="/payments/new">
            <Button variant="secondary">دفعة جديدة</Button>
          </Link>
        )
      }
      pagination={{ page, pageSize: PAGE_SIZE, total: filtered.length, onPageChange: setPage }}
    />
  );
}
