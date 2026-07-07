/**
 * Focus-mode store (Productivity Sprint #8) — collapses the workspace chrome
 * (sidebar + productivity bar) so a long document edit gets the full width and
 * a calmer field. A component-free module-level store read through
 * useSyncExternalStore; it sets `data-focus` on <html> and the CSS in
 * globals.css does the hiding. Deliberately NOT persisted: focus is a
 * transient working state that should reset on a fresh load, never trap the
 * user in a chrome-less shell after a reload.
 */
let active = false;
const listeners = new Set<() => void>();

function apply(): void {
  if (typeof document !== 'undefined') {
    if (active) {
      document.documentElement.dataset.focus = 'on';
    } else {
      delete document.documentElement.dataset.focus;
    }
  }
}

export const focusMode = {
  set(next: boolean): void {
    if (active === next) {
      return;
    }
    active = next;
    apply();
    listeners.forEach((listener) => listener());
  },
  toggle(): void {
    focusMode.set(!active);
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): boolean {
    return active;
  },
  getServerSnapshot(): boolean {
    return false;
  },
};
