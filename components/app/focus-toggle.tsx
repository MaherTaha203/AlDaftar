'use client';

import { useSyncExternalStore } from 'react';
import { FocusIcon, cn } from '../ui';
import { focusMode } from './focus-store';

/**
 * FocusToggle (Productivity Sprint #8) — enters/leaves focus mode, which
 * collapses the sidebar and productivity bar for a distraction-free document
 * edit. Lives in the header so it is always reachable (it is also the way out
 * of focus mode). Reflects state via aria-pressed.
 */
export function FocusToggle() {
  const active = useSyncExternalStore(
    focusMode.subscribe,
    focusMode.getSnapshot,
    focusMode.getServerSnapshot,
  );
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? 'إنهاء وضع التركيز' : 'وضع التركيز'}
      title={active ? 'إنهاء وضع التركيز' : 'وضع التركيز'}
      onClick={() => focusMode.toggle()}
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-md transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        active
          ? 'bg-primary/[0.10] text-primary'
          : 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600',
      )}
    >
      <FocusIcon />
    </button>
  );
}
