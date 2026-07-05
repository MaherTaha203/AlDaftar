'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getProductService, type Product } from '@/lib/modules/products';
import {
  getPurchaseReturnService,
  ReturnStatus,
  type ReturnDraftInput,
} from '@/lib/modules/purchase-returns';
import { getPurchaseService, PurchaseStatus, type Purchase } from '@/lib/modules/purchases';
import { BOOK_CURRENCY, computeLineTotal, sumAmounts } from '@/lib/modules/shared/money';
import { getSupplierService, type Supplier } from '@/lib/modules/suppliers';
import { getUnitService, type Unit } from '@/lib/modules/units';
import { EntityPicker, FormPage, useOperation } from '../../framework';
import {
  Button,
  ConfirmDialog,
  DatePicker,
  ErrorState,
  Field,
  Input,
  MoneyDisplay,
  QuantityInput,
  useToast,
} from '../../ui';

/**
 * ReturnForm — screens S-32 (create) / S-33 (edit draft), per frozen doc 06:
 * the return references one posted purchase (picked at creation, fixed
 * afterwards); lines are the purchase's lines with the returnable remainder
 * shown (purchased − already returned by posted returns) and the input
 * clamped to it (BDR-16 conservative interim — service re-validates at
 * post). Prices come from the purchase lines; totals are calculated ILS.
 */
export interface ReturnFormProps {
  returnId?: string;
  /** Pre-selected purchase when arriving from S-21 «إنشاء مرتجع». */
  initialPurchaseId?: string;
}

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
}

