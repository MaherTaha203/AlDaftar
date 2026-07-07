'use client';

import { forwardRef, type ButtonHTMLAttributes, type PointerEvent, type ReactNode } from 'react';
import { cn } from './cn';
import { Spinner } from './spinner';

/**
 * Button — 04_Component_Library.md §1, Royal Emerald interaction language.
 * Variants: primary | secondary | danger | ghost | link. Sizes: md | sm.
 * `loading` shows a spinner while preserving width and sets `aria-busy`;
 * the button is inert while loading. Icon-only usage must pass `aria-label`.
 *
 * Interaction (approved motion spec): 150–220ms transitions only — gentle
 * lift on hover, 0.99 scale on press, soft shadow expansion, and on filled
 * variants a very subtle cursor-following light (radial highlight driven by
 * the --mx/--my custom properties; pure CSS paint, no layout work).
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

/** Cursor-light overlay for filled variants (primary/danger). */
const litClasses =
  'relative overflow-hidden after:pointer-events-none after:absolute after:inset-0 ' +
  'after:rounded-[inherit] after:opacity-0 after:transition-opacity after:duration-200 ' +
  'after:bg-[radial-gradient(120px_circle_at_var(--mx,50%)_var(--my,40%),rgba(255,255,255,0.16),transparent_65%)] ' +
  'hover:after:opacity-100';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'text-white focus-visible:outline-primary ' +
    'bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-primary)_86%,white)_0%,var(--color-primary)_100%)] ' +
    'shadow-[0_1px_2px_rgba(16,33,27,0.10),0_2px_10px_rgba(12,110,95,0.22)] ' +
    'hover:shadow-[0_2px_4px_rgba(16,33,27,0.10),0_6px_16px_rgba(12,110,95,0.30)] ' +
    litClasses,
  secondary:
    'border border-neutral-300 bg-white text-neutral-500 hover:bg-neutral-100 ' +
    'hover:border-neutral-400/70 shadow-sm hover:shadow-md focus-visible:outline-primary',
  danger:
    'text-white focus-visible:outline-danger ' +
    'bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-danger)_88%,white)_0%,var(--color-danger)_100%)] ' +
    'shadow-[0_1px_2px_rgba(16,33,27,0.10),0_2px_10px_rgba(194,69,47,0.24)] ' +
    'hover:shadow-[0_2px_4px_rgba(16,33,27,0.10),0_6px_16px_rgba(194,69,47,0.32)] ' +
    litClasses,
  ghost: 'text-neutral-500 hover:bg-neutral-100 focus-visible:outline-primary',
  link: 'text-primary underline-offset-4 hover:underline focus-visible:outline-primary',
};

const sizeClasses: Record<ButtonSize, string> = {
  md: 'h-[var(--ctrl-h)] px-md text-sm gap-sm',
  sm: 'h-8 px-sm text-sm gap-xs',
};

/** Variants that lift/press; link stays purely textual. */
const motionClasses = 'hover:-translate-y-px active:translate-y-0 active:scale-[0.99]';

function trackCursorLight(event: PointerEvent<HTMLButtonElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty('--mx', `${event.clientX - rect.left}px`);
  event.currentTarget.style.setProperty('--my', `${event.clientY - rect.top}px`);
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, icon, className, children, ...props },
  ref,
) {
  const lit = variant === 'primary' || variant === 'danger';
  return (
    <button
      ref={ref}
      type={props.type ?? 'button'}
      aria-busy={loading || undefined}
      onPointerMove={lit ? trackCursorLight : undefined}
      {...props}
      disabled={props.disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center rounded-md font-medium',
        'transition-[background-color,border-color,box-shadow,transform] duration-200',
        'focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variant !== 'link' && motionClasses,
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
