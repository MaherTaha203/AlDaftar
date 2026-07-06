import type { ReactNode } from 'react';
import { AppProviders, AppShellFrame, AuthGate } from '@/components/app';

/**
 * Application route-group layout.
 *
 * Every real screen lives under this `(app)` group and therefore renders
 * inside the persistent shell: global providers (toasts) wrap the AuthGate
 * (single-administrator protection — every application route requires a
 * session) which wraps the RTL chrome (sidebar + header + mobile drawer),
 * and the page renders in the scroll area. The frozen root `app/layout.tsx`
 * remains the minimal `<html dir="rtl">` document; the /login screen lives
 * outside this group and is the only unauthenticated surface.
 */
export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return (
    <AppProviders>
      <AuthGate>
        <AppShellFrame>{children}</AppShellFrame>
      </AuthGate>
    </AppProviders>
  );
}
