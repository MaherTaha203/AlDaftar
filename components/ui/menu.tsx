'use client';

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from './cn';

/**
 * Menu — a lightweight overflow / dropdown menu (Productivity Sprint #1).
 * The panel is rendered in a portal with fixed positioning so it escapes the
 * DataTable's `overflow-auto` clip; it anchors to the trigger's inline-start
 * (right edge in RTL) and flips above when there is no room below. Keyboard:
 * ArrowUp/Down move, Home/End jump, Enter/Space activate, Esc closes. Closes
 * on outside pointerdown, Escape, and any scroll/resize (the anchor moves).
 */
export interface MenuItem {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export interface MenuProps {
  /** Accessible label for the trigger button (icon-only). */
  label: string;
  /** Trigger content (an icon). */
  trigger: ReactNode;
  items: readonly MenuItem[];
  className?: string;
  triggerClassName?: string;
}

interface Position {
  top: number;
  right: number;
  flip: boolean;
}

export function Menu({ label, trigger, items, className, triggerClassName }: MenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Position | null>(null);
  const [active, setActive] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLUListElement>(null);
  const menuId = useId();

  const enabledIndexes = items.map((item, i) => (item.disabled ? -1 : i)).filter((i) => i >= 0);

  const close = useCallback((focusTrigger = false) => {
    setOpen(false);
    setPos(null);
    if (focusTrigger) {
      triggerRef.current?.focus();
    }
  }, []);

  const place = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const spaceBelow = window.innerHeight - rect.bottom;
    setPos({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
      flip: spaceBelow < 220,
    });
  }, []);

  function toggle() {
    if (open) {
      close();
      return;
    }
    place();
    setActive(enabledIndexes[0] ?? 0);
    setOpen(true);
  }

  // Reposition to sit above the trigger once we can measure the panel height.
  useLayoutEffect(() => {
    if (!open || !pos?.flip) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    const height = panelRef.current?.offsetHeight ?? 0;
    if (rect) {
      setPos((current) =>
        current ? { ...current, top: rect.top - height - 4, flip: false } : current,
      );
    }
    // Only re-run when the panel first opens in flip mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Focus the panel so arrow keys work immediately.
    const timer = setTimeout(() => panelRef.current?.focus(), 0);
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        close();
      }
    }
    function onScrollOrResize() {
      close();
    }
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, close]);

  function moveActive(delta: number) {
    const order = enabledIndexes;
    if (order.length === 0) return;
    const current = order.indexOf(active);
    const next = order[(current + delta + order.length) % order.length];
    setActive(next);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case 'ArrowDown':
        moveActive(1);
        event.preventDefault();
        break;
      case 'ArrowUp':
        moveActive(-1);
        event.preventDefault();
        break;
      case 'Home':
        setActive(enabledIndexes[0] ?? 0);
        event.preventDefault();
        break;
      case 'End':
        setActive(enabledIndexes[enabledIndexes.length - 1] ?? 0);
        event.preventDefault();
        break;
      case 'Enter':
      case ' ': {
        const item = items[active];
        if (item && !item.disabled) {
          close(true);
          item.onSelect();
        }
        event.preventDefault();
        break;
      }
      case 'Escape':
        close(true);
        event.preventDefault();
        break;
      case 'Tab':
        close();
        break;
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={toggle}
        className={cn(
          'inline-flex size-8 items-center justify-center rounded-md text-neutral-400',
          'transition-colors hover:bg-neutral-100 hover:text-neutral-600',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
          triggerClassName,
        )}
      >
        {trigger}
      </button>
      {open && pos
        ? createPortal(
            <ul
              ref={panelRef}
              id={menuId}
              role="menu"
              tabIndex={-1}
              dir="rtl"
              onKeyDown={onKeyDown}
              style={{ position: 'fixed', top: pos.top, right: pos.right }}
              className={cn(
                'z-50 min-w-44 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg',
                'focus:outline-none',
                className,
              )}
            >
              {items.map((item, index) => (
                <li key={item.key} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    onMouseEnter={() => !item.disabled && setActive(index)}
                    onClick={() => {
                      close(true);
                      item.onSelect();
                    }}
                    className={cn(
                      'flex w-full items-center gap-sm px-md py-sm text-start text-sm transition-colors',
                      'disabled:cursor-not-allowed disabled:opacity-40',
                      item.danger ? 'text-danger' : 'text-neutral-600',
                      index === active &&
                        !item.disabled &&
                        (item.danger ? 'bg-danger/[0.08]' : 'bg-primary/[0.08]'),
                    )}
                  >
                    {item.icon ? (
                      <span className="flex size-4 items-center justify-center text-current opacity-80">
                        {item.icon}
                      </span>
                    ) : null}
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>,
            document.body,
          )
        : null}
    </>
  );
}
