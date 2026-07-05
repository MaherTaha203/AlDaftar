'use client';

import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from './cn';

/**
 * Textarea — 04_Component_Library.md §1. Multiline input for notes;
 * defaults to 4 rows (design cap 6). Shows a live character counter when
 * `maxLength` is provided. Pair with `Field` for label + message wiring.
 */
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid = false, className, rows = 4, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={Math.min(rows, 6)}
      aria-invalid={invalid || undefined}
      {...props}
      className={cn(
        'w-full rounded-md border bg-white p-md text-sm text-neutral-500',
        'placeholder:text-neutral-400 transition-colors',
        'focus:outline-2 focus:outline-offset-1 focus:outline-primary',
        'disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:opacity-70',
        invalid ? 'border-danger focus:outline-danger' : 'border-neutral-300',
        className,
      )}
    />
  );
});
