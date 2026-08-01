'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getAuditService, type AuditEntry } from '@/lib/modules/audit';
import { getAttachmentService, type Attachment } from '@/lib/modules/attachments';
import { useOperation } from '../../framework';
import { Card, Skeleton, formatDate } from '../../ui';

/**
 * DocumentHistorySection — «سجلّ المستند» (BDD-011): ONE unified place per
 * document showing everything that ever happened to it — creation, posting,
 * draft edits and deletes (from the append-only audit trail), every derived
 * document, every attachment, and the document's notes. Deliberately named
 * سجلّ المستند, not "Timeline".
 *
 * The audit trail and attachments are loaded here (filtered client-side —
 * the same load-all-then-derive model as every read screen); derived
 * documents arrive from the parent screen, which already fetched them for
 * the Linked Documents section.
 */
export interface DerivedHistoryRef {
  readonly key: string;
  readonly href: string;
  readonly label: string;
  /** ISO timestamp used for ordering (the derived doc's createdAt). */
  readonly timestamp: string;
}

export interface DocumentHistorySectionProps {
  /** Audit identity of this document (entityType + entityId). */
  entityType: string;
  entityId: string;
  /** Attachment owner type, when the document supports attachments. */
  attachmentOwnerType?: string;
  /** Derived documents (returns / credit notes / refunds), if any. */
  derived?: readonly DerivedHistoryRef[];
  /** The document's notes field — shown as the closing line when present. */
  notes?: string;
}

interface HistoryEvent {
  readonly key: string;
  readonly timestamp: string;
  readonly label: string;
  readonly href?: string;
}

function timeLabel(timestamp: string): string {
  return formatDate(timestamp.slice(0, 10));
}

export function DocumentHistorySection({
  entityType,
  entityId,
  attachmentOwnerType,
  derived = [],
  notes = '',
}: DocumentHistorySectionProps) {
  const [entries, setEntries] = useState<readonly AuditEntry[] | null>(null);
  const [attachments, setAttachments] = useState<readonly Attachment[]>([]);

  const { run: loadAudit } = useOperation(() => getAuditService().list());
  const { run: loadAttachments } = useOperation((owner: { type: string; id: string }) =>
    getAttachmentService().listByOwner(owner),
  );

  useEffect(() => {
    void loadAudit().then((r) => {
      if (r.ok) {
        setEntries(r.value.filter((e) => e.entityType === entityType && e.entityId === entityId));
      }
    });
    if (attachmentOwnerType !== undefined) {
      void loadAttachments({ type: attachmentOwnerType, id: entityId }).then(
        (r) => r.ok && setAttachments(r.value),
      );
    }
  }, [entityType, entityId, attachmentOwnerType, loadAudit, loadAttachments]);

  const events = useMemo<readonly HistoryEvent[]>(() => {
    const all: HistoryEvent[] = [];
    for (const entry of entries ?? []) {
      all.push({ key: `audit-${entry.id}`, timestamp: entry.timestamp, label: entry.summary });
    }
    for (const ref of derived) {
      all.push({
        key: `derived-${ref.key}`,
        timestamp: ref.timestamp,
        label: ref.label,
        href: ref.href,
      });
    }
    for (const attachment of attachments) {
      all.push({
        key: `attachment-${attachment.id}`,
        timestamp: attachment.createdAt,
        label: `مرفق: ${attachment.title}`,
      });
    }
    return all.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }, [entries, derived, attachments]);

  return (
    <Card title="سجلّ المستند">
      {entries === null ? (
        <div className="flex flex-col gap-sm">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : events.length === 0 && notes === '' ? (
        <p className="text-sm text-neutral-400">لا توجد أحداث مسجّلة لهذا المستند.</p>
      ) : (
        <ol className="flex flex-col">
          {events.map((event) => (
            <li
              key={event.key}
              className="relative flex items-baseline gap-md border-s-2 border-neutral-200 pb-sm ps-md last:pb-0"
            >
              <span
                aria-hidden="true"
                className="absolute -start-[5px] top-1.5 size-2 rounded-full bg-primary/60"
              />
              <span className="w-24 shrink-0 text-xs text-neutral-400">
                <bdi dir="ltr">{timeLabel(event.timestamp)}</bdi>
              </span>
              {event.href ? (
                <Link href={event.href} className="text-sm text-primary hover:underline">
                  {event.label}
                </Link>
              ) : (
                <span className="text-sm">{event.label}</span>
              )}
            </li>
          ))}
          {notes !== '' ? (
            <li className="mt-sm border-t border-neutral-200 pt-sm text-sm text-neutral-500">
              ملاحظات المستند: {notes}
            </li>
          ) : null}
        </ol>
      )}
    </Card>
  );
}
