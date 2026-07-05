'use client';

import { cn } from './cn';
import { Button } from './button';
import { AlertCircleIcon } from './icons';
import { uiText } from './ui-text';

/**
 * ErrorState — 03_UI_Specification.md §7: load failures render a retry card
 * with the error message (from the Result error's `AppError.message`),
 * never a blank screen.
 */
export interface ErrorStateProps {
  /** Human-readable error message (Arabic at the boundary). */
  message: string;
  title?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  message,
  title = uiText.errorTitle,
  onRetry,
  retryLabel = uiText.retry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-md rounded-lg border border-danger/30 bg-danger/5 px-lg py-xl text-center',
        className,
      )}
    >
      <span className="text-danger">
        <AlertCircleIcon width={32} height={32} />
      </span>
      <div className="flex flex-col gap-xs">
        <p className="text-sm font-semibold text-danger">{title}</p>
        <p className="text-sm text-neutral-500">{message}</p>
      </div>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
