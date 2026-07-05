import type { ReactNode } from 'react';
import { AppProviders, AppShellFrame } from '@/components/app';

/**
 * Application route-group layout.
 *
 * Every real screen lives under this `(app)` group and therefore renders
 * inside the persistent shell: global providers (toasts) wrap the RTL chrome
 * (sidebar + header + mobile drawer), and the page renders in the scroll area.
 * The frozen root `app/layout.tsx` remains the minimal `<html dir="rtl">`
 * document; this layer adds the application shell without touching it.
 */
export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return (
    <AppProviders>
      <AppShellFrame>{children}</AppShellFrame>
    </AppProviders>
  );
}
