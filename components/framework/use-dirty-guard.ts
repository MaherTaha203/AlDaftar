'use client';

import { useEffect } from 'react';

/**
 * useDirtyGuard — warns before the browser unloads a page with unsaved form
 * changes (the D-03 "unsaved changes" protection at the navigation boundary
 * the router cannot intercept). Active only while `dirty` is true; the
 * browser renders its own localized confirmation UI.
 */
export function useDirtyGuard(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) {
      return;
    }
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
}
