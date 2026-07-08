'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../ui/cn';
import { CloseIcon } from '../ui/icons';
import { uiText } from '../ui/ui-text';
import { Header, type HeaderProps } from './header';
import { Sidebar, type SidebarProps } from './sidebar';

/**
 * AppShell — the application layout (03_UI_Specification.md §1): fixed
 * sidebar at the inline start, header on top, scrollable content area.
 * Below md the sidebar becomes an overlay drawer toggled from the header
 * (03 §5). Navigation config and header slots come from the caller, so the
 * shell stays business-blind and mounts once at the root of the app tree.
 */
export interface AppShellProps {
  sidebar: SidebarProps;
  header: Omit<HeaderProps, 'onMenuClick'>;
  children: ReactNode;
  className?: string;
}

export function AppShell({ sidebar, header, children, className }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDialogElement>(null);

  // The drawer is a native <dialog>: showModal() provides focus trapping,
  // Esc-to-close, and top-layer stacking for free (matching Dialog).
  useEffect(() => {
    const dialog = drawerRef.current;
    if (!dialog) {
      return;
    }
    if (drawerOpen && !dialog.open) {
      dialog.showModal();
    } else if (!drawerOpen && dialog.open) {
      dialog.close();
    }
  }, [drawerOpen]);

  return (
    <div
      className={cn(
        // Calm, static workspace ground — a very subtle emerald-tinted wash
        // (no motion inside the app, per the design brief).
        'flex h-dvh overflow-hidden bg-[linear-gradient(180deg,var(--color-neutral-100)_0%,color-mix(in_srgb,var(--color-neutral-100)_55%,white)_100%)]',
        className,
      )}
    >
      <div className="app-focus-collapsible screen-only max-md:hidden">
        <Sidebar {...sidebar} />
      </div>

      <dialog
        ref={drawerRef}
        aria-label={uiText.menu}
        onCancel={(event) => {
          event.preventDefault();
          setDrawerOpen(false);
        }}
        onClick={(event) => {
          if (event.target === drawerRef.current) {
            setDrawerOpen(false);
          }
        }}
        className="screen-only m-0 h-dvh max-h-none w-full max-w-none bg-transparent backdrop:bg-black/40 md:hidden"
      >
        <div className="absolute inset-y-0 start-0 flex bg-[color-mix(in_srgb,var(--color-primary)_82%,#020e0b)] shadow-lg">
          <Sidebar {...sidebar} />
          <button
            type="button"
            aria-label={uiText.close}
            onClick={() => setDrawerOpen(false)}
            className="absolute end-sm top-sm rounded-md p-xs text-white/70 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
          >
            <CloseIcon />
          </button>
        </div>
      </dialog>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="screen-only contents">
          <Header {...header} onMenuClick={() => setDrawerOpen(true)} />
        </div>
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
