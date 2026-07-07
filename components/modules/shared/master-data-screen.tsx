'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  MasterStatus,
  type MasterDataService,
  type MasterInput,
  type MasterRecord,
} from '@/lib/modules/shared/master-data';
import { recentRow } from '../../app';
import { ListPage, useOperation } from '../../framework';
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
 * REFERENCE FRAMEWORK — screen (execution-contract Phase 8).
 *
 * The shared managed-list screen for reference modules kept in dialogs
 * (design D-09: Categories S-60, Units S-61, Currencies S-62). Provides in
 * one business-independent implementation: Reference List Page, Form/Dialog,
 * Search, Toolbar, Table, Status handling, Archive handling with the
 * Confirmation flow, Messages (overridable Arabic texts), and Empty / Error
 * / Loading states — all composed from the frozen ui/framework layers.
 * Modules instantiate it with their entity, labels, declarative extra
 * fields, and columns; per the contract's objective they contain almost no
 * infrastructure code. Future-ready seams (print/import/export, permissions)
 * enter through new optional props without breaking instantiations.
 */
export interface MasterExtraField {
  /** Key into the dialog's extras state and the module's toInput mapper. */
  key: string;
  label: string;
  multiline?: boolean;
  /** LTR entry (codes, symbols) per 03 §6.5. */
  ltr?: boolean;
  maxLength?: number;
}

export interface MasterScreenTexts {
  createLabel: string;
  createTitle: string;
  editTitle: string;
  emptyMessage: string;
  searchPlaceholder: string;
  nameLabel: string;
  /** e.g. «سيُخفى العنصر من قوائم الاختيار ولن يُحذف أي سجل.» */
  archiveBody: string;
}

export interface MasterDataScreenProps<T extends MasterRecord, TInput extends MasterInput> {
  service: MasterDataService<T, TInput>;
  texts: MasterScreenTexts;
  /** Columns rendered between the name and status columns. */
  extraColumns?: readonly DataTableColumn<T>[];
  /** Declarative dialog fields beyond the name. */
  extraFields?: readonly MasterExtraField[];
  /** Builds the module input from the dialog state. */
  toInput: (name: string, extras: Readonly<Record<string, string>>) => TInput;
  /** Seeds the dialog extras when editing an existing record. */
  fromRecord: (record: T) => Readonly<Record<string, string>>;
}

const PAGE_SIZE = 25;

type DialogState<T> = { mode: 'create' } | { mode: 'edit'; record: T } | null;

