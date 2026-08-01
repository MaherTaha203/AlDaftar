import { beforeEach, describe, expect, it } from 'vitest';
import { failure, success, ErrorFactory, type AsyncResult, type Result } from '@/lib/core';
import {
  CreditNoteReason,
  CreditNoteService,
  CreditNoteStatus,
  type CreditNote,
  type CreditNoteDraftInput,
} from '@/lib/modules/credit-notes';
import { PurchaseStatus, type Purchase } from '@/lib/modules/purchases';
import { ReturnStatus, type PurchaseReturn } from '@/lib/modules/purchase-returns';

/*
 * CreditNoteService — «إشعار دائن للمورد» (BDD-011 / DL-036). Hermetic:
 * repository and cross-service lookups are injected fakes; audit writes go
 * through the real best-effort path and are harmlessly swallowed.
 * Load-bearing assertions: posted immutability, the fixed purchase
 * reference, decrease-only amounts, attribution sum rule, and the SHARED
 * no-negative cap across returns + prior notes.
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

function expectError<T>(result: Result<T>): string {
  expect(result.ok).toBe(false);
  return result.ok ? '' : result.error.message;
}

/** A posted purchase worth 1000 (2 lines: 10×60=600, 8×50=400). */
function postedPurchase(): Purchase {
  return {
    id: 'P1',
    number: 1,
    status: PurchaseStatus.Posted,
    supplierId: 'S1',
    date: '2026-07-01',
    supplierInvoiceRef: 'INV-9',
    withoutSupplierInvoice: false,
    notes: '',
    lines: [
      { id: 'L1', productId: 'prod1', unitId: 'u1', quantity: 10, unitPrice: 60 },
      { id: 'L2', productId: 'prod2', unitId: 'u1', quantity: 8, unitPrice: 50 },
    ],
    createdAt: 't',
    updatedAt: 't',
    postedAt: 't',
  } as unknown as Purchase;
}

/** A posted return of 5×60 = 300 against L1. */
function postedReturn(): PurchaseReturn {
  return {
    id: 'R1',
    number: 1,
    status: ReturnStatus.Posted,
    purchaseId: 'P1',
    supplierId: 'S1',
    date: '2026-07-02',
    notes: '',
    lines: [
      {
        id: 'RL1',
        purchaseLineId: 'L1',
        productId: 'prod1',
        unitId: 'u1',
        quantity: 5,
        unitPrice: 60,
      },
    ],
    createdAt: 't',
    updatedAt: 't',
    postedAt: 't',
  };
}

function draftInput(overrides: Partial<CreditNoteDraftInput> = {}): CreditNoteDraftInput {
  return {
    purchaseId: 'P1',
    date: '2026-07-05',
    amount: 100,
    reasonType: CreditNoteReason.WrongPrice,
    reasonNote: 'فرق سعر متفق عليه',
    ...overrides,
  };
}

let store: ReturnType<typeof makeStore<CreditNote>>;
let purchases: Purchase[];
let returns: PurchaseReturn[];
let service: CreditNoteService;

beforeEach(() => {
  store = makeStore<CreditNote>();
  purchases = [postedPurchase()];
  returns = [];
  service = new CreditNoteService(
    store,
    async (id) => {
      const p = purchases.find((x) => x.id === id);
      return p ? success(p) : failure(ErrorFactory.notFound('missing purchase', { id }));
    },
    async (purchaseId) => success(returns.filter((r) => r.purchaseId === purchaseId)),
  );
});

