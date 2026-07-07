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
        'flex h-full w-[260px] flex-col gap-lg overflow-y-auto border-e border-neutral-200 bg-white/95 p-md backdrop-blur-sm',
        'max-xl:w-16 max-xl:items-center max-md:w-[260px] max-md:items-stretch',
        className,
      )}
    >
      {brand ? <div className="px-sm py-xs max-xl:px-0 max-md:px-sm">{brand}</div> : null}
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-xs">
          <p className="px-sm text-xs font-medium text-neutral-400 max-xl:sr-only max-md:not-sr-only max-md:px-sm">
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
                      'focus-visible:outline-2 focus-visible:outline-primary',
                      // Active: soft emerald wash + a rounded accent bar at the
                      // inline-start edge (the "you are here" indicator).
                      active
                        ? 'bg-primary/[0.08] font-semibold text-primary before:absolute before:inset-y-1.5 before:start-0 before:w-[3px] before:rounded-full before:bg-primary max-xl:before:hidden max-md:before:block'
                        : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700',
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
