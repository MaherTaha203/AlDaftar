'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { cn } from '../ui/cn';

/**
 * Sidebar — Sidebar Architecture v2 (03_UI_Specification.md §2).
 *
 * Physical model: the emerald rail is the solid object; the workspace is
 * carved out of it. The active navigation item is NOT a highlighted button —
 * it is the first visible part of the carved workspace, entering the rail's
 * body. That relationship is built in the DOM, not painted:
 *
 *   <nav>                     ← the rail: a face of the emerald solid
 *     <li>                    ← plain item: label resting on the solid
 *     <li> (the dock)         ← THE CARVE — an in-flow block that owns real
 *       ├ workspace surface   ←   height, so activating an item physically
 *       ├ rail cap (top)      ←   reshapes the rail:
 *       ├ active <Link>       ←   · the workspace surface enters at the seam
 *       └ rail cap (bottom)   ←   · the caps are the rail's own body, their
 *     <li>                    ←     corner radii curving into the carve
 *   </nav>
 *   <workspace panel>         ← same surface, flush at the seam — one ground
 *
 * Motion: on navigation the dock GLIDES from the old section to the new one
 * via the native View Transitions API (`.rail-dock` view-transition-name in
 * globals.css). The API snapshots the real in-flow dock before and after the
 * route change and morphs between them — the DOM keeps owning the geometry;
 * no measurement, no overlay. Unsupported browsers and reduced-motion users
 * get an instant, correct carve.
 *
 * Density: item height tracks `--ctrl-h`, and the rail is condensed to fit
 * common viewports without scrolling — a scrollbar would sit on the seam and
 * sever the carve (see `.rail-scroll`).
 *
 * Business-blind: navigation groups/items arrive as props; active detection
 * matches the current pathname prefix. Between lg and xl the rail collapses
 * to icons (the carve still works — it is layout, not decoration); below md
 * the shell renders it as a drawer (see AppShell).
 */
export interface SidebarItem {
  label: string;
  href: string;
  icon?: ReactNode;
}

export interface SidebarGroup {
  label: string;
  items: readonly SidebarItem[];
}

export interface SidebarProps {
  groups: readonly SidebarGroup[];
  /** App name/logo area at the top of the sidebar. */
  brand?: ReactNode;
  className?: string;
}

/** Height of the concave curve where the rail bends into the carve. */
const CAP = 'h-[18px]';

export function Sidebar({ groups, brand, className }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  // Resolves the pending view transition once the new route has rendered.
  const settleNavigation = useRef<(() => void) | null>(null);

  useEffect(() => {
    settleNavigation.current?.();
    settleNavigation.current = null;
  }, [pathname]);

  function isActive(href: string): boolean {
    return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
  }

  /**
   * Wraps client navigation in a view transition so the dock glides to the
   * clicked section. Falls back to the plain <Link> navigation for modified
   * clicks (new tab…), same-section clicks, reduced motion, and browsers
   * without the API.
   */
  function navigate(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      isActive(href) ||
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

  return (
    <nav
      aria-label="التنقل الرئيسي"
      className={cn(
        // A face of the emerald solid — flat, calm, and open toward the seam
        // (no inline-end padding/border) so the carve reaches the workspace.
        'rail-scroll relative flex h-full w-[236px] flex-col gap-md overflow-y-auto py-md pe-0 ps-0',
        'bg-(--rail-surface)',
        'max-xl:w-16 max-md:w-[260px]',
        className,
      )}
    >
      {brand ? <div className="px-md max-xl:px-xs max-md:px-md">{brand}</div> : null}

      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-xs">
          <p className="px-md text-[11px] font-medium tracking-wide text-white/40 max-xl:sr-only max-md:not-sr-only max-md:px-md">
            {group.label}
          </p>
          <ul className="flex flex-col gap-xs">
            {group.items.map((item) => {
              const active = isActive(item.href);

              if (active) {
                // The dock — the carved opening. In flow: it owns its full
                // height (cap + item + cap), so the rail physically changes
                // shape around the active item.
                return (
                  <li key={item.href} className="rail-dock relative">
                    {/* The workspace surface entering the rail: a full-height
                        strip at the seam, continuous with the content panel —
                        the concave caps reveal it. */}
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 end-0 w-[22px] bg-(--workspace-surface)"
                    />
                    {/* The rail's own body above the carve — its end-end
                        corner is the upper concave curve. */}
                    <span
                      aria-hidden="true"
                      className={cn('relative block rounded-ee-[18px] bg-(--rail-surface)', CAP)}
                    />
                    <Link
                      href={item.href}
                      aria-current="page"
                      title={item.label}
                      className={cn(
                        // First visible part of the workspace: same ground
                        // colour, reaching the seam — no border, no shadow.
                        'relative flex h-(--ctrl-h) items-center gap-sm rounded-s-2xl ms-sm px-md',
                        'bg-(--workspace-surface) text-sm font-bold text-primary',
                        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
                        'max-xl:ms-xs max-xl:justify-center max-xl:px-0 max-md:ms-sm max-md:justify-start max-md:px-md',
                      )}
                    >
                      {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
                      <span className="truncate max-xl:sr-only max-md:not-sr-only">
                        {item.label}
                      </span>
                    </Link>
                    {/* The rail's body below the carve — the lower curve. */}
                    <span
                      aria-hidden="true"
                      className={cn('relative block rounded-se-[18px] bg-(--rail-surface)', CAP)}
                    />
                  </li>
                );
              }

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={item.label}
                    onClick={(event) => navigate(event, item.href)}
                    className={cn(
                      'group flex h-(--ctrl-h) items-center gap-sm rounded-2xl px-md text-sm',
                      'me-sm ms-sm font-medium text-white/72',
                      'transition-[transform,background-color,color,box-shadow] duration-200 ease-out',
                      // Hover: the item leans toward the workspace and its
                      // surface softens toward it — no scale, no pop.
                      'hover:-translate-x-1.5 hover:bg-white/[0.12] hover:font-semibold hover:text-white',
                      'hover:shadow-[-10px_0_26px_-14px_rgba(0,0,0,0.32)]',
                      'focus-visible:outline-2 focus-visible:outline-white',
                      'max-xl:mx-xs max-xl:justify-center max-xl:px-0 max-md:mx-sm max-md:justify-start max-md:px-md',
                    )}
                  >
                    {item.icon ? (
                      <span className="shrink-0 opacity-85 transition-[transform,opacity] duration-200 ease-out group-hover:-translate-x-0.5 group-hover:opacity-100">
                        {item.icon}
                      </span>
                    ) : null}
                    <span className="truncate max-xl:sr-only max-md:not-sr-only">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
