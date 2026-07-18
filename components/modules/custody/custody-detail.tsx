'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  CustodyStatus,
  getCustodyService,
  presentedStatus,
  type CustodyBasis,
  type CustodyLineBalance,
} from '@/lib/modules/custody';
import { PageLayout, useShortcut } from '../../app';
import { useOperation } from '../../framework';
import {
  Card,
  CheckIcon,
  CloseIcon,
  ConfirmDialog,
  DataTable,
  DocumentActionBar,
  ErrorState,
  PencilIcon,
  PrinterIcon,
  RotateIcon,
  Skeleton,
  TrashIcon,
  formatDate,
  useToast,
  type DataTableColumn,
} from '../../ui';
import { CustodyStatusBadge, ReturnProgress } from './custody-status';
import { RecordReturnDialog } from './record-return-dialog';

/**
 * CustodyDetail — read view of a custody voucher: header (recipient, phone,
 * issue date, expected return, notes), derived status, and the items table with
 * delivered / returned / remaining per line. Drafts get Edit + Issue + Delete;
 * an issued voucher gets a Print action, "Record Return" (while anything is
 * outstanding), Cancel (only while it has no returns), and an append-only
 * return-history timeline.
 */
export interface CustodyDetailProps {
  custodyId: string;
}

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
}

