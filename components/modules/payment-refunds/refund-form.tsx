'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  getPaymentRefundService,
  PaymentRefundReason,
  PaymentRefundStatus,
  PAYMENT_REFUND_REASON_LABELS,
  type PaymentRefundDraftInput,
} from '@/lib/modules/payment-refunds';
import { getPaymentService, PaymentStatus, type Payment } from '@/lib/modules/payments';
import { BOOK_CURRENCY, roundAmount, sumAmounts } from '@/lib/modules/shared/money';
import { getSupplierService, type Supplier } from '@/lib/modules/suppliers';
import { EntityPicker, FormPage, useOperation } from '../../framework';
import {
  Button,
  ConfirmDialog,
  DatePicker,
  ErrorState,
  Field,
  Input,
  MoneyDisplay,
  MoneyInput,
  Select,
  useToast,
} from '../../ui';

/**
 * RefundForm — create/edit a draft «سند استرداد دفعة» (BDD-011): one posted
 * payment (fixed after creation), date, the two refund components — cash
 * `amount` and `discountReversal` (shown only when the payment carries a
 * discount) — reason type + optional description, method/reference/notes.
 * Shows the per-component refundable remainders; the service re-validates
 * the caps at post.
 */
export interface RefundFormProps {
  refundId?: string;
  /** Pre-selected payment when arriving from the payment detail action. */
  initialPaymentId?: string;
}

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
}

