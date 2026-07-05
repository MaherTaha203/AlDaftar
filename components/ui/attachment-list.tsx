'use client';

import { cn } from './cn';
import { Button } from './button';
import { DownloadIcon, FileIcon, TrashIcon } from './icons';
import { uiText } from './ui-text';

/**
 * AttachmentList — 04_Component_Library.md §3. Read-only rows of archived
 * files with view / download / delete actions. Business-blind: items are
 * plain descriptors; whether delete is offered at all is the caller's
 * decision (BDR-08 gate) — the button renders only when `onDelete` is
 * provided. Pairs with `AttachmentViewer` for the view action. An empty
 * list renders nothing; callers show their own `EmptyState`.
 */
export interface AttachmentListItem {
  id: string;
  title: string;
  /** MIME type, e.g. 'image/jpeg'; used for the row icon only. */
  contentType?: string;
  /** Preformatted secondary line (size, date, owner…). */
  meta?: string;
  /** Direct download URL, when downloadable. */
  downloadUrl?: string;
}

export interface AttachmentListProps {
  items: readonly AttachmentListItem[];
  /** Opens the item (typically in AttachmentViewer). */
  onView?: (item: AttachmentListItem) => void;
  /** Enables the delete action (caller enforces BDR-08 rules). */
  onDelete?: (item: AttachmentListItem) => void;
  viewLabel?: string;
  deleteLabel?: string;
  className?: string;
}

export function AttachmentList({
  items,
  onView,
  onDelete,
  viewLabel = 'عرض',
  deleteLabel = 'حذف',
  className,
}: AttachmentListProps) {
  if (items.length === 0) {
    return null;
  }
  return (
    <ul className={cn('flex flex-col gap-xs', className)}>
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-center gap-sm rounded-md border border-neutral-200 bg-white px-md py-sm text-sm"
        >
          <span className="shrink-0 text-neutral-400">
            <FileIcon />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate">{item.title}</span>
            {item.meta !== undefined ? (
              <span className="block truncate text-xs text-neutral-400">{item.meta}</span>
            ) : null}
          </span>
          {onView ? (
            <Button variant="ghost" size="sm" onClick={() => onView(item)}>
              {viewLabel}
            </Button>
          ) : null}
          {item.downloadUrl !== undefined ? (
            <a
              href={item.downloadUrl}
              download={item.title}
              aria-label={`${uiText.viewer.download}: ${item.title}`}
              className="rounded-sm p-xs text-neutral-400 hover:text-neutral-500 focus-visible:outline-2 focus-visible:outline-primary"
            >
              <DownloadIcon />
            </a>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              aria-label={`${deleteLabel}: ${item.title}`}
              onClick={() => onDelete(item)}
              className="rounded-sm p-xs text-neutral-400 hover:text-danger focus-visible:outline-2 focus-visible:outline-primary"
            >
              <TrashIcon />
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