export function CustodyDetail({ custodyId }: CustodyDetailProps) {
  const router = useRouter();
  const toast = useToast();
  const [basis, setBasis] = useState<CustodyBasis | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmIssue, setConfirmIssue] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showReturn, setShowReturn] = useState(false);

  const { run: load, error } = useOperation((id: string) => getCustodyService().basis(id));
  const del = useOperation((id: string) => getCustodyService().deleteDraft(id));
  const issueOp = useOperation((id: string) => getCustodyService().issue(id));
  const cancelOp = useOperation((id: string) => getCustodyService().cancel(id));

  function reload() {
    void load(custodyId).then((r) => r.ok && setBasis(r.value));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [custodyId]);

  const custody = basis?.custody ?? null;
  const isDraft = custody?.status === CustodyStatus.Draft;
  const isIssued = custody?.status === CustodyStatus.Issued;
  const hasReturns = (basis?.returns.length ?? 0) > 0;
  const hasRemaining = (basis?.balances ?? []).some((b) => b.remaining > 0);
  const itemName = useMemo(
    () => new Map((basis?.custody.lines ?? []).map((l) => [l.id, l.item])),
    [basis],
  );

  useShortcut('edit', () => router.push(`/custody/${custodyId}/edit`), isDraft);
  useShortcut('delete', () => setConfirmDelete(true), isDraft);

  async function handleDelete() {
    const result = await del.run(custodyId);
    setConfirmDelete(false);
    if (result.ok) {
      toast.show({ variant: 'success', message: 'تم حذف المسودة' });
      router.push('/custody');
    } else {
      toast.show({ variant: 'error', message: del.error ?? 'تعذّر حذف المسودة' });
    }
  }

  async function handleIssue() {
    setConfirmIssue(false);
    const result = await issueOp.run(custodyId);
    if (result.ok) {
      toast.show({ variant: 'success', message: `تم إصدار السند — رقم ${result.value.number}` });
      reload();
    } else {
      toast.show({ variant: 'error', message: issueOp.error ?? 'تعذّر إصدار السند' });
    }
  }

  async function handleCancel() {
    setConfirmCancel(false);
    const result = await cancelOp.run(custodyId);
    if (result.ok) {
      toast.show({ variant: 'success', message: 'تم إلغاء السند' });
      reload();
    } else {
      toast.show({ variant: 'error', message: cancelOp.error ?? 'تعذّر إلغاء السند' });
    }
  }

  const lineColumns = useMemo<readonly DataTableColumn<CustodyLineBalance>[]>(
    () => [
      { key: 'item', header: 'الصنف', render: (b) => b.line.item || '—' },
      {
        key: 'description',
        header: 'الوصف',
        priority: 2,
        render: (b) => b.line.description || '—',
      },
      {
        key: 'delivered',
        header: 'المُسلَّمة',
        align: 'left',
        render: (b) => <bdi dir="ltr">{b.delivered}</bdi>,
      },
      {
        key: 'returned',
        header: 'المُرجَعة',
        align: 'left',
        render: (b) => <bdi dir="ltr">{b.returned}</bdi>,
      },
      {
        key: 'remaining',
        header: 'المتبقّية',
        align: 'left',
        render: (b) => <bdi dir="ltr">{b.remaining}</bdi>,
      },
      { key: 'remarks', header: 'ملاحظات', priority: 3, render: (b) => b.line.remarks || '—' },
    ],
    [],
  );

  if (error !== null) {
    return (
      <PageLayout>
        <ErrorState message={error} onRetry={() => reload()} />
      </PageLayout>
    );
  }

  if (basis === null || custody === null) {
    return (
      <PageLayout>
        <Card>
          <div className="flex flex-col gap-sm">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </Card>
      </PageLayout>
    );
  }

  const status = presentedStatus(custody, basis.returns, todayIso());
  const title = isDraft ? 'مسودة استلام بضاعة' : `سند استلام بضاعة رقم ${custody.number}`;

  return (
    <PageLayout leafLabel={title}>
      <Card
        title={
          <span className="flex items-center gap-sm">
            {title}
            <CustodyStatusBadge status={status} />
          </span>
        }
        actions={
          <DocumentActionBar
            actions={[
              {
                key: 'print',
                label: 'طباعة',
                icon: <PrinterIcon />,
                variant: 'outline' as const,
                onSelect: () => router.push(`/custody/${custody.id}/print`),
              },
              ...(isIssued && hasRemaining
                ? [
                    {
                      key: 'return',
                      label: 'تسجيل إرجاع',
                      icon: <RotateIcon />,
                      variant: 'primary' as const,
                      onSelect: () => setShowReturn(true),
                    },
                  ]
                : []),
              ...(isDraft
                ? [
                    {
                      key: 'edit',
                      label: 'تعديل',
                      icon: <PencilIcon />,
                      variant: 'secondary' as const,
                      onSelect: () => router.push(`/custody/${custody.id}/edit`),
                    },
                    {
                      key: 'issue',
                      label: 'إصدار',
                      icon: <CheckIcon />,
                      variant: 'primary' as const,
                      onSelect: () => setConfirmIssue(true),
                    },
                    {
                      key: 'delete',
                      label: 'حذف',
                      icon: <TrashIcon />,
                      variant: 'danger' as const,
                      onSelect: () => setConfirmDelete(true),
                    },
                  ]
                : []),
              ...(isIssued
                ? [
                    {
                      key: 'cancel',
                      label: 'إلغاء السند',
                      icon: <CloseIcon />,
                      variant: 'secondary' as const,
                      overflow: true,
                      disabled: hasReturns,
                      disabledReason: hasReturns
                        ? 'لا يمكن إلغاء سند سُجِّل عليه إرجاع — يجب الحفاظ على السجل. الإلغاء متاح فقط قبل أول إرجاع.'
                        : undefined,
                      onSelect: () => setConfirmCancel(true),
                    },
                  ]
                : []),
            ]}
          />
        }
      >
        <dl className="grid grid-cols-1 gap-md md:grid-cols-3">
          <div className="flex flex-col gap-xs">
            <dt className="text-xs text-neutral-400">المُستلِم</dt>
            <dd className="text-sm">{custody.recipient || '—'}</dd>
          </div>
          <div className="flex flex-col gap-xs">
            <dt className="text-xs text-neutral-400">الهاتف</dt>
            <dd className="text-sm">
              {custody.phone ? <bdi dir="ltr">{custody.phone}</bdi> : '—'}
            </dd>
          </div>
          <div className="flex flex-col gap-xs">
            <dt className="text-xs text-neutral-400">تاريخ الإصدار</dt>
            <dd className="text-sm">
              <bdi dir="ltr">{formatDate(custody.date)}</bdi>
            </dd>
          </div>
          <div className="flex flex-col gap-xs">
            <dt className="text-xs text-neutral-400">تاريخ الإرجاع المتوقع</dt>
            <dd className="text-sm">
              {custody.expectedReturnDate === null ? (
                '—'
              ) : (
                <bdi dir="ltr">{formatDate(custody.expectedReturnDate)}</bdi>
              )}
            </dd>
          </div>
          {custody.status !== CustodyStatus.Draft ? (
            <div className="flex flex-col gap-xs">
              <dt className="text-xs text-neutral-400">نسبة الإرجاع</dt>
              <dd className="text-sm">
                <ReturnProgress
                  value={
                    basis.balances.reduce((s, b) => s + b.returned, 0) /
                    Math.max(
                      1,
                      basis.balances.reduce((s, b) => s + b.delivered, 0),
                    )
                  }
                />
              </dd>
            </div>
          ) : null}
          {custody.notes !== '' ? (
            <div className="flex flex-col gap-xs md:col-span-3">
              <dt className="text-xs text-neutral-400">ملاحظات</dt>
              <dd className="text-sm">{custody.notes}</dd>
            </div>
          ) : null}
        </dl>
      </Card>

      <Card title="الأصناف">
        <DataTable columns={lineColumns} rows={basis.balances} rowKey={(b) => b.line.id} />
      </Card>

      {basis.returns.length > 0 ? (
        <Card title="سجل الإرجاعات">
          <ol className="flex flex-col gap-md">
            {basis.returns.map((event) => (
              <li key={event.id} className="border-s-2 border-neutral-200 ps-md">
                <div className="text-sm font-medium">
                  <bdi dir="ltr">{formatDate(event.date)}</bdi>
                </div>
                <ul className="mt-xs flex flex-col gap-xs text-sm text-neutral-500">
                  {event.lines.map((line, index) => (
                    <li key={`${line.custodyLineId}-${index}`}>
                      {itemName.get(line.custodyLineId) ?? '—'} —{' '}
                      <bdi dir="ltr">{line.quantity}</bdi>
                    </li>
                  ))}
                </ul>
                {event.notes ? (
                  <p className="mt-xs text-xs text-neutral-400">{event.notes}</p>
                ) : null}
              </li>
            ))}
          </ol>
        </Card>
      ) : null}

      <RecordReturnDialog
        open={showReturn}
        custodyId={custody.id}
        balances={basis.balances}
        onClose={() => setShowReturn(false)}
        onRecorded={() => reload()}
      />

      <ConfirmDialog
        open={confirmIssue}
        title="إصدار سند الاستلام"
        confirmLabel="إصدار"
        busy={issueOp.pending}
        onConfirm={() => void handleIssue()}
        onCancel={() => setConfirmIssue(false)}
      >
        بعد الإصدار يأخذ السند رقمًا رسميًا وتُثبَّت الكميات المُسلَّمة. تُسجَّل الإرجاعات لاحقًا
        كحركات على السند نفسه.
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmCancel}
        title="إلغاء سند الاستلام"
        confirmLabel="إلغاء السند"
        danger
        busy={cancelOp.pending}
        onConfirm={() => void handleCancel()}
        onCancel={() => setConfirmCancel(false)}
      >
        سيُعلَّم السند كملغى ويبقى محفوظًا في السجل (لا يُحذف ولا يُعاد استخدام رقمه). الإلغاء متاح
        فقط لأنه لم يُسجَّل عليه أي إرجاع بعد.
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmDelete}
        title="حذف مسودة الاستلام"
        confirmLabel="حذف نهائيًا"
        danger
        busy={del.pending}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      >
        سيُحذف هذا السند المسودة نهائيًا ولا يمكن التراجع. المسودّات لا تحمل رقمًا، لذا الحذف آمن —
        وسيُسجَّل في سجل التدقيق.
      </ConfirmDialog>
    </PageLayout>
  );
}
