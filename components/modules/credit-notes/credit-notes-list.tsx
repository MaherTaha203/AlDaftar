'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  getCreditNoteService,
  CreditNoteStatus,
  CREDIT_NOTE_REASON_LABELS,
  type CreditNote,
} from '@/lib/modules/credit-notes';
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
 * CreditNotesList — «إشعارات دائنة للموردين» (BDD-011). Number (or «مسودة»),
 * date, supplier, reason, amount, status. Row → detail (posted) / edit
 * (draft). Lives behind the «التسويات» tabs with the refunds list.
 */
const PAGE_SIZE = 25;

export function CreditNotesList() {
  const router = useRouter();
  const [notes, setNotes] = useState<readonly CreditNote[]>([]);
  const [suppliers, setSuppliers] = useState<readonly Supplier[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const { run: load, pending, error } = useOperation(() => getCreditNoteService().list());
  const { run: loadSuppliers } = useOperation(() => getSupplierService().list());

  useEffect(() => {
    void load().then((r) => r.ok && setNotes(r.value));
    void loadSuppliers().then((r) => r.ok && setSuppliers(r.value));
  }, [load, loadSuppliers]);

  const supplierName = useMemo(() => new Map(suppliers.map((s) => [s.id, s.name])), [suppliers]);
  const supplierById = useMemo(() => new Map(suppliers.map((s) => [s.id, s])), [suppliers]);

  const columns = useMemo<readonly DataTableColumn<CreditNote>[]>(
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
        render: (row) => CREDIT_NOTE_REASON_LABELS[row.reasonType],
      },
      {
        key: 'amount',
        header: 'المبلغ',
        align: 'left',
        render: (row) => <MoneyDisplay value={row.amount} currencyLabel={BOOK_CURRENCY.symbol} />,
      },
      { key: 'status', header: 'الحالة', render: (row) => <DocumentStatus state={row.status} /> },
    ],
    [supplierById],
  );

  const filtered = useMemo(() => {
    const text = query.trim();
    if (text === '') {
      return notes;
    }
    return notes.filter((n) => {
      const name = supplierName.get(n.supplierId) ?? '';
      return String(n.number ?? '').includes(text) || name.includes(text);
    });
  }, [notes, query, supplierName]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <ListPage
      description="تصحيحات مالية بحتة على فواتير مرحّلة — البضاعة العائدة فعليًا مكانها المرتجعات."
      onNew={() => router.push('/credit-notes/new')}
      primaryAction={
        <Link href="/credit-notes/new">
          <Button icon={<PlusIcon />}>إشعار دائن جديد</Button>
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
          row.status === CreditNoteStatus.Draft
            ? `/credit-notes/${row.id}/edit`
            : `/credit-notes/${row.id}`,
        )
      }
      rowActions={(row) => {
        const isDraft = row.status === CreditNoteStatus.Draft;
        const actions: RowAction[] = [
          {
            key: 'view',
            label: 'عرض',
            icon: <EyeIcon />,
            onSelect: () => router.push(`/credit-notes/${row.id}`),
          },
        ];
        if (isDraft) {
          actions.push({
            key: 'edit',
            label: 'تعديل',
            icon: <PencilIcon />,
            onSelect: () => router.push(`/credit-notes/${row.id}/edit`),
          });
        }
        actions.push({
          key: 'print',
          label: 'طباعة',
          icon: <PrinterIcon />,
          onSelect: () => router.push(`/credit-notes/${row.id}/print`),
        });
        return <RowActions actions={actions} />;
      }}
      loading={pending && notes.length === 0}
      error={error}
      onRetry={() => void load().then((r) => r.ok && setNotes(r.value))}
      emptyMessage={query.trim() !== '' ? 'لا توجد نتائج مطابقة' : 'لا توجد إشعارات دائنة بعد'}
      pagination={{ page, pageSize: PAGE_SIZE, total: filtered.length, onPageChange: setPage }}
    />
  );
}
