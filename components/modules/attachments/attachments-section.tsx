'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_MAX_SIZE_BYTES,
  formatFileSize,
  getAttachmentService,
  type Attachment,
  type AttachmentOwner,
} from '@/lib/modules/attachments';
import { getErrorMessage, useOperation } from '../../framework';
import {
  AttachmentList,
  AttachmentUpload,
  AttachmentViewer,
  Card,
  ConfirmDialog,
  ErrorState,
  useToast,
  type ViewerItem,
} from '../../ui';

/**
 * AttachmentsSection — the reusable per-record archive block (D-05 upload +
 * list + D-06 viewer) consumed by every owning module's detail screen.
 * Business-blind: the owner is an opaque (type, id) pair; whether deletion
 * is offered is the OWNING screen's decision via `allowDelete` (BDR-08
 * interim: documents pass their draft state; master data passes false).
 */
export interface AttachmentsSectionProps {
  owner: AttachmentOwner;
  /** Caller's deletion policy (BDR-08 gate lives with the owner's module). */
  allowDelete?: boolean;
  title?: string;
}

interface ViewerState {
  item: ViewerItem;
  url: string;
}

export function AttachmentsSection({
  owner,
  allowDelete = false,
  title = 'المرفقات',
}: AttachmentsSectionProps) {
  const toast = useToast();
  const [attachments, setAttachments] = useState<readonly Attachment[]>([]);
  const [viewer, setViewer] = useState<ViewerState | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Attachment | null>(null);

  const { run: load, error: loadError } = useOperation((target: AttachmentOwner) =>
    getAttachmentService().listByOwner(target),
  );
  const removeOp = useOperation((id: string) => getAttachmentService().remove(id));
  const { run: loadFile } = useOperation((attachment: Attachment) =>
    getAttachmentService().loadFile(attachment),
  );

  const reload = useCallback(async () => {
    const result = await load(owner);
    if (result.ok) {
      setAttachments(result.value);
    }
  }, [load, owner]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Revoke the viewer's object URL when it closes/changes.
  useEffect(() => {
    return () => {
      if (viewer !== null) {
        URL.revokeObjectURL(viewer.url);
      }
    };
  }, [viewer]);

  async function uploadFile(file: File, onProgress: (percent: number) => void): Promise<void> {
    const result = await getAttachmentService().upload(owner, file);
    if (!result.ok) {
      throw new Error(getErrorMessage(result.error));
    }
    onProgress(100);
    await reload();
  }

  async function handleView(item: { id: string }) {
    const attachment = attachments.find((a) => a.id === item.id);
    if (attachment === undefined) {
      return;
    }
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
        meta: `${formatFileSize(attachment.size)} · ${attachment.createdAt.slice(0, 10)}`,
      },
    });
  }

  async function handleDelete() {
    if (confirmTarget === null) {
      return;
    }
    const result = await removeOp.run(confirmTarget.id);
    setConfirmTarget(null);
    if (result.ok) {
      toast.show({ variant: 'success', message: 'تم حذف المرفق' });
      await reload();
    } else {
      toast.show({ variant: 'error', message: removeOp.error ?? 'تعذر حذف المرفق' });
    }
  }

  return (
    <Card title={title}>
      <div className="flex flex-col gap-md">
        {loadError !== null ? (
          <ErrorState message={loadError} onRetry={() => void reload()} />
        ) : (
          <AttachmentList
            items={attachments.map((a) => ({
              id: a.id,
              title: a.title,
              contentType: a.contentType,
              meta: `${formatFileSize(a.size)} · ${a.createdAt.slice(0, 10)}`,
            }))}
            onView={(item) => void handleView(item)}
            onDelete={
              allowDelete
                ? (item) => {
                    const target = attachments.find((a) => a.id === item.id);
                    if (target !== undefined) {
                      setConfirmTarget(target);
                    }
                  }
                : undefined
            }
          />
        )}
        <AttachmentUpload
          uploadFile={uploadFile}
          accept={ATTACHMENT_ACCEPT}
          maxSizeBytes={ATTACHMENT_MAX_SIZE_BYTES}
        />
      </div>

      {viewer !== null ? (
        <AttachmentViewer
          open
          onClose={() => setViewer(null)}
          items={[viewer.item]}
          initialIndex={0}
        />
      ) : null}

      <ConfirmDialog
        open={confirmTarget !== null}
        title="حذف المرفق"
        confirmLabel="حذف"
        danger
        busy={removeOp.pending}
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmTarget(null)}
      >
        {`سيُحذف «${confirmTarget?.title ?? ''}» نهائيًا من الأرشيف.`}
      </ConfirmDialog>
    </Card>
  );
}
