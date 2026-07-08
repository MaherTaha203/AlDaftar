import { AUDIT_RECORD_FAILED_EVENT } from '@/lib/modules/audit';

/**
 * Notifications store (Visual Identity #1 — top bar) — an append-only history
 * of noteworthy events, distinct from the live system-status pill (which shows
 * the current derived level). It is fed ONLY by real signals the app genuinely
 * has: audit-record failures (BDD-010) and connectivity changes. Other honest
 * producers push into it as they land (e.g. a completed backup, Batch 5). It
 * fabricates nothing — with no real events it shows an honest empty state.
 *
 * Component-free module store, read through useSyncExternalStore.
 */
export type NotificationKind = 'error' | 'warning' | 'success' | 'info';

export interface AppNotification {
  readonly id: string;
  readonly kind: NotificationKind;
  readonly title: string;
  readonly at: number;
  readonly read: boolean;
}

const MAX = 50;
let seq = 0;
let items: AppNotification[] = [];
const listeners = new Set<() => void>();
let browserWired = false;

function emit(): void {
  listeners.forEach((listener) => listener());
}

function add(kind: NotificationKind, title: string, at: number): void {
  seq += 1;
  items = [{ id: `n${seq}`, kind, title, at, read: false }, ...items].slice(0, MAX);
  emit();
}

/** Wire the real browser signals once, on first subscription (client only). */
function ensureWired(): void {
  if (browserWired || typeof window === 'undefined') {
    return;
  }
  browserWired = true;
  window.addEventListener(AUDIT_RECORD_FAILED_EVENT, () =>
    add('error', 'تعذّر تسجيل عملية في سجل التدقيق', Date.now()),
  );
  window.addEventListener('offline', () => add('warning', 'انقطع الاتصال بالشبكة', Date.now()));
  window.addEventListener('online', () => add('success', 'عاد الاتصال بالشبكة', Date.now()));
}

export const notifications = {
  /** Honest producers (e.g. backup) push real events here. */
  push(kind: NotificationKind, title: string, at: number): void {
    add(kind, title, at);
  },
  markAllRead(): void {
    if (items.some((item) => !item.read)) {
      items = items.map((item) => ({ ...item, read: true }));
      emit();
    }
  },
  clear(): void {
    if (items.length > 0) {
      items = [];
      emit();
    }
  },
  subscribe(listener: () => void): () => void {
    ensureWired();
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): readonly AppNotification[] {
    return items;
  },
  getServerSnapshot(): readonly AppNotification[] {
    return EMPTY;
  },
};

const EMPTY: readonly AppNotification[] = [];

export function unreadCount(list: readonly AppNotification[]): number {
  return list.reduce((n, item) => (item.read ? n : n + 1), 0);
}
