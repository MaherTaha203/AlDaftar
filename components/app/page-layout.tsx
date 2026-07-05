'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Breadcrumb, PageContainer, type BreadcrumbItem } from '../layout';
import { buildBreadcrumbs } from './breadcrumbs';
import { getRouteTitle } from './routes';

/**
 * PageLayout — the master screen scaffold every module page adopts.
 *
 * Standardizes the content pattern from `03_UI_Specification.md` §1
 * (title row → breadcrumb → toolbar → content → footer). Title and breadcrumb
 * are derived automatically from the current route via the Phase 3 navigation
 * utilities, so screens stay consistent with the approved route map; both can
 * be overridden, and `leafLabel` supplies the human name for a dynamic record
 * on detail/edit screens.
 *
 * Structural only — no data, no business logic. Content-level states
 * (loading / empty / error) are owned by the page body using the Sprint 1
 * `Skeleton` / `EmptyState` / `ErrorState` components.
 */
export interface PageLayoutProps {
  /** Page heading; defaults to the current route's Arabic title. */
  title?: ReactNode;
  /** Human label for a dynamic record segment (detail/edit screens). */
  leafLabel?: string;
  /** Explicit breadcrumb trail; overrides the route-derived one. */
  breadcrumb?: readonly BreadcrumbItem[];
  /** Title-row actions at the inline end (e.g. a primary Button). */
  actions?: ReactNode;
  /** Toolbar above the content (search / filters), per 03 §1. */
  toolbar?: ReactNode;
  /** Footer below the content (e.g. Pagination). */
  footer?: ReactNode;
  children: ReactNode;
}

export function PageLayout({
  title,
  leafLabel,
  breadcrumb,
  actions,
  toolbar,
  footer,
  children,
}: PageLayoutProps) {
  const pathname = usePathname();
  const items = breadcrumb ?? buildBreadcrumbs(pathname, { leafLabel });
  const heading = title ?? getRouteTitle(pathname);

  return (
    <PageContainer
      title={heading}
      actions={actions}
      breadcrumb={items.length > 0 ? <Breadcrumb items={items} /> : undefined}
    >
      {toolbar}
      {children}
      {footer}
    </PageContainer>
  );
}
