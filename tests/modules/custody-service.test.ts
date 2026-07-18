import { beforeEach, describe, expect, it } from 'vitest';
import { failure, success, ErrorFactory, type AsyncResult, type Result } from '@/lib/core';
import {
  CustodyService,
  CustodyStatus,
  PresentedCustodyStatus,
  lineBalances,
  presentedStatus,
  returnProgress,
  type Custody,
  type CustodyDraftInput,
  type CustodyReturn,
} from '@/lib/modules/custody';

/**
 * CustodyService logic — the whole domain layer before any UI. Repositories are
 * injected in-memory fakes so the tests are hermetic; audit writes go through
 * the real best-effort path and are harmlessly swallowed (no window, no store).
 */

interface Row {
  readonly id: string;
}

function makeStore<T extends Row>() {
  const rows: T[] = [];
  return {
    rows,
    findAll: async (): AsyncResult<readonly T[]> => success([...rows]),
    findById: async (id: string): AsyncResult<T | null> =>
      success(rows.find((r) => r.id === id) ?? null),
    create: async (record: T): AsyncResult<T> => {
      rows.push(record);
      return success(record);
    },
    update: async (id: string, changes: Partial<T>): AsyncResult<T> => {
      const index = rows.findIndex((r) => r.id === id);
      if (index === -1) {
        return failure(ErrorFactory.notFound('missing', { id }));
      }
      rows[index] = { ...rows[index], ...changes, id } as T;
      return success(rows[index]);
    },
    remove: async (id: string): AsyncResult<void> => {
      const index = rows.findIndex((r) => r.id === id);
      if (index >= 0) {
        rows.splice(index, 1);
      }
      return success(undefined);
    },
  };
}

function unwrap<T>(result: Result<T>): T {
  if (!result.ok) {
    throw result.error;
  }
  return result.value;
}

function draftInput(overrides: Partial<CustodyDraftInput> = {}): CustodyDraftInput {
  return {
    recipient: 'أحمد',
    phone: '0599000000',
    date: '2026-07-01',
    lines: [{ item: 'حاسوب محمول', quantity: 5 }],
    ...overrides,
  };
}

let vouchers: ReturnType<typeof makeStore<Custody>>;
let returns: ReturnType<typeof makeStore<CustodyReturn>>;
let service: CustodyService;

beforeEach(() => {
  vouchers = makeStore<Custody>();
  returns = makeStore<CustodyReturn>();
  service = new CustodyService(vouchers, returns);
});

describe('CustodyService — draft lifecycle', () => {
  it('creates a draft with no number and a draft status', async () => {
    const custody = unwrap(await service.createDraft(draftInput()));
    expect(custody.number).toBeNull();
    expect(custody.status).toBe(CustodyStatus.Draft);
    expect(custody.recipient).toBe('أحمد');
    expect(custody.expectedReturnDate).toBeNull();
    expect(custody.lines).toHaveLength(1);
  });

  it('keeps an optional expected return date when provided', async () => {
    const custody = unwrap(
      await service.createDraft(draftInput({ expectedReturnDate: '2026-07-20' })),
    );
    expect(custody.expectedReturnDate).toBe('2026-07-20');
  });

  it('rejects a draft without a recipient', async () => {
    const result = await service.createDraft(draftInput({ recipient: '  ' }));
    expect(result.ok).toBe(false);
  });

  it('deletes a draft but never an issued voucher', async () => {
    const custody = unwrap(await service.createDraft(draftInput()));
    expect((await service.deleteDraft(custody.id)).ok).toBe(true);
    expect(vouchers.rows).toHaveLength(0);

    const issuedDraft = unwrap(await service.createDraft(draftInput()));
    unwrap(await service.issue(issuedDraft.id));
    expect((await service.deleteDraft(issuedDraft.id)).ok).toBe(false);
  });
});

describe('CustodyService — issue', () => {
  it('assigns an independent per-type sequence starting at 1', async () => {
    const a = unwrap(await service.createDraft(draftInput()));
    const b = unwrap(await service.createDraft(draftInput()));
    const issuedA = unwrap(await service.issue(a.id));
    const issuedB = unwrap(await service.issue(b.id));
    expect(issuedA.number).toBe(1);
    expect(issuedB.number).toBe(2);
    expect(issuedA.status).toBe(CustodyStatus.Issued);
    expect(issuedA.issuedAt).not.toBeNull();
  });

  it('refuses to issue with no lines or a zero quantity', async () => {
    const empty = unwrap(await service.createDraft(draftInput({ lines: [] })));
    expect((await service.issue(empty.id)).ok).toBe(false);

    const zero = unwrap(
      await service.createDraft(draftInput({ lines: [{ item: 'x', quantity: 0 }] })),
    );
    expect((await service.issue(zero.id)).ok).toBe(false);
  });

  it('makes an issued voucher immutable to updateDraft', async () => {
    const custody = unwrap(await service.createDraft(draftInput()));
    unwrap(await service.issue(custody.id));
    const result = await service.updateDraft(custody.id, draftInput({ recipient: 'خالد' }));
    expect(result.ok).toBe(false);
  });
});

