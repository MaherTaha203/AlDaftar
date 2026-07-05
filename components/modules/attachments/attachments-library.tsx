'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AttachmentOwnerTypes,
  formatFileSize,
  getAttachmentService,
  type Attachment,
} from '@/lib/modules/attachments';
import { getErrorMessage, ListPage, useOperation } from '../../framework';
import {
  AttachmentViewer,
  Button,
  FilterPanel,
  Select,
  useToast,
  type DataTableColumn,
  type ViewerItem,
} from '../../ui';

/**
 * AttachmentsLibrary — screen S-70: every archived file across the system,
 * filterable by owner kind, viewable in D-06. Owner labels/routes are the
 * only app-level knowledge and live here, not in the generic module.
 */
const ownerLabels: Record<string, string> = {
  [AttachmentOwnerTypes.Supplier]: 'مورد',
  [AttachmentOwnerTypes.Purchase]: 'شراء',
  [AttachmentOwnerTypes.PurchaseReturn]: 'مرتجع شراء',
  [AttachmentOwnerTypes.Payment]: 'دفعة',
};

const PAGE_SIZE = 25;

export function AttachmentsLibrary() {
  const toast = useToast();
  const [attachments, setAttachments] = useState<readonly Attachment[]>([]);
  const [query, setQuery] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [viewer, setViewer] = useState<{ item: ViewerItem; url: string } | null>(null);

  const { run: load, pending, error } = useOperation(() => getAttachmentService().listAll());
  const { run: loadFile } = useOperation((attachment: Attachment) =>
    getAttachmentService().loadFile(attachment),
  );

  useEffect(() => {
    void load().then((r) => r.ok && setAttachments(r.value));
  }, [load]);

  useEffect(() => {
    return () => {
      if (viewer !== null) {
        URL.revokeObjectURL(viewer.url);
      }
    };
  }, [viewer]);

  async function openViewer(attachment: Attachment) {
    const result = await loadFile(attachment);
    if (!result.ok) {
      toast.show({ variant: 'error', message: getErrorMessage(result.error) });
      return;
    }
    const url = URL.createObjectURL(result.value);
    setViewer({
      url,
      item: {
        url,
        title: attachment.title,
        contentType: attachment.contentType,
        meta: `${ownerLabels[attachment.ownerType] ?? attachment.ownerType} · ${formatFileSize(
          attachment.size,
        )} · ${attachment.createdAt.slice(0, 10)}`,
      },
    });
  }

  const columns = useMemo<readonly DataTableColumn<Attachment>[]>(
    () => [
      { key: 'title', header: 'العنوان', render: (row) => row.title },
      {
        key: 'owner',
        header: 'يخص',
        render: (row) => ownerLabels[row.ownerType] ?? row.ownerType,
      },
      {
        key: 'type',
        header: 'النوع',
        priority: 2,
        render: (row) => (row.contentType === '' ? '—' : <bdi dir="ltr">{row.contentType}</bdi>),
      },
      {
        key: 'size',
        header: 'الحجم',
        align: 'left',
        priority: 2,
        render: (row) => <bdi dir="ltr">{formatFileSize(row.size)}</bdi>,
      },
      {
        key: 'date',
        header: 'التاريخ',
        render: (row) => <bdi dir="ltr">{row.createdAt.slice(0, 10)}</bdi>,
      },
    ],
    [],
  );

  const filtered = useMemo(() => {
    const text = query.trim();
    return attachments.filter(
      (a) =>
        (ownerFilter === 'all' || a.ownerType === ownerFilter) &&
        (text === '' || a.title.includes(text)),
    );
  }, [attachments, query, ownerFilter]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <ListPage
        search={{
          placeholder: 'بحث بعنوان الملف…',
          onQueryChange: (value) => {
            setQuery(value);
            setPage(1);
          },
        }}
        toolbarActions={
          <Button variant="secondary" size="sm" onClick={() => setFiltersOpen((o) => !o)}>
            تصفية
          </Button>
        }
        filters={
          <FilterPanel
            open={filtersOpen}
            chips={
              ownerFilter === 'all'
                ? []
                : [{ key: 'owner', label: `يخص: ${ownerLabels[ownerFilter] ?? ownerFilter}` }]
            }
            onRemoveChip={() => {
              setOwnerFilter('all');
              setPage(1);
            }}
          >
            <label className="flex items-center gap-sm text-sm text-neutral-500">
              يخص
              <Select
                value={ownerFilter}
                onChange={(e) => {
                  setOwnerFilter(e.target.value);
                  setPage(1);
                }}
                className="w-44"
              >
                <option value="all">الكل</option>
                {Object.entries(ownerLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </label>
          </FilterPanel>
        }
        columns={columns}
        rows={pageRows}
        rowKey={(row) => row.id}
        onRowClick={(row) => void openViewer(row)}
        loading={pending && attachments.length === 0}
        error={error}
        onRetry={() => void load().then((r) => r.ok && setAttachments(r.value))}
        emptyMessage={
          query.trim() === '' && ownerFilter === 'all'
            ? 'الأرشيف فارغ — تُرفع الملفات من شاشات الموردين والمستندات'
            : 'لا توجد نتائج مطابقة'
        }
        pagination={{ page, pageSize: PAGE_SIZE, total: filtered.length, onPageChange: setPage }}
      />

      {viewer !== null ? (
        <AttachmentViewer
          open
          onClose={() => setViewer(null)}
          items={[viewer.item]}
          initialIndex={0}
        />
      ) : null}
    </>
  );
}
