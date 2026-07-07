'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from './cn';

/**
 * Input — 04_Component_Library.md §1. Text input with invalid/disabled/
 * read-only states. `ltr` forces left-to-right entry with start-aligned
 * text for references and phone numbers (03_UI_Specification.md §6.5).
 * Pair with `Field` for label + validation message wiring.
 */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  /** Force LTR content direction (references, phone numbers). */
  ltr?: boolean;
}

export const inputBaseClasses =
  'h-10 w-full rounded-md border bg-white px-md text-sm text-neutral-500 ' +
  'placeholder:text-neutral-400 transition-[border-color,box-shadow] duration-200 ' +
  'focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(12,110,95,0.16)] ' +
  'disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:opacity-70 ' +
  'read-only:bg-neutral-100';

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid = false, ltr = false, className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      dir={ltr ? 'ltr' : undefined}
      {...props}
      className={cn(
        inputBaseClasses,
        invalid
          ? 'border-danger focus:border-danger focus:shadow-[0_0_0_3px_rgba(194,69,47,0.16)]'
          : 'border-neutral-300',
        ltr && 'text-left',
        className,
      )}
    />
  );
});
