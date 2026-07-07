'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from './cn';
import { CloseIcon } from './icons';
import { uiText } from './ui-text';

/**
 * SideDetailPanel — a slide-in detail panel (Productivity Sprint #5). A quick,
 * in-context "peek" at a record without leaving the list: the list stays
 * mounted underneath (scroll preserved) while the panel slides from the
 * inline-end edge. Built on the native <dialog> (focus trap, Esc, top layer),
 * with the panel body animated in/out. Always offers "open the full page".
 * Business-blind: the caller supplies the title, body, and full-page link.
 */
export interface SideDetailPanelProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Optional status chip / secondary line under the title. */
  subtitle?: ReactNode;
  /** The full-page route; rendered as the primary footer action. */
  fullPageHref?: string;
  fullPageLabel?: string;
  /** Called when the full-page action is chosen (caller navigates + closes). */
  onOpenFullPage?: () => void;
  children: ReactNode;
}

export function SideDetailPanel({
  open,
  onClose,
  title,
  subtitle,
  fullPageLabel = 'فتح الصفحة الكاملة',
  onOpenFullPage,
  children,
}: SideDetailPanelProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
      // Next frame → transition the panel in from the edge.
      const id = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(id);
    }
    if (!open && dialog.open) {
      setShown(false);
      // Let the slide-out play before closing the dialog.
      const timer = setTimeout(() => dialog.close(), 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      dir="rtl"
      aria-label={typeof title === 'string' ? title : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) {
          onClose();
        }
      }}
      className="screen-only m-0 max-h-none max-w-none border-0 bg-transparent p-0 backdrop:bg-[rgba(16,33,27,0.4)] backdrop:backdrop-blur-sm"
    >
      <div
        className={cn(
          // The panel is fixed to the viewport (not the dialog): a modal
          // <dialog> whose only child is out-of-flow collapses to zero width,
          // so positioning against it fails — fixed anchors to the viewport's
          // inline-end edge instead (left edge in this RTL app). The dialog's
          // ::backdrop still covers the screen for the dim + click-to-close.
          'fixed inset-y-0 end-0 flex w-[26rem] max-w-[calc(100vw-3rem)] flex-col bg-white shadow-lg',
          'transition-transform duration-200 ease-out',
          shown ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <header className="flex items-start justify-between gap-md border-b border-neutral-200 px-lg py-md">
          <div className="flex min-w-0 flex-col gap-xs">
            <h2 className="truncate text-sm font-semibold">{title}</h2>
            {subtitle ? <div className="flex items-center gap-sm">{subtitle}</div> : null}
          </div>
          <button
            type="button"
            aria-label={uiText.close}
            onClick={onClose}
            className="rounded-sm p-xs text-neutral-400 hover:text-neutral-500 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-lg py-md">{children}</div>

        {onOpenFullPage ? (
          <footer className="border-t border-neutral-200 px-lg py-md">
            <button
              type="button"
              onClick={onOpenFullPage}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
            >
              {fullPageLabel} ←
            </button>
          </footer>
        ) : null}
      </div>
    </dialog>
  );
}

/** A labelled field row for the panel body (RTL dl semantics). */
export function PeekField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-xs border-b border-neutral-100 py-sm last:border-b-0">
      <dt className="text-xs text-neutral-400">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}
