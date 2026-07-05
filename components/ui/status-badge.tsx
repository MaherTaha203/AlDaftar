import type { ReactNode } from 'react';
import { cn } from './cn';

/**
 * StatusBadge — 04_Component_Library.md §3. Generic colored pill; business
 * meaning enters only through `tone` + `children` (e.g. document states map
 * Draft→warning «مسودة», Posted→success «مرحّل» at the call site).
 */
export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

export interface StatusBadgeProps {
  tone: BadgeTone;
  className?: string;
  children: ReactNode;
}

const toneClasses: Record<BadgeTone, string> = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  neutral: 'bg-neutral-100 text-neutral-500',
  info: 'bg-primary/10 text-primary',
};

export function StatusBadge({ tone, className, children }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-xs rounded-full px-sm py-xs text-xs font-medium',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
