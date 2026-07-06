'use client';

import type { ReactNode } from 'react';
import { ToastProvider } from '../ui';
import { AuditFailureNotifier } from './audit-failure-notifier';
import { SingleTabGuard } from './single-tab-guard';

/**
 * AppProviders — the application's global client-provider composition,
 * mounted once at the top of the app route group. Today it provides the
 * toast system, the single-tab write guard, and the audit-gap notifier;
 * future cross-cutting client providers (e.g. a confirm-dialog service) are
 * added here, so no screen ever wires providers itself.
 *
 * Deliberately thin and provider-agnostic: it holds no business state.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuditFailureNotifier />
      <SingleTabGuard>{children}</SingleTabGuard>
    </ToastProvider>
  );
}
