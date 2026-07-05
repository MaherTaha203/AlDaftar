import { describe, expect, it } from 'vitest';
import { buildBreadcrumbs } from '@/components/app/breadcrumbs';
import { navigationGroups } from '@/components/app/navigation';
import { ROUTE_ACTION_LABEL } from '@/components/app/routes';

/** Configured Arabic label for a top-level route, from the nav source of truth
 * — so these tests verify the trail structure, not a frozen copy of the
 * (docs-driven) label text. */
function navLabel(href: string): string {
  const item = navigationGroups.flatMap((group) => group.items).find((i) => i.href === href);
  if (!item) {
    throw new Error(`no navigation item registered for ${href}`);
  }
  return item.label;
}

const suppliers = navLabel('/suppliers');

describe('buildBreadcrumbs', () => {
  it('produces no breadcrumb for the dashboard', () => {
    expect(buildBreadcrumbs('/')).toEqual([]);
  });

  it('produces no breadcrumb for an unknown route', () => {
    expect(buildBreadcrumbs('/does-not-exist')).toEqual([]);
  });

  it('a module root is a single current crumb (no href)', () => {
    expect(buildBreadcrumbs('/suppliers')).toEqual([{ label: suppliers }]);
  });

  it('a create route resolves the action to its fixed Arabic label', () => {
    expect(buildBreadcrumbs('/suppliers/new')).toEqual([
      { label: suppliers, href: '/suppliers' },
      { label: ROUTE_ACTION_LABEL.new },
    ]);
  });

  it('ignores a leaf label on an action route', () => {
    expect(buildBreadcrumbs('/suppliers/new', { leafLabel: 'ignored' })).toEqual([
      { label: suppliers, href: '/suppliers' },
      { label: ROUTE_ACTION_LABEL.new },
    ]);
  });

  it('a record route uses the raw segment when no leaf label is given', () => {
    expect(buildBreadcrumbs('/suppliers/42')).toEqual([
      { label: suppliers, href: '/suppliers' },
      { label: '42' },
    ]);
  });

  it('a record route uses the provided leaf label', () => {
    expect(buildBreadcrumbs('/suppliers/42', { leafLabel: 'شركة النور' })).toEqual([
      { label: suppliers, href: '/suppliers' },
      { label: 'شركة النور' },
    ]);
  });

  it('an edit route links the record and resolves the trailing action', () => {
    expect(buildBreadcrumbs('/suppliers/42/edit', { leafLabel: 'شركة النور' })).toEqual([
      { label: suppliers, href: '/suppliers' },
      { label: 'شركة النور', href: '/suppliers/42' },
      { label: ROUTE_ACTION_LABEL.edit },
    ]);
  });
});
