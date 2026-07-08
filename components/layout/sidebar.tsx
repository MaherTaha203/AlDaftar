'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { cn } from '../ui/cn';

/**
 * Sidebar — 03_UI_Specification.md §2. Fixed inline-start (right in RTL)
 * navigation, 260px; collapses to icons between lg and xl per 03 §5.
 * Business-blind: navigation groups/items arrive as props; active detection
 * matches the current pathname prefix. Below md the shell renders it as a
 * drawer (see AppShell).
 *
 * Visual identity — Royal Emerald (Design Sprint, approved concept B). The
 * sidebar is a deep emerald surface derived from the `--color-primary` token
 * (via color-mix, so it tracks the token and adds nothing to the DL-006 theme
 * projection). Light foreground; the active item carries a soft white "you are
 * here" bar. This is the element the product is recognized by, while the
 * content workspace stays white and calm for long entry sessions.
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

export function Sidebar({ groups, brand, className }: SidebarProps) {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav
      aria-label="التنقل الرئيسي"
      className={cn(
        'flex h-full w-[260px] flex-col gap-lg overflow-y-auto border-e border-white/10 p-md',
        // Royal Emerald surface — a subtle vertical depth built from the
        // primary token so it deepens the brand without a new token.
        'bg-[linear-gradient(186deg,color-mix(in_srgb,var(--color-primary)_86%,#04211c)_0%,var(--color-primary)_58%,color-mix(in_srgb,var(--color-primary)_78%,#020e0b)_100%)]',
        'max-xl:w-16 max-xl:items-center max-md:w-[260px] max-md:items-stretch',
        className,
      )}
    >
      {brand ? <div className="px-sm py-xs max-xl:px-0 max-md:px-sm">{brand}</div> : null}
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-xs">
          <p className="px-sm text-xs font-medium tracking-wide text-white/45 max-xl:sr-only max-md:not-sr-only max-md:px-sm">
            {group.label}
          </p>
          <ul className="flex flex-col gap-xs">
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    title={item.label}
                    className={cn(
                      'relative flex items-center gap-sm rounded-md px-sm py-sm text-sm transition-colors duration-150',
                      'focus-visible:outline-2 focus-visible:outline-white',
                      // Active: soft white wash + a rounded, gently glowing
                      // accent bar at the inline-start edge (the "you are here"
                      // indicator) — the calm identity cue on the emerald field.
                      active
                        ? 'bg-white/[0.12] font-semibold text-white before:absolute before:inset-y-1.5 before:start-0 before:w-[3px] before:rounded-full before:bg-white before:shadow-[0_0_10px_rgba(255,255,255,0.45)] max-xl:before:hidden max-md:before:block'
                        : 'text-white/70 hover:bg-white/[0.06] hover:text-white',
                    )}
                  >
                    {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
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
