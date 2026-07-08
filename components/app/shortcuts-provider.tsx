'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Dialog, Input, cn } from '../ui';
import { calculatorWindow } from './calculator-store';
import { focusMode } from './focus-store';
import { navigationGroups } from './navigation';
import { commandPalette, shortcutGuide } from './overlay-store';
import { shortcutRegistry, type ShortcutAction } from './shortcut-registry';

/**
 * ShortcutsProvider (Productivity Sprint #3) — the global keyboard layer.
 * Always-available: Ctrl/⌘+K command palette, Alt+C calculator, ? guide.
 * Contextual (dispatched to a registered handler, only preventing the browser
 * default when the app has a real equivalent): Ctrl+F focus search, Ctrl+N
 * new, Ctrl+S save, Ctrl+P print, F2 edit, Delete delete. Esc is left to the
 * native <dialog> layer. Nothing is trapped on a page that lacks the action.
 */
interface Command {
  label: string;
  href: string;
  hint?: string;
}

function buildCommands(): Command[] {
  const nav: Command[] = navigationGroups.flatMap((group) =>
    group.items.map((item) => ({ label: item.label, href: item.href, hint: group.label })),
  );
  const create: Command[] = [
    { label: 'فاتورة شراء جديدة', href: '/purchases/new', hint: 'إنشاء' },
    { label: 'مرتجع شراء جديد', href: '/purchase-returns/new', hint: 'إنشاء' },
    { label: 'دفعة جديدة', href: '/payments/new', hint: 'إنشاء' },
    { label: 'مورد جديد', href: '/suppliers/new', hint: 'إنشاء' },
  ];
  return [...create, ...nav];
}

const GUIDE: readonly { keys: string; label: string }[] = [
  { keys: 'Ctrl + K', label: 'لوحة الأوامر والتنقل السريع' },
  { keys: 'Ctrl + N', label: 'مستند / سجل جديد' },
  { keys: 'Ctrl + S', label: 'حفظ النموذج الحالي' },
  { keys: 'Ctrl + P', label: 'طباعة المستند' },
  { keys: 'Ctrl + F', label: 'البحث داخل الصفحة' },
  { keys: 'Alt + C', label: 'الآلة الحاسبة' },
  { keys: 'Alt + F', label: 'وضع التركيز' },
  { keys: 'F2', label: 'تعديل السجل الحالي' },
  { keys: 'Delete', label: 'حذف السجل الحالي (بتأكيد)' },
  { keys: 'Esc', label: 'إغلاق النافذة' },
  { keys: 'Shift + ?', label: 'دليل الاختصارات' },
];

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable === true;
}

export function ShortcutsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const paletteOpen = useSyncExternalStore(
    commandPalette.subscribe,
    commandPalette.getSnapshot,
    commandPalette.getServerSnapshot,
  );
  const guideOpen = useSyncExternalStore(
    shortcutGuide.subscribe,
    shortcutGuide.getSnapshot,
    shortcutGuide.getServerSnapshot,
  );

  useEffect(() => {
    const openPalette = () => {
      shortcutGuide.close();
      commandPalette.open();
    };
    function onKeyDown(event: KeyboardEvent) {
      const mod = event.ctrlKey || event.metaKey;
      const editable = isEditableTarget(event.target);

      // Always-available globals.
      if (event.altKey && (event.key === 'c' || event.key === 'C')) {
        calculatorWindow.toggleOpen();
        event.preventDefault();
        return;
      }
      if (event.altKey && (event.key === 'f' || event.key === 'F')) {
        focusMode.toggle();
        event.preventDefault();
        return;
      }
      if (mod && (event.key === 'k' || event.key === 'K')) {
        openPalette();
        event.preventDefault();
        return;
      }
      if (!mod && !event.altKey && event.key === '?' && !editable) {
        shortcutGuide.open();
        event.preventDefault();
        return;
      }

      // Contextual — dispatch only if a handler is registered; otherwise leave
      // the browser default alone.
      const tryDispatch = (action: ShortcutAction) => {
        if (shortcutRegistry.dispatch(action)) {
          event.preventDefault();
          return true;
        }
        return false;
      };

      if (mod && (event.key === 'f' || event.key === 'F')) {
        tryDispatch('search');
        return;
      }
      if (mod && (event.key === 'n' || event.key === 'N')) {
        // Contextual new where a page registered one; otherwise fall back to
        // the command palette (create actions are listed at the top).
        if (!tryDispatch('new')) {
          openPalette();
          event.preventDefault();
        }
        return;
      }
      if (mod && (event.key === 's' || event.key === 'S')) {
        tryDispatch('save');
        return;
      }
      if (mod && (event.key === 'p' || event.key === 'P')) {
        tryDispatch('print');
        return;
      }
      if (event.key === 'F2' && !editable) {
        tryDispatch('edit');
        return;
      }
      if ((event.key === 'Delete' || event.key === 'Del') && !editable) {
        tryDispatch('delete');
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      {children}
      <CommandPalette
        open={paletteOpen}
        onClose={() => commandPalette.close()}
        onSelect={(href) => {
          commandPalette.close();
          router.push(href);
        }}
      />
      <ShortcutGuide open={guideOpen} onClose={() => shortcutGuide.close()} />
    </>
  );
}

function CommandPalette({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (href: string) => void;
}) {
  const commands = useMemo(buildCommands, []);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (q === '') return commands;
    return commands.filter((command) => command.label.includes(q));
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      // Focus after the dialog paints.
      const timer = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      setActive((i) => Math.min(i + 1, filtered.length - 1));
      event.preventDefault();
    } else if (event.key === 'ArrowUp') {
      setActive((i) => Math.max(i - 1, 0));
      event.preventDefault();
    } else if (event.key === 'Enter') {
      const target = filtered[active];
      if (target) onSelect(target.href);
      event.preventDefault();
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="لوحة الأوامر" size="md">
      <div className="flex flex-col gap-md" onKeyDown={onKeyDown}>
        <Input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="اكتب للتنقل أو الإنشاء…"
          aria-label="بحث الأوامر"
        />
        <ul className="max-h-72 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-sm py-md text-sm text-neutral-400">لا نتائج.</li>
          ) : (
            filtered.map((command, index) => (
              <li key={command.href}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(index)}
                  onClick={() => onSelect(command.href)}
                  className={cn(
                    'flex w-full items-center justify-between gap-md rounded-md px-sm py-sm text-start text-sm transition-colors',
                    index === active ? 'bg-primary/[0.08] text-primary' : 'text-neutral-600',
                  )}
                >
                  <span className="font-medium">{command.label}</span>
                  {command.hint ? (
                    <span className="text-xs text-neutral-400">{command.hint}</span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </Dialog>
  );
}

function ShortcutGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="دليل اختصارات لوحة المفاتيح" size="md">
      <ul className="flex flex-col gap-1">
        {GUIDE.map((row) => (
          <li
            key={row.keys}
            className="flex items-center justify-between gap-md border-b border-neutral-100 py-sm last:border-b-0"
          >
            <span className="text-sm text-neutral-600">{row.label}</span>
            <kbd
              dir="ltr"
              className="rounded-md border border-neutral-300 bg-neutral-100 px-sm py-0.5 text-xs font-medium text-neutral-600 tabular-nums"
            >
              {row.keys}
            </kbd>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
