/**
 * Recent-row store (Productivity Sprint #9, Smart Row Highlight) — carries the
 * key of the row a user just created / edited / saved across a client
 * navigation back to its list, so the list can briefly highlight it. A
 * component-free module-level store (survives route changes, no import cycle),
 * read through useSyncExternalStore. The value is transient: `mark` sets it and
 * the consuming list clears it once the highlight animation has played.
 */
type RowKey = string | number;

let current: RowKey | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export const recentRow = {
  /** Remember the row to highlight on the next list render. */
  mark(key: RowKey): void {
    current = key;
    emit();
  },
  /** Clear the pending highlight (called once the animation has shown). */
  clear(): void {
    if (current !== null) {
      current = null;
      emit();
    }
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): RowKey | null {
    return current;
  },
  getServerSnapshot(): null {
    return null;
  },
};
