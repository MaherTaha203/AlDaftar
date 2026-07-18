'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../ui/cn';
import { isNavActive, useNavGlide } from './nav-glide';
import type { SidebarGroup, SidebarItem } from './sidebar';

/**
 * BottomNav — the phone face of the emerald solid (Sidebar Architecture v2).
 *
 * Below md there is no side rail and no drawer: the solid continues along the
 * bottom of the screen instead, and the SAME carve happens there, rotated 90°.
 * The active item is a piece of the workspace surface descending into the
 * bar — real in-flow geometry, exactly like the desktop dock:
 *
 *   <workspace panel>          ← flush above, one continuous ground
 *   <nav>                      ← the bar: a face of the emerald solid
 *     <li>                     ← plain tile resting on the solid
 *     <li> (the dock)          ← THE CARVE — in flow, owns real width:
 *       ├ workspace surface    ←   · the workspace enters at the top seam
 *       ├ bar cap (start)      ←   · the caps are the bar's own body, their
 *       ├ active <Link>        ←     corner radii curving into the carve
 *       └ bar cap (end)
 *   </nav>
 *
 * Items marked `mobilePrimary` sit on the bar (compact icon+label tiles); the
 * rest fold politely behind «المزيد» into a bottom sheet — a rounded slab of
 * the workspace surface rising over the solid, keeping the system's shape.
 * When the active section lives inside the fold, the carve forms around the
 * «المزيد» tile so "you are here" never disappears.
 *
 * The dock shares `.rail-dock` with the desktop rail (only one face renders
 * per breakpoint), so the View Transitions glide works on the phone too.
 */
export interface BottomNavProps {
  groups: readonly SidebarGroup[];
  className?: string;
}

/** Width of the concave curve where the bar bends into the carve. */
const CAP = 'w-[18px]';

export function BottomNav({ groups, className }: BottomNavProps) {
  const { pathname, navigate } = useNavGlide();
  const [moreOpen, setMoreOpen] = useState(false);
  const sheetRef = useRef<HTMLDialogElement>(null);

  const items = groups.flatMap((group) => group.items);
  const primary = items.filter((item) => item.mobilePrimary);
  const folded = items.filter((item) => !item.mobilePrimary);
  const activeInFold = folded.some((item) => isNavActive(pathname, item.href));

  // The sheet is a native <dialog>: showModal() gives focus trapping,
  // Esc-to-close, and top-layer stacking for free (same pattern as Dialog).
  useEffect(() => {
    const dialog = sheetRef.current;
    if (!dialog) {
      return;
    }
    if (moreOpen && !dialog.open) {
      dialog.showModal();
    } else if (!moreOpen && dialog.open) {
      dialog.close();
    }
  }, [moreOpen]);

  // Navigating from the sheet closes it (backup for any navigation path).
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  /** One compact tile: icon above a small label. */
  function tileContent(item: SidebarItem) {
    return (
      <>
        {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
        <span className="max-w-full truncate">{item.shortLabel ?? item.label}</span>
      </>
    );
  }

  /** The dock <li> shell — the carve, horizontal (see DockChrome below). */
  const dockLi = 'rail-dock relative flex flex-none items-stretch';

  const tileBase =
    'flex h-full w-full flex-col items-center justify-center gap-1 px-xs text-[10px] font-medium';
  const dockTile =
    'relative flex h-full flex-col items-center justify-center gap-1 rounded-b-2xl bg-(--workspace-surface) px-sm text-[10px] font-bold text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary';

  return (
    <nav
      aria-label="التنقل السفلي"
      className={cn('bg-(--rail-surface) pb-[env(safe-area-inset-bottom)]', className)}
    >
      <ul className="flex h-[58px] items-stretch">
        {primary.map((item) => {
          const active = isNavActive(pathname, item.href);
          if (active) {
            return (
              <li key={item.href} className={dockLi}>
                <Dock>
                  <Link
                    href={item.href}
                    aria-current="page"
                    title={item.label}
                    className={dockTile}
                  >
                    {tileContent(item)}
                  </Link>
                </Dock>
              </li>
            );
          }
          return (
            <li key={item.href} className="min-w-0 flex-1">
              <Link
                href={item.href}
                title={item.label}
                onClick={(event) => navigate(event, item.href)}
                className={cn(
                  tileBase,
                  'text-white/70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white',
                )}
              >
                {tileContent(item)}
              </Link>
            </li>
          );
        })}

        {/* «المزيد» — the polite fold. Carved when the active section lives inside it. */}
        {activeInFold ? (
          <li className={dockLi}>
            <Dock>
              <button type="button" onClick={() => setMoreOpen(true)} className={dockTile}>
                <MoreIcon />
                <span>المزيد</span>
              </button>
            </Dock>
          </li>
        ) : (
          <li className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(
                tileBase,
                'text-white/70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white',
              )}
            >
              <MoreIcon />
              <span>المزيد</span>
            </button>
          </li>
        )}
      </ul>

      <dialog
        ref={sheetRef}
        aria-label="المزيد"
        onCancel={(event) => {
          event.preventDefault();
          setMoreOpen(false);
        }}
        onClick={(event) => {
          if (event.target === sheetRef.current) {
            setMoreOpen(false);
          }
        }}
        className="m-0 mt-auto w-full max-w-none bg-transparent p-0 backdrop:bg-black/40"
      >
        {/* A rounded slab of the workspace surface rising over the solid. */}
        <div className="sheet-rise rounded-t-[26px] bg-(--workspace-surface) px-md pb-[calc(env(safe-area-inset-bottom)+var(--spacing-md))] pt-sm">
          <span
            aria-hidden="true"
            className="mx-auto mb-sm block h-1 w-10 rounded-full bg-neutral-300"
          />
          <ul className="grid grid-cols-2 gap-xs">
            {folded.map((item) => {
              const active = isNavActive(pathname, item.href);
              return (
                <li key={item.href} className="min-w-0">
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      'flex items-center gap-sm rounded-xl px-sm py-2.5 text-sm',
                      'focus-visible:outline-2 focus-visible:outline-primary',
                      active
                        ? 'bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] font-bold text-primary'
                        : 'font-medium text-neutral-500 active:bg-neutral-200',
                    )}
                  >
                    {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </dialog>
    </nav>
  );
}

/**
 * The carve's chrome, horizontal — rendered inside the dock <li>: the
 * workspace surface entering the bar at the top seam, and the bar's own body
 * on both sides of the tile, corner radii bending into the carve (the same
 * real-element geometry as the desktop rail, rotated 90°).
 */
function Dock({ children }: { children: ReactNode }) {
  return (
    <>
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[16px] bg-(--workspace-surface)"
      />
      <span
        aria-hidden="true"
        className={cn('relative rounded-se-[16px] bg-(--rail-surface)', CAP)}
      />
      {children}
      <span
        aria-hidden="true"
        className={cn('relative rounded-ss-[16px] bg-(--rail-surface)', CAP)}
      />
    </>
  );
}

/** Four quiet dots — the fold's own mark (no arrow shapes in this design). */
function MoreIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="8.5" cy="8.5" r="1.4" />
      <circle cx="15.5" cy="8.5" r="1.4" />
      <circle cx="8.5" cy="15.5" r="1.4" />
      <circle cx="15.5" cy="15.5" r="1.4" />
    </svg>
  );
}
