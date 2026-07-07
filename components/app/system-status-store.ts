import { AUDIT_RECORD_FAILED_EVENT } from '@/lib/modules/audit';

/**
 * System-status store — the honest, in-app source of truth for the top-bar
 * status indicator (System Status & Productivity Bar).
 *
 * It reflects ONLY real signals the browser genuinely has:
 *   • activeOps  — in-flight operations, incremented/decremented by the shared
 *                  useOperation runner (every service call funnels through it).
 *   • offline    — navigator.onLine + online/offline events.
 *   • auditGap   — the audit service's record-failure event (BDD-010): a
 *                  genuine "critical" signal (e.g. storage quota).
 *   • infra      — the last operation that failed with an infrastructure
 *                  category (external / unavailable / internal); business
 *                  categories (validation, not_found, conflict, …) never raise
 *                  a system alert — those are normal inline UX.
 *
 * Derived status: attention (any issue) → saving (activeOps > 0) → ready.
 * Framework-agnostic and component-free, so useOperation can import it with no
 * cycle. Consumed through `useSystemStatus`.
 */
export type SystemStatusLevel = 'ready' | 'saving' | 'attention';

export type SystemIssueId = 'offline' | 'audit' | 'infra';

export interface SystemIssue {
  readonly id: SystemIssueId;
  readonly message: string;
  readonly at: number;
}

export interface SystemStatusSnapshot {
  readonly activeOps: number;
  readonly issues: readonly SystemIssue[];
}

/** Infrastructure error categories that warrant a system alert. */
const SYSTEMIC_CATEGORIES = new Set(['external', 'unavailable', 'internal']);

const EMPTY_SNAPSHOT: SystemStatusSnapshot = { activeOps: 0, issues: [] };

let activeOps = 0;
let issues: SystemIssue[] = [];
let snapshot: SystemStatusSnapshot = EMPTY_SNAPSHOT;
const listeners = new Set<() => void>();
let browserWired = false;

function rebuildAndEmit(): void {
  snapshot = { activeOps, issues: [...issues] };
  listeners.forEach((listener) => listener());
}

function setIssue(issue: SystemIssue): void {
  issues = [issue, ...issues.filter((existing) => existing.id !== issue.id)];
  rebuildAndEmit();
}

function clearIssue(id: SystemIssueId): void {
  const next = issues.filter((existing) => existing.id !== id);
  if (next.length !== issues.length) {
    issues = next;
    rebuildAndEmit();
  }
}

/** Wire the browser signals once, on the first subscription (client only). */
function ensureBrowserWired(): void {
  if (browserWired || typeof window === 'undefined') {
    return;
  }
  browserWired = true;

  if (!navigator.onLine) {
    setIssue({ id: 'offline', message: 'لا يوجد اتصال بالشبكة', at: Date.now() });
  }
  window.addEventListener('online', () => clearIssue('offline'));
  window.addEventListener('offline', () =>
    setIssue({ id: 'offline', message: 'لا يوجد اتصال بالشبكة', at: Date.now() }),
  );
  window.addEventListener(AUDIT_RECORD_FAILED_EVENT, () =>
    setIssue({
      id: 'audit',
      message: 'تعذّر تسجيل عملية في سجل التدقيق — قد تكون مساحة التخزين ممتلئة',
      at: Date.now(),
    }),
  );
}

/** Minimal shape read off a failed operation's error. */
interface OperationError {
  readonly category?: string;
}

export const systemStatus = {
  /** An operation started (shared useOperation runner). */
  begin(): void {
    activeOps += 1;
    rebuildAndEmit();
  },

  /** An operation settled; a systemic failure raises a standing alert. */
  settle(error?: OperationError | null): void {
    activeOps = Math.max(0, activeOps - 1);
    if (error && error.category && SYSTEMIC_CATEGORIES.has(error.category)) {
      setIssue({
        id: 'infra',
        message: 'تعذّر إكمال عملية — تحقّق من الاتصال بالخادم',
        at: Date.now(),
      });
    } else {
      rebuildAndEmit();
    }
  },

  /** Dismiss a standing issue from the details panel. */
  acknowledge(id: SystemIssueId): void {
    clearIssue(id);
  },

  subscribe(listener: () => void): () => void {
    ensureBrowserWired();
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot(): SystemStatusSnapshot {
    return snapshot;
  },

  getServerSnapshot(): SystemStatusSnapshot {
    return EMPTY_SNAPSHOT;
  },
};

/** Derive the single status level from a snapshot. */
export function statusLevel(snap: SystemStatusSnapshot): SystemStatusLevel {
  if (snap.issues.length > 0) {
    return 'attention';
  }
  return snap.activeOps > 0 ? 'saving' : 'ready';
}
