/**
 * Keyboard-shortcut registry (Productivity Sprint #3) — a component-free store
 * mapping named actions to a stack of handlers. Pages register contextual
 * handlers with `useShortcut`; the global listener (ShortcutsProvider) invokes
 * the topmost registered handler for an action and only then preventDefaults —
 * so a browser-native key (Ctrl+S/P/F) is overridden ONLY where the app has a
 * real equivalent, and never trapped on a page that lacks one.
 */
export type ShortcutAction =
  | 'search' // Ctrl+F — focus the in-page search
  | 'new' // Ctrl+N — new document/record
  | 'save' // Ctrl+S — save the current form
  | 'print' // Ctrl+P — print the current document
  | 'edit' // F2 — edit the current record
  | 'delete'; // Delete — delete the current record (with confirm)

export interface ShortcutHandler {
  run: () => void;
}

const stacks = new Map<ShortcutAction, ShortcutHandler[]>();

export const shortcutRegistry = {
  register(action: ShortcutAction, handler: ShortcutHandler): () => void {
    const stack = stacks.get(action) ?? [];
    stack.push(handler);
    stacks.set(action, stack);
    return () => {
      const current = stacks.get(action);
      if (!current) return;
      const index = current.indexOf(handler);
      if (index !== -1) current.splice(index, 1);
    };
  },
  /** Invoke the topmost handler for an action; returns true if one ran. */
  dispatch(action: ShortcutAction): boolean {
    const stack = stacks.get(action);
    if (!stack || stack.length === 0) {
      return false;
    }
    stack[stack.length - 1].run();
    return true;
  },
  has(action: ShortcutAction): boolean {
    const stack = stacks.get(action);
    return !!stack && stack.length > 0;
  },
};
