'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from './cn';
import { CloseIcon } from './icons';
import { uiText } from './ui-text';

/**
 * Dialog — 03_UI_Specification.md §3 / 04_Component_Library.md §4.
 * Built on the native `<dialog>` element (focus trapping, Esc, top-layer
 * come from the platform). Controlled via `open` + `onClose`. Sizes:
 * sm = confirms (480px), md = entry dialogs (720px), full = viewer.
 * Backdrop click closes unless `dismissable` is false (e.g. during upload).
 */
export type DialogSize = 'sm' | 'md' | 'full';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  size?: DialogSize;
  /** When false, Esc and backdrop clicks do not close (in-flight work). */
  dismissable?: boolean;
  /** Footer slot — action buttons, safe action first (RTL: rightmost). */
  footer?: ReactNode;
  closeLabel?: string;
  children: ReactNode;
}

const sizeClasses: Record<DialogSize, string> = {
  sm: 'w-full max-w-[480px]',
  md: 'w-full max-w-[720px]',
  full: 'h-[100dvh] w-[100dvw] max-h-none max-w-none rounded-none',
};

export function Dialog({
  open,
  onClose,
  title,
  size = 'sm',
  dismissable = true,
  footer,
  closeLabel = uiText.close,
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      dir="rtl"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (dismissable) {
          onClose();
        }
      }}
      onClick={(event) => {
        if (dismissable && event.target === ref.current) {
          onClose();
        }
      }}
      className={cn(
        // Dialogs are an approved glass moment: ink-tinted, softly blurred
        // backdrop; the panel itself stays opaque for readability.
        'm-auto rounded-lg bg-white p-0 text-inherit shadow-lg',
        'backdrop:bg-[rgba(16,33,27,0.4)] backdrop:backdrop-blur-sm',
        sizeClasses[size],
      )}
    >
      <div
        className={cn(
          'flex flex-col overflow-hidden text-start',
          size === 'full' ? 'h-full' : 'max-h-[85dvh]',
        )}
      >
        <header className="flex items-center justify-between gap-md border-b border-neutral-200 px-lg py-md">
          <h2 id={titleId} className="text-sm font-semibold">
            {title}
          </h2>
          <button
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
            className="rounded-sm p-xs text-neutral-400 hover:text-neutral-500 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <CloseIcon />
          </button>
        </header>
        <div className="overflow-y-auto p-lg">{children}</div>
        {footer ? (
          <footer className="flex items-center justify-start gap-sm border-t border-neutral-200 px-lg py-md">
            {footer}
          </footer>
        ) : null}
      </div>
    </dialog>
  );
}
