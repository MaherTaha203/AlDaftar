'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  CustodyStatus,
  PresentedCustodyStatus,
  getCustodyService,
  type CustodySummary,
  type PresentedCustodyStatus as Status,
} from '@/lib/modules/custody';
import { ListPage, useOperation } from '../../framework';
import {
  Button,
  EyeIcon,
  FilterPanel,
  PanelIcon,
  PencilIcon,
  PlusIcon,
  RowActions,
  Select,
  SideDetailPanel,
  PeekField,
  formatDate,
  type DataTableColumn,
  type RowAction,
} from '../../ui';
import { CustodyStatusBadge, ReturnProgress } from './custody-status';

/**
 * CustodyList — the custody vouchers screen. Columns: number (or «مسودة»),
 * recipient, issue date, expected return date, derived status, item count,
 * remaining quantity, and a return-progress meter. Row → detail (issued) or
 * edit (draft). Filter by derived status.
 */
function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
}

type StatusFilter = 'all' | Status;

const STATUS_OPTIONS: readonly { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'الكل' },
  { value: PresentedCustodyStatus.Draft, label: 'مسودة' },
  { value: PresentedCustodyStatus.Issued, label: 'صادر' },
  { value: PresentedCustodyStatus.PartiallyReturned, label: 'مُرجَع جزئيًا' },
  { value: PresentedCustodyStatus.FullyReturned, label: 'مكتمل الإرجاع' },
  { value: PresentedCustodyStatus.Overdue, label: 'متأخر' },
  { value: PresentedCustodyStatus.Cancelled, label: 'ملغى' },
];

const PAGE_SIZE = 25;

