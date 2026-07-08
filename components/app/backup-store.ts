/**
 * Backup store (Visual Identity #21) — remembers when a backup was last
 * downloaded from this device, so the Backup Center and the top-bar status can
 * reflect a real "last backup" instead of a fabricated one. Persisted in
 * localStorage (the honest per-device signal for a single-owner app); recorded
 * only after a download genuinely succeeds. Component-free module store.
 */
export const LAST_BACKUP_KEY = 'aldaftar.lastBackupAt';

let current: string | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function load(): void {
  if (loaded || typeof window === 'undefined') {
    return;
  }
  loaded = true;
  try {
    current = window.localStorage.getItem(LAST_BACKUP_KEY);
  } catch {
    current = null;
  }
}

export const backupStore = {
  /** Record a successful backup download (ISO timestamp). */
  markNow(iso: string): void {
    current = iso;
    try {
      window.localStorage.setItem(LAST_BACKUP_KEY, iso);
    } catch {
      // Preference not persisted this session; still reflected live.
    }
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void): () => void {
    load();
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): string | null {
    return current;
  },
  getServerSnapshot(): string | null {
    return null;
  },
};

/** Compact Arabic "time ago" for a backup timestamp. */
export function backupAgo(iso: string | null, nowMs: number): string {
  if (!iso) {
    return 'لم تُنشأ نسخة بعد';
  }
  const diff = Math.max(0, nowMs - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'الآن';
  if (min < 60) return `قبل ${min} دقيقة`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `قبل ${hr} ساعة`;
  const days = Math.floor(hr / 24);
  return `قبل ${days} يوم`;
}
