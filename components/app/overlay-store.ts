/**
 * Overlay stores (Visual Identity #1 — top bar) — tiny component-free toggles
 * for the two global overlays owned by ShortcutsProvider: the command palette
 * and the keyboard-shortcuts guide. Exposing them as module stores lets the
 * header (global search, quick create, help) open them imperatively without a
 * context or prop-drilling, while the global keydown layer stays the same.
 */
function makeToggle() {
  let open = false;
  const listeners = new Set<() => void>();
  function emit(): void {
    listeners.forEach((listener) => listener());
  }
  return {
    open(): void {
      if (!open) {
        open = true;
        emit();
      }
    },
    close(): void {
      if (open) {
        open = false;
        emit();
      }
    },
    toggle(): void {
      open = !open;
      emit();
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot(): boolean {
      return open;
    },
    getServerSnapshot(): boolean {
      return false;
    },
  };
}

export const commandPalette = makeToggle();
export const shortcutGuide = makeToggle();
