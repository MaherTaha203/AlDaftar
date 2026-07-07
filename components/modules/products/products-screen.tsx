'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCategoryService, type Category } from '@/lib/modules/categories';
import {
  getProductService,
  ProductStatus,
  type Product,
  type ProductInput,
} from '@/lib/modules/products';
import { getUnitService, type Unit } from '@/lib/modules/units';
import { recentRow } from '../../app';
import { EntityPicker, ListPage, useOperation } from '../../framework';
import {
  Button,
  ConfirmDialog,
  EntryDialog,
  Field,
  InboxIcon,
  Input,
  PencilIcon,
  PlusIcon,
  RotateIcon,
  RowActions,
  StatusBadge,
  Textarea,
  useToast,
  type DataTableColumn,
} from '../../ui';

/**
 * ProductsScreen — screen S-50. Module-specific screen (needs category/unit
 * pickers in its dialog, which the Reference Framework's declarative fields
 * do not cover — governance Rule 2 keeps it here). The calculated stock
 * column arrives with the inventory read model (documents are its source).
 */
interface DialogState {
  mode: 'create' | 'edit';
  record?: Product;
}

const PAGE_SIZE = 25;

export function ProductsScreen() {
  const toast = useToast();
  const [products, setProducts] = useState<readonly Product[]>([]);
  const [categories, setCategories] = useState<readonly Category[]>([]);
  const [units, setUnits] = useState<readonly Unit[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [fields, setFields] = useState({ name: '', code: '', notes: '' });
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ name?: string; unit?: string }>({});
  const [confirmTarget, setConfirmTarget] = useState<Product | null>(null);

  const { run: loadAll, pending, error } = useOperation(() => getProductService().list());
  const save = useOperation((input: ProductInput, id?: string) =>
    id === undefined ? getProductService().create(input) : getProductService().update(id, input),
  );
  const toggle = useOperation((id: string, archive: boolean) =>
    archive ? getProductService().archive(id) : getProductService().reactivate(id),
  );
  const { run: loadCategories } = useOperation(() => getCategoryService().list());
  const { run: loadUnits } = useOperation(() => getUnitService().list());

  const reload = useCallback(async () => {
    const result = await loadAll();
    if (result.ok) {
      setProducts(result.value);
    }
  }, [loadAll]);

  useEffect(() => {
    void reload();
    void loadCategories().then((r) => r.ok && setCategories(r.value));
    void loadUnits().then((r) => r.ok && setUnits(r.value));
  }, [reload, loadCategories, loadUnits]);

  const categoryName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const unitName = useMemo(() => new Map(units.map((u) => [u.id, u.name])), [units]);

  const columns = useMemo<readonly DataTableColumn<Product>[]>(
    () => [
      { key: 'name', header: 'الاسم', render: (row) => row.name },
      {
        key: 'code',
        header: 'الكود',
        priority: 2,
        render: (row) => (row.code === '' ? '—' : <bdi dir="ltr">{row.code}</bdi>),
      },
      {
        key: 'category',
        header: 'التصنيف',
        priority: 2,
        render: (row) => categoryName.get(row.categoryId) ?? '—',
      },
      { key: 'unit', header: 'الوحدة', render: (row) => unitName.get(row.unitId) ?? '—' },
      {
        key: 'status',
        header: 'الحالة',
        render: (row) => (
          <StatusBadge tone={row.status === ProductStatus.Active ? 'success' : 'neutral'}>
            {row.status === ProductStatus.Active ? 'نشط' : 'مؤرشف'}
          </StatusBadge>
        ),
      },
    ],
    [categoryName, unitName],
  );

  const filtered = useMemo(() => {
    const text = query.trim();
    return text === ''
      ? products
      : products.filter((p) => p.name.includes(text) || p.code.includes(text));
  }, [products, query]);

  function openDialog(record?: Product) {
    setFields({ name: record?.name ?? '', code: record?.code ?? '', notes: record?.notes ?? '' });
    setCategoryId(record?.categoryId === '' || record === undefined ? null : record.categoryId);
    setUnitId(record === undefined ? null : record.unitId);
    setFieldError({});
    save.clearError();
    setDialog({ mode: record === undefined ? 'create' : 'edit', record });
  }

  async function handleSubmit() {
    const errors: { name?: string; unit?: string } = {};
    if (fields.name.trim() === '') {
      errors.name = 'الاسم مطلوب';
    }
    if (unitId === null) {
      errors.unit = 'الوحدة مطلوبة';
    }
    if (errors.name !== undefined || errors.unit !== undefined) {
      setFieldError(errors);
      return;
    }
    const input: ProductInput = {
      name: fields.name,
      code: fields.code,
      notes: fields.notes,
      categoryId: categoryId ?? '',
      unitId: unitId as string,
    };
    const result = await save.run(input, dialog?.record?.id);
    if (result.ok) {
      setDialog(null);
      toast.show({
        variant: 'success',
        message: dialog?.mode === 'edit' ? 'تم حفظ التعديلات' : 'تمت إضافة المنتج',
      });
      await reload();
      recentRow.mark(result.value.id);
    }
  }

  async function handleToggle() {
    if (confirmTarget === null) {
      return;
    }
    const archiving = confirmTarget.status === ProductStatus.Active;
    const toggledId = confirmTarget.id;
    const result = await toggle.run(confirmTarget.id, archiving);
    setConfirmTarget(null);
    if (result.ok) {
      toast.show({ variant: 'success', message: archiving ? 'تمت الأرشفة' : 'تمت إعادة التنشيط' });
      await reload();
      recentRow.mark(toggledId);
    }
  }

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <ListPage
        primaryAction={
          <Button icon={<PlusIcon />} onClick={() => openDialog()}>
            منتج جديد
          </Button>
        }
        search={{
          placeholder: 'بحث بالاسم أو الكود…',
          onQueryChange: (value) => {
            setQuery(value);
            setPage(1);
          },
        }}
        columns={columns}
        rows={pageRows}
        rowKey={(row) => row.id}
        onRowClick={(row) => openDialog(row)}
        rowActions={(row) => {
          const active = row.status === ProductStatus.Active;
          return (
            <RowActions
              actions={[
                {
                  key: 'edit',
                  label: 'تعديل',
                  icon: <PencilIcon />,
                  onSelect: () => openDialog(row),
                },
                {
                  key: 'toggle',
                  label: active ? 'أرشفة' : 'إعادة تنشيط',
                  icon: active ? <InboxIcon /> : <RotateIcon />,
                  onSelect: () => setConfirmTarget(row),
                  danger: active,
                },
              ]}
            />
          );
        }}
        loading={pending && products.length === 0}
        error={error}
        onRetry={() => void reload()}
        emptyMessage={query.trim() === '' ? 'لا توجد منتجات بعد' : 'لا توجد نتائج مطابقة'}
        emptyAction={
          query.trim() === '' ? (
            <Button variant="secondary" onClick={() => openDialog()}>
              منتج جديد
            </Button>
          ) : undefined
        }
        pagination={{ page, pageSize: PAGE_SIZE, total: filtered.length, onPageChange: setPage }}
      />

      <EntryDialog
        open={dialog !== null}
        title={dialog?.mode === 'edit' ? 'تعديل المنتج' : 'منتج جديد'}
        submitLabel="حفظ"
        busy={save.pending}
        onSubmit={() => void handleSubmit()}
        onClose={() => setDialog(null)}
      >
        {save.error !== null ? (
          <p role="alert" className="text-sm text-danger">
            {save.error}
          </p>
        ) : null}
        <Field label="الاسم" required error={fieldError.name}>
          <Input
            value={fields.name}
            onChange={(e) => {
              setFields((f) => ({ ...f, name: e.target.value }));
              setFieldError((er) => ({ ...er, name: undefined }));
            }}
            maxLength={200}
          />
        </Field>
        <Field label="الوحدة" required error={fieldError.unit}>
          <EntityPicker
            options={units.map((u) => ({ id: u.id, label: u.name }))}
            value={unitId}
            onValueChange={(id) => {
              setUnitId(id);
              setFieldError((er) => ({ ...er, unit: undefined }));
            }}
          />
        </Field>
        <Field label="التصنيف">
          <EntityPicker
            options={categories.map((c) => ({ id: c.id, label: c.name }))}
            value={categoryId}
            onValueChange={setCategoryId}
          />
        </Field>
        <Field label="الكود">
          <Input
            value={fields.code}
            onChange={(e) => setFields((f) => ({ ...f, code: e.target.value }))}
            ltr
            maxLength={50}
          />
        </Field>
        <Field label="ملاحظات">
          <Textarea
            value={fields.notes}
            onChange={(e) => setFields((f) => ({ ...f, notes: e.target.value }))}
            maxLength={1000}
          />
        </Field>
      </EntryDialog>

      <ConfirmDialog
        open={confirmTarget !== null}
        title={
          confirmTarget?.status === ProductStatus.Active ? 'أرشفة المنتج' : 'إعادة تنشيط المنتج'
        }
        confirmLabel={confirmTarget?.status === ProductStatus.Active ? 'أرشفة' : 'إعادة تنشيط'}
        danger={confirmTarget?.status === ProductStatus.Active}
        busy={toggle.pending}
        onConfirm={() => void handleToggle()}
        onCancel={() => setConfirmTarget(null)}
      >
        {confirmTarget?.status === ProductStatus.Active
          ? `سيُخفى «${confirmTarget.name}» من قوائم الاختيار ولن يُحذف أي سجل.`
          : `سيعود «${confirmTarget?.name ?? ''}» للظهور في قوائم الاختيار.`}
      </ConfirmDialog>
    </>
  );
}
