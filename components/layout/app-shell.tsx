'use client';

import type { ReactNode } from 'react';
import { cn } from '../ui/cn';
import { BottomNav } from './bottom-nav';
import { Header, type HeaderProps } from './header';
import { Sidebar, type SidebarProps } from './sidebar';

/**
 * AppShell — the application layout (03_UI_Specification.md §1), shaped by
 * Sidebar Architecture v2: the shell root IS the emerald solid. On desktop
 * the rail is a face of it at the inline start and the workspace panel is
 * carved out of it (inset, large radius, flush at the rail seam). Below md
 * the SAME solid continues along the bottom of the screen instead: no rail,
 * no drawer — a BottomNav bar with the identical carve, rotated 90°, and the
 * workspace flush above it. Navigation config and header slots come from the
 * caller, so the shell stays business-blind and mounts once at the root of
 * the app tree. On paper the solid disappears (print keeps the sheet only).
 */
export interface AppShellProps {
  sidebar: SidebarProps;
  header: Omit<HeaderProps, 'onMenuClick'>;
  children: ReactNode;
  className?: string;
}

export function AppShell({ sidebar, header, children, className }: AppShellProps) {
  return (
    <div
      className={cn(
        'flex h-dvh overflow-hidden bg-(--rail-surface) max-md:flex-col',
        'print:block print:h-auto print:overflow-visible print:bg-white',
        className,
      )}
    >
      <div className="app-focus-collapsible screen-only max-md:hidden">
        <Sidebar {...sidebar} />
      </div>

      {/* The workspace — carved out of the emerald solid: inset from the frame
          with the same large radius on ALL corners (a fully rounded slab sunk
          into the block), yet FLUSH at the rail seam (no margin, no border) so
          the surface stays continuous with the carve around the active nav
          item — the seam-side radii only notch the extreme corners, far from
          where the dock enters. Below md the seam moves to the BOTTOM edge
          (the BottomNav bar): full-bleed above, bottom corners notched, flush
          at the bar. On paper it is a plain sheet. */}
      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-(--workspace-surface)',
          'max-md:rounded-b-[20px]',
          'md:my-3.5 md:me-3.5 md:rounded-[26px]',
          'print:m-0 print:overflow-visible print:rounded-none print:bg-white',
        )}
      >
        <div className="screen-only contents">
          <Header {...header} />
        </div>
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>

      {/* The phone face of the solid — same carve, bottom seam. */}
      <div className="screen-only md:hidden">
        <BottomNav groups={sidebar.groups} />
      </div>
    </div>
  );
}
