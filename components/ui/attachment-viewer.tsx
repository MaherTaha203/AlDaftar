'use client';

import { useCallback, useEffect, useState, type KeyboardEvent } from 'react';
import { cn } from './cn';
import { Button } from './button';
import { Dialog } from './dialog';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  FileIcon,
  RotateIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from './icons';
import { uiText } from './ui-text';

/**
 * AttachmentViewer — 04_Component_Library.md §3 (D-06). Full-screen viewer:
 * image zoom/rotate, PDF paging via the browser viewer, prev/next across
 * the given items (arrow keys included — physical keys mapped to logical
 * direction for RTL), download, metadata footer. Unsupported types show a
 * download fallback. Business-blind: items are plain descriptors.
 */
export interface ViewerItem {
  /** Browser-loadable URL (object URL or signed URL supplied by the caller). */
  url: string;
  title: string;
  /** MIME type, e.g. 'image/jpeg' or 'application/pdf'. */
  contentType: string;
  /** Optional metadata line for the footer (owner, date, size…). */
  meta?: string;
}

export interface AttachmentViewerProps {
  open: boolean;
  onClose: () => void;
  items: readonly ViewerItem[];
  /** Index of the initially shown item. */
  initialIndex?: number;
}

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.5, 2, 3] as const;

export function AttachmentViewer({
  open,
  onClose,
  items,
  initialIndex = 0,
}: AttachmentViewerProps) {
  const [index, setIndex] = useState(initialIndex);
  const [zoomStep, setZoomStep] = useState(2);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (open) {
      setIndex(Math.min(Math.max(initialIndex, 0), Math.max(items.length - 1, 0)));
      setZoomStep(2);
      setRotation(0);
    }
  }, [open, initialIndex, items.length]);

  const goTo = useCallback(
    (nextIndex: number) => {
      if (nextIndex >= 0 && nextIndex < items.length) {
        setIndex(nextIndex);
        setZoomStep(2);
        setRotation(0);
      }
    },
    [items.length],
  );

  const item = items[index];
  if (item === undefined) {
    return null;
  }

  const isImage = item.contentType.startsWith('image/');
  const isPdf = item.contentType === 'application/pdf';
  const zoom = ZOOM_LEVELS[zoomStep] ?? 1;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // RTL: ArrowLeft advances (next), ArrowRight goes back (previous).
    if (event.key === 'ArrowLeft') {
      goTo(index + 1);
    } else if (event.key === 'ArrowRight') {
      goTo(index - 1);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={item.title} size="full">
      <div
        role="group"
        aria-label={item.title}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="flex h-full min-h-[70dvh] flex-col gap-md"
      >
        <div className="flex flex-wrap items-center gap-sm">
          {isImage ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                aria-label={uiText.viewer.zoomIn}
                disabled={zoomStep >= ZOOM_LEVELS.length - 1}
                onClick={() => setZoomStep((step) => Math.min(step + 1, ZOOM_LEVELS.length - 1))}
                icon={<ZoomInIcon />}
              />
              <Button
                variant="secondary"
                size="sm"
                aria-label={uiText.viewer.zoomOut}
                disabled={zoomStep <= 0}
                onClick={() => setZoomStep((step) => Math.max(step - 1, 0))}
                icon={<ZoomOutIcon />}
              />
              <Button
                variant="secondary"
                size="sm"
                aria-label={uiText.viewer.rotate}
                onClick={() => setRotation((deg) => (deg + 90) % 360)}
                icon={<RotateIcon />}
              />
            </>
          ) : null}
          <a
            href={item.url}
            download={item.title}
            className="inline-flex h-8 items-center gap-xs rounded-md border border-neutral-300 bg-white px-sm text-sm text-neutral-500 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <DownloadIcon />
            {uiText.viewer.download}
          </a>
          <span className="ms-auto flex items-center gap-sm">
            <Button
              variant="secondary"
              size="sm"
              aria-label={uiText.viewer.previous}
              disabled={index <= 0}
              onClick={() => goTo(index - 1)}
              icon={<ChevronRightIcon />}
            />
            <span className="text-sm text-neutral-500 tabular-nums" dir="ltr">
              {index + 1} / {items.length}
            </span>
            <Button
              variant="secondary"
              size="sm"
              aria-label={uiText.viewer.next}
              disabled={index >= items.length - 1}
              onClick={() => goTo(index + 1)}
              icon={<ChevronLeftIcon />}
            />
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center overflow-auto rounded-lg bg-neutral-100">
          {isImage ? (
            // next/image is unsuitable here: sources are caller-supplied
            // object/signed URLs with unknown dimensions and hosts.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.url}
              alt={item.title}
              style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
              className="max-h-full max-w-full object-contain transition-transform"
            />
          ) : isPdf ? (
            <object
              data={item.url}
              type="application/pdf"
              aria-label={item.title}
              className="h-full min-h-[65dvh] w-full"
            >
              <ViewerFallback url={item.url} title={item.title} />
            </object>
          ) : (
            <ViewerFallback url={item.url} title={item.title} />
          )}
        </div>

        {item.meta !== undefined ? (
          <p className="text-center text-xs text-neutral-400">{item.meta}</p>
        ) : null}
      </div>
    </Dialog>
  );
}

function ViewerFallback({ url, title }: { url: string; title: string }) {
  return (
    <div className="flex flex-col items-center gap-md p-xl text-center">
      <span className="text-neutral-300">
        <FileIcon width={32} height={32} />
      </span>
      <p className="text-sm text-neutral-500">{uiText.viewer.unsupported}</p>
      <a
        href={url}
        download={title}
        className={cn(
          'inline-flex h-10 items-center gap-sm rounded-md bg-primary px-md text-sm font-medium text-white',
          'hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        )}
      >
        <DownloadIcon />
        {uiText.viewer.download}
      </a>
    </div>
  );
}
