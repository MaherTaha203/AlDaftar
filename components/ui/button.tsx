'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from './cn';
import { Spinner } from './spinner';

/**
 * Button — 04_Component_Library.md §1.
 * Variants: primary | secondary | danger | ghost | link. Sizes: md | sm.
 * `loading` shows a spinner while preserving width and sets `aria-busy`;
 * the button is inert while loading. Icon-only usage must pass `aria-label`.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
export type ButtonSize = 'md' | 'sm';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Leading icon (decorative; rendered at the inline start). */
  icon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary/90 focus-visible:outline-primary',
  secondary:
    'border border-neutral-300 bg-white text-neutral-500 hover:bg-neutral-100 focus-visible:outline-primary',
  danger: 'bg-danger text-white hover:bg-danger/90 focus-visible:outline-danger',
  ghost: 'text-neutral-500 hover:bg-neutral-100 focus-visible:outline-primary',
  link: 'text-primary underline-offset-4 hover:underline focus-visible:outline-primary',
};

const sizeClasses: Record<ButtonSize, string> = {
  md: 'h-10 px-md text-sm gap-sm',
  sm: 'h-8 px-sm text-sm gap-xs',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, icon, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={props.type ?? 'button'}
      aria-busy={loading || undefined}
      {...props}
      disabled={props.disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center rounded-md font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
    >
      {loading ? <Spinner className="size-4" /> : icon}
      {children}
    </button>
  );
});