export function ReturnForm({ returnId, initialPurchaseId }: ReturnFormProps) {
  const router = useRouter();
  const toast = useToast();
  const editing = returnId !== undefined;

  const [purchaseId, setPurchaseId] = useState<string | null>(initialPurchaseId ?? null);
  const [purchases, setPurchases] = useState<readonly Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<readonly Supplier[]>([]);
  const [products, setProducts] = useState<readonly Product[]>([]);
  const [units, setUnits] = useState<readonly Unit[]>([]);
  const [basisPurchase, setBasisPurchase] = useState<Purchase | null>(null);
  const [returnedByLine, setReturnedByLine] = useState<Readonly<Record<string, number>>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [date, setDate] = useState<string | null>(todayIso());
  const [notes, setNotes] = useState('');
  const [dirty, setDirty] = useState(false);
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [confirming, setConfirming] = useState(false);
  const [draftId, setDraftId] = useState<string | undefined>(returnId);

  const { run: loadPurchases } = useOperation(() => getPurchaseService().list());
  const { run: loadSuppliers } = useOperation(() => getSupplierService().list());
  const { run: loadProducts } = useOperation(() => getProductService().list());
  const { run: loadUnits } = useOperation(() => getUnitService().list());
  const { run: loadBasis, error: basisError } = useOperation((id: string) =>
    getPurchaseReturnService().basisForPurchase(id),
  );
  const { run: loadExisting, error: loadError } = useOperation((id: string) =>
    getPurchaseReturnService().getById(id),
  );
  const save = useOperation((input: ReturnDraftInput, id?: string) =>
    id === undefined
      ? getPurchaseReturnService().createDraft(input)
      : getPurchaseReturnService().updateDraft(id, input),
  );
  const postOp = useOperation((id: string) => getPurchaseReturnService().post(id));

  useEffect(() => {
    void loadPurchases().then((r) => r.ok && setPurchases(r.value));
    void loadSuppliers().then((r) => r.ok && setSuppliers(r.value));
    void loadProducts().then((r) => r.ok && setProducts(r.value));
    void loadUnits().then((r) => r.ok && setUnits(r.value));
  }, [loadPurchases, loadSuppliers, loadProducts, loadUnits]);

  // Edit mode: load the draft, then its basis.
  useEffect(() => {
    if (returnId !== undefined) {
      void loadExisting(returnId).then((result) => {
        if (result.ok) {
          const record = result.value;
          if (record.status !== ReturnStatus.Draft) {
            router.replace(`/purchase-returns/${record.id}`);
            return;
          }
          setPurchaseId(record.purchaseId);
          setDate(record.date === '' ? null : record.date);
          setNotes(record.notes);
          setQuantities(
            Object.fromEntries(record.lines.map((line) => [line.purchaseLineId, line.quantity])),
          );
        }
      });
    }
  }, [returnId, loadExisting, router]);

  // Whenever the referenced purchase is known, load its returnable basis.
  useEffect(() => {
    if (purchaseId !== null) {
      void loadBasis(purchaseId).then((result) => {
        if (result.ok) {
          setBasisPurchase(result.value.purchase);
          setReturnedByLine(result.value.returnedByLine);
        }
      });
    } else {
      setBasisPurchase(null);
    }
  }, [purchaseId, loadBasis]);

  const supplierName = useMemo(() => new Map(suppliers.map((s) => [s.id, s.name])), [suppliers]);
  const productName = useMemo(() => new Map(products.map((p) => [p.id, p.name])), [products]);
  const unitName = useMemo(() => new Map(units.map((u) => [u.id, u.name])), [units]);

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

  const total = sumAmounts(
    (basisPurchase?.lines ?? []).map((line) =>
      computeLineTotal(quantities[line.id] ?? 0, line.unitPrice),
    ),
  );
  const anyQuantity = Object.values(quantities).some((q) => q > 0);

  function buildInput(): ReturnDraftInput | null {
    if (purchaseId === null) {
      setFormError('اختر مستند الشراء');
      return null;
    }
    if (date === null) {
      setFormError('التاريخ مطلوب');
      return null;
    }
    return { purchaseId, date, notes, quantities };
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
        router.replace(`/purchase-returns/${id}/edit`);
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
        message: `تم ترحيل المرتجع — رقم المستند ${result.value.number}`,
      });
      router.push(`/purchase-returns/${id}`);
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
            label="مستند الشراء"
            required
            hint={draftId !== undefined ? 'لا يمكن تغيير مرجع الشراء بعد إنشاء المسودة' : undefined}
          >
            <EntityPicker
              options={postedPurchaseOptions}
              value={purchaseId}
              onValueChange={(id) => {
                setPurchaseId(id);
                setQuantities({});
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
        </div>

        {basisPurchase !== null ? (
          <div className="flex flex-col gap-sm">
            <h2 className="text-sm font-semibold">الكميات المرتجعة</h2>
            {basisPurchase.lines.map((line) => {
              const returned = returnedByLine[line.id] ?? 0;
              const returnable = line.quantity - returned;
              const quantity = quantities[line.id] ?? 0;
              return (
                <div
                  key={line.id}
                  className="grid grid-cols-2 items-end gap-sm rounded-md border border-neutral-200 p-sm md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr]"
                >
                  <div className="flex flex-col gap-xs text-sm">
                    <span className="text-xs text-neutral-400">المنتج</span>
                    <span>{productName.get(line.productId) ?? '—'}</span>
                    <span className="text-xs text-neutral-400">
                      {unitName.get(line.unitId) ?? ''} · سعر الوحدة{' '}
                      <MoneyDisplay value={line.unitPrice} />
                    </span>
                  </div>
                  <div className="flex flex-col gap-xs text-sm">
                    <span className="text-xs text-neutral-400">المشتراة</span>
                    <bdi dir="ltr">{line.quantity}</bdi>
                  </div>
                  <div className="flex flex-col gap-xs text-sm">
                    <span className="text-xs text-neutral-400">أُرجع سابقًا</span>
                    <bdi dir="ltr">{returned}</bdi>
                  </div>
                  <div className="flex flex-col gap-xs text-sm">
                    <span className="text-xs text-neutral-400">القابل للإرجاع</span>
                    <bdi dir="ltr">{returnable}</bdi>
                  </div>
                  <Field label="الكمية المرتجعة">
                    <QuantityInput
                      value={quantity === 0 ? null : quantity}
                      max={returnable}
                      disabled={returnable <= 0}
                      onValueChange={(value) => {
                        setQuantities((current) => ({ ...current, [line.id]: value ?? 0 }));
                        setDirty(true);
                      }}
                    />
                  </Field>
                  <div className="flex flex-col gap-xs text-sm">
                    <span className="text-xs text-neutral-400">قيمة الإرجاع</span>
                    <MoneyDisplay value={computeLineTotal(quantity, line.unitPrice)} />
                  </div>
                </div>
              );
            })}
            <p className="text-end text-sm font-semibold">
              إجمالي المرتجع: <MoneyDisplay value={total} currencyLabel={BOOK_CURRENCY.symbol} />
            </p>
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
            disabled={busy || !anyQuantity}
            onClick={() => setConfirming(true)}
          >
            ترحيل…
          </Button>
        </div>
      </FormPage>

      <ConfirmDialog
        open={confirming}
        title="ترحيل المرتجع"
        confirmLabel="ترحيل"
        busy={busy}
        onConfirm={() => void handlePost()}
        onCancel={() => setConfirming(false)}
      >
        <p>
          شراء رقم {basisPurchase?.number ?? '—'} · إجمالي المرتجع:{' '}
          <MoneyDisplay value={total} currencyLabel={BOOK_CURRENCY.symbol} />
        </p>
        <p className="mt-sm text-xs">
          بعد الترحيل يصبح المرتجع نهائيًا ويُخصم من رصيد المورد ومن المخزون.
        </p>
      </ConfirmDialog>
    </>
  );
}