export function MasterDataScreen<T extends MasterRecord, TInput extends MasterInput>({
  service,
  texts,
  extraColumns = [],
  extraFields = [],
  toInput,
  fromRecord,
}: MasterDataScreenProps<T, TInput>) {
  const toast = useToast();
  const [records, setRecords] = useState<readonly T[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<DialogState<T>>(null);
  const [name, setName] = useState('');
  const [extras, setExtras] = useState<Record<string, string>>({});
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [confirmTarget, setConfirmTarget] = useState<T | null>(null);

  const { run: load, pending: loading, error: loadError } = useOperation(() => service.list());
  const save = useOperation((input: TInput, id?: string) =>
    id === undefined ? service.create(input) : service.update(id, input),
  );
  const toggle = useOperation((id: string, archive: boolean) =>
    archive ? service.archive(id) : service.reactivate(id),
  );

  useEffect(() => {
    void load().then((result) => {
      if (result.ok) {
        setRecords(result.value);
      }
    });
  }, [load]);

  async function reload() {
    const result = await load();
    if (result.ok) {
      setRecords(result.value);
    }
  }

  function openCreate() {
    setName('');
    setExtras({});
    setNameError(undefined);
    save.clearError();
    setDialog({ mode: 'create' });
  }

  function openEdit(record: T) {
    setName(record.name);
    setExtras({ ...fromRecord(record) });
    setNameError(undefined);
    save.clearError();
    setDialog({ mode: 'edit', record });
  }

  async function handleSubmit() {
    if (name.trim() === '') {
      setNameError('الاسم مطلوب');
      return;
    }
    const input = toInput(name, extras);
    const id = dialog?.mode === 'edit' ? dialog.record.id : undefined;
    const result = await save.run(input, id);
    if (result.ok) {
      setDialog(null);
      toast.show({
        variant: 'success',
        message: dialog?.mode === 'edit' ? 'تم حفظ التعديلات' : 'تمت الإضافة',
      });
      await reload();
      recentRow.mark(result.value.id);
    }
  }

  async function handleToggle() {
    if (confirmTarget === null) {
      return;
    }
    const archiving = confirmTarget.status === MasterStatus.Active;
    const toggledId = confirmTarget.id;
    const result = await toggle.run(confirmTarget.id, archiving);
    setConfirmTarget(null);
    if (result.ok) {
      toast.show({
        variant: 'success',
        message: archiving ? 'تمت الأرشفة' : 'تمت إعادة التنشيط',
      });
      await reload();
      recentRow.mark(toggledId);
    } else {
      toast.show({ variant: 'error', message: toggle.error ?? 'تعذر تنفيذ العملية' });
    }
  }

  const columns = useMemo<readonly DataTableColumn<T>[]>(
    () => [
      { key: 'name', header: texts.nameLabel, render: (row) => row.name },
      ...extraColumns,
      {
        key: 'status',
        header: 'الحالة',
        render: (row) => (
          <StatusBadge tone={row.status === MasterStatus.Active ? 'success' : 'neutral'}>
            {row.status === MasterStatus.Active ? 'نشط' : 'مؤرشف'}
          </StatusBadge>
        ),
      },
    ],
    [texts.nameLabel, extraColumns],
  );

  const filtered = useMemo(() => {
    const text = query.trim();
    return text === '' ? records : records.filter((record) => record.name.includes(text));
  }, [records, query]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <ListPage
        onNew={openCreate}
        primaryAction={
          <Button icon={<PlusIcon />} onClick={openCreate}>
            {texts.createLabel}
          </Button>
        }
        search={{
          placeholder: texts.searchPlaceholder,
          onQueryChange: (value) => {
            setQuery(value);
            setPage(1);
          },
        }}
        columns={columns}
        rows={pageRows}
        rowKey={(row) => row.id}
        onRowClick={openEdit}
        rowActions={(row) => {
          const active = row.status === MasterStatus.Active;
          return (
            <RowActions
              actions={[
                {
                  key: 'edit',
                  label: 'تعديل',
                  icon: <PencilIcon />,
                  onSelect: () => openEdit(row),
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
        loading={loading && records.length === 0}
        error={loadError}
        onRetry={() => void reload()}
        emptyMessage={query.trim() === '' ? texts.emptyMessage : 'لا توجد نتائج مطابقة'}
        emptyAction={
          query.trim() === '' ? (
            <Button variant="secondary" onClick={openCreate}>
              {texts.createLabel}
            </Button>
          ) : undefined
        }
        pagination={{ page, pageSize: PAGE_SIZE, total: filtered.length, onPageChange: setPage }}
      />

      <EntryDialog
        open={dialog !== null}
        title={dialog?.mode === 'edit' ? texts.editTitle : texts.createTitle}
        submitLabel="حفظ"
        size="sm"
        busy={save.pending}
        onSubmit={() => void handleSubmit()}
        onClose={() => setDialog(null)}
      >
        {save.error !== null ? (
          <p role="alert" className="text-sm text-danger">
            {save.error}
          </p>
        ) : null}
        <Field label={texts.nameLabel} required error={nameError}>
          <Input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setNameError(undefined);
            }}
            maxLength={200}
          />
        </Field>
        {extraFields.map((field) => (
          <Field key={field.key} label={field.label}>
            {field.multiline === true ? (
              <Textarea
                value={extras[field.key] ?? ''}
                onChange={(event) =>
                  setExtras((current) => ({ ...current, [field.key]: event.target.value }))
                }
                maxLength={field.maxLength ?? 1000}
              />
            ) : (
              <Input
                value={extras[field.key] ?? ''}
                onChange={(event) =>
                  setExtras((current) => ({ ...current, [field.key]: event.target.value }))
                }
                ltr={field.ltr === true}
                maxLength={field.maxLength ?? 100}
              />
            )}
          </Field>
        ))}
      </EntryDialog>

      <ConfirmDialog
        open={confirmTarget !== null}
        title={confirmTarget?.status === MasterStatus.Active ? 'أرشفة' : 'إعادة تنشيط'}
        confirmLabel={confirmTarget?.status === MasterStatus.Active ? 'أرشفة' : 'إعادة تنشيط'}
        danger={confirmTarget?.status === MasterStatus.Active}
        busy={toggle.pending}
        onConfirm={() => void handleToggle()}
        onCancel={() => setConfirmTarget(null)}
      >
        {confirmTarget?.status === MasterStatus.Active
          ? texts.archiveBody
          : `سيعود «${confirmTarget?.name ?? ''}» للظهور في قوائم الاختيار.`}
      </ConfirmDialog>
    </>
  );
}
