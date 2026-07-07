'use client';

import { useSyncExternalStore } from 'react';
import { CalculatorIcon, cn } from '../ui';
import { calculatorWindow } from './calculator-store';
import { SystemStatusIndicator } from './system-status-indicator';
import { TopClock } from './top-clock';

/**
 * ProductivityBar — the top-bar cluster of the System Status & Productivity
 * Bar: live clock/date, the always-visible system-status indicator, and the
 * floating-calculator toggle. Placed in the header's end slot next to the
 * (future) notification center. Every item earns its place with a daily
 * practical use; nothing here is decorative.
 */
export function ProductivityBar() {
  const windowState = useSyncExternalStore(
    calculatorWindow.subscribe,
    calculatorWindow.getSnapshot,
    calculatorWindow.getServerSnapshot,
  );

  return (
    <div className="flex items-center gap-sm">
      <TopClock />
      <SystemStatusIndicator />
      <button
        type="button"
        onClick={() => calculatorWindow.toggleOpen()}
        aria-label="الآلة الحاسبة"
        aria-pressed={windowState.open}
        title="الآلة الحاسبة"
        className={cn(
          'rounded-md p-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
          windowState.open
            ? 'bg-primary/10 text-primary'
            : 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600',
        )}
      >
        <CalculatorIcon />
      </button>
    </div>
  );
}
