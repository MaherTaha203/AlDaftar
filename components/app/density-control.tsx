'use client';

import { useSyncExternalStore } from 'react';
import { cn } from '../ui';
import { density, DENSITIES, type Density } from './density-store';

/**
 * DensityControl — a segmented control for the interface density preset
 * (Productivity Sprint #7). Persists across sessions via the density store;
 * changing it only affects spacing, row height, and control sizing.
 */
const LABELS: Record<Density, string> = {
  comfortable: 'مريح',
  compact: 'مضغوط',
  spacious: 'واسع',
};

export function DensityControl() {
  const current = useSyncExternalStore(
    density.subscribe,
    density.getSnapshot,
    density.getServerSnapshot,
  );

  return (
    <div
      role="radiogroup"
      aria-label="كثافة الواجهة"
      className="inline-flex rounded-lg border border-neutral-200 bg-neutral-100/60 p-1"
    >
      {DENSITIES.map((value) => {
        const active = current === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => density.set(value)}
            className={cn(
              'rounded-md px-md py-1 text-sm font-medium transition-colors duration-200',
              'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary',
              active
                ? 'bg-white text-primary shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700',
            )}
          >
            {LABELS[value]}
          </button>
        );
      })}
    </div>
  );
}
