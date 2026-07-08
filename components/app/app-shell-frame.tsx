'use client';

import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { signOut } from '@/lib/infrastructure';
import { AuditAction, getAuditService } from '@/lib/modules/audit';
import { AppShell } from '../layout';
import { Button, LogOutIcon, uiText } from '../ui';
import { APP_BRAND, navigationGroups } from './navigation';
import { FocusToggle } from './focus-toggle';
import { ProductivityBar } from './productivity-bar';
import { SidebarBrand } from './sidebar-brand';
import {
  BackupStatus,
  GlobalSearch,
  HelpButton,
  NotificationsBell,
  QuickCreate,
  SystemCenter,
  UserMenu,
} from './top-bar';

/**
 * AppShellFrame — binds the reusable `AppShell` (Sprint 1) to this
 * application's navigation configuration, giving every route the persistent
 * RTL chrome (sidebar + header + mobile drawer) with page content rendered in
 * the scroll area. The header's end slot carries the sign-out action
 * (single-administrator model): it records the Logout audit action while the
 * session is still valid, then signs out — the AuthGate redirects to /login.
 *
 * The header's global search slot remains intentionally unfilled (Search —
 * its own phase), so the shell carries no behavior that does not yet exist.
 */
export function AppShellFrame({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function onLogout() {
    setSigningOut(true);
    // Second producer of the reserved Logout audit action (BDD-010) — written
    // BEFORE signOut, while the authenticated session can still insert.
    await getAuditService().record({
      action: AuditAction.Logout,
      entityType: 'auth',
      entityId: 'admin',
      entityLabel: 'المدير',
      summary: 'تسجيل خروج المدير',
    });
    await signOut();
    router.replace('/login');
  }

  return (
    <AppShell
      sidebar={{
        groups: navigationGroups,
        brand: <SidebarBrand />,
      }}
      header={{
        title: <span className="sr-only">{APP_BRAND}</span>,
        search: <GlobalSearch />,
        actions: (
          <>
            <span className="app-focus-collapsible contents">
              <QuickCreate />
              <NotificationsBell />
              <ProductivityBar />
              <BackupStatus />
              <span className="mx-0.5 h-5 w-px bg-neutral-200" aria-hidden="true" />
              <HelpButton />
              <SystemCenter />
              <UserMenu />
            </span>
            <FocusToggle />
            <Button
              variant="outline"
              size="sm"
              icon={<LogOutIcon />}
              loading={signingOut}
              onClick={() => void onLogout()}
            >
              {uiText.auth.logout}
            </Button>
          </>
        ),
      }}
    >
      {children}
    </AppShell>
  );
}
