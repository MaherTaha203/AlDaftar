import { enableSupabasePersistence } from '@/lib/modules/shared/supabase-provider';

/**
 * Persistence bootstrap — the composition root's ONE side effect (GA /
 * Database Integration cutover). Imported exclusively by `AppProviders`
 * (client module graph), so it runs before any screen effect touches a
 * repository, on both the server render pass and the browser.
 *
 * Registration only — no network call happens here (the Supabase client is
 * created lazily on first repository use). Deliberately NOT exported through
 * the `components/app` barrel: tests import navigation/route helpers from
 * that folder and must never pull the environment-validated infrastructure
 * chain.
 *
 * Also exposes the one-time local-data import for the pre-cutover browser
 * data: run `await window.aldaftarMigrateLocalData()` once in the devtools
 * console on the device that holds the old records (idempotent; see
 * lib/modules/shared/local-data-migration.ts).
 */
enableSupabasePersistence();

declare global {
  interface Window {
    aldaftarMigrateLocalData?: () => Promise<unknown>;
  }
}

if (typeof window !== 'undefined') {
  window.aldaftarMigrateLocalData = async () => {
    const { migrateLocalDataToSupabase } =
      await import('@/lib/modules/shared/local-data-migration');
    const result = await migrateLocalDataToSupabase();
    // Console utility: readable output is the entire point.
    console.log('aldaftar local-data migration:', result);
    return result;
  };
}

export {};
