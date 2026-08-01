'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  getCreditNoteService,
  CreditNoteReason,
  CreditNoteStatus,
  CREDIT_NOTE_REASON_LABELS,
  type CreditNoteDraftInput,
} from '@/lib/modules/credit-notes';
import { getProductService, type Product } from '@/lib/modules/products';
import { getPurchaseService, PurchaseStatus, type Purchase } from '@/lib/modules/purchases';
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
 * CreditNoteForm — create/edit a draft «إشعار دائن للمورد» (BDD-011): one
 * posted purchase (fixed after creation), date, amount, reason type +
 * optional description, notes, and OPTIONAL line attributions that must sum
 * to the amount when used. Shows the value still creditable (the shared
 * no-negative cap basis); the service re-validates at post.
 */
export interface CreditNoteFormProps {
  noteId?: string;
  /** Pre-selected purchase when arriving from the purchase detail action. */
  initialPurchaseId?: string;
}

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
}

export function CreditNoteForm({ noteId, initialPurchaseId }: CreditNoteFormProps) {
  const router = useRouter();
  const toast = useToast();
  const editing = noteId !== undefined;

  const [purchaseId, setPurchaseId] = useState<string | null>(initialPurchaseId ?? null);
  const [purchases, setPurchases] = useState<readonly Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<readonly Supplier[]>([]);
  const [products, setProducts] = useState<readonly Product[]>([]);
  const [basisPurchase, setBasisPurchase] = useState<Purchase | null>(null);
  const [remainingValue, setRemainingValue] = useState<number | null>(null);
  const [date, setDate] = useState<string | null>(todayIso());
  const [amount, setAmount] = useState<number | null>(null);
  const [reasonType, setReasonType] = useState<CreditNoteReason>(CreditNoteReason.SupplierCredit);
  const [reasonNote, setReasonNote] = useState('');
  const [notes, setNotes] = useState('');
  const [attributing, setAttributing] = useState(false);
  const [attributions, setAttributions] = useState<Record<string, number>>({});
  const [dirty, setDirty] = useState(false);
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [confirming, setConfirming] = useState(false);
  const [draftId, setDraftId] = useState<string | undefined>(noteId);

  const { run: loadPurchases } = useOperation(() => getPurchaseService().list());
  const { run: loadSuppliers } = useOperation(() => getSupplierService().list());
  const { run: loadProducts } = useOperation(() => getProductService().list());
  const { run: loadBasis, error: basisError } = useOperation((id: string) =>
    getCreditNoteService().basisForPurchase(id),
  );
  const { run: loadExisting, error: loadError } = useOperation((id: string) =>
    getCreditNoteService().getById(id),
  );
  const save = useOperation((input: CreditNoteDraftInput, id?: string) =>
    id === undefined
      ? getCreditNoteService().createDraft(input)
      : getCreditNoteService().updateDraft(id, input),
  );
  const postOp = useOperation((id: string) => getCreditNoteService().post(id));

  useEffect(() => {
    void loadPurchases().then((r) => r.ok && setPurchases(r.value));
    void loadSuppliers().then((r) => r.ok && setSuppliers(r.value));
    void loadProducts().then((r) => r.ok && setProducts(r.value));
  }, [loadPurchases, loadSuppliers, loadProducts]);

  // Edit mode: load the draft, then its basis.
  useEffect(() => {
    if (noteId !== undefined) {
      void loadExisting(noteId).then((result) => {
        if (result.ok) {
          const record = result.value;
          if (record.status !== CreditNoteStatus.Draft) {
            router.replace(`/credit-notes/${record.id}`);
            return;
          }
          setPurchaseId(record.purchaseId);
          setDate(record.date === '' ? null : record.date);
          setAmount(record.amount);
          setReasonType(record.reasonType);
          setReasonNote(record.reasonNote);
          setNotes(record.notes);
          if (record.attributions.length > 0) {
            setAttributing(true);
            setAttributions(
              Object.fromEntries(record.attributions.map((a) => [a.purchaseLineId, a.amount])),
            );
          }
        }
      });
    }
  }, [noteId, loadExisting, router]);

  // Whenever the referenced purchase is known, load its creditable basis.
  useEffect(() => {
    if (purchaseId !== null) {
      void loadBasis(purchaseId).then((result) => {
        if (result.ok) {
          setBasisPurchase(result.value.purchase);
          setRemainingValue(result.value.remainingValue);
        }
      });
    } else {
      setBasisPurchase(null);
      setRemainingValue(null);
    }
  }, [purchaseId, loadBasis]);

  const supplierName = useMemo(() => new Map(suppliers.map((s) => [s.id, s.name])), [suppliers]);
  const productName = useMemo(() => new Map(products.map((p) => [p.id, p.name])), [products]);

  const postedPurchaseOptions = useMemo(
    () =>
      purchases
        .filter((p) => p.status === PurchaseStatus.Posted)
        .map((p) => ({
          id: p.id,
          label: `شراء رقم ${p.number} — ${supplierName.get(p.supplierId) ?? ''}`,
        })),
    [purchases, supplierName],
  );

  const attributedTotal = roundAmount(sumAmounts(Object.values(attributions).filter((v) => v > 0)));
  const attributionsMatch = !attributing || attributedTotal === roundAmount(amount ?? 0);

  function buildInput(): CreditNoteDraftInput | null {
    if (purchaseId === null) {
      setFormError('اختر فاتورة الشراء');
      return null;
    }
    if (date === null) {
      setFormError('التاريخ مطلوب');
      return null;
    }
    if (amount === null || !(amount > 0)) {
      setFormError('المبلغ مطلوب ويجب أن يكون أكبر من صفر');
      return null;
    }
    if (!attributionsMatch) {
      setFormError('مجموع التوزيع يجب أن يساوي مبلغ الإشعار');
      return null;
    }
    return {
      purchaseId,
      date,
      amount,
      reasonType,
      reasonNote,
      notes,
      attributions: attributing
        ? Object.entries(attributions)
            .filter(([, value]) => value > 0)
            .map(([purchaseLineId, value]) => ({ purchaseLineId, amount: value }))
        : [],
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
        router.replace(`/credit-notes/${id}/edit`);
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
        message: `تم ترحيل الإشعار — رقم المستند ${result.value.number}`,
      });
      router.push(`/credit-notes/${id}`);
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
            label="فاتورة الشراء"
            required
            hint={
              draftId !== undefined ? 'لا يمكن تغيير مرجع الفاتورة بعد إنشاء المسودة' : undefined
            }
          >
            <EntityPicker
              options={postedPurchaseOptions}
              value={purchaseId}
              onValueChange={(id) => {
                setPurchaseId(id);
                setAttributions({});
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
            label="المبلغ"
            required
            hint={
              remainingValue !== null
                ? `القيمة القابلة للتصحيح على هذه الفاتورة: ${remainingValue.toFixed(2)} ${BOOK_CURRENCY.symbol}`
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
          <Field label="سبب التصحيح" required>
            <Select
              value={reasonType}
              onChange={(e) => {
                setReasonType(e.target.value as CreditNoteReason);
                setDirty(true);
              }}
            >
              {Object.entries(CREDIT_NOTE_REASON_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="وصف السبب (اختياري)" className="md:col-span-2">
            <Input
              value={reasonNote}
              onChange={(e) => {
                setReasonNote(e.target.value);
                setDirty(true);
              }}
              maxLength={300}
            />
          </Field>
        </div>

        {basisPurchase !== null ? (
          <div className="flex flex-col gap-sm">
            <label className="flex items-center gap-sm text-sm font-semibold">
              <input
                type="checkbox"
                checked={attributing}
                onChange={(e) => {
                  setAttributing(e.target.checked);
                  setDirty(true);
                }}
              />
              توزيع المبلغ على أصناف الفاتورة (اختياري)
            </label>
            {attributing ? (
              <>
                {basisPurchase.lines.map((line) => (
                  <div
                    key={line.id}
                    className="grid grid-cols-2 items-end gap-sm rounded-md border border-neutral-200 p-sm md:grid-cols-[2fr_1fr_1fr]"
                  >
                    <div className="flex flex-col gap-xs text-sm">
                      <span className="text-xs text-neutral-400">الصنف</span>
                      <span>{productName.get(line.productId) ?? '—'}</span>
                    </div>
                    <div className="flex flex-col gap-xs text-sm">
                      <span className="text-xs text-neutral-400">قيمة الصنف</span>
                      <MoneyDisplay value={line.quantity * line.unitPrice} />
                    </div>
                    <Field label="حصة التصحيح">
                      <MoneyInput
                        value={attributions[line.id] ?? null}
                        onValueChange={(value) => {
                          setAttributions((current) => ({ ...current, [line.id]: value ?? 0 }));
                          setDirty(true);
                        }}
                      />
                    </Field>
                  </div>
                ))}
                <p
                  className={
                    attributionsMatch
                      ? 'text-end text-sm text-neutral-500'
                      : 'text-end text-sm font-semibold text-danger'
                  }
                >
                  مجموع التوزيع: <MoneyDisplay value={attributedTotal} /> — يجب أن يساوي مبلغ
                  الإشعار
                </p>
              </>
            ) : null}
          </div>
        ) : null}

        <Field label="ملاحظات">
          <Input
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setDirty(true);
            }}
            maxLength={500}
          />
        </Field>

        <div className="flex justify-end">
          <Button
            variant="primary"
            disabled={busy || amount === null || !(amount > 0)}
            onClick={() => setConfirming(true)}
          >
            ترحيل…
          </Button>
        </div>
      </FormPage>

      <ConfirmDialog
        open={confirming}
        title="ترحيل الإشعار الدائن"
        confirmLabel="ترحيل"
        busy={busy}
        onConfirm={() => void handlePost()}
        onCancel={() => setConfirming(false)}
      >
        <p>
          شراء رقم {basisPurchase?.number ?? '—'} · مبلغ الإشعار:{' '}
          <MoneyDisplay value={amount ?? 0} currencyLabel={BOOK_CURRENCY.symbol} />
        </p>
        <p className="mt-sm text-xs">
          بعد الترحيل يصبح الإشعار نهائيًا ويُخصم من رصيد المورد. لا يمكن تعديل مستند مرحّل —
          التصحيح يكون بمستند جديد.
        </p>
      </ConfirmDialog>
    </>
  );
}
