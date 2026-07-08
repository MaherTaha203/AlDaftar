import type { ReactNode } from 'react';
import { cn } from '../ui/cn';

/**
 * PageContainer — 03_UI_Specification.md §1: content area max-width 1280px,
 * centered, spacing from the theme scale. One page structure across the whole
 * app (Visual Identity #16 — layout consistency): breadcrumb → title row
 * (title + primary action) → optional description → content. Adopting the same
 * skeleton on every screen is what makes the pages read as one product.
 */
export interface PageContainerProps {
  title: ReactNode;
  /** End-aligned title-row actions (primary Button etc.). */
  actions?: ReactNode;
  /** Breadcrumb slot rendered above the title row. */
  breadcrumb?: ReactNode;
  /** Optional one-line description under the title (page purpose). */
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PageContainer({
  title,
  actions,
  breadcrumb,
  description,
  children,
  className,
}: PageContainerProps) {
  return (
    <div className={cn('mx-auto flex w-full max-w-[1280px] flex-col gap-md p-lg', className)}>
      <div className="flex flex-col gap-xs">
        {breadcrumb}
        <div className="flex flex-wrap items-center justify-between gap-md">
          <h1 className="text-xl font-semibold tracking-[-0.01em]">{title}</h1>
          {actions ? <div className="flex items-center gap-sm">{actions}</div> : null}
        </div>
        {description ? (
          <p className="max-w-[70ch] text-sm text-neutral-400">{description}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-md">{children}</div>
    </div>
  );
}
