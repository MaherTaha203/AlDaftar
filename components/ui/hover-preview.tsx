'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from './cn';

/**
 * HoverPreview — a rich preview card shown on hover / focus (Productivity
 * Sprint #6). Wraps an inline reference (a supplier or product name) and, after
 * a short intent delay, reveals a small card with key details in a portal
 * (fixed positioning to escape table/overflow clips). Opens on focus too, so it
 * is keyboard reachable; closes on blur, mouse-leave, Esc, and scroll. Purely
 * presentational — the caller supplies the card body.
 */
export interface HoverPreviewProps {
  /** Inline trigger content (the reference text). */
  children: ReactNode;
  /** The preview card body. */
  content: ReactNode;
  /** Skip the preview entirely (e.g. missing reference). */
  disabled?: boolean;
  className?: string;
}

interface Pos {
  top: number;
  right: number;
}

const OPEN_DELAY = 260;

export function HoverPreview({ children, content, disabled, className }: HoverPreviewProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardId = useId();

  const place = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom;
    // Prefer below; flip above when tight. Card is ~ up to 180px tall.
    const top = below < 200 ? rect.top - 8 - 170 : rect.bottom + 6;
    setPos({ top: Math.max(8, top), right: window.innerWidth - rect.right });
  }, []);

  const show = useCallback(() => {
    if (disabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      place();
      setOpen(true);
    }, OPEN_DELAY);
  }, [disabled, place]);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(false);
    setPos(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onScrollOrKey(event: Event) {
      if (event instanceof KeyboardEvent && event.key !== 'Escape') return;
      hide();
    }
    window.addEventListener('scroll', onScrollOrKey, true);
    window.addEventListener('keydown', onScrollOrKey, true);
    return () => {
      window.removeEventListener('scroll', onScrollOrKey, true);
      window.removeEventListener('keydown', onScrollOrKey, true);
    };
  }, [open, hide]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    },
    [],
  );

  if (disabled) {
    return <span className={className}>{children}</span>;
  }

  return (
    <span
      ref={triggerRef}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      tabIndex={0}
      aria-describedby={open ? cardId : undefined}
      className={cn(
        'cursor-default rounded-sm underline decoration-dotted decoration-neutral-300 underline-offset-4',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        className,
      )}
    >
      {children}
      {open && pos
        ? createPortal(
            <div
              id={cardId}
              role="tooltip"
              dir="rtl"
              style={{ position: 'fixed', top: pos.top, right: pos.right }}
              className="z-50 w-64 rounded-lg border border-neutral-200 bg-white p-md text-start shadow-lg"
            >
              {content}
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}
