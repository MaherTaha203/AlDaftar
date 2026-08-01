import { ApplicationService } from '@/lib/application';
import { ErrorFactory, type AsyncResult, type Result } from '@/lib/core';
import { getPaymentService, PaymentStatus, type Payment } from '../payments';
import { newRecordId, nowIso, type LocalRecordStore } from '../shared/local-record-store';
import { RepositoryFactory } from '../shared/repository-factory';
import { isValidIsoDate } from '../shared/dates';
import {
  assertMutableDraft,
  consumptionByKey,
  nextDocumentNumber,
  remainingBasis,
} from '../shared/document-kit';
import { roundAmount } from '../shared/money';
import { AuditAction, getAuditService } from '../audit';
import {
  PaymentRefundReason,
  PaymentRefundStatus,
  type PaymentRefund,
  type PaymentRefundDraftInput,
} from './payment-refund';

/** Human reference for a refund in the audit trail. */
function refundLabel(record: PaymentRefund): string {
  return record.number === null ? 'مسودة' : `رقم ${record.number}`;
}

/**
 * PaymentRefundService — «سند استرداد دفعة» per BDD-011 (resolves BDR-07):
 * money returned by the supplier against exactly one posted payment. Built
 * on the document-kit. The PER-COMPONENT CAPS are the load-bearing rule:
 * posting blocks when cash refunded would exceed the payment's cash minus
 * prior posted refunds, or when the discount reversal would exceed the
 * payment's discount minus prior posted reversals — so refunds can fully
 * reverse a payment but never overdraw either component.
 */
export type PaymentRefundRepository = Pick<
  LocalRecordStore<PaymentRefund>,
  'findAll' | 'findById' | 'create' | 'update' | 'remove'
>;

export function getPaymentRefundRepository(): PaymentRefundRepository {
  return RepositoryFactory.get<PaymentRefund>('aldaftar.payment-refunds');
}

/** Data the refund form needs: the posted payment + what is still refundable. */
export interface PaymentRefundBasis {
  readonly payment: Payment;
  /** Cash still refundable: payment.amount − posted refunds' cash. */
  readonly remainingCash: number;
  /** Discount still reversible: payment.discount − posted reversals. */
  readonly remainingDiscount: number;
}

export class PaymentRefundService extends ApplicationService {
  private readonly repository: PaymentRefundRepository;
  private readonly paymentById: (id: string) => AsyncResult<Payment>;

  constructor(
    repository: PaymentRefundRepository = getPaymentRefundRepository(),
    paymentById: (id: string) => AsyncResult<Payment> = (id) => getPaymentService().getById(id),
  ) {
    super('payment-refunds');
    this.repository = repository;
    this.paymentById = paymentById;
  }

  /** All refunds, newest first. */
  list(): AsyncResult<readonly PaymentRefund[]> {
    return this.execute('payment-refunds.list', async () => {
      const refunds = this.unwrap(await this.repository.findAll());
      return [...refunds].sort(
        (a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt),
      );
    });
  }

  getById(id: string): AsyncResult<PaymentRefund> {
    return this.execute('payment-refunds.getById', async () => this.require(id));
  }