export function RefundForm({ refundId, initialPaymentId }: RefundFormProps) {
  const router = useRouter();
  const toast = useToast();
  const editing = refundId !== undefined;

  const [paymentId, setPaymentId] = useState<string | null>(initialPaymentId ?? null);
  const [payments, setPayments] = useState<readonly Payment[]>([]);
  const [suppliers, setSuppliers] = useState<readonly Supplier[]>([]);
  const [basisPayment, setBasisPayment] = useState<Payment | null>(null);
  const [remainingCash, setRemainingCash] = useState<number | null>(null);
  const [remainingDiscount, setRemainingDiscount] = useState<number | null>(null);
  const [date, setDate] = useState<string | null>(todayIso());
  const [amount, setAmount] = useState<number | null>(null);
  const [discountReversal, setDiscountReversal] = useState<number | null>(null);
  const [reasonType, setReasonType] = useState<PaymentRefundReason>(
    PaymentRefundReason.MoneyReturned,
  );
  const [reasonNote, setReasonNote] = useState('');
  const [method, setMethod] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [dirty, setDirty] = useState(false);
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [confirming, setConfirming] = useState(false);
  const [draftId, setDraftId] = useState<string | undefined>(refundId);

  const { run: loadPayments } = useOperation(() => getPaymentService().list());
  const { run: loadSuppliers } = useOperation(() => getSupplierService().list());
  const { run: loadBasis, error: basisError } = useOperation((id: string) =>
    getPaymentRefundService().basisForPayment(id),
  );
  const { run: loadExisting, error: loadError } = useOperation((id: string) =>
    getPaymentRefundService().getById(id),
  );
  const save = useOperation((input: PaymentRefundDraftInput, id?: string) =>
    id === undefined
      ? getPaymentRefundService().createDraft(input)
      : getPaymentRefundService().updateDraft(id, input),
  );
  const postOp = useOperation((id: string) => getPaymentRefundService().post(id));

  useEffect(() => {
    void loadPayments().then((r) => r.ok && setPayments(r.value));
    void loadSuppliers().then((r) => r.ok && setSuppliers(r.value));
  }, [loadPayments, loadSuppliers]);

  // Edit mode: load the draft, then its basis.
  useEffect(() => {
    if (refundId !== undefined) {
      void loadExisting(refundId).then((result) => {
        if (result.ok) {
          const record = result.value;
          if (record.status !== PaymentRefundStatus.Draft) {
            router.replace(`/payment-refunds/${record.id}`);
            return;
          }
          setPaymentId(record.paymentId);
          setDate(record.date === '' ? null : record.date);
          setAmount(record.amount === 0 ? null : record.amount);
          setDiscountReversal(record.discountReversal === 0 ? null : record.discountReversal);
          setReasonType(record.reasonType);
          setReasonNote(record.reasonNote);
          setMethod(record.method);
          setReference(record.reference);
          setNotes(record.notes);
        }
      });
    }
  }, [refundId, loadExisting, router]);

  // Whenever the referenced payment is known, load its refundable basis.
  useEffect(() => {
    if (paymentId !== null) {
      void loadBasis(paymentId).then((result) => {
        if (result.ok) {
          setBasisPayment(result.value.payment);
          setRemainingCash(result.value.remainingCash);
          setRemainingDiscount(result.value.remainingDiscount);
        }
      });
    } else {
      setBasisPayment(null);
      setRemainingCash(null);
      setRemainingDiscount(null);
    }
  }, [paymentId, loadBasis]);

  const supplierName = useMemo(() => new Map(suppliers.map((s) => [s.id, s.name])), [suppliers]);

  const postedPaymentOptions = useMemo(
    () =>
      payments
        .filter((p) => p.status === PaymentStatus.Posted)
        .map((p) => ({
          id: p.id,
          label: `دفعة رقم ${p.number} — ${supplierName.get(p.supplierId) ?? ''}`,
        })),
    [payments, supplierName],
  );

  const totalDebit = roundAmount(sumAmounts([amount ?? 0, discountReversal ?? 0]));
  const hasComponent = (amount ?? 0) > 0 || (discountReversal ?? 0) > 0;
  const showDiscountReversal = (basisPayment?.discount ?? 0) > 0;

  function buildInput(): PaymentRefundDraftInput | null {
    if (paymentId === null) {
      setFormError('اختر الدفعة');
      return null;
    }
    if (date === null) {
      setFormError('التاريخ مطلوب');
      return null;
    }
    if (!hasComponent) {
      setFormError('أدخل مبلغًا مستردًا أو إلغاء خصم');
      return null;
    }
    return {
      paymentId,
      date,
      amount: amount ?? 0,
      discountReversal: discountReversal ?? 0,
      reasonType,
      reasonNote,
      method,
      reference,
      notes,
    };
  }

  async function saveDraft(): Promise<string | null> {
    const input = buildInput();
    if (input === null) {
      return null;
    }
    const result = await save.run(input, draftId);
    if (!result.ok) {
      return null;
    }
    setDraftId(result.value.id);
    setDirty(false);
    return result.value.id;
  }

  async function handleSave() {
    const id = await saveDraft();
    if (id !== null) {
      toast.show({ variant: 'success', message: 'تم حفظ المسودة' });
      if (!editing) {
        router.replace(`/payment-refunds/${id}/edit`);
      }
    }
  }

  async function handlePost() {
    setConfirming(false);
    const id = await saveDraft();
    if (id === null) {
      return;
    }
    const result = await postOp.run(id);
    if (result.ok) {
      toast.show({
        variant: 'success',
        message: `تم ترحيل السند — رقم المستند ${result.value.number}`,
      });
      router.push(`/payment-refunds/${id}`);
    }
  }

  if (editing && loadError !== null) {
    return <ErrorState message={loadError} onRetry={() => router.refresh()} />;
  }

  const busy = save.pending || postOp.pending;

  return (
    <>
      <FormPage
        submitLabel="حفظ المسودة"
        busy={busy}
        dirty={dirty}
        error={formError ?? basisError ?? save.error ?? postOp.error}
        onSubmit={() => void handleSave()}
      >
        <div className="grid grid-cols-1 gap-md md:grid-cols-2">
          <Field
            label="الدفعة"
            required
            hint={draftId !== undefined ? 'لا يمكن تغيير مرجع الدفعة بعد إنشاء المسودة' : undefined}
          >
            <EntityPicker
              options={postedPaymentOptions}
              value={paymentId}
              onValueChange={(id) => {
                setPaymentId(id);
                setDirty(true);
                setFormError(undefined);
              }}
              disabled={draftId !== undefined}
            />
          </Field>
          <Field label="التاريخ" required>
            <DatePicker
              value={date}
              onValueChange={(value) => {
                setDate(value);
                setDirty(true);
              }}
            />
          </Field>
          <Field
            label="المبلغ المسترد نقدًا"
            hint={
              remainingCash !== null
                ? `المتبقي القابل للاسترداد: ${remainingCash.toFixed(2)} ${BOOK_CURRENCY.symbol}`
                : undefined
            }
          >
            <MoneyInput
              value={amount}
              onValueChange={(value) => {
                setAmount(value);
                setDirty(true);
                setFormError(undefined);
              }}
            />
          </Field>
          {showDiscountReversal ? (
            <Field
              label="إلغاء خصم التسوية"
              hint={
                remainingDiscount !== null
                  ? `الخصم القابل للإلغاء: ${remainingDiscount.toFixed(2)} ${BOOK_CURRENCY.symbol}`
                  : undefined
              }
            >
              <MoneyInput
                value={discountReversal}
                onValueChange={(value) => {
                  setDiscountReversal(value);
                  setDirty(true);
                  setFormError(undefined);
                }}
              />
            </Field>
          ) : null}
          <Field label="سبب الاسترداد" required>
            <Select
              value={reasonType}
              onChange={(e) => {
                setReasonType(e.target.value as PaymentRefundReason);
                setDirty(true);
              }}
            >
              {Object.entries(PAYMENT_REFUND_REASON_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="وصف السبب (اختياري)">
            <Input
              value={reasonNote}
              onChange={(e) => {
                setReasonNote(e.target.value);
                setDirty(true);
              }}
              maxLength={300}
            />
          </Field>
          <Field label="طريقة الإرجاع">
            <Input
              value={method}
              onChange={(e) => {
                setMethod(e.target.value);
                setDirty(true);
              }}
              maxLength={120}
              placeholder="نقدًا، تحويل بنكي…"
            />
          </Field>
          <Field label="مرجع العملية">
            <Input
              value={reference}
              onChange={(e) => {
                setReference(e.target.value);
                setDirty(true);
              }}
              maxLength={120}
            />
          </Field>
          <Field label="ملاحظات" className="md:col-span-2">
            <Input
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setDirty(true);
              }}
              maxLength={500}
            />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-md">
          <span className="text-sm font-semibold">
            إجمالي السند: <MoneyDisplay value={totalDebit} currencyLabel={BOOK_CURRENCY.symbol} />
          </span>
          <Button
            variant="primary"
            disabled={busy || !hasComponent}
            onClick={() => setConfirming(true)}
          >
            ترحيل…
          </Button>
        </div>
      </FormPage>

      <ConfirmDialog
        open={confirming}
        title="ترحيل سند الاسترداد"
        confirmLabel="ترحيل"
        busy={busy}
        onConfirm={() => void handlePost()}
        onCancel={() => setConfirming(false)}
      >
        <p>
          دفعة رقم {basisPayment?.number ?? '—'} · إجمالي السند:{' '}
          <MoneyDisplay value={totalDebit} currencyLabel={BOOK_CURRENCY.symbol} />
        </p>
        <p className="mt-sm text-xs">
          بعد الترحيل يصبح السند نهائيًا ويُضاف إلى رصيد المورد. الدفعة الأصلية تبقى كما هي —
          التاريخ لا يُعدَّل.
        </p>
      </ConfirmDialog>
    </>
  );
}