describe('createDraft', () => {
  it('creates a draft copying the supplier, with no number', async () => {
    const note = unwrap(await service.createDraft(draftInput()));
    expect(note.status).toBe(CreditNoteStatus.Draft);
    expect(note.number).toBeNull();
    expect(note.supplierId).toBe('S1');
    expect(note.reasonNote).toBe('فرق سعر متفق عليه');
  });

  it('rejects a non-posted purchase reference', async () => {
    purchases[0] = { ...purchases[0], status: PurchaseStatus.Draft } as Purchase;
    expect(expectError(await service.createDraft(draftInput()))).toMatch(/posted purchase/);
  });

  it('rejects a non-positive amount (decrease-only design)', async () => {
    expect(expectError(await service.createDraft(draftInput({ amount: 0 })))).toMatch(
      /greater than zero/,
    );
    expect(expectError(await service.createDraft(draftInput({ amount: -5 })))).toMatch(
      /greater than zero/,
    );
  });

  it('rejects attributions that do not sum to the amount', async () => {
    const result = await service.createDraft(
      draftInput({
        amount: 100,
        attributions: [
          { purchaseLineId: 'L1', amount: 60 },
          { purchaseLineId: 'L2', amount: 30 },
        ],
      }),
    );
    expect(expectError(result)).toMatch(/sum to the credit note amount/);
  });

  it('accepts attributions that sum exactly, and normalizes them', async () => {
    const note = unwrap(
      await service.createDraft(
        draftInput({
          amount: 100,
          attributions: [
            { purchaseLineId: 'L1', amount: 60, note: 'فرق سعر' },
            { purchaseLineId: 'L2', amount: 40 },
          ],
        }),
      ),
    );
    expect(note.attributions).toHaveLength(2);
    expect(note.attributions[0].note).toBe('فرق سعر');
    expect(note.attributions[1].note).toBe('');
  });

  it('rejects an attribution referencing an unknown purchase line', async () => {
    const result = await service.createDraft(
      draftInput({ attributions: [{ purchaseLineId: 'NOPE', amount: 100 }] }),
    );
    expect(expectError(result)).toMatch(/unknown purchase line/);
  });
});

describe('updateDraft', () => {
  it('never lets the purchase reference change', async () => {
    const note = unwrap(await service.createDraft(draftInput()));
    const result = await service.updateDraft(note.id, draftInput({ purchaseId: 'P2' }));
    expect(expectError(result)).toMatch(/cannot change/);
  });
});

describe('post — the shared no-negative cap (BDD-011)', () => {
  it('posts a valid note with the type’s own sequence number', async () => {
    const note = unwrap(await service.createDraft(draftInput({ amount: 400 })));
    const posted = unwrap(await service.post(note.id));
    expect(posted.status).toBe(CreditNoteStatus.Posted);
    expect(posted.number).toBe(1);
    expect(posted.postedAt).not.toBeNull();
  });

  it('blocks a note exceeding the purchase total', async () => {
    const note = unwrap(await service.createDraft(draftInput({ amount: 1001 })));
    expect(expectError(await service.post(note.id))).toMatch(/correctable remainder/);
  });

  it('counts POSTED RETURNS against the correctable remainder', async () => {
    returns.push(postedReturn()); // 300 returned of 1000 → remaining 700
    const ok = unwrap(await service.createDraft(draftInput({ amount: 700 })));
    unwrap(await service.post(ok.id));
    const over = unwrap(await service.createDraft(draftInput({ amount: 1 })));
    expect(expectError(await service.post(over.id))).toMatch(/correctable remainder/);
  });

  it('counts PRIOR POSTED NOTES against the remainder (drafts reserve nothing)', async () => {
    const first = unwrap(await service.createDraft(draftInput({ amount: 900 })));
    unwrap(await service.post(first.id));
    const draftOnly = unwrap(await service.createDraft(draftInput({ amount: 500 })));
    expect(draftOnly.status).toBe(CreditNoteStatus.Draft); // creating is fine
    expect(expectError(await service.post(draftOnly.id))).toMatch(/correctable remainder/);
    const within = unwrap(await service.createDraft(draftInput({ amount: 100 })));
    const posted = unwrap(await service.post(within.id));
    expect(posted.number).toBe(2);
  });

  it('posted notes are immutable: no edit, no delete, no re-post', async () => {
    const note = unwrap(await service.createDraft(draftInput()));
    unwrap(await service.post(note.id));
    expect(expectError(await service.updateDraft(note.id, draftInput()))).toMatch(/immutable/);
    expect(expectError(await service.deleteDraft(note.id))).toMatch(/immutable/);
    expect(expectError(await service.post(note.id))).toMatch(/immutable/);
  });
});

describe('basisForPurchase', () => {
  it('reports the value still creditable after returns and posted notes', async () => {
    returns.push(postedReturn()); // −300
    const first = unwrap(await service.createDraft(draftInput({ amount: 200 })));
    unwrap(await service.post(first.id)); // −200
    const basis = unwrap(await service.basisForPurchase('P1'));
    expect(basis.remainingValue).toBe(500);
  });
});
