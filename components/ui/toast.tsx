'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from './cn';
import { AlertCircleIcon, CheckIcon, CloseIcon, InfoIcon } from './icons';
import { uiText } from './ui-text';

/**
 * Toast system — 03_UI_Specification.md §10. Viewport at bottom-start
 * (RTL); success/info auto-dismiss after 5s, errors persist until manually
 * dismissed. Mount `ToastProvider` once at the application shell; trigger
 * with `useToast().show(...)`. `action` renders an inline link/button slot
 * (e.g. the posted-document link).
 */
export type ToastVariant = 'success' | 'info' | 'error';

export interface ToastOptions {
  variant: ToastVariant;
  message: string;
  /** Optional inline action (e.g. a link to the created record). */
  action?: ReactNode;
}

interface ToastItem extends ToastOptions {
  id: number;
}

interface ToastContextValue {
  show: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 5000;

const variantStyles: Record<ToastVariant, { className: string; icon: ReactNode }> = {
  success: { className: 'border-success/30 text-success', icon: <CheckIcon /> },
  info: { className: 'border-primary/30 text-primary', icon: <InfoIcon /> },
  error: { className: 'border-danger/30 text-danger', icon: <AlertCircleIcon /> },
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (context === null) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<readonly ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  // Clear any pending auto-dismiss timers when the provider unmounts.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (options: ToastOptions) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { ...options, id }]);
      if (options.variant !== 'error') {
        const timer = setTimeout(() => {
          timers.current.delete(timer);
          dismiss(id);
        }, AUTO_DISMISS_MS);
        timers.current.add(timer);
      }
    },
    [dismiss],
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Each toast carries its own role (status = polite, alert = assertive),
          so the container is not itself a live region — avoids double
          announcements. */}
      <div className="pointer-events-none fixed bottom-lg start-lg z-50 flex w-full max-w-[360px] flex-col gap-sm">
        {toasts.map((toast) => {
          const style = variantStyles[toast.variant];
          return (
            <div
              key={toast.id}
              role={toast.variant === 'error' ? 'alert' : 'status'}
              className={cn(
                'pointer-events-auto flex items-start gap-sm rounded-md border bg-white/90 p-md shadow-lg backdrop-blur-md',
                style.className,
              )}
            >
              <span className="mt-xs shrink-0">{style.icon}</span>
              <div className="flex min-w-0 flex-1 flex-col gap-xs text-sm text-neutral-500">
                <p>{toast.message}</p>
                {toast.action}
              </div>
              <button
                type="button"
                aria-label={uiText.close}
                onClick={() => dismiss(toast.id)}
                className="shrink-0 rounded-sm p-xs text-neutral-400 hover:text-neutral-500 focus-visible:outline-2 focus-visible:outline-primary"
              >
                <CloseIcon />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
