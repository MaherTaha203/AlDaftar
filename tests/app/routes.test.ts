import { describe, expect, it } from 'vitest';
import { APP_BRAND, navigationGroups } from '@/components/app/navigation';
import {
  getRouteTitle,
  isRouteActionSegment,
  matchTopLevelRoute,
  pathSegments,
} from '@/components/app/routes';

/** The configured Arabic label for a top-level route, from the nav source of
 * truth — so these tests verify the derivation wiring, not a frozen copy of
 * the (docs-driven) label text. */
function navLabel(href: string): string {
  const item = navigationGroups.flatMap((group) => group.items).find((i) => i.href === href);
  if (!item) {
    throw new Error(`no navigation item registered for ${href}`);
  }
  return item.label;
}

describe('pathSegments', () => {
  it('splits a pathname into non-empty segments', () => {
    expect(pathSegments('/suppliers/42/edit')).toEqual(['suppliers', '42', 'edit']);
    expect(pathSegments('/')).toEqual([]);
  });
});

describe('isRouteActionSegment', () => {
  it('recognizes only the create/edit action segments', () => {
    expect(isRouteActionSegment('new')).toBe(true);
    expect(isRouteActionSegment('edit')).toBe(true);
    expect(isRouteActionSegment('42')).toBe(false);
    expect(isRouteActionSegment('suppliers')).toBe(false);
  });
});

describe('matchTopLevelRoute', () => {
  it('matches the dashboard only at the exact root', () => {
    expect(matchTopLevelRoute('/')?.href).toBe('/');
    expect(matchTopLevelRoute('/suppliers')?.href).not.toBe('/');
  });

  it('matches a module by its own path and any deeper path', () => {
    expect(matchTopLevelRoute('/suppliers')?.href).toBe('/suppliers');
    expect(matchTopLevelRoute('/suppliers/42/edit')?.href).toBe('/suppliers');
  });

  it('does not confuse sibling routes that share a prefix', () => {
    expect(matchTopLevelRoute('/purchase-returns')?.href).toBe('/purchase-returns');
    expect(matchTopLevelRoute('/purchases')?.href).toBe('/purchases');
  });

  it('returns undefined for an unknown route', () => {
    expect(matchTopLevelRoute('/does-not-exist')).toBeUndefined();
  });
});

describe('getRouteTitle', () => {
  it('returns the configured module label for a known route', () => {
    expect(getRouteTitle('/')).toBe(navLabel('/'));
    expect(getRouteTitle('/suppliers')).toBe(navLabel('/suppliers'));
    expect(getRouteTitle('/purchases')).toBe(navLabel('/purchases'));
  });

  it('falls back to the app brand for an unknown route', () => {
    expect(getRouteTitle('/does-not-exist')).toBe(APP_BRAND);
  });
});
