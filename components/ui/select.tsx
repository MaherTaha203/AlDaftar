'use client';

import { forwardRef, type ReactNode, type SelectHTMLAttributes } from 'react';
import { cn } from './cn';
import { ChevronDownIcon } from './icons';

/**
 * Select — 04_Component_Library.md §1, foundation form.
 * A styled native `<select>`: fully accessible and keyboard/type-ahead
 * capable by the platform. The richer searchable picker with quick-create
 * (EntityPicker) builds on top of it in a later sprint and is intentionally
 * NOT part of the UI foundation. `placeholder` renders as a disabled first
 * option bound to the empty value. `className` styles the wrapper, so it
 * controls the outer width (full-width by default; pass e.g. `w-20` to make
 * a compact select); the inner control always fills the wrapper.
 */
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  placeholder?: string;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { invalid = false, placeholder, className, children, ...props },
  ref,
) {
  return (
    <span className={cn('relative block', className)}>
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        {...props}
        className={cn(
          'h-10 w-full appearance-none rounded-md border bg-white ps-md pe-xl text-sm text-neutral-500',
          'transition-colors focus:outline-2 focus:outline-offset-1 focus:outline-primary',
          'disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:opacity-70',
          invalid ? 'border-danger focus:outline-danger' : 'border-neutral-300',
        )}
      >
        {placeholder !== undefined ? (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        ) : null}
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute end-md top-1/2 -translate-y-1/2 text-neutral-400" />
    </span>
  );
});
