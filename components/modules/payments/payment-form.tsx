'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getPaymentService, PaymentStatus, type PaymentDraftInput } from '@/lib/modules/payments';
import { BOOK_CURRENCY, sumAmounts } from '@/lib/modules/shared/money';
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
  useToast,
} from '../../ui';

/**
 * PaymentForm — screens S-42 (create) / S-43 (edit draft), per the frozen
 * Payments Architecture: supplier*, date*, amount* (ILS), separate discount,
 * free-text method* (BDR-05), reference, notes. No currency field (single
 * ILS). No allocation (running-balance, BDR-04). Post confirms then applies
 * the frozen posting rules; the toast shows the issued number.
 */
export interface PaymentFormProps {
  paymentId?: string;
  /** Pre-selected supplier when arriving from the supplier detail «دفع». */
  initialSupplierId?: string;
}

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
}

export function PaymentForm({ paymentId, initialSupplierId }: PaymentFormProps) {
  const router = useRouter();
  const toast = useToast();
  const editing = paymentId !== undefined;

  const [suppliers, setSuppliers] = useState<readonly Supplier[]>([]);
  const [supplierId, setSupplierId] = useState<string | null>(initialSupplierId ?? null);
  const [date, setDate] = useState<string | null>(todayIso());
  const [amount, setAmount] = useState<number | null>(null);
  const [discount, setDiscount] = useState<number | null>(null);
  const [method, setMethod] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [dirty, setDirty] = useState(false);
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [confirming, setConfirming] = useState(false);
  const [draftId, setDraftId] = useState<string | undefined>(paymentId);

  const { run: loadSuppliers } = useOperation(() => getSupplierService().list());
  const {
    run: loadExisting,
    error: loadError,
    pending: loadPending,
  } = useOperation((id: string) => getPaymentService().getById(id));
  const save = useOperation((input: PaymentDraftInput, id?: string) =>
    id === undefined
      ? getPaymentService().createDraft(input)
      : getPaymentService().updateDraft(id, input),
  );
  const postOp = useOperation((id: string) => getPaymentService().post(id));

  useEffect(() => {
    void loadSuppliers().then((r) => r.ok && setSuppliers(r.value));
  }, [loadSuppliers]);

  useEffect(() => {
    if (paymentId !== undefined) {
      void loadExisting(paymentId).then((result) => {
        if (result.ok) {
          const p = result.value;
          if (p.status !== PaymentStatus.Draft) {
            router.replace(`/payments/${p.id}`);
            return;
          }
          setSupplierId(p.supplierId);
          setDate(p.date === '' ? null : p.date);
          setAmount(p.amount === 0 ? null : p.amount);
          setDiscount(p.discount === 0 ? null : p.discount);
          setMethod(p.method);
          setReference(p.reference);
          setNotes(p.notes);
        }
      });
    }
  }, [paymentId, loadExisting, router]);

  const supplierName = useMemo(() => new Map(suppliers.map((s) => [s.id, s.name])), [suppliers]);
  const totalCredit = sumAmounts([amount ?? 0, discount ?? 0]);

  function markDirty() {
    setDirty(true);
    setFormError(undefined);
  }

  function buildInput(): PaymentDraftInput | null {
    if (supplierId === null) {
      setFormError('المورد مطلوب');
      return null;
    }
    if (date === null) {
      setFormError('التاريخ مطلوب');
      return null;
    }
    if (method.trim() === '') {
      setFormError('طريقة الدفع مطلوبة');
      return null;
    }
    return { supplierId, date, amount, discount, method, reference, notes };
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
        router.replace(`/payments/${id}/edit`);
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
        message: `تم ترحيل الدفعة — رقم المستند ${result.value.number}`,
      });
      router.push(`/payments/${id}`);
    }
  }

  if (editing && loadError !== null) {
    return <ErrorState message={loadError} onRetry={() => router.refresh()} />;
  }

  const busy = save.pending || postOp.pending || (editing && loadPending);
  const canPost = supplierId !== null && date !== null && method.trim() !== '' && (amount ?? 0) > 0;

  return (
    <>
      <FormPage
        submitLabel="حفظ المسودة"
        busy={busy}
        dirty={dirty}
        error={formError ?? save.error ?? postOp.error}
        onSubmit={() => void handleSave()}
      >
        <div className="grid grid-cols-1 gap-md md:grid-cols-2">
          <Field label="المورد" required>
            <EntityPicker
              options={suppliers
                .filter((s) => s.status === 'active')
                .map((s) => ({ id: s.id, label: s.name }))}
              value={supplierId}
              onValueChange={(id) => {
                setSupplierId(id);
                markDirty();
              }}
            />
          </Field>
          <Field label="التاريخ" required>
            <DatePicker
              value={date}
              onValueChange={(value) => {
                setDate(value);
                markDirty();
              }}
            />
          </Field>
          <Field label="المبلغ المدفوع" required>
            <MoneyInput
              value={amount}
              onValueChange={(value) => {
                setAmount(value);
                markDirty();
              }}
              currencyLabel={BOOK_CURRENCY.symbol}
            />
          </Field>
          <Field label="خصم عند الدفع" hint="اختياري — يُسجَّل منفصلًا عن المبلغ">
            <MoneyInput
              value={discount}
              onValueChange={(value) => {
                setDiscount(value);
                markDirty();
              }}
              currencyLabel={BOOK_CURRENCY.symbol}
            />
          </Field>
          <Field label="طريقة الدفع" required>
            <Input
              value={method}
              onChange={(e) => {
                setMethod(e.target.value);
                markDirty();
              }}
              maxLength={50}
              placeholder="نقدًا / تحويل بنكي / شيك…"
            />
          </Field>
          <Field label="المرجع" hint="رقم التحويل أو الشيك">
            <Input
              value={reference}
              onChange={(e) => {
                setReference(e.target.value);
                markDirty();
              }}
              ltr
              maxLength={50}
            />
          </Field>
        </div>

        <Field label="ملاحظات">
          <Input
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              markDirty();
            }}
            maxLength={500}
          />
        </Field>

        <div className="flex items-center justify-between border-t border-neutral-200 pt-md">
          <p className="text-sm font-semibold">
            إجمالي الائتمان للمورد:{' '}
            <MoneyDisplay value={totalCredit} currencyLabel={BOOK_CURRENCY.symbol} />
          </p>
          <Button variant="primary" disabled={busy || !canPost} onClick={() => setConfirming(true)}>
            ترحيل…
          </Button>
        </div>
      </FormPage>

      <ConfirmDialog
        open={confirming}
        title="ترحيل الدفعة"
        confirmLabel="ترحيل"
        busy={save.pending || postOp.pending}
        onConfirm={() => void handlePost()}
        onCancel={() => setConfirming(false)}
      >
        <p>
          المورد: {supplierId === null ? '—' : (supplierName.get(supplierId) ?? '—')} · المبلغ:{' '}
          <MoneyDisplay value={amount} currencyLabel={BOOK_CURRENCY.symbol} />
          {(discount ?? 0) > 0 ? (
            <>
              {' '}
              · خصم: <MoneyDisplay value={discount} currencyLabel={BOOK_CURRENCY.symbol} />
            </>
          ) : null}
        </p>
        <p className="mt-sm text-xs">
          بعد الترحيل يصبح المستند نهائيًا ولا يمكن تعديله؛ ويُخصم من رصيد المورد.
        </p>
      </ConfirmDialog>
    </>
  );
}
