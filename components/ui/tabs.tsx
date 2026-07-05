'use client';

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from './cn';

/**
 * Tabs — 04_Component_Library.md §3. Horizontal tabs under a detail header;
 * only the active panel renders (lazy per the design); optional count badge
 * per tab. Uncontrolled by default (`defaultTabId`), controllable via
 * `activeTabId` + `onTabChange`.
 *
 * Accessibility: WAI-ARIA tabs pattern — roving tabindex; in RTL, ArrowLeft
 * moves to the next tab and ArrowRight to the previous (physical keys mapped
 * to the visual order), plus Home/End.
 */
export interface TabItem {
  id: string;
  label: string;
  /** Optional count badge (e.g. number of attachments). */
  badge?: number;
  content: ReactNode;
}

export interface TabsProps {
  tabs: readonly TabItem[];
  defaultTabId?: string;
  /** Controlled active tab id; pair with `onTabChange`. */
  activeTabId?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, defaultTabId, activeTabId, onTabChange, className }: TabsProps) {
  const baseId = useId();
  const [internalId, setInternalId] = useState(defaultTabId ?? tabs[0]?.id ?? '');
  const currentId = activeTabId ?? internalId;
  const listRef = useRef<HTMLDivElement>(null);

  function activate(tabId: string) {
    if (activeTabId === undefined) {
      setInternalId(tabId);
    }
    onTabChange?.(tabId);
  }

  function focusTabAt(index: number) {
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    const target = buttons?.[index];
    if (target) {
      target.focus();
      const tab = tabs[index];
      if (tab) {
        activate(tab.id);
      }
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    // RTL: ArrowLeft advances (next tab), ArrowRight goes back.
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusTabAt((index + 1) % tabs.length);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusTabAt((index - 1 + tabs.length) % tabs.length);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusTabAt(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusTabAt(tabs.length - 1);
    }
  }

  const active = tabs.find((tab) => tab.id === currentId) ?? tabs[0];
  if (active === undefined) {
    return null;
  }

  return (
    <div className={cn('flex flex-col gap-md', className)}>
      <div
        ref={listRef}
        role="tablist"
        className="flex items-center gap-xs overflow-x-auto border-b border-neutral-200"
      >
        {tabs.map((tab, index) => {
          const selected = tab.id === active.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => activate(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cn(
                'inline-flex shrink-0 items-center gap-xs border-b-2 px-md py-sm text-sm transition-colors',
                'focus-visible:outline-2 focus-visible:outline-primary',
                selected
                  ? 'border-primary font-medium text-primary'
                  : 'border-transparent text-neutral-500 hover:text-neutral-400',
              )}
            >
              {tab.label}
              {tab.badge !== undefined ? (
                <span className="rounded-full bg-neutral-100 px-sm text-xs tabular-nums">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel-${active.id}`}
        aria-labelledby={`${baseId}-tab-${active.id}`}
      >
        {active.content}
      </div>
    </div>
  );
}
