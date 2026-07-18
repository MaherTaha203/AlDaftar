'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, type MouseEvent } from 'react';

/**
 * Shared navigation-architecture helpers (Sidebar Architecture v2), used by
 * both faces of the emerald solid: the desktop rail (Sidebar) and the phone
 * bottom bar (BottomNav). One definition of "which section am I in" and one
 * definition of how the carve glides between sections.
 */

/** Active detection — matches the current pathname prefix. */
export function isNavActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The carve glide. Wraps client navigation in a native view transition so the
 * dock (`.rail-dock`, see globals.css) morphs from the old section to the new
 * one. The API snapshots the real in-flow dock before and after the route
 * change — the DOM keeps owning the geometry; no measurement, no overlay.
 *
 * `navigate` falls back to the plain <Link> behaviour for modified clicks
 * (new tab…), same-section clicks, reduced motion, and browsers without the
 * API — those get an instant, correct carve.
 */
export function useNavGlide() {
  const pathname = usePathname();
  const router = useRouter();
  // Resolves the pending view transition once the new route has rendered.
  const settleNavigation = useRef<(() => void) | null>(null);

  useEffect(() => {
    settleNavigation.current?.();
    settleNavigation.current = null;
  }, [pathname]);

  function navigate(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      isNavActive(pathname, href) ||
      typeof document.startViewTransition !== 'function' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    event.preventDefault();
    document.startViewTransition(() => {
      router.push(href);
      return new Promise<void>((resolve) => {
        settleNavigation.current = resolve;
        // Never hold the old frame hostage if the route stalls.
        setTimeout(resolve, 800);
      });
    });
  }

  return { pathname, navigate };
}
