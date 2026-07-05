import type { ReactNode } from 'react';
import { cn } from '../ui/cn';

/**
 * PageContainer — 03_UI_Specification.md §1: content area max-width 1280px,
 * centered, spacing from the theme scale; page title row (title + primary
 * action at the inline end) with the breadcrumb slot beneath it.
 */
export interface PageContainerProps {
  title: ReactNode;
  /** End-aligned title-row actions (primary Button etc.). */
  actions?: ReactNode;
  /** Breadcrumb slot rendered under the title row. */
  breadcrumb?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PageContainer({
  title,
  actions,
  breadcrumb,
  children,
  className,
}: PageContainerProps) {
  return (
    <div className={cn('mx-auto flex w-full max-w-[1280px] flex-col gap-md p-lg', className)}>
      <div className="flex flex-wrap items-center justify-between gap-md">
        <h1 className="text-lg font-semibold">{title}</h1>
        {actions ? <div className="flex items-center gap-sm">{actions}</div> : null}
      </div>
      {breadcrumb}
      <div className="flex flex-col gap-md">{children}</div>
    </div>
  );
}