  /** Refunds referencing one payment (Linked Documents section, BDD-011). */
  listByPayment(paymentId: string): AsyncResult<readonly PaymentRefund[]> {
    return this.execute('payment-refunds.listByPayment', async () => {
      const refunds = this.unwrap(await this.repository.findAll());
      return refunds
        .filter((r) => r.paymentId === paymentId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    });
  }

  /** The form basis: posted payment + per-component refundable remainders. */
  basisForPayment(paymentId: string): AsyncResult<PaymentRefundBasis> {
    return this.execute('payment-refunds.basis', async () => {
      const payment = await this.requirePostedPayment(paymentId);
      const consumed = await this.postedRefundedComponents(payment.id);
      return {
        payment,
        remainingCash: roundAmount(remainingBasis(payment.amount, consumed.cash)),
        remainingDiscount: roundAmount(remainingBasis(payment.discount, consumed.discount)),
      };
    });
  }

  createDraft(input: PaymentRefundDraftInput): AsyncResult<PaymentRefund> {
    return this.execute('payment-refunds.createDraft', async () => {
      const payment = await this.requirePostedPayment(input.paymentId);
      this.validateContent(input);
      const timestamp = nowIso();
      const draft: PaymentRefund = {
        id: newRecordId(),
        number: null,
        status: PaymentRefundStatus.Draft,
        paymentId: payment.id,
        supplierId: payment.supplierId,
        ...this.sanitize(input),
        createdAt: timestamp,
        updatedAt: timestamp,
        postedAt: null,
      };
      const created = this.unwrap(await this.repository.create(draft));
      await getAuditService().record({
        action: AuditAction.Create,
        entityType: 'payment-refunds',
        entityId: created.id,
        entityLabel: refundLabel(created),
        summary: 'إنشاء مسودة سند استرداد دفعة',
        after: created,
      });
      return created;
    });
  }

  /** Draft-only edit; the payment reference is fixed at creation. */
  updateDraft(id: string, input: PaymentRefundDraftInput): AsyncResult<PaymentRefund> {
    return this.execute('payment-refunds.updateDraft', async () => {
      const existing = await this.require(id);
      this.assertDraft(existing);
      if (input.paymentId !== existing.paymentId) {
        throw ErrorFactory.conflict('The payment reference of a refund cannot change', { id });
      }
      await this.requirePostedPayment(existing.paymentId);
      this.validateContent(input);
      const updated = this.unwrap(
        await this.repository.update(id, {
          ...this.sanitize(input),
          updatedAt: nowIso(),
        }),
      );
      await getAuditService().record({
        action: AuditAction.Update,
        entityType: 'payment-refunds',
        entityId: updated.id,
        entityLabel: refundLabel(updated),
        summary: 'تعديل مسودة سند استرداد دفعة',
        before: existing,
        after: updated,
      });
      return updated;
    });
  }

  /** POST — atomically: validations + the per-component caps + number. */
  post(id: string): AsyncResult<PaymentRefund> {
    return this.execute('payment-refunds.post', async () => {
      // 1. State.
      const draft = await this.require(id);
      this.assertDraft(draft);

      // 2. Referenced payment exists and is posted.
      const payment = await this.requirePostedPayment(draft.paymentId);

      // 3. Content valid (components, reason, date).
      this.validateContent(draft);

      // 4. The per-component caps (BDD-011): cash against the payment's cash,
      //    discount reversal against the payment's discount — each net of
      //    prior POSTED refunds (drafts reserve nothing).
      const consumed = await this.postedRefundedComponents(payment.id);
      const remainingCash = roundAmount(remainingBasis(payment.amount, consumed.cash));
      if (draft.amount > remainingCash) {
        throw ErrorFactory.validation('Refund exceeds the refundable cash remainder', {
          amount: draft.amount,
          remainingCash,
        });
      }
      const remainingDiscount = roundAmount(remainingBasis(payment.discount, consumed.discount));
      if (draft.discountReversal > remainingDiscount) {
        throw ErrorFactory.validation('Reversal exceeds the reversible discount remainder', {
          discountReversal: draft.discountReversal,
          remainingDiscount,
        });
      }

      // Effects atomically: the type's own sequence number + state + postedAt.
      const timestamp = nowIso();
      const number = await this.nextNumber();
      const posted = this.unwrap(
        await this.repository.update(id, {
          number,
          status: PaymentRefundStatus.Posted,
          postedAt: timestamp,
          updatedAt: timestamp,
        }),
      );
      await getAuditService().record({
        action: AuditAction.Post,
        entityType: 'payment-refunds',
        entityId: posted.id,
        entityLabel: refundLabel(posted),
        summary: `ترحيل سند استرداد دفعة رقم ${number}`,
        before: draft,
        after: posted,
      });
      return posted;
    });
  }

  /** Delete a DRAFT refund; posted refunds are immutable and never deleted. */
  deleteDraft(id: string): AsyncResult<void> {
    return this.execute('payment-refunds.deleteDraft', async () => {
      const record = await this.require(id);
      this.assertDraft(record);
      this.unwrap(await this.repository.remove(id));
      await getAuditService().record({
        action: AuditAction.Delete,
        entityType: 'payment-refunds',
        entityId: id,
        entityLabel: refundLabel(record),
        summary: 'حذف مسودة سند استرداد',
        before: record,
      });
    });
  }

  /** Next REFUND number (BDR-01: the type's own plain sequence). */
  private async nextNumber(): Promise<number> {
    return nextDocumentNumber(this.unwrap(await this.repository.findAll()));
  }

  /** Cash and discount already refunded against a payment by POSTED refunds. */
  private async postedRefundedComponents(
    paymentId: string,
  ): Promise<{ cash: number; discount: number }> {
    const refunds = this.unwrap(await this.repository.findAll());
    const posted = refunds.filter(
      (r) => r.paymentId === paymentId && r.status === PaymentRefundStatus.Posted,
    );
    const consumed = consumptionByKey(posted, (refund) => [
      ['cash', refund.amount] as const,
      ['discount', refund.discountReversal] as const,
    ]);
    return { cash: consumed['cash'] ?? 0, discount: consumed['discount'] ?? 0 };
  }

  /** Shared content validation for draft create/update and posting. */
  private validateContent(
    input: Pick<PaymentRefundDraftInput, 'date' | 'amount' | 'discountReversal' | 'reasonType'>,
  ): void {
    if (!isValidIsoDate(input.date)) {
      throw ErrorFactory.validation('A valid date is required', { field: 'date' });
    }
    const amount = input.amount;
    const discountReversal = input.discountReversal ?? 0;
    if (!Number.isFinite(amount) || amount < 0) {
      throw ErrorFactory.validation('Refunded cash must be zero or more', { field: 'amount' });
    }
    if (!Number.isFinite(discountReversal) || discountReversal < 0) {
      throw ErrorFactory.validation('Discount reversal must be zero or more', {
        field: 'discountReversal',
      });
    }
    if (!(amount > 0) && !(discountReversal > 0)) {
      throw ErrorFactory.validation('A refund must return cash or reverse discount', {
        field: 'amount',
      });
    }
    if (!Object.values(PaymentRefundReason).includes(input.reasonType)) {
      throw ErrorFactory.validation('A correction reason is required', { field: 'reasonType' });
    }
  }

  /** Normalized document content from a draft input (BDD-011 fields). */
  private sanitize(input: PaymentRefundDraftInput): {
    date: string;
    amount: number;
    discountReversal: number;
    reasonType: PaymentRefundReason;
    reasonNote: string;
    method: string;
    reference: string;
    notes: string;
  } {
    return {
      date: input.date.trim(),
      amount: roundAmount(input.amount),
      discountReversal: roundAmount(input.discountReversal ?? 0),
      reasonType: input.reasonType,
      reasonNote: input.reasonNote?.trim() ?? '',
      method: input.method?.trim() ?? '',
      reference: input.reference?.trim() ?? '',
      notes: input.notes?.trim() ?? '',
    };
  }

  private async requirePostedPayment(paymentId: string): Promise<Payment> {
    const result = await this.paymentById(paymentId);
    if (!result.ok) {
      throw result.error;
    }
    if (result.value.status !== PaymentStatus.Posted) {
      throw ErrorFactory.validation('Refunds can only reference a posted payment', {
        paymentId,
      });
    }
    return result.value;
  }

  private assertDraft(record: PaymentRefund): void {
    assertMutableDraft(record, PaymentRefundStatus.Draft, 'Posted refunds are immutable');
  }

  private unwrap<T>(result: Result<T>): T {
    if (!result.ok) {
      throw result.error;
    }
    return result.value;
  }

  private async require(id: string): Promise<PaymentRefund> {
    const record = this.unwrap(await this.repository.findById(id));
    if (record === null) {
      throw ErrorFactory.notFound(`Refund '${id}' was not found`, { id });
    }
    return record;
  }
}

let service: PaymentRefundService | undefined;

/** Module singleton used by the payment-refund screens. */
export function getPaymentRefundService(): PaymentRefundService {
  if (service === undefined) {
    service = new PaymentRefundService();
  }
  return service;
}
