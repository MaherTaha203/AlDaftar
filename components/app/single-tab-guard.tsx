'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '../ui';

/**
 * SingleTabGuard — enforces the single-writer model the persistence layer
 * assumes (PURCHASE_ARCHITECTURE_REVIEW.md; localStorage writes are
 * read-modify-write over whole collections, so two live tabs can silently
 * revert posted documents or issue duplicate official numbers).
 *
 * A Web Locks API lock (`steal: true`) is held for the tab's lifetime: the
 * newest tab takes over and every older tab is covered by a blocking overlay
 * until reloaded. Browsers without the API keep today's behavior (no guard).
 */
const LOCK_NAME = 'aldaftar.single-tab';

export function SingleTabGuard({ children }: { children: ReactNode }) {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('locks' in navigator)) {
      return;
    }
    let disposed = false;
    let releaseHeld: (() => void) | undefined;
    navigator.locks
      .request(LOCK_NAME, { steal: true }, () => {
        if (disposed) {
          return;
        }
        setBlocked(false);
        return new Promise<void>((resolve) => {
          releaseHeld = resolve;
        });
      })
      // A newer tab stole the lock → this tab must stop writing.
      .catch(() => {
        if (!disposed) {
          setBlocked(true);
        }
      });
    return () => {
      disposed = true;
      releaseHeld?.();
    };
  }, []);

  if (!blocked) {
    return <>{children}</>;
  }
  return (
    <main className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-md bg-white p-lg text-center">
      <h1 className="text-2xl font-bold">الدفتر مفتوح في نافذة أخرى</h1>
      <p className="max-w-md text-sm text-neutral-500">
        لحماية البيانات من التعارض، يعمل الدفتر في نافذة واحدة فقط. أغلق النافذة الأخرى ثم تابع من
        هنا.
      </p>
      <Button onClick={() => window.location.reload()}>المتابعة هنا</Button>
    </main>
  );
}