export function CustodyList() {
  const router = useRouter();
  const [rows, setRows] = useState<readonly CustodySummary[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [peek, setPeek] = useState<CustodySummary | null>(null);

  const {
    run: load,
    pending,
    error,
  } = useOperation(() => getCustodyService().summaries(todayIso()));

  useEffect(() => {
    void load().then((r) => r.ok && setRows(r.value));
  }, [load]);

  const detailHref = (row: CustodySummary) =>
    row.custody.status === CustodyStatus.Draft
      ? `/custody/${row.custody.id}/edit`
      : `/custody/${row.custody.id}`;

  const columns = useMemo<readonly DataTableColumn<CustodySummary>[]>(
    () => [
      {
        key: 'number',
        header: 'الرقم',
        render: (row) =>
          row.custody.number === null ? '—' : <bdi dir="ltr">{row.custody.number}</bdi>,
      },
      { key: 'recipient', header: 'المُستلِم', render: (row) => row.custody.recipient || '—' },
      {
        key: 'date',
        header: 'تاريخ الإصدار',
        render: (row) => <bdi dir="ltr">{formatDate(row.custody.date)}</bdi>,
      },
      {
        key: 'expected',
        header: 'الإرجاع المتوقع',
        priority: 2,
        render: (row) =>
          row.custody.expectedReturnDate === null ? (
            '—'
          ) : (
            <bdi dir="ltr">{formatDate(row.custody.expectedReturnDate)}</bdi>
          ),
      },
      {
        key: 'items',
        header: 'الأصناف',
        align: 'left',
        render: (row) => <bdi dir="ltr">{row.itemCount}</bdi>,
      },
      {
        key: 'remaining',
        header: 'المتبقّي',
        align: 'left',
        render: (row) => <bdi dir="ltr">{row.remaining}</bdi>,
      },
      {
        key: 'progress',
        header: 'نسبة الإرجاع',
        render: (row) =>
          row.custody.status === CustodyStatus.Draft ? (
            <span className="text-neutral-300">—</span>
          ) : (
            <ReturnProgress value={row.progress} />
          ),
      },
      {
        key: 'status',
        header: 'الحالة',
        render: (row) => <CustodyStatusBadge status={row.status} />,
      },
    ],
    [],
  );

  const filtered = useMemo(() => {
    const text = query.trim();
    return rows.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) {
        return false;
      }
      if (text === '') {
        return true;
      }
      return (
        String(row.custody.number ?? '').includes(text) || row.custody.recipient.includes(text)
      );
    });
  }, [rows, query, statusFilter]);

  const chips =
    statusFilter !== 'all'
      ? [
          {
            key: 'status',
            label: `الحالة: ${STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? ''}`,
          },
        ]
      : [];

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const isFiltered = query.trim() !== '' || chips.length > 0;

  return (
    <>
      <ListPage
        description="سندات العهدة — أصناف سُلِّمت لأشخاص كعهدة، مع متابعة ما أُرجع وما تبقّى."
        onNew={() => router.push('/custody/new')}
        primaryAction={
          <Link href="/custody/new">
            <Button icon={<PlusIcon />}>سند عهدة جديد</Button>
          </Link>
        }
        search={{
          placeholder: 'بحث بالرقم أو المُستلِم…',
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
            onRemoveChip={() => {
              setStatusFilter('all');
              setPage(1);
            }}
            onClearAll={() => {
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
                className="w-44"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>
          </FilterPanel>
        }
        columns={columns}
        rows={pageRows}
        rowKey={(row) => row.custody.id}
        onRowClick={(row) => router.push(detailHref(row))}
        rowActions={(row) => {
          const isDraft = row.custody.status === CustodyStatus.Draft;
          const actions: RowAction[] = [
            { key: 'peek', label: 'معاينة', icon: <PanelIcon />, onSelect: () => setPeek(row) },
            {
              key: 'view',
              label: 'عرض',
              icon: <EyeIcon />,
              onSelect: () => router.push(`/custody/${row.custody.id}`),
            },
          ];
          if (isDraft) {
            actions.push({
              key: 'edit',
              label: 'تعديل',
              icon: <PencilIcon />,
              onSelect: () => router.push(`/custody/${row.custody.id}/edit`),
            });
          }
          return <RowActions actions={actions} />;
        }}
        loading={pending && rows.length === 0}
        error={error}
        onRetry={() => void load().then((r) => r.ok && setRows(r.value))}
        emptyMessage={isFiltered ? 'لا توجد نتائج مطابقة' : 'لا توجد سندات عهدة بعد'}
        emptyAction={
          isFiltered ? undefined : (
            <Link href="/custody/new">
              <Button variant="secondary">سند عهدة جديد</Button>
            </Link>
          )
        }
        pagination={{ page, pageSize: PAGE_SIZE, total: filtered.length, onPageChange: setPage }}
      />

      <SideDetailPanel
        open={peek !== null}
        onClose={() => setPeek(null)}
        title={peek?.custody.number == null ? 'مسودة عهدة' : `سند عهدة رقم ${peek?.custody.number}`}
        subtitle={peek ? <CustodyStatusBadge status={peek.status} /> : undefined}
        onOpenFullPage={
          peek
            ? () => {
                const target = peek;
                setPeek(null);
                router.push(detailHref(target));
              }
            : undefined
        }
      >
        {peek ? (
          <dl>
            <PeekField label="المُستلِم">{peek.custody.recipient || '—'}</PeekField>
            <PeekField label="الهاتف">
              {peek.custody.phone ? <bdi dir="ltr">{peek.custody.phone}</bdi> : '—'}
            </PeekField>
            <PeekField label="تاريخ الإصدار">
              <bdi dir="ltr">{formatDate(peek.custody.date)}</bdi>
            </PeekField>
            <PeekField label="الإرجاع المتوقع">
              {peek.custody.expectedReturnDate === null ? (
                '—'
              ) : (
                <bdi dir="ltr">{formatDate(peek.custody.expectedReturnDate)}</bdi>
              )}
            </PeekField>
            <PeekField label="الأصناف">{peek.itemCount}</PeekField>
            <PeekField label="المتبقّي">
              <bdi dir="ltr">{peek.remaining}</bdi> من <bdi dir="ltr">{peek.delivered}</bdi>
            </PeekField>
            {peek.custody.status !== CustodyStatus.Draft ? (
              <PeekField label="نسبة الإرجاع">
                <ReturnProgress value={peek.progress} />
              </PeekField>
            ) : null}
          </dl>
        ) : null}
      </SideDetailPanel>
    </>
  );
}
