'use client';

import type { ReactNode } from 'react';
import { cn } from '../ui/cn';
import { MenuIcon } from '../ui/icons';
import { uiText } from '../ui/ui-text';

/**
 * Header — 03_UI_Specification.md §2: 56px bar with the global search in
 * the center and quick actions. `onMenuClick` shows the mobile drawer
 * trigger (< md only); slots keep the header business-blind.
 */
export interface HeaderProps {
  /** App title / brand shown at the inline start. */
  title?: ReactNode;
  /** Center slot — the global SearchBox. */
  search?: ReactNode;
  /** End slot — quick actions (e.g. the "+ new" split button). */
  actions?: ReactNode;
  /** Opens the mobile navigation drawer; renders the trigger when set. */
  onMenuClick?: () => void;
  className?: string;
}

export function Header({ title, search, actions, onMenuClick, className }: HeaderProps) {
  return (
    <header
      className={cn(
        'flex h-14 items-center gap-md border-b border-neutral-200 bg-white/85 px-md backdrop-blur-md',
        className,
      )}
    >
      {onMenuClick ? (
        <button
          type="button"
          aria-label={uiText.menu}
          onClick={onMenuClick}
          className="rounded-md p-sm text-neutral-500 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-primary md:hidden"
        >
          <MenuIcon />
        </button>
      ) : null}
      {title ? <div className="shrink-0 text-sm font-semibold">{title}</div> : null}
      <div className="mx-auto w-full max-w-[480px]">{search}</div>
      {actions ? <div className="flex shrink-0 items-center gap-sm">{actions}</div> : null}
    </header>
  );
}
