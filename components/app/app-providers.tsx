'use client';

import type { ReactNode } from 'react';
import { ToastProvider } from '../ui';
import { AuditFailureNotifier } from './audit-failure-notifier';
import { Calculator } from './calculator';
import { SingleTabGuard } from './single-tab-guard';
import './persistence-bootstrap';

/**
 * AppProviders — the application's global client-provider composition,
 * mounted once at the top of the app route group. It provides the toast
 * system, the single-tab write guard, and the audit-gap notifier; and (via
 * the persistence-bootstrap side-effect import) it switches the
 * repository/file-store seams to Supabase before any screen touches a
 * repository. Future cross-cutting client providers (e.g. a confirm-dialog
 * service) are added here, so no screen ever wires providers itself.
 *
 * Deliberately thin and provider-agnostic: it holds no business state.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuditFailureNotifier />
      <SingleTabGuard>{children}</SingleTabGuard>
      {/* Mounted above the router so the floating calculator survives
          navigation and stays non-modal over any page. */}
      <Calculator />
    </ToastProvider>
  );
}
