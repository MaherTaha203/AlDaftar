'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { getCurrentUser, onAuthChange } from '@/lib/infrastructure';
import { Spinner, uiText } from '../ui';

/**
 * AuthGate — protects every application route (single-administrator model).
 * Renders children only with a live session; otherwise redirects to /login.
 * Subscribes to auth transitions so a sign-out anywhere immediately locks
 * the UI. This gate is UX-level protection; the enforced boundary is RLS
 * (migration 0002: authenticated-only policies), which holds even if the
 * client is tampered with.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  // null = still checking; false = no session (redirecting); true = signed in.
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    void getCurrentUser().then((user) => {
      if (!active) {
        return;
      }
      if (user) {
        setAuthed(true);
      } else {
        setAuthed(false);
        router.replace('/login');
      }
    });
    const unsubscribe = onAuthChange((user) => {
      if (!active) {
        return;
      }
      if (user) {
        setAuthed(true);
      } else {
        setAuthed(false);
        router.replace('/login');
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [router]);

  if (authed !== true) {
    return (
      <div className="flex min-h-dvh items-center justify-center gap-sm text-sm text-neutral-500">
        <Spinner />
        <span>{uiText.auth.checkingSession}</span>
      </div>
    );
  }

  return <>{children}</>;
}
