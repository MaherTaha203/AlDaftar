import { APP_BRAND, navigationGroups } from './navigation';

/**
 * Route registry — the navigation system's lookup layer.
 *
 * Top-level route titles are derived from the sidebar configuration
 * (`navigation.tsx`), which is itself the transcription of the approved
 * design docs. Deriving here rather than re-listing routes means titles and
 * breadcrumbs can never drift from the sidebar. Pure module (no hooks, no
 * side effects) so it is usable on the server and unit-testable.
 */

/** Labels for the create/edit action segments (design `02_Screen_Flow.md`). */
export const ROUTE_ACTION_LABEL = {
  new: 'جديد',
  edit: 'تعديل',
} as const;

export type RouteActionSegment = keyof typeof ROUTE_ACTION_LABEL;

export interface RouteEntry {
  readonly href: string;
  readonly label: string;
}

const routeIndex: readonly RouteEntry[] = navigationGroups
  .flatMap((group) => group.items)
  .map((item) => ({ href: item.href, label: item.label }));

export function isRouteActionSegment(segment: string): segment is RouteActionSegment {
  return segment === 'new' || segment === 'edit';
}

/** Non-empty path segments, e.g. '/suppliers/42/edit' → ['suppliers','42','edit']. */
export function pathSegments(pathname: string): readonly string[] {
  return pathname.split('/').filter((segment) => segment !== '');
}

/**
 * Resolves the top-level module a pathname belongs to. `'/'` (Dashboard)
 * matches only the exact root; every other module matches its own path and
 * any deeper path. The longest matching prefix wins.
 */
export function matchTopLevelRoute(pathname: string): RouteEntry | undefined {
  let best: RouteEntry | undefined;
  for (const entry of routeIndex) {
    if (entry.href === '/') {
      if (pathname === '/') {
        return entry;
      }
      continue;
    }
    if (pathname === entry.href || pathname.startsWith(`${entry.href}/`)) {
      if (best === undefined || entry.href.length > best.href.length) {
        best = entry;
      }
    }
  }
  return best;
}

/**
 * Arabic title for a route, for page headings and the browser tab. Unmatched
 * routes fall back to the application brand.
 */
export function getRouteTitle(pathname: string): string {
  return matchTopLevelRoute(pathname)?.label ?? APP_BRAND;
}
