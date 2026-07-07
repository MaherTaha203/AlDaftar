'use client';

import { useEffect, useRef } from 'react';
import { shortcutRegistry, type ShortcutAction } from './shortcut-registry';

/**
 * useShortcut — register a contextual handler for a named keyboard action
 * (Productivity Sprint #3). The latest closure is always used (ref-kept), and
 * the registration is a LIFO stack so a dialog/screen mounted later takes
 * precedence and cleanly restores the previous handler on unmount. Pass
 * `enabled: false` to suspend without unregistering call-site order.
 */
export function useShortcut(
  action: ShortcutAction,
  handler: () => void,
  enabled: boolean = true,
): void {
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    if (!enabled) {
      return;
    }
    return shortcutRegistry.register(action, { run: () => ref.current() });
  }, [action, enabled]);
}
