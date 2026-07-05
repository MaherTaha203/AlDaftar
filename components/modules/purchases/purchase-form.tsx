'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getProductService, type Product } from '@/lib/modules/products';
import {
  getPurchaseService,
  PurchaseStatus,
  type PurchaseDraftInput,
  type PurchaseLineInput,
} from '@/lib/modules/purchases';
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
  MoneyInput,
  PlusIcon,
  QuantityInput,
  TrashIcon,
  useToast,
} from '../../ui';

/**
 * PurchaseForm — screens S-22 (create) and S-23 (edit draft), per the frozen
 * architecture: header (supplier*, date*, supplier-invoice ref XOR the
 * «بدون فاتورة مورد» flag, notes — no currency field, BDR-02) and the lines
 * editor (product picker → unit derived from the product, quantity, unit
 * price, calculated line total). Save keeps the draft; Post confirms (D-01)
 * then runs the frozen posting rules; the toast shows the issued number.
 */
export interface PurchaseFormProps {
  purchaseId?: string;
}

interface LineRow {
  key: string;
  productId: string | null;
  quantity: number | null;
  unitPrice: number | null;
  notes: string;
}

function newLineRow(): LineRow {
  return { key: crypto.randomUUID(), productId: null, quantity: null, unitPrice: null, notes: '' };
}

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
}

