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
        // Sidebar Architecture v2: the shell root IS the emerald solid — the
        // rail is a face of it, and the workspace panel is carved out of it
        // (inset, large radius). Flat colour so the carve stays seamless. On
        // paper the solid disappears (print keeps the sheet only).
        'flex h-dvh overflow-hidden bg-(--rail-surface)',
        'print:block print:h-auto print:overflow-visible print:bg-white',
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
        {/* The panel is fixed to the VIEWPORT, not the dialog: a modal <dialog>
            whose only child is out-of-flow collapses to zero width, so an
            `absolute` panel anchors to a 0-width box and lands off-screen (proven
            on phones). `fixed inset-y-0 start-0` pins it to the inline-start edge
            (right in this RTL app); the ::backdrop still dims + closes on tap. */}
        <div className="fixed inset-y-0 start-0 flex max-w-[calc(100vw-3rem)] bg-(--rail-surface) shadow-lg">
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

      {/* The workspace — carved out of the emerald solid: inset from the frame
          with the same large radius on ALL corners (a fully rounded slab sunk
          into the block), yet FLUSH at the rail seam (no margin, no border) so
          the surface stays continuous with the carve around the active nav
          item — the seam-side radii only notch the extreme corners, far from
          where the dock enters. Below md the rail is a drawer, so the
          workspace is full-bleed; on paper it is a plain sheet. */}
      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col overflow-hidden bg-(--workspace-surface)',
          'md:my-3.5 md:me-3.5 md:rounded-[26px]',
          'print:m-0 print:overflow-visible print:rounded-none print:bg-white',
        )}
      >
        <div className="screen-only contents">
          <Header {...header} onMenuClick={() => setDrawerOpen(true)} />
        </div>
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
