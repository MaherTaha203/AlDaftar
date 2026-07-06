import { afterEach, describe, expect, it } from 'vitest';
import { failure, success, ErrorFactory } from '@/lib/core';
import {
  AuditAction,
  AuditService,
  AUDIT_RECORD_FAILED_EVENT,
  type AuditEntry,
  type AuditRepository,
} from '@/lib/modules/audit';

/**
 * Audit trail edge behavior: a failed append never throws (best-effort at the
 * edge) but must never be silent — it returns a failure Result AND dispatches
 * the UI notification event so the owner sees the gap (BDD-010).
 */
function input() {
  return {
    action: AuditAction.Create,
    entityType: 'purchase',
    entityId: 'p1',
    entityLabel: 'فاتورة شراء',
    summary: 'إنشاء مسودة فاتورة شراء',
  };
}

const failingRepository: AuditRepository = {
  findAll: async () => success<readonly AuditEntry[]>([]),
  create: async () => failure(ErrorFactory.internal('quota exceeded')),
};

const workingRepository: AuditRepository = {
  findAll: async () => success<readonly AuditEntry[]>([]),
  create: async (entry) => success(entry),
};

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

describe('AuditService.record', () => {
  it('returns a failure Result and dispatches the failure event when the append fails', async () => {
    const dispatched: string[] = [];
    (globalThis as { window?: unknown }).window = {
      dispatchEvent: (event: Event) => {
        dispatched.push(event.type);
        return true;
      },
    };

    const result = await new AuditService(failingRepository).record(input());

    expect(result.ok).toBe(false);
    expect(dispatched).toEqual([AUDIT_RECORD_FAILED_EVENT]);
  });

  it('records successfully without dispatching the failure event', async () => {
    const dispatched: string[] = [];
    (globalThis as { window?: unknown }).window = {
      dispatchEvent: (event: Event) => {
        dispatched.push(event.type);
        return true;
      },
    };

    const result = await new AuditService(workingRepository).record(input());

    expect(result.ok).toBe(true);
    expect(dispatched).toEqual([]);
  });
});
