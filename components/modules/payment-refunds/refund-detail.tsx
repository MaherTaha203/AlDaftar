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
import { getPaymentService, type Payment } from '@/lib/modules/payments';
import { BOOK_CURRENCY } from '@/lib/modules/shared/money';
import { getSupplierService, type Supplier } from '@/lib/modules/suppliers';
import { PageLayout, useShortcut } from '../../app';
import { DocumentHistorySection } from '../shared/document-history';
import { useOperation } from '../../framework';
import {
  Card,
  CloseIcon,
  ConfirmDialog,
  DocumentActionBar,
  DocumentStatus,
  ErrorState,
  Field,
  MoneyDisplay,
  PencilIcon,
  PrinterIcon,
  Skeleton,
  Textarea,
  TrashIcon,
  formatDate,
  useToast,
} from '../../ui';

/**
 * RefundDetail — read-only «سند استرداد دفعة» view with the link back to the
 * refunded payment (BDD-011 bidirectional traceability). Drafts get
 * edit/delete; posted refunds are immutable — their only exit is the reversal
 * cancellation (BDD-011 amendment): a reasoned, audited status transition
 * that freezes the content and removes the financial effect.
 */
export function RefundDetail({ refundId }: { refundId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [record, setRecord] = useState<PaymentRefund | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [suppliers, setSuppliers] = useState<readonly Supplier[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const { run: load, error } = useOperation((id: string) => getPaymentRefundService().getById(id));
  const del = useOperation((id: string) => getPaymentRefundService().deleteDraft(id));
  const cancelOp = useOperation((id: string, reason: string) =>
    getPaymentRefundService().cancel(id, reason),
  );
  const { run: loadPayment } = useOperation((id: string) => getPaymentService().getById(id));
  const { run: loadSuppliers } = useOperation(() => getSupplierService().list());

  useEffect(() => {
    void load(refundId).then((r) => {
      if (r.ok) {
        setRecord(r.value);
        void loadPayment(r.value.paymentId).then((p) => p.ok && setPayment(p.value));
      }
    });
    void loadSuppliers().then((r) => r.ok && setSuppliers(r.value));
  }, [refundId, load, loadPayment, loadSuppliers]);

  const supplierName = useMemo(() => new Map(suppliers.map((s) => [s.id, s.name])), [suppliers]);

  async function handleDelete() {
    const result = await del.run(refundId);
    setConfirmDelete(false);
    if (result.ok) {
      toast.show({ variant: 'success', message: 'تم حذف المسودة' });
      router.push('/payment-refunds');
    } else {
      toast.show({ variant: 'error', message: del.error ?? 'تعذّر حذف المسودة' });
    }
  }

  async function handleCancel() {
    const trimmed = cancelReason.trim();
    if (trimmed === '') {
      toast.show({ variant: 'error', message: 'سبب الإلغاء مطلوب' });
      return;
    }
    const result = await cancelOp.run(refundId, trimmed);
    if (result.ok) {
      setConfirmCancel(false);
      setCancelReason('');
      setRecord(result.value);
      toast.show({ variant: 'success', message: 'أُلغي السند وزال أثره من رصيد المورد' });
    } else {
      toast.show({ variant: 'error', message: cancelOp.error ?? 'تعذّر إلغاء السند' });
    }
  }

  useShortcut(
    'edit',
    () => router.push(`/payment-refunds/${refundId}/edit`),
    record?.status === PaymentRefundStatus.Draft,
  );
  useShortcut('delete', () => setConfirmDelete(true), record?.status === PaymentRefundStatus.Draft);

  if (error !== null) {
    return (
      <PageLayout>
        <ErrorState message={error} onRetry={() => void load(refundId)} />
      </PageLayout>
    );
  }

  if (record === null) {
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

  const isDraft = record.status === PaymentRefundStatus.Draft;
  const isPosted = record.status === PaymentRefundStatus.Posted;
  const isCancelled = record.status === PaymentRefundStatus.Cancelled;
  const title = isDraft ? 'مسودة سند استرداد' : `سند استرداد رقم ${record.number}`;

  return (
    <PageLayout leafLabel={title}>
      <Card
        title={
          <span className="flex items-center gap-sm">
            {title}
            <DocumentStatus state={record.status} />
          </span>
        }
        actions={
          <DocumentActionBar
            actions={[
              {
                key: 'print',
                label: 'طباعة',
                icon: <PrinterIcon />,
                variant: 'outline',
                onSelect: () => router.push(`/payment-refunds/${record.id}/print`),
              },
              ...(isDraft
                ? [
                    {
                      key: 'edit',
                      label: 'تعديل',
                      icon: <PencilIcon />,
                      variant: 'secondary' as const,
                      onSelect: () => router.push(`/payment-refunds/${record.id}/edit`),
                    },
                  ]
                : []),
              ...(isPosted
                ? [
                    {
                      key: 'cancel',
                      label: 'إلغاء…',
                      icon: <CloseIcon />,
                      variant: 'danger' as const,
                      onSelect: () => setConfirmCancel(true),
                    },
                  ]
                : []),
              {
                key: 'delete',
                label: 'حذف',
                icon: <TrashIcon />,
                variant: isDraft ? 'danger' : 'secondary',
                disabled: !isDraft,
                disabledReason: isDraft
                  ? undefined
                  : 'لا يمكن حذف مستند مرحّل — الدفتر سجلّ محاسبي غير قابل للتعديل.',
                onSelect: () => setConfirmDelete(true),
              },
            ]}
          />
        }
      >
        <dl className="grid grid-cols-1 gap-md md:grid-cols-3">
          <div className="flex flex-col gap-xs">
            <dt className="text-xs text-neutral-400">المورد</dt>
            <dd className="text-sm">{supplierName.get(record.supplierId) ?? '—'}</dd>
          </div>
          <div className="flex flex-col gap-xs">
            <dt className="text-xs text-neutral-400">التاريخ</dt>
            <dd className="text-sm">
              <bdi dir="ltr">{formatDate(record.date)}</bdi>
            </dd>
          </div>
          <div className="flex flex-col gap-xs">
            <dt className="text-xs text-neutral-400">الدفعة المستردّ منها</dt>
            <dd className="text-sm">
              <Link href={`/payments/${record.paymentId}`} className="text-primary hover:underline">
                {payment?.number != null ? `دفعة رقم ${payment.number}` : 'عرض الدفعة'}
              </Link>
            </dd>
          </div>
          <div className="flex flex-col gap-xs">
            <dt className="text-xs text-neutral-400">المبلغ المسترد نقدًا</dt>
            <dd className="text-sm">
              <MoneyDisplay value={record.amount} currencyLabel={BOOK_CURRENCY.symbol} />
            </dd>
          </div>
          {record.discountReversal > 0 ? (
            <div className="flex flex-col gap-xs">
              <dt className="text-xs text-neutral-400">إلغاء خصم التسوية</dt>
              <dd className="text-sm">
                <MoneyDisplay
                  value={record.discountReversal}
                  currencyLabel={BOOK_CURRENCY.symbol}
                />
              </dd>
            </div>
          ) : null}
          <div className="flex flex-col gap-xs">
            <dt className="text-xs text-neutral-400">إجمالي السند</dt>
            <dd className="text-sm font-semibold">
              <MoneyDisplay value={refundTotalDebit(record)} currencyLabel={BOOK_CURRENCY.symbol} />
            </dd>
          </div>
          <div className="flex flex-col gap-xs">
            <dt className="text-xs text-neutral-400">سبب الاسترداد</dt>
            <dd className="text-sm">
              {PAYMENT_REFUND_REASON_LABELS[record.reasonType]}
              {record.reasonNote !== '' ? ` — ${record.reasonNote}` : ''}
            </dd>
          </div>
          {record.method !== '' ? (
            <div className="flex flex-col gap-xs">
              <dt className="text-xs text-neutral-400">طريقة الإرجاع</dt>
              <dd className="text-sm">
                {record.method}
                {record.reference !== '' ? (
                  <>
                    {' · '}
                    <bdi dir="ltr">{record.reference}</bdi>
                  </>
                ) : null}
              </dd>
            </div>
          ) : null}
          {record.notes !== '' ? (
            <div className="flex flex-col gap-xs md:col-span-3">
              <dt className="text-xs text-neutral-400">ملاحظات</dt>
              <dd className="text-sm">{record.notes}</dd>
            </div>
          ) : null}
          {isCancelled ? (
            <div className="flex flex-col gap-xs md:col-span-3">
              <dt className="text-xs text-neutral-400">الإلغاء</dt>
              <dd className="text-sm text-neutral-500">
                {record.cancelReason}
                {record.cancelledAt !== null ? (
                  <>
                    {' — '}
                    <bdi dir="ltr">{formatDate(record.cancelledAt.slice(0, 10))}</bdi>
                  </>
                ) : null}
              </dd>
            </div>
          ) : null}
        </dl>
      </Card>

      <DocumentHistorySection
        entityType="payment-refunds"
        entityId={record.id}
        notes={record.notes}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="حذف مسودة السند"
        confirmLabel="حذف نهائيًا"
        danger
        busy={del.pending}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      >
        سيُحذف هذا المستند المسودة نهائيًا ولا يمكن التراجع. المسودّات لا تحمل رقمًا ولا أثرًا في
        الدفتر، لذا الحذف آمن محاسبيًا — وسيُسجَّل في سجل التدقيق.
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmCancel}
        title="إلغاء سند الاسترداد"
        confirmLabel="إلغاء المستند"
        danger
        busy={cancelOp.pending}
        onConfirm={() => void handleCancel()}
        onCancel={() => setConfirmCancel(false)}
      >
        <div className="flex flex-col gap-md">
          <p>
            الإلغاء نهائي ولا يمكن التراجع عنه: يبقى المستند ورقمه مجمّدَين في السجل بوسم «ملغى»،
            ويزول أثره من رصيد المورد ويعود المبلغ إلى المتاح للاسترداد، ويُسجَّل الإلغاء وسببه في
            سجل التدقيق.
          </p>
          <Field label="سبب الإلغاء" required>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={2}
              placeholder="مثال: أُدخل المستند بالخطأ أثناء التجربة"
            />
          </Field>
        </div>
      </ConfirmDialog>
    </PageLayout>
  );
}
