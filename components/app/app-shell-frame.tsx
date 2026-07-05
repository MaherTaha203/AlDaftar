'use client';

import type { ReactNode } from 'react';
import { AppShell } from '../layout';
import { APP_BRAND, navigationGroups } from './navigation';

/**
 * AppShellFrame — binds the reusable `AppShell` (Sprint 1) to this
 * application's navigation configuration, giving every route the persistent
 * RTL chrome (sidebar + header + mobile drawer) with page content rendered in
 * the scroll area.
 *
 * The header's global search and quick-action slots are intentionally left
 * unfilled here; they are wired in their own phases (Search — Phase 17), so
 * the shell carries no behavior that does not yet exist.
 */
export function AppShellFrame({ children }: { children: ReactNode }) {
  return (
    <AppShell
      sidebar={{
        groups: navigationGroups,
        brand: <span className="text-base font-semibold text-primary">{APP_BRAND}</span>,
      }}
      header={{ title: <span className="sr-only">{APP_BRAND}</span> }}
    >
      {children}
    </AppShell>
  );
}