export function PurchaseForm({ purchaseId }: PurchaseFormProps) {
  const router = useRouter();
  const toast = useToast();
  const editing = purchaseId !== undefined;

  const [suppliers, setSuppliers] = useState<readonly Supplier[]>([]);
  const [products, setProducts] = useState<readonly Product[]>([]);
  const [units, setUnits] = useState<readonly Unit[]>([]);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(todayIso());
  const [invoiceRef, setInvoiceRef] = useState('');
  const [withoutInvoice, setWithoutInvoice] = useState(false);
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<readonly LineRow[]>([newLineRow()]);
  const [dirty, setDirty] = useState(false);
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [confirmingPost, setConfirmingPost] = useState(false);
  // The persisted draft's id. Once the first save creates the draft, every
  // later save/post targets it — a failed post can never fork a duplicate.
  const [draftId, setDraftId] = useState<string | undefined>(purchaseId);

  const { run: loadSuppliers } = useOperation(() => getSupplierService().list());
  const { run: loadProducts } = useOperation(() => getProductService().list());
  const { run: loadUnits } = useOperation(() => getUnitService().list());
  const {
    run: loadExisting,
    error: loadError,
    pending: loadPending,
  } = useOperation((id: string) => getPurchaseService().getById(id));
  const save = useOperation((input: PurchaseDraftInput, id?: string) =>
    id === undefined
      ? getPurchaseService().createDraft(input)
      : getPurchaseService().updateDraft(id, input),
  );
  const postOp = useOperation((id: string) => getPurchaseService().post(id));

  useEffect(() => {
    void loadSuppliers().then((r) => r.ok && setSuppliers(r.value));
    void loadProducts().then((r) => r.ok && setProducts(r.value));
    void loadUnits().then((r) => r.ok && setUnits(r.value));
  }, [loadSuppliers, loadProducts, loadUnits]);

  useEffect(() => {
    if (purchaseId !== undefined) {
      void loadExisting(purchaseId).then((result) => {
        if (result.ok) {
          const p = result.value;
          if (p.status !== PurchaseStatus.Draft) {
            router.replace(`/purchases/${p.id}`);
            return;
          }
          setSupplierId(p.supplierId === '' ? null : p.supplierId);
          setDate(p.date === '' ? null : p.date);
          setInvoiceRef(p.supplierInvoiceRef);
          setWithoutInvoice(p.withoutSupplierInvoice);
          setNotes(p.notes);
          setRows(
            p.lines.length === 0
              ? [newLineRow()]
              : p.lines.map((line) => ({
                  key: line.id,
                  productId: line.productId,
                  quantity: line.quantity,
                  unitPrice: line.unitPrice,
                  notes: line.notes,
                })),
          );
        }
      });
    }
  }, [purchaseId, loadExisting, router]);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const unitName = useMemo(() => new Map(units.map((u) => [u.id, u.name])), [units]);
  const supplierName = useMemo(() => new Map(suppliers.map((s) => [s.id, s.name])), [suppliers]);

  const completeRows = rows.filter((row) => row.productId !== null);
  const total = sumAmounts(
    completeRows.map((row) => computeLineTotal(row.quantity ?? 0, row.unitPrice ?? 0)),
  );

  function markDirty() {
    setDirty(true);
    setFormError(undefined);
  }

  function updateRow(key: string, changes: Partial<LineRow>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...changes } : row)));
    markDirty();
  }

  function buildInput(): PurchaseDraftInput | null {
    if (supplierId === null) {
      setFormError('المورد مطلوب');
      return null;
    }
    if (date === null) {
      setFormError('التاريخ مطلوب');
      return null;
    }
    const lines: PurchaseLineInput[] = completeRows.map((row) => {
      const product = productById.get(row.productId as string);
      return {
        productId: row.productId as string,
        unitId: product?.unitId ?? '',
        quantity: row.quantity ?? 0,
        unitPrice: row.unitPrice ?? 0,
        notes: row.notes,
      };
    });
    return {
      supplierId,
      date,
      supplierInvoiceRef: invoiceRef,
      withoutSupplierInvoice: withoutInvoice,
      notes,
      lines,
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
        router.replace(`/purchases/${id}/edit`);
      }
    }
  }

  async function handlePost() {
    setConfirmingPost(false);
    const id = await saveDraft();
    if (id === null) {
      return;
    }
    const result = await postOp.run(id);
    if (result.ok) {
      toast.show({
        variant: 'success',
        message: `تم الترحيل — رقم المستند ${result.value.number}`,
      });
      router.push(`/purchases/${id}`);
    }
  }

  if (editing && loadError !== null) {
    return <ErrorState message={loadError} onRetry={() => router.refresh()} />;
  }

  const busy = save.pending || postOp.pending || (editing && loadPending);

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
          <Field label="مرجع فاتورة المورد" hint="رقم الفاتورة الورقية إن وُجدت">
            <Input
              value={invoiceRef}
              onChange={(e) => {
                setInvoiceRef(e.target.value);
                if (e.target.value !== '') {
                  setWithoutInvoice(false);
                }
                markDirty();
              }}
              ltr
              disabled={withoutInvoice}
              maxLength={50}
            />
          </Field>
          <div className="flex items-end pb-sm">
            <label className="flex cursor-pointer items-center gap-sm text-sm text-neutral-500">
              <input
                type="checkbox"
                checked={withoutInvoice}
                onChange={(e) => {
                  setWithoutInvoice(e.target.checked);
                  if (e.target.checked) {
                    setInvoiceRef('');
                  }
                  markDirty();
                }}
                className="size-4 accent-primary"
              />
              بدون فاتورة مورد
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-sm">
          <h2 className="text-sm font-semibold">الأصناف</h2>
          {rows.map((row) => {
            const product = row.productId === null ? undefined : productById.get(row.productId);
            const lineUnit = product === undefined ? '—' : (unitName.get(product.unitId) ?? '—');
            return (
              <div
                key={row.key}
                className="grid grid-cols-1 items-end gap-sm rounded-md border border-neutral-200 p-sm md:grid-cols-[2fr_auto_1fr_1fr_auto_auto]"
              >
                <Field label="المنتج">
                  <EntityPicker
                    options={products
                      .filter((p) => p.status === 'active')
                      .map((p) => ({ id: p.id, label: p.name }))}
                    value={row.productId}
                    onValueChange={(id) => updateRow(row.key, { productId: id })}
                  />
                </Field>
                <div className="flex flex-col gap-xs pb-xs text-sm">
                  <span className="text-xs text-neutral-400">الوحدة</span>
                  <span>{lineUnit}</span>
                </div>
                <Field label="الكمية">
                  <QuantityInput
                    value={row.quantity}
                    onValueChange={(value) => updateRow(row.key, { quantity: value })}
                  />
                </Field>
                <Field label="سعر الوحدة">
                  <MoneyInput
                    value={row.unitPrice}
                    onValueChange={(value) => updateRow(row.key, { unitPrice: value })}
                    currencyLabel={BOOK_CURRENCY.symbol}
                  />
                </Field>
                <div className="flex flex-col gap-xs pb-xs text-sm">
                  <span className="text-xs text-neutral-400">الإجمالي</span>
                  <MoneyDisplay value={computeLineTotal(row.quantity ?? 0, row.unitPrice ?? 0)} />
                </div>
                <button
                  type="button"
                  aria-label="حذف السطر"
                  onClick={() => {
                    setRows((current) =>
                      current.length === 1
                        ? [newLineRow()]
                        : current.filter((r) => r.key !== row.key),
                    );
                    markDirty();
                  }}
                  className="mb-sm rounded-sm p-xs text-neutral-400 hover:text-danger focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <TrashIcon />
                </button>
              </div>
            );
          })}
          <div className="flex items-center justify-between">
            <Button
              variant="secondary"
              size="sm"
              icon={<PlusIcon />}
              onClick={() => {
                setRows((current) => [...current, newLineRow()]);
                markDirty();
              }}
            >
              إضافة سطر
            </Button>
            <p className="text-sm font-semibold">
              الإجمالي: <MoneyDisplay value={total} currencyLabel={BOOK_CURRENCY.symbol} />
            </p>
          </div>
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

        <div className="flex justify-end">
          <Button variant="primary" disabled={busy} onClick={() => setConfirmingPost(true)}>
            ترحيل…
          </Button>
        </div>
      </FormPage>

      <ConfirmDialog
        open={confirmingPost}
        title="ترحيل المستند"
        confirmLabel="ترحيل"
        busy={save.pending || postOp.pending}
        onConfirm={() => void handlePost()}
        onCancel={() => setConfirmingPost(false)}
      >
        <p>
          المورد: {supplierId === null ? '—' : (supplierName.get(supplierId) ?? '—')} · عدد الأسطر:{' '}
          {completeRows.length} · الإجمالي:{' '}
          <MoneyDisplay value={total} currencyLabel={BOOK_CURRENCY.symbol} />
        </p>
        <p className="mt-sm text-xs">
          بعد الترحيل يصبح المستند نهائيًا ولا يمكن تعديله؛ التصحيح يتم بمرتجع شراء.
        </p>
      </ConfirmDialog>
    </>
  );
}
