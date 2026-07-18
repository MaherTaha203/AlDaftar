'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  CustodyStatus,
  getCustodyService,
  type CustodyDraftInput,
  type CustodyLineInput,
} from '@/lib/modules/custody';
import { FormPage, useOperation } from '../../framework';
import {
  Button,
  ConfirmDialog,
  DatePicker,
  ErrorState,
  Field,
  Input,
  PlusIcon,
  QuantityInput,
  TrashIcon,
  useToast,
} from '../../ui';

/**
 * CustodyForm — create / edit a DRAFT custody voucher. Header: recipient*,
 * phone, issue date*, optional expected return date, notes. Lines editor: item*,
 * description, quantity, remarks (delivered quantities only — no price, no
 * total). Save keeps the draft; Issue confirms then assigns the number and
 * freezes the voucher.
 */
export interface CustodyFormProps {
  custodyId?: string;
}

interface LineRow {
  key: string;
  item: string;
  description: string;
  quantity: number | null;
  remarks: string;
}

function newLineRow(): LineRow {
  return { key: crypto.randomUUID(), item: '', description: '', quantity: null, remarks: '' };
}

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
}

export function CustodyForm({ custodyId }: CustodyFormProps) {
  const router = useRouter();
  const toast = useToast();
  const editing = custodyId !== undefined;

  const [recipient, setRecipient] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState<string | null>(todayIso());
  const [expectedReturnDate, setExpectedReturnDate] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<readonly LineRow[]>([newLineRow()]);
  const [dirty, setDirty] = useState(false);
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [confirmingIssue, setConfirmingIssue] = useState(false);
  const [draftId, setDraftId] = useState<string | undefined>(custodyId);

  const {
    run: loadExisting,
    error: loadError,
    pending: loadPending,
  } = useOperation((id: string) => getCustodyService().getById(id));
  const save = useOperation((input: CustodyDraftInput, id?: string) =>
    id === undefined
      ? getCustodyService().createDraft(input)
      : getCustodyService().updateDraft(id, input),
  );
  const issueOp = useOperation((id: string) => getCustodyService().issue(id));

  useEffect(() => {
    if (custodyId !== undefined) {
      void loadExisting(custodyId).then((result) => {
        if (result.ok) {
          const record = result.value;
          if (record.status !== CustodyStatus.Draft) {
            router.replace(`/custody/${record.id}`);
            return;
          }
          setRecipient(record.recipient);
          setPhone(record.phone);
          setDate(record.date === '' ? null : record.date);
          setExpectedReturnDate(record.expectedReturnDate);
          setNotes(record.notes);
          setRows(
            record.lines.length === 0
              ? [newLineRow()]
              : record.lines.map((line) => ({
                  key: line.id,
                  item: line.item,
                  description: line.description,
                  quantity: line.quantity,
                  remarks: line.remarks,
                })),
          );
        }
      });
    }
  }, [custodyId, loadExisting, router]);

  function markDirty() {
    setDirty(true);
    setFormError(undefined);
  }

  function updateRow(key: string, changes: Partial<LineRow>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...changes } : row)));
    markDirty();
  }

  const completeRows = rows.filter((row) => row.item.trim() !== '');

  function buildInput(): CustodyDraftInput | null {
    if (recipient.trim() === '') {
      setFormError('اسم المُستلِم مطلوب');
      return null;
    }
    if (date === null) {
      setFormError('تاريخ الإصدار مطلوب');
      return null;
    }
    const lines: CustodyLineInput[] = completeRows.map((row) => ({
      item: row.item,
      description: row.description,
      quantity: row.quantity ?? 0,
      remarks: row.remarks,
    }));
    return { recipient, phone, date, expectedReturnDate, notes, lines };
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
        router.replace(`/custody/${id}/edit`);
      }
    }
  }

  async function handleIssue() {
    setConfirmingIssue(false);
    const id = await saveDraft();
    if (id === null) {
      return;
    }
    const result = await issueOp.run(id);
    if (result.ok) {
      toast.show({ variant: 'success', message: `تم إصدار السند — رقم ${result.value.number}` });
      router.push(`/custody/${id}`);
    }
  }

  if (editing && loadError !== null) {
    return <ErrorState message={loadError} onRetry={() => router.refresh()} />;
  }

  const busy = save.pending || issueOp.pending || (editing && loadPending);
  const canIssue = recipient.trim() !== '' && date !== null && completeRows.length > 0;

  return (
    <>
      <FormPage
        submitLabel="حفظ المسودة"
        busy={busy}
        dirty={dirty}
        error={formError ?? save.error ?? issueOp.error}
        onSubmit={() => void handleSave()}
      >
        <div className="grid grid-cols-1 gap-md md:grid-cols-2">
          <Field label="المُستلِم" required>
            <Input
              value={recipient}
              onChange={(e) => {
                setRecipient(e.target.value);
                markDirty();
              }}
              maxLength={120}
            />
          </Field>
          <Field label="الهاتف">
            <Input
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                markDirty();
              }}
              ltr
              maxLength={30}
            />
          </Field>
          <Field label="تاريخ الإصدار" required>
            <DatePicker
              value={date}
              onValueChange={(value) => {
                setDate(value);
                markDirty();
              }}
            />
          </Field>
          <Field label="تاريخ الإرجاع المتوقع" hint="اختياري">
            <DatePicker
              value={expectedReturnDate}
              onValueChange={(value) => {
                setExpectedReturnDate(value);
                markDirty();
              }}
            />
          </Field>
        </div>

        <div className="flex flex-col gap-sm">
          <h2 className="text-sm font-semibold">الأصناف المُسلَّمة</h2>
          {rows.map((row) => (
            <div
              key={row.key}
              className="grid grid-cols-1 items-end gap-sm rounded-md border border-neutral-200 p-sm md:grid-cols-[2fr_2fr_1fr_2fr_auto]"
            >
              <Field label="الصنف">
                <Input
                  value={row.item}
                  onChange={(e) => updateRow(row.key, { item: e.target.value })}
                  maxLength={120}
                />
              </Field>
              <Field label="الوصف">
                <Input
                  value={row.description}
                  onChange={(e) => updateRow(row.key, { description: e.target.value })}
                  maxLength={200}
                />
              </Field>
              <Field label="الكمية">
                <QuantityInput
                  value={row.quantity}
                  onValueChange={(value) => updateRow(row.key, { quantity: value })}
                />
              </Field>
              <Field label="ملاحظات">
                <Input
                  value={row.remarks}
                  onChange={(e) => updateRow(row.key, { remarks: e.target.value })}
                  maxLength={200}
                />
              </Field>
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
          ))}
          <div>
            <Button
              variant="secondary"
              size="sm"
              icon={<PlusIcon />}
              onClick={() => {
                setRows((current) => [...current, newLineRow()]);
                markDirty();
              }}
            >
              إضافة صنف
            </Button>
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
          <Button
            variant="primary"
            disabled={busy || !canIssue}
            onClick={() => setConfirmingIssue(true)}
          >
            إصدار…
          </Button>
        </div>
      </FormPage>

      <ConfirmDialog
        open={confirmingIssue}
        title="إصدار سند الاستلام"
        confirmLabel="إصدار"
        busy={busy}
        onConfirm={() => void handleIssue()}
        onCancel={() => setConfirmingIssue(false)}
      >
        <p>
          المُستلِم: {recipient || '—'} · عدد الأصناف: {completeRows.length}
        </p>
        <p className="mt-sm text-xs">
          بعد الإصدار يأخذ السند رقمًا رسميًا وتُثبَّت الكميات المُسلَّمة؛ تُسجَّل الإرجاعات لاحقًا
          كحركات على السند نفسه.
        </p>
      </ConfirmDialog>
    </>
  );
}