describe('CustodyService — recordReturn (append-only history)', () => {
  async function issuedWithFive() {
    const custody = unwrap(await service.createDraft(draftInput()));
    const issued = unwrap(await service.issue(custody.id));
    return issued;
  }

  it('records a partial return and derives the remaining balance', async () => {
    const custody = await issuedWithFive();
    const lineId = custody.lines[0].id;

    unwrap(
      await service.recordReturn({
        custodyId: custody.id,
        date: '2026-07-05',
        quantities: { [lineId]: 2 },
      }),
    );
    const basis = unwrap(await service.basis(custody.id));
    expect(basis.balances[0].returned).toBe(2);
    expect(basis.balances[0].remaining).toBe(3);
    expect(basis.returns).toHaveLength(1);
  });

  it('accumulates multiple return events without overwriting history', async () => {
    const custody = await issuedWithFive();
    const lineId = custody.lines[0].id;
    unwrap(
      await service.recordReturn({
        custodyId: custody.id,
        date: '2026-07-05',
        quantities: { [lineId]: 2 },
      }),
    );
    unwrap(
      await service.recordReturn({
        custodyId: custody.id,
        date: '2026-07-08',
        quantities: { [lineId]: 1 },
      }),
    );
    const basis = unwrap(await service.basis(custody.id));
    expect(basis.returns).toHaveLength(2);
    expect(basis.balances[0].returned).toBe(3);
    expect(basis.balances[0].remaining).toBe(2);
  });

  it('rejects a return that exceeds the outstanding balance', async () => {
    const custody = await issuedWithFive();
    const lineId = custody.lines[0].id;
    const result = await service.recordReturn({
      custodyId: custody.id,
      date: '2026-07-05',
      quantities: { [lineId]: 6 },
    });
    expect(result.ok).toBe(false);
    expect(returns.rows).toHaveLength(0);
  });

  it('requires at least one positive quantity (zero rows are dropped)', async () => {
    const custody = await issuedWithFive();
    const lineId = custody.lines[0].id;
    const result = await service.recordReturn({
      custodyId: custody.id,
      date: '2026-07-05',
      quantities: { [lineId]: 0 },
    });
    expect(result.ok).toBe(false);
  });

  it('cannot record a return against a draft voucher', async () => {
    const custody = unwrap(await service.createDraft(draftInput()));
    const lineId = custody.lines[0].id;
    const result = await service.recordReturn({
      custodyId: custody.id,
      date: '2026-07-05',
      quantities: { [lineId]: 1 },
    });
    expect(result.ok).toBe(false);
  });
});

describe('CustodyService — cancel', () => {
  it('cancels a clean issued voucher', async () => {
    const custody = unwrap(await service.createDraft(draftInput()));
    unwrap(await service.issue(custody.id));
    const cancelled = unwrap(await service.cancel(custody.id));
    expect(cancelled.status).toBe(CustodyStatus.Cancelled);
    expect(cancelled.cancelledAt).not.toBeNull();
  });

  it('refuses to cancel once a return exists (history is load-bearing)', async () => {
    const custody = unwrap(await service.createDraft(draftInput()));
    const issued = unwrap(await service.issue(custody.id));
    unwrap(
      await service.recordReturn({
        custodyId: issued.id,
        date: '2026-07-05',
        quantities: { [issued.lines[0].id]: 1 },
      }),
    );
    expect((await service.cancel(custody.id)).ok).toBe(false);
  });

  it('refuses to cancel a draft', async () => {
    const custody = unwrap(await service.createDraft(draftInput()));
    expect((await service.cancel(custody.id)).ok).toBe(false);
  });
});

describe('presentedStatus + returnProgress (pure derivations)', () => {
  const base: Custody = {
    id: 'c1',
    number: 1,
    status: CustodyStatus.Issued,
    recipient: 'أحمد',
    phone: '',
    date: '2026-07-01',
    expectedReturnDate: '2026-07-15',
    notes: '',
    lines: [
      { id: 'l1', item: 'حاسوب', description: '', quantity: 4, remarks: '' },
      { id: 'l2', item: 'شاشة', description: '', quantity: 2, remarks: '' },
    ],
    createdAt: '',
    updatedAt: '',
    issuedAt: '2026-07-01T00:00:00.000Z',
    cancelledAt: null,
  };

  function ret(lines: { custodyLineId: string; quantity: number }[]): CustodyReturn {
    return { id: 'r', custodyId: 'c1', date: '2026-07-05', notes: '', lines, createdAt: '' };
  }

  it('is Issued when nothing is returned and not overdue', () => {
    expect(presentedStatus(base, [], '2026-07-10')).toBe(PresentedCustodyStatus.Issued);
  });

  it('is Partially Returned when some but not all is back', () => {
    const returns = [ret([{ custodyLineId: 'l1', quantity: 2 }])];
    expect(presentedStatus(base, returns, '2026-07-10')).toBe(
      PresentedCustodyStatus.PartiallyReturned,
    );
    expect(returnProgress(base, returns)).toBeCloseTo(2 / 6);
  });

  it('is Fully Returned when everything is back', () => {
    const returns = [
      ret([
        { custodyLineId: 'l1', quantity: 4 },
        { custodyLineId: 'l2', quantity: 2 },
      ]),
    ];
    expect(presentedStatus(base, returns, '2026-07-20')).toBe(PresentedCustodyStatus.FullyReturned);
    expect(returnProgress(base, returns)).toBe(1);
  });

  it('is Overdue past the expected date with items still out', () => {
    const returns = [ret([{ custodyLineId: 'l1', quantity: 1 }])];
    expect(presentedStatus(base, returns, '2026-07-16')).toBe(PresentedCustodyStatus.Overdue);
  });

  it('never reports a draft or cancelled voucher as overdue', () => {
    expect(presentedStatus({ ...base, status: CustodyStatus.Draft }, [], '2026-08-01')).toBe(
      PresentedCustodyStatus.Draft,
    );
    expect(presentedStatus({ ...base, status: CustodyStatus.Cancelled }, [], '2026-08-01')).toBe(
      PresentedCustodyStatus.Cancelled,
    );
  });

  it('computes per-line balances with remaining clamped at zero', () => {
    const balances = lineBalances(base, [ret([{ custodyLineId: 'l1', quantity: 4 }])]);
    expect(balances[0].remaining).toBe(0);
    expect(balances[1].remaining).toBe(2);
  });
});
