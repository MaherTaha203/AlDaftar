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
import { getProductService, type Product } from '@/lib/modules/products';
import { getPurchaseService, type Purchase } from '@/lib/modules/purchases';
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
 * CreditNoteDetail — read-only «إشعار دائن للمورد» view with the link back to
 * the corrected purchase (BDD-011 bidirectional traceability). Drafts get
 * edit/delete; posted notes are immutable — their only exit is the reversal
 * cancellation (BDD-011 amendment): a reasoned, audited status transition
 * that freezes the content and removes the financial effect.
 */
export function CreditNoteDetail({ noteId }: { noteId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [record, setRecord] = useState<CreditNote | null>(null);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [suppliers, setSuppliers] = useState<readonly Supplier[]>([]);
  const [products, setProducts] = useState<readonly Product[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const { run: load, error } = useOperation((id: string) => getCreditNoteService().getById(id));
  const del = useOperation((id: string) => getCreditNoteService().deleteDraft(id));
  const cancelOp = useOperation((id: string, reason: string) =>
    getCreditNoteService().cancel(id, reason),
  );
  const { run: loadPurchase } = useOperation((id: string) => getPurchaseService().getById(id));
  const { run: loadSuppliers } = useOperation(() => getSupplierService().list());
  const { run: loadProducts } = useOperation(() => getProductService().list());

  useEffect(() => {
    void load(noteId).then((r) => {
      if (r.ok) {
        setRecord(r.value);
        void loadPurchase(r.value.purchaseId).then((p) => p.ok && setPurchase(p.value));
      }
    });
    void loadSuppliers().then((r) => r.ok && setSuppliers(r.value));
    void loadProducts().then((r) => r.ok && setProducts(r.value));
  }, [noteId, load, loadPurchase, loadSuppliers, loadProducts]);

  const supplierName = useMemo(() => new Map(suppliers.map((s) => [s.id, s.name])), [suppliers]);
  const productName = useMemo(() => new Map(products.map((p) => [p.id, p.name])), [products]);
  const purchaseLineProduct = useMemo(
    () => new Map((purchase?.lines ?? []).map((l) => [l.id, l.productId])),
    [purchase],
  );

  async function handleDelete() {
    const result = await del.run(noteId);
    setConfirmDelete(false);
    if (result.ok) {
      toast.show({ variant: 'success', message: 'تم حذف المسودة' });
      router.push('/credit-notes');
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
    const result = await cancelOp.run(noteId, trimmed);
    if (result.ok) {
      setConfirmCancel(false);
      setCancelReason('');
      setRecord(result.value);
      toast.show({ variant: 'success', message: 'أُلغي الإشعار وزال أثره من رصيد المورد' });
    } else {
      toast.show({ variant: 'error', message: cancelOp.error ?? 'تعذّر إلغاء الإشعار' });
    }
  }

  useShortcut(
    'edit',
    () => router.push(`/credit-notes/${noteId}/edit`),
    record?.status === CreditNoteStatus.Draft,
  );
  useShortcut('delete', () => setConfirmDelete(true), record?.status === CreditNoteStatus.Draft);

  if (error !== null) {
    return (
      <PageLayout>
        <ErrorState message={error} onRetry={() => void load(noteId)} />
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

  const isDraft = record.status === CreditNoteStatus.Draft;
  const isPosted = record.status === CreditNoteStatus.Posted;
  const isCancelled = record.status === CreditNoteStatus.Cancelled;
  const title = isDraft ? 'مسودة إشعار دائن' : `إشعار دائن رقم ${record.number}`;

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
                onSelect: () => router.push(`/credit-notes/${record.id}/print`),
              },
              ...(isDraft
                ? [
                    {
                      key: 'edit',
                      label: 'تعديل',
                      icon: <PencilIcon />,
                      variant: 'secondary' as const,
                      onSelect: () => router.push(`/credit-notes/${record.id}/edit`),
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
            <dt className="text-xs text-neutral-400">فاتورة الشراء المصحَّحة</dt>
            <dd className="text-sm">
              <Link
                href={`/purchases/${record.purchaseId}`}
                className="text-primary hover:underline"
              >
                {purchase?.number != null ? `شراء رقم ${purchase.number}` : 'عرض الفاتورة'}
              </Link>
            </dd>
          </div>
          <div className="flex flex-col gap-xs">
            <dt className="text-xs text-neutral-400">المبلغ</dt>
            <dd className="text-sm font-semibold">
              <MoneyDisplay value={record.amount} currencyLabel={BOOK_CURRENCY.symbol} />
            </dd>
          </div>
          <div className="flex flex-col gap-xs">
            <dt className="text-xs text-neutral-400">سبب التصحيح</dt>
            <dd className="text-sm">
              {CREDIT_NOTE_REASON_LABELS[record.reasonType]}
              {record.reasonNote !== '' ? ` — ${record.reasonNote}` : ''}
            </dd>
          </div>
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

      {record.attributions.length > 0 ? (
        <Card title="توزيع المبلغ على الأصناف">
          <ul className="flex flex-col gap-xs text-sm">
            {record.attributions.map((attribution) => (
              <li
                key={attribution.id}
                className="flex items-center justify-between rounded-md border border-neutral-200 px-sm py-xs"
              >
                <span>
                  {productName.get(purchaseLineProduct.get(attribution.purchaseLineId) ?? '') ??
                    '—'}
                  {attribution.note !== '' ? (
                    <span className="text-neutral-400"> — {attribution.note}</span>
                  ) : null}
                </span>
                <MoneyDisplay value={attribution.amount} />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <DocumentHistorySection entityType="credit-notes" entityId={record.id} notes={record.notes} />

      <ConfirmDialog
        open={confirmDelete}
        title="حذف مسودة الإشعار"
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
        title="إلغاء الإشعار الدائن"
        confirmLabel="إلغاء المستند"
        danger
        busy={cancelOp.pending}
        onConfirm={() => void handleCancel()}
        onCancel={() => setConfirmCancel(false)}
      >
        <div className="flex flex-col gap-md">
          <p>
            الإلغاء نهائي ولا يمكن التراجع عنه: يبقى المستند ورقمه مجمّدَين في السجل بوسم «ملغى»،
            ويزول أثره من رصيد المورد ومن سقف التصحيح، ويُسجَّل الإلغاء وسببه في سجل التدقيق.
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
