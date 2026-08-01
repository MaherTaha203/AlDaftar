import { beforeEach, describe, expect, it } from 'vitest';
import { failure, success, ErrorFactory, type AsyncResult, type Result } from '@/lib/core';
import {
  PaymentRefundReason,
  PaymentRefundService,
  PaymentRefundStatus,
  refundTotalDebit,
  type PaymentRefund,
  type PaymentRefundDraftInput,
} from '@/lib/modules/payment-refunds';
import { PaymentStatus, type Payment } from '@/lib/modules/payments';

/*
 * PaymentRefundService — «سند استرداد دفعة» (BDD-011 / DL-036). Hermetic:
 * repository and the payment lookup are injected fakes. Load-bearing
 * assertions: posted immutability, the fixed payment reference, the
 * at-least-one-component rule, and the PER-COMPONENT caps (cash vs the
 * payment's cash, reversal vs the payment's discount — full reversal
 * possible, overdraw never).
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

/** A posted payment: 1000 cash + 50 settlement discount. */
function postedPayment(): Payment {
  return {
    id: 'PAY1',
    number: 1,
    status: PaymentStatus.Posted,
    supplierId: 'S1',
    date: '2026-07-01',
    amount: 1000,
    discount: 50,
    method: 'تحويل بنكي',
    reference: 'TX-1',
    notes: '',
    createdAt: 't',
    updatedAt: 't',
    postedAt: 't',
  };
}

function draftInput(overrides: Partial<PaymentRefundDraftInput> = {}): PaymentRefundDraftInput {
  return {
    paymentId: 'PAY1',
    date: '2026-07-05',
    amount: 200,
    reasonType: PaymentRefundReason.MoneyReturned,
    ...overrides,
  };
}

let store: ReturnType<typeof makeStore<PaymentRefund>>;
let payments: Payment[];
let service: PaymentRefundService;

beforeEach(() => {
  store = makeStore<PaymentRefund>();
  payments = [postedPayment()];
  service = new PaymentRefundService(store, async (id) => {
    const p = payments.find((x) => x.id === id);
    return p ? success(p) : failure(ErrorFactory.notFound('missing payment', { id }));
  });
});

describe('createDraft', () => {
  it('creates a draft copying the supplier, with no number', async () => {
    const refund = unwrap(await service.createDraft(draftInput()));
    expect(refund.status).toBe(PaymentRefundStatus.Draft);
    expect(refund.number).toBeNull();
    expect(refund.supplierId).toBe('S1');
    expect(refund.discountReversal).toBe(0);
  });

  it('rejects a non-posted payment reference', async () => {
    payments[0] = { ...payments[0], status: PaymentStatus.Draft };
    expect(expectError(await service.createDraft(draftInput()))).toMatch(/posted payment/);
  });

  it('requires at least one positive component', async () => {
    const result = await service.createDraft(draftInput({ amount: 0, discountReversal: 0 }));
    expect(expectError(result)).toMatch(/cash or reverse discount/);
  });

  it('accepts a discount-only reversal (wrong-discount case)', async () => {
    const refund = unwrap(
      await service.createDraft(
        draftInput({
          amount: 0,
          discountReversal: 50,
          reasonType: PaymentRefundReason.WrongDiscount,
        }),
      ),
    );
    expect(refundTotalDebit(refund)).toBe(50);
  });

  it('rejects negative components', async () => {
    expect(expectError(await service.createDraft(draftInput({ amount: -1 })))).toMatch(
      /zero or more/,
    );
    expect(expectError(await service.createDraft(draftInput({ discountReversal: -1 })))).toMatch(
      /zero or more/,
    );
  });
});

describe('updateDraft', () => {
  it('never lets the payment reference change', async () => {
    const refund = unwrap(await service.createDraft(draftInput()));
    const result = await service.updateDraft(refund.id, draftInput({ paymentId: 'PAY2' }));
    expect(expectError(result)).toMatch(/cannot change/);
  });
});

describe('post — the per-component caps (BDD-011)', () => {
  it('posts a valid refund with the type’s own sequence number', async () => {
    const refund = unwrap(await service.createDraft(draftInput({ amount: 400 })));
    const posted = unwrap(await service.post(refund.id));
    expect(posted.status).toBe(PaymentRefundStatus.Posted);
    expect(posted.number).toBe(1);
  });

  it('blocks cash beyond the payment’s cash', async () => {
    const refund = unwrap(await service.createDraft(draftInput({ amount: 1001 })));
    expect(expectError(await service.post(refund.id))).toMatch(/refundable cash/);
  });

  it('blocks reversal beyond the payment’s discount', async () => {
    const refund = unwrap(await service.createDraft(draftInput({ discountReversal: 51 })));
    expect(expectError(await service.post(refund.id))).toMatch(/reversible discount/);
  });

  it('counts PRIOR POSTED refunds per component (drafts reserve nothing)', async () => {
    const first = unwrap(
      await service.createDraft(draftInput({ amount: 900, discountReversal: 30 })),
    );
    unwrap(await service.post(first.id));
    const overCash = unwrap(await service.createDraft(draftInput({ amount: 101 })));
    expect(expectError(await service.post(overCash.id))).toMatch(/refundable cash/);
    const overDiscount = unwrap(
      await service.createDraft(draftInput({ amount: 0, discountReversal: 21 })),
    );
    expect(expectError(await service.post(overDiscount.id))).toMatch(/reversible discount/);
    const fullReversal = unwrap(
      await service.createDraft(draftInput({ amount: 100, discountReversal: 20 })),
    );
    const posted = unwrap(await service.post(fullReversal.id));
    expect(posted.number).toBe(2); // the payment is now fully reversed: 1000+50 refunded
  });

  it('posted refunds are immutable: no edit, no delete, no re-post', async () => {
    const refund = unwrap(await service.createDraft(draftInput()));
    unwrap(await service.post(refund.id));
    expect(expectError(await service.updateDraft(refund.id, draftInput()))).toMatch(/immutable/);
    expect(expectError(await service.deleteDraft(refund.id))).toMatch(/immutable/);
    expect(expectError(await service.post(refund.id))).toMatch(/immutable/);
  });
});

describe('basisForPayment', () => {
  it('reports per-component refundable remainders', async () => {
    const first = unwrap(
      await service.createDraft(draftInput({ amount: 300, discountReversal: 10 })),
    );
    unwrap(await service.post(first.id));
    const basis = unwrap(await service.basisForPayment('PAY1'));
    expect(basis.remainingCash).toBe(700);
    expect(basis.remainingDiscount).toBe(40);
  });
});
