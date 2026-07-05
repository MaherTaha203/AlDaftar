import type { BreadcrumbItem } from '../layout';
import {
  ROUTE_ACTION_LABEL,
  isRouteActionSegment,
  matchTopLevelRoute,
  pathSegments,
} from './routes';

/**
 * Breadcrumb builder for the navigation system.
 *
 * Produces the `Module / Record` trail specified in `03_UI_Specification.md`
 * §2 from a pathname, using the route registry for the module label. Dynamic
 * record segments (e.g. a supplier id) get their human label from the calling
 * page via `leafLabel`; create/edit segments resolve to fixed Arabic labels.
 * The Dashboard (`/`) intentionally has no breadcrumb (03 §2). Pure and
 * unit-testable; the last item is always the current page (no `href`).
 */
export interface BuildBreadcrumbsOptions {
  /** Human label for a dynamic record segment (e.g. the supplier's name). */
  readonly leafLabel?: string;
}

export function buildBreadcrumbs(
  pathname: string,
  options: BuildBreadcrumbsOptions = {},
): BreadcrumbItem[] {
  const base = matchTopLevelRoute(pathname);
  if (base === undefined || base.href === '/') {
    return [];
  }

  const moduleSegmentCount = pathSegments(base.href).length;
  const afterModule = pathSegments(pathname).slice(moduleSegmentCount);

  // Module root (list screen): a single, current crumb.
  if (afterModule.length === 0) {
    return [{ label: base.label }];
  }

  const items: BreadcrumbItem[] = [{ label: base.label, href: base.href }];
  const [first, second] = afterModule;

  if (isRouteActionSegment(first)) {
    // e.g. /suppliers/new → الموردون / جديد
    items.push({ label: ROUTE_ACTION_LABEL[first] });
    return items;
  }

  // `first` is a dynamic record id.
  const recordLabel = options.leafLabel ?? first;
  if (second !== undefined && isRouteActionSegment(second)) {
    // e.g. /suppliers/42/edit → الموردون / <name> / تعديل
    items.push({ label: recordLabel, href: `${base.href}/${first}` });
    items.push({ label: ROUTE_ACTION_LABEL[second] });
  } else {
    // e.g. /suppliers/42 → الموردون / <name>
    items.push({ label: recordLabel });
  }
  return items;
}
