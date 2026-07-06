'use client';

import type { ReactNode } from 'react';
import { ToastProvider } from '../ui';
import './persistence-bootstrap';

/**
 * AppProviders — the application's global client-provider composition,
 * mounted once at the top of the app route group. It provides the toast
 * system, and (via the persistence-bootstrap side-effect import) the
 * repository/file-store seams are switched to Supabase before any screen
 * touches a repository. Future cross-cutting client providers (e.g. a
 * confirm-dialog service) are added here, so no screen ever wires providers
 * itself.
 *
 * Deliberately thin and provider-agnostic: it holds no business state.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
