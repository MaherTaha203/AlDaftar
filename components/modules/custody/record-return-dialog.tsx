'use client';

import { useMemo, useState } from 'react';
import { getCustodyService, type CustodyLineBalance } from '@/lib/modules/custody';
import { useOperation } from '../../framework';
import { Button, DatePicker, Dialog, Field, Input, QuantityInput, useToast } from '../../ui';

/**
 * RecordReturnDialog — records an immutable return event against an issued
 * voucher. It shows ONLY lines that still have an outstanding balance, with the
 * quantity input clamped to each line's remaining. Saving appends the event
 * (history is never overwritten) and calls back so the detail can refresh.
 */
export interface RecordReturnDialogProps {
  open: boolean;
  custodyId: string;
  balances: readonly CustodyLineBalance[];
  onClose: () => void;
  onRecorded: () => void;
}

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
}

export function RecordReturnDialog({
  open,
  custodyId,
  balances,
  onClose,
  onRecorded,
}: RecordReturnDialogProps) {
  const toast = useToast();
  const [date, setDate] = useState<string | null>(todayIso());
  const [notes, setNotes] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [formError, setFormError] = useState<string | undefined>(undefined);

  const record = useOperation(
    (input: Parameters<ReturnType<typeof getCustodyService>['recordReturn']>[0]) =>
      getCustodyService().recordReturn(input),
  );

  const outstanding = useMemo(() => balances.filter((b) => b.remaining > 0), [balances]);
  const anyQuantity = Object.values(quantities).some((q) => q > 0);

  function reset() {
    setDate(todayIso());
    setNotes('');
    setQuantities({});
    setFormError(undefined);
  }

  function close() {
    reset();
    onClose();
  }

  async function handleSave() {
    if (date === null) {
      setFormError('التاريخ مطلوب');
      return;
    }
    if (!anyQuantity) {
      setFormError('أدخل كمية مُرجَعة واحدة على الأقل');
      return;
    }
    const result = await record.run({ custodyId, date, notes, quantities });
    if (result.ok) {
      toast.show({ variant: 'success', message: 'تم تسجيل الإرجاع' });
      reset();
      onRecorded();
      onClose();
    }
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title="تسجيل إرجاع"
      size="md"
      dismissable={!record.pending}
      footer={
        <div className="flex justify-end gap-sm">
          <Button variant="secondary" onClick={close} disabled={record.pending}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            onClick={() => void handleSave()}
            loading={record.pending}
            disabled={outstanding.length === 0 || !anyQuantity}
          >
            حفظ الإرجاع
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-md">
        <div className="grid grid-cols-1 gap-md md:grid-cols-2">
          <Field label="تاريخ الإرجاع" required>
            <DatePicker value={date} onValueChange={setDate} />
          </Field>
          <Field label="ملاحظات">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={200} />
          </Field>
        </div>

        {outstanding.length === 0 ? (
          <p className="rounded-md bg-neutral-50 p-md text-sm text-neutral-500">
            لا توجد كميات متبقّية — أُرجعت كل الأصناف.
          </p>
        ) : (
          <div className="flex flex-col gap-sm">
            <h3 className="text-sm font-semibold">الكميات المتبقّية</h3>
            {outstanding.map((b) => {
              const quantity = quantities[b.line.id] ?? 0;
              return (
                <div
                  key={b.line.id}
                  className="grid grid-cols-2 items-end gap-sm rounded-md border border-neutral-200 p-sm md:grid-cols-[2fr_1fr_1fr_1fr_1.5fr]"
                >
                  <div className="flex flex-col gap-xs text-sm">
                    <span className="text-xs text-neutral-400">الصنف</span>
                    <span>{b.line.item || '—'}</span>
                  </div>
                  <div className="flex flex-col gap-xs text-sm">
                    <span className="text-xs text-neutral-400">المُسلَّمة</span>
                    <bdi dir="ltr">{b.delivered}</bdi>
                  </div>
                  <div className="flex flex-col gap-xs text-sm">
                    <span className="text-xs text-neutral-400">أُرجع سابقًا</span>
                    <bdi dir="ltr">{b.returned}</bdi>
                  </div>
                  <div className="flex flex-col gap-xs text-sm">
                    <span className="text-xs text-neutral-400">المتبقّية</span>
                    <bdi dir="ltr">{b.remaining}</bdi>
                  </div>
                  <Field label="إرجاع الآن">
                    <QuantityInput
                      value={quantity === 0 ? null : quantity}
                      max={b.remaining}
                      onValueChange={(value) => {
                        setQuantities((current) => ({ ...current, [b.line.id]: value ?? 0 }));
                        setFormError(undefined);
                      }}
                    />
                  </Field>
                </div>
              );
            })}
          </div>
        )}

        {(formError ?? record.error) !== undefined ? (
          <p role="alert" className="text-sm text-danger">
            {formError ?? record.error}
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}
