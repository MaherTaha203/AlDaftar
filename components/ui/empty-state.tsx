import type { ReactNode } from 'react';
import { cn } from './cn';
import { InboxIcon } from './icons';
import { uiText } from './ui-text';

/**
 * EmptyState — 03_UI_Specification.md §7: icon + one sentence + primary
 * action. Use the `filtered` variant text for "no results for these
 * filters" cases and pass a clear-filters action.
 */
export interface EmptyStateProps {
  /** One-sentence Arabic description; defaults to the generic no-data copy. */
  message?: string;
  icon?: ReactNode;
  /** Primary action (e.g. a create Button or clear-filters Button). */
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  message = uiText.noData,
  icon = <InboxIcon width={32} height={32} />,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-md px-lg py-xl text-center',
        className,
      )}
    >
      <span className="text-neutral-300">{icon}</span>
      <p className="text-sm text-neutral-500">{message}</p>
      {action}
    </div>
  );
}
