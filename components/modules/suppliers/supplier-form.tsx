'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSupplierService, type SupplierInput } from '@/lib/modules/suppliers';
import { FormPage, useOperation } from '../../framework';
import { ErrorState, Field, Input, Textarea, useToast } from '../../ui';

/**
 * SupplierForm — screens S-12 (create) and S-13 (edit). Fields are exactly
 * the approved S-12 set; opening balance is absent pending BDR-06.
 * Validation follows the tier rules: the form owns the required-name check
 * with the inline Arabic message (03 §8); the service re-validates and owns
 * uniqueness (conflict surfaces via the operation error banner).
 */
export interface SupplierFormProps {
  /** When set, the form edits this supplier; otherwise it creates. */
  supplierId?: string;
}

interface FormFields {
  name: string;
  phone: string;
  address: string;
  taxReference: string;
  notes: string;
}

const emptyFields: FormFields = { name: '', phone: '', address: '', taxReference: '', notes: '' };

export function SupplierForm({ supplierId }: SupplierFormProps) {
  const router = useRouter();
  const toast = useToast();
  const editing = supplierId !== undefined;

  const [fields, setFields] = useState<FormFields>(emptyFields);
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [dirty, setDirty] = useState(false);
  const [loadedName, setLoadedName] = useState<string | undefined>(undefined);

  const save = useOperation((input: SupplierInput) =>
    editing ? getSupplierService().update(supplierId, input) : getSupplierService().create(input),
  );
  const {
    run: loadExisting,
    error: loadExistingError,
    pending: loadExistingPending,
  } = useOperation((id: string) => getSupplierService().getById(id));

  useEffect(() => {
    if (supplierId !== undefined) {
      void loadExisting(supplierId).then((result) => {
        if (result.ok) {
          const { name, phone, address, taxReference, notes } = result.value;
          setFields({ name, phone, address, taxReference, notes });
          setLoadedName(name);
        }
      });
    }
  }, [supplierId, loadExisting]);

  function setField<K extends keyof FormFields>(key: K, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
    setDirty(true);
    if (key === 'name') {
      setNameError(undefined);
    }
  }

  async function handleSubmit() {
    if (fields.name.trim() === '') {
      setNameError('الاسم مطلوب');
      return;
    }
    const result = await save.run(fields);
    if (result.ok) {
      setDirty(false);
      toast.show({
        variant: 'success',
        message: editing ? 'تم حفظ التعديلات' : 'تم إنشاء المورد',
      });
      router.push(`/suppliers/${result.value.id}`);
    }
  }

  if (editing && loadExistingError !== null) {
    return <ErrorState message={loadExistingError} onRetry={() => router.refresh()} />;
  }

  return (
    <FormPage
      leafLabel={loadedName}
      submitLabel="حفظ"
      busy={save.pending || (editing && loadExistingPending)}
      dirty={dirty}
      error={save.error}
      onSubmit={() => void handleSubmit()}
    >
      <Field label="الاسم" required error={nameError}>
        <Input
          value={fields.name}
          onChange={(event) => setField('name', event.target.value)}
          maxLength={200}
        />
      </Field>
      <Field label="الهاتف">
        <Input
          value={fields.phone}
          onChange={(event) => setField('phone', event.target.value)}
          ltr
          inputMode="tel"
          maxLength={30}
        />
      </Field>
      <Field label="العنوان">
        <Input
          value={fields.address}
          onChange={(event) => setField('address', event.target.value)}
          maxLength={300}
        />
      </Field>
      <Field label="الرقم الضريبي / السجل">
        <Input
          value={fields.taxReference}
          onChange={(event) => setField('taxReference', event.target.value)}
          ltr
          maxLength={50}
        />
      </Field>
      <Field label="ملاحظات">
        <Textarea
          value={fields.notes}
          onChange={(event) => setField('notes', event.target.value)}
          maxLength={1000}
        />
      </Field>
    </FormPage>
  );
}
