'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { cn } from '../ui/cn';
import { statusLevel, systemStatus, type SystemStatusLevel } from './system-status-store';

/**
 * SystemStatusIndicator — the always-visible top-bar health summary
 * (System Status & Productivity Bar). A colored dot + short label:
 *   ready → «جاهز», saving → «جارٍ الحفظ…», attention → «يتطلب انتباهك».
 * Selecting it opens a small details panel listing the real standing issues
 * (offline / audit-gap / server error), each dismissible. Reflects only
 * genuine in-app signals — never fabricated system health.
 */
const LEVEL_META: Record<
  SystemStatusLevel,
  { label: string; dot: string; text: string; pulse: boolean }
> = {
  ready: { label: 'جاهز', dot: 'bg-success', text: 'text-neutral-500', pulse: false },
  saving: { label: 'جارٍ الحفظ…', dot: 'bg-warning', text: 'text-neutral-500', pulse: true },
  attention: { label: 'يتطلب انتباهك', dot: 'bg-danger', text: 'text-danger', pulse: false },
};

export function SystemStatusIndicator() {
  const snapshot = useSyncExternalStore(
    systemStatus.subscribe,
    systemStatus.getSnapshot,
    systemStatus.getServerSnapshot,
  );
  const level = statusLevel(snapshot);
  const meta = LEVEL_META[level];

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close the details panel on outside click or Escape.
  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`حالة النظام: ${meta.label}`}
        className={cn(
          'flex items-center gap-xs rounded-full border border-neutral-200 bg-white/70 px-sm py-1',
          'text-xs font-medium transition-colors duration-200 hover:bg-neutral-100',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
          meta.text,
        )}
      >
        <span className="relative flex size-2">
          {meta.pulse ? (
            <span
              className="absolute inline-flex size-full animate-ping rounded-full opacity-60 motion-reduce:hidden"
              style={{ backgroundColor: 'currentColor' }}
              aria-hidden="true"
            />
          ) : null}
          <span
            className={cn('relative inline-flex size-2 rounded-full transition-colors', meta.dot)}
          />
        </span>
        <span className="max-sm:sr-only">{meta.label}</span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="تفاصيل حالة النظام"
          className="absolute end-0 top-[calc(100%+8px)] z-50 w-72 rounded-lg border border-neutral-200 bg-white/95 p-md shadow-lg backdrop-blur-md"
        >
          <p className="mb-sm text-xs font-semibold text-neutral-400">حالة النظام</p>
          {snapshot.issues.length === 0 ? (
            <div className="flex items-center gap-sm text-sm text-neutral-500">
              <span className="inline-flex size-2 rounded-full bg-success" aria-hidden="true" />
              كل الأنظمة تعمل بشكل طبيعي.
            </div>
          ) : (
            <ul className="flex flex-col gap-sm">
              {snapshot.issues.map((issue) => (
                <li key={issue.id} className="flex items-start gap-sm">
                  <span
                    className="mt-1 inline-flex size-2 shrink-0 rounded-full bg-danger"
                    aria-hidden="true"
                  />
                  <span className="flex-1 text-sm text-neutral-500">{issue.message}</span>
                  <button
                    type="button"
                    onClick={() => systemStatus.acknowledge(issue.id)}
                    className="rounded-sm px-1 text-xs text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    تجاهل
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
