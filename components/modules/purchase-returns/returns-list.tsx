'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  getPurchaseReturnService,
  returnTotal,
  ReturnStatus,
  type PurchaseReturn,
} from '@/lib/modules/purchase-returns';
import { BOOK_CURRENCY } from '@/lib/modules/shared/money';
import { getSupplierService, type Supplier } from '@/lib/modules/suppliers';
import { ListPage, useOperation } from '../../framework';
import {
  Button,
  DocumentStatus,
  FilterPanel,
  MoneyDisplay,
  PlusIcon,
  Select,
  formatDate,
  type DataTableColumn,
} from '../../ui';

/**
 * ReturnsList — screen S-30. Number (or «مسودة»), date, supplier, calculated
 * total (ILS), status. Row → detail (posted) or edit (draft). Status filter.
 */
type StatusFilter = 'all' | ReturnStatus;

const PAGE_SIZE = 25;

export function ReturnsList() {
  const router = useRouter();
  const [returns, setReturns] = useState<readonly PurchaseReturn[]>([]);
  const [suppliers, setSuppliers] = useState<readonly Supplier[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);

  const { run: load, pending, error } = useOperation(() => getPurchaseReturnService().list());
  const { run: loadSuppliers } = useOperation(() => getSupplierService().list());

  useEffect(() => {
    void load().then((r) => r.ok && setReturns(r.value));
    void loadSuppliers().then((r) => r.ok && setSuppliers(r.value));
  }, [load, loadSuppliers]);

  const supplierName = useMemo(() => new Map(suppliers.map((s) => [s.id, s.name])), [suppliers]);

  const columns = useMemo<readonly DataTableColumn<PurchaseReturn>[]>(
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
        key: 'total',
        header: 'الإجمالي',
        align: 'left',
        render: (row) => (
          <MoneyDisplay value={returnTotal(row.lines)} currencyLabel={BOOK_CURRENCY.symbol} />
        ),
      },
      { key: 'status', header: 'الحالة', render: (row) => <DocumentStatus state={row.status} /> },
    ],
    [supplierName],
  );

  const filtered = useMemo(() => {
    const text = query.trim();
    return returns.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) {
        return false;
      }
      if (text === '') {
        return true;
      }
      const name = supplierName.get(r.supplierId) ?? '';
      return String(r.number ?? '').includes(text) || name.includes(text);
    });
  }, [returns, query, statusFilter, supplierName]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const isFiltered = query.trim() !== '' || statusFilter !== 'all';

  return (
    <ListPage
      primaryAction={
        <Link href="/purchase-returns/new">
          <Button icon={<PlusIcon />}>مرتجع جديد</Button>
        </Link>
      }
      search={{
        placeholder: 'بحث بالرقم أو المورد…',
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
                    label: `الحالة: ${statusFilter === ReturnStatus.Draft ? 'مسودة' : 'مرحّل'}`,
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
              <option value={ReturnStatus.Draft}>مسودة</option>
              <option value={ReturnStatus.Posted}>مرحّل</option>
            </Select>
          </label>
        </FilterPanel>
      }
      columns={columns}
      rows={pageRows}
      rowKey={(row) => row.id}
      onRowClick={(row) =>
        router.push(
          row.status === ReturnStatus.Draft
            ? `/purchase-returns/${row.id}/edit`
            : `/purchase-returns/${row.id}`,
        )
      }
      loading={pending && returns.length === 0}
      error={error}
      onRetry={() => void load().then((r) => r.ok && setReturns(r.value))}
      emptyMessage={isFiltered ? 'لا توجد نتائج مطابقة' : 'لا توجد مرتجعات بعد'}
      emptyAction={
        isFiltered ? undefined : (
          <Link href="/purchase-returns/new">
            <Button variant="secondary">مرتجع جديد</Button>
          </Link>
        )
      }
      pagination={{ page, pageSize: PAGE_SIZE, total: filtered.length, onPageChange: setPage }}
    />
  );
}
