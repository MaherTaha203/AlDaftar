'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getSupplierService, SupplierStatus, type Supplier } from '@/lib/modules/suppliers';
import { ListPage, useOperation } from '../../framework';
import {
  Button,
  EyeIcon,
  FilterPanel,
  PanelIcon,
  PeekField,
  PencilIcon,
  PlusIcon,
  RowActions,
  Select,
  SideDetailPanel,
  StatusBadge,
  type DataTableColumn,
} from '../../ui';

/**
 * SuppliersList — screen S-10 (02_Screen_Flow.md). A ListPage instance over
 * SupplierService: in-list search, status filter, pagination, row → detail.
 * The calculated-balance column arrives with the Purchases module (documents
 * are its only source; none exist yet — tracked interim state).
 */
type StatusFilter = 'all' | SupplierStatus;

const PAGE_SIZE = 25;

const statusLabels: Record<SupplierStatus, string> = {
  [SupplierStatus.Active]: 'نشط',
  [SupplierStatus.Archived]: 'مؤرشف',
};

const columns: readonly DataTableColumn<Supplier>[] = [
  { key: 'name', header: 'الاسم', render: (row) => row.name },
  {
    key: 'phone',
    header: 'الهاتف',
    priority: 2,
    render: (row) => (row.phone === '' ? '—' : <bdi dir="ltr">{row.phone}</bdi>),
  },
  {
    key: 'status',
    header: 'الحالة',
    render: (row) => (
      <StatusBadge tone={row.status === SupplierStatus.Active ? 'success' : 'neutral'}>
        {statusLabels[row.status]}
      </StatusBadge>
    ),
  },
];

export function SuppliersList() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<readonly Supplier[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [peek, setPeek] = useState<Supplier | null>(null);

  const { run: load, pending, error } = useOperation(() => getSupplierService().list());

  useEffect(() => {
    void load().then((result) => {
      if (result.ok) {
        setSuppliers(result.value);
      }
    });
  }, [load]);

  const filtered = useMemo(() => {
    const text = query.trim();
    return suppliers.filter(
      (supplier) =>
        (statusFilter === 'all' || supplier.status === statusFilter) &&
        (text === '' || supplier.name.includes(text) || supplier.phone.includes(text)),
    );
  }, [suppliers, query, statusFilter]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const isFiltered = query.trim() !== '' || statusFilter !== 'all';

  return (
    <>
      <ListPage
        primaryAction={
          <Link href="/suppliers/new">
            <Button icon={<PlusIcon />}>مورد جديد</Button>
          </Link>
        }
        search={{
          placeholder: 'بحث بالاسم أو الهاتف…',
          onQueryChange: (value) => {
            setQuery(value);
            setPage(1);
          },
        }}
        toolbarActions={
          <Button variant="secondary" size="sm" onClick={() => setFiltersOpen((open) => !open)}>
            تصفية
          </Button>
        }
        filters={
          <FilterPanel
            open={filtersOpen}
            chips={
              statusFilter === 'all'
                ? []
                : [{ key: 'status', label: `الحالة: ${statusLabels[statusFilter]}` }]
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
                onChange={(event) => {
                  setStatusFilter(event.target.value as StatusFilter);
                  setPage(1);
                }}
                className="w-40"
              >
                <option value="all">الكل</option>
                <option value={SupplierStatus.Active}>{statusLabels[SupplierStatus.Active]}</option>
                <option value={SupplierStatus.Archived}>
                  {statusLabels[SupplierStatus.Archived]}
                </option>
              </Select>
            </label>
          </FilterPanel>
        }
        columns={columns}
        rows={pageRows}
        rowKey={(row) => row.id}
        onRowClick={(row) => router.push(`/suppliers/${row.id}`)}
        rowActions={(row) => (
          <RowActions
            actions={[
              {
                key: 'peek',
                label: 'معاينة',
                icon: <PanelIcon />,
                onSelect: () => setPeek(row),
              },
              {
                key: 'view',
                label: 'عرض',
                icon: <EyeIcon />,
                onSelect: () => router.push(`/suppliers/${row.id}`),
              },
              {
                key: 'edit',
                label: 'تعديل',
                icon: <PencilIcon />,
                onSelect: () => router.push(`/suppliers/${row.id}/edit`),
              },
            ]}
          />
        )}
        loading={pending && suppliers.length === 0}
        error={error}
        onRetry={() => void load()}
        emptyMessage={isFiltered ? 'لا توجد نتائج مطابقة' : 'لا يوجد موردون بعد'}
        emptyAction={
          isFiltered ? undefined : (
            <Link href="/suppliers/new">
              <Button variant="secondary">مورد جديد</Button>
            </Link>
          )
        }
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          total: filtered.length,
          onPageChange: setPage,
        }}
      />

      <SideDetailPanel
        open={peek !== null}
        onClose={() => setPeek(null)}
        title={peek?.name ?? ''}
        subtitle={
          peek ? (
            <StatusBadge tone={peek.status === SupplierStatus.Active ? 'success' : 'neutral'}>
              {statusLabels[peek.status]}
            </StatusBadge>
          ) : undefined
        }
        onOpenFullPage={
          peek
            ? () => {
                const id = peek.id;
                setPeek(null);
                router.push(`/suppliers/${id}`);
              }
            : undefined
        }
      >
        {peek ? (
          <dl>
            <PeekField label="الهاتف">
              {peek.phone === '' ? '—' : <bdi dir="ltr">{peek.phone}</bdi>}
            </PeekField>
            <PeekField label="العنوان">{peek.address === '' ? '—' : peek.address}</PeekField>
            <PeekField label="الرقم الضريبي / السجل">
              {peek.taxReference === '' ? '—' : <bdi dir="ltr">{peek.taxReference}</bdi>}
            </PeekField>
            <PeekField label="ملاحظات">{peek.notes === '' ? '—' : peek.notes}</PeekField>
          </dl>
        ) : null}
      </SideDetailPanel>
    </>
  );
}
