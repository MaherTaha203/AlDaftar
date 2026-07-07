/**
 * Density store (Productivity Sprint #7) — the interface density preset,
 * persisted across sessions. Sets `data-density` on <html>; the CSS in
 * globals.css rescales semantic spacing, table row height, and control height
 * only. Component-free module-level store (no import cycle), read through
 * useSyncExternalStore. A no-flash inline script in the root layout applies
 * the saved value before first paint; this store keeps it in sync at runtime.
 */
export type Density = 'comfortable' | 'compact' | 'spacious';

export const DENSITIES: readonly Density[] = ['comfortable', 'compact', 'spacious'];
export const DENSITY_STORAGE_KEY = 'aldaftar.density';

const DEFAULT: Density = 'comfortable';

let current: Density = DEFAULT;
let loaded = false;
const listeners = new Set<() => void>();

function isDensity(value: unknown): value is Density {
  return value === 'comfortable' || value === 'compact' || value === 'spacious';
}

function apply(): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.density = current;
  }
}

function load(): void {
  if (loaded || typeof window === 'undefined') {
    return;
  }
  loaded = true;
  try {
    const saved = window.localStorage.getItem(DENSITY_STORAGE_KEY);
    if (isDensity(saved)) {
      current = saved;
    }
  } catch {
    current = DEFAULT;
  }
  apply();
}

export const density = {
  set(next: Density): void {
    current = next;
    try {
      window.localStorage.setItem(DENSITY_STORAGE_KEY, next);
    } catch {
      // Preference not persisted this session; still applied live.
    }
    apply();
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void): () => void {
    load();
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): Density {
    return current;
  },
  getServerSnapshot(): Density {
    return DEFAULT;
  },
};
