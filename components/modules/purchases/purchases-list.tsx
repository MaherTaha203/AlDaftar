'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  getPurchaseService,
  purchaseTotal,
  PurchaseStatus,
  type Purchase,
} from '@/lib/modules/purchases';
import { BOOK_CURRENCY } from '@/lib/modules/shared/money';
import { getSupplierService, type Supplier } from '@/lib/modules/suppliers';
import { ListPage, useOperation } from '../../framework';
import {
  Button,
  DocumentStatus,
  EyeIcon,
  FilterPanel,
  MissingInvoiceBadge,
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
 * PurchasesList — screen S-20. Columns per the design: number (or «مسودة»),
 * date, supplier, supplier-invoice ref / no-invoice badge, calculated total
 * (ILS), status. Row → detail (posted) or edit (draft). Filters: status,
 * with/without supplier invoice.
 */
type StatusFilter = 'all' | PurchaseStatus;
type InvoiceFilter = 'all' | 'with' | 'without';

const PAGE_SIZE = 25;

export function PurchasesList() {
  const router = useRouter();
  const [purchases, setPurchases] = useState<readonly Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<readonly Supplier[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [invoiceFilter, setInvoiceFilter] = useState<InvoiceFilter>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);

  const { run: load, pending, error } = useOperation(() => getPurchaseService().list());
  const { run: loadSuppliers } = useOperation(() => getSupplierService().list());

  useEffect(() => {
    void load().then((r) => r.ok && setPurchases(r.value));
    void loadSuppliers().then((r) => r.ok && setSuppliers(r.value));
  }, [load, loadSuppliers]);

  const supplierName = useMemo(() => new Map(suppliers.map((s) => [s.id, s.name])), [suppliers]);

  const columns = useMemo<readonly DataTableColumn<Purchase>[]>(
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
      {
        key: 'invoice',
        header: 'فاتورة المورد',
        priority: 2,
        render: (row) =>
          row.withoutSupplierInvoice ? (
            <MissingInvoiceBadge />
          ) : row.supplierInvoiceRef === '' ? (
            '—'
          ) : (
            <bdi dir="ltr">{row.supplierInvoiceRef}</bdi>
          ),
      },
      {
        key: 'total',
        header: 'الإجمالي',
        align: 'left',
        render: (row) => (
          <MoneyDisplay value={purchaseTotal(row.lines)} currencyLabel={BOOK_CURRENCY.symbol} />
        ),
      },
      {
        key: 'status',
        header: 'الحالة',
        render: (row) => <DocumentStatus state={row.status} />,
      },
    ],
    [supplierName],
  );

  const filtered = useMemo(() => {
    const text = query.trim();
    return purchases.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) {
        return false;
      }
      if (invoiceFilter === 'with' && p.withoutSupplierInvoice) {
        return false;
      }
      if (invoiceFilter === 'without' && !p.withoutSupplierInvoice) {
        return false;
      }
      if (text === '') {
        return true;
      }
      const name = supplierName.get(p.supplierId) ?? '';
      return (
        String(p.number ?? '').includes(text) ||
        p.supplierInvoiceRef.includes(text) ||
        name.includes(text)
      );
    });
  }, [purchases, query, statusFilter, invoiceFilter, supplierName]);

  const chips = [
    ...(statusFilter !== 'all'
      ? [
          {
            key: 'status',
            label: `الحالة: ${statusFilter === PurchaseStatus.Draft ? 'مسودة' : 'مرحّل'}`,
          },
        ]
      : []),
    ...(invoiceFilter !== 'all'
      ? [
          {
            key: 'invoice',
            label: invoiceFilter === 'without' ? 'بدون فاتورة مورد' : 'بفاتورة مورد',
          },
        ]
      : []),
  ];

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const isFiltered = query.trim() !== '' || chips.length > 0;

  return (
    <ListPage
      onNew={() => router.push('/purchases/new')}
      primaryAction={
        <Link href="/purchases/new">
          <Button icon={<PlusIcon />}>شراء جديد</Button>
        </Link>
      }
      search={{
        placeholder: 'بحث بالرقم أو المورد أو مرجع الفاتورة…',
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
          chips={chips}
          onRemoveChip={(key) => {
            if (key === 'status') {
              setStatusFilter('all');
            } else {
              setInvoiceFilter('all');
            }
            setPage(1);
          }}
          onClearAll={() => {
            setStatusFilter('all');
            setInvoiceFilter('all');
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
              <option value={PurchaseStatus.Draft}>مسودة</option>
              <option value={PurchaseStatus.Posted}>مرحّل</option>
            </Select>
          </label>
          <label className="flex items-center gap-sm text-sm text-neutral-500">
            فاتورة المورد
            <Select
              value={invoiceFilter}
              onChange={(e) => {
                setInvoiceFilter(e.target.value as InvoiceFilter);
                setPage(1);
              }}
              className="w-44"
            >
              <option value="all">الكل</option>
              <option value="with">بفاتورة</option>
              <option value="without">بدون فاتورة</option>
            </Select>
          </label>
        </FilterPanel>
      }
      columns={columns}
      rows={pageRows}
      rowKey={(row) => row.id}
      onRowClick={(row) =>
        router.push(
          row.status === PurchaseStatus.Draft
            ? `/purchases/${row.id}/edit`
            : `/purchases/${row.id}`,
        )
      }
      rowActions={(row) => {
        const isDraft = row.status === PurchaseStatus.Draft;
        const actions: RowAction[] = [
          {
            key: 'view',
            label: 'عرض',
            icon: <EyeIcon />,
            onSelect: () => router.push(`/purchases/${row.id}`),
          },
        ];
        if (isDraft) {
          actions.push({
            key: 'edit',
            label: 'تعديل',
            icon: <PencilIcon />,
            onSelect: () => router.push(`/purchases/${row.id}/edit`),
          });
        }
        actions.push({
          key: 'print',
          label: 'طباعة',
          icon: <PrinterIcon />,
          onSelect: () => router.push(`/purchases/${row.id}/print`),
        });
        return <RowActions actions={actions} />;
      }}
      loading={pending && purchases.length === 0}
      error={error}
      onRetry={() => void load().then((r) => r.ok && setPurchases(r.value))}
      emptyMessage={isFiltered ? 'لا توجد نتائج مطابقة' : 'لا توجد مشتريات بعد'}
      emptyAction={
        isFiltered ? undefined : (
          <Link href="/purchases/new">
            <Button variant="secondary">شراء جديد</Button>
          </Link>
        )
      }
      pagination={{ page, pageSize: PAGE_SIZE, total: filtered.length, onPageChange: setPage }}
    />
  );
}
