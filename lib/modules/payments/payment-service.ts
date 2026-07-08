import { ApplicationService } from '@/lib/application';
import { ErrorFactory, isNonEmptyString, type AsyncResult, type Result } from '@/lib/core';
import { MasterStatus } from '../shared/master-data';
import { newRecordId, nowIso, type LocalRecordStore } from '../shared/local-record-store';
import { roundAmount } from '../shared/money';
import { RepositoryFactory } from '../shared/repository-factory';
import { isValidIsoDate } from '../shared/dates';
import { getSupplierRepository } from '../suppliers';
import { AuditAction, getAuditService } from '../audit';
import { PaymentStatus, type Payment, type PaymentDraftInput } from './payment';

/** Human reference for a payment in the audit trail. */
function paymentLabel(payment: Payment): string {
  return payment.number === null ? 'مسودة' : `رقم ${payment.number}`;
}

/**
 * PaymentService — implements the frozen Payments Architecture
 * (docs/payments/01/06): Draft create/update (posted is immutable), posting
 * with the ordered validation and atomic effects (per-type BDR-01 number +
 * state), and the running-balance model (no allocation, BDR-04). Posting
 * mutates nothing but the document; the supplier balance is calculated
 * elsewhere from posted payments (amount + discount credits). Audit-entry
 * effect lands with the Audit module (P20) reading the same posted docs.
 */
export type PaymentRepository = Pick<
  LocalRecordStore<Payment>,
  'findAll' | 'findById' | 'create' | 'update' | 'remove'
>;

export function getPaymentRepository(): PaymentRepository {
  return RepositoryFactory.get<Payment>('aldaftar.payments');
}

export class PaymentService extends ApplicationService {
  private readonly repository: PaymentRepository;

  constructor(repository: PaymentRepository = getPaymentRepository()) {
    super('payments');
    this.repository = repository;
  }

  /** All payments, newest first. */
  list(): AsyncResult<readonly Payment[]> {
    return this.execute('payments.list', async () => {
      const payments = this.unwrap(await this.repository.findAll());
      return [...payments].sort(
        (a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt),
      );
    });
  }

  getById(id: string): AsyncResult<Payment> {
    return this.execute('payments.getById', async () => this.require(id));
  }

  createDraft(input: PaymentDraftInput): AsyncResult<Payment> {
    return this.execute('payments.createDraft', async () => {
      this.validateDraftInput(input);
      const timestamp = nowIso();
      const payment: Payment = {
        id: newRecordId(),
        number: null,
        status: PaymentStatus.Draft,
        ...this.sanitize(input),
        createdAt: timestamp,
        updatedAt: timestamp,
        postedAt: null,
      };
      const created = this.unwrap(await this.repository.create(payment));
      await getAuditService().record({
        action: AuditAction.Create,
        entityType: 'payments',
        entityId: created.id,
        entityLabel: paymentLabel(created),
        summary: 'إنشاء مسودة دفعة',
        after: created,
      });
      return created;
    });
  }

  updateDraft(id: string, input: PaymentDraftInput): AsyncResult<Payment> {
    return this.execute('payments.updateDraft', async () => {
      const existing = await this.require(id);
      this.assertDraft(existing);
      this.validateDraftInput(input);
      const updated = this.unwrap(
        await this.repository.update(id, { ...this.sanitize(input), updatedAt: nowIso() }),
      );
      await getAuditService().record({
        action: AuditAction.Update,
        entityType: 'payments',
        entityId: updated.id,
        entityLabel: paymentLabel(updated),
        summary: 'تعديل مسودة دفعة',
        before: existing,
        after: updated,
      });
      return updated;
    });
  }

  /** POST — frozen posting rules (docs/payments/01 §5), atomic. */
  post(id: string): AsyncResult<Payment> {
    return this.execute('payments.post', async () => {
      // 1. State.
      const payment = await this.require(id);
      this.assertDraft(payment);

      // 2. Supplier exists and is active.
      const supplier = this.unwrap(await getSupplierRepository().findById(payment.supplierId));
      if (supplier === null || supplier.status !== MasterStatus.Active) {
        throw ErrorFactory.validation('Supplier must exist and be active', {
          field: 'supplierId',
        });
      }

      // 3. Amount > 0. 4. Discount ≥ 0. 5. Method present. 6. Date present.
      if (!(payment.amount > 0)) {
        throw ErrorFactory.validation('Amount must be greater than zero', { field: 'amount' });
      }
      if (!Number.isFinite(payment.discount) || payment.discount < 0) {
        throw ErrorFactory.validation('Discount cannot be negative', { field: 'discount' });
      }
      if (!isNonEmptyString(payment.method)) {
        throw ErrorFactory.validation('Payment method is required', { field: 'method' });
      }
      if (!isValidIsoDate(payment.date)) {
        throw ErrorFactory.validation('A valid date is required', { field: 'date' });
      }

      // Effects atomically: Payment-sequence number + state + postedAt.
      const timestamp = nowIso();
      const number = await this.nextNumber();
      const posted = this.unwrap(
        await this.repository.update(id, {
          number,
          status: PaymentStatus.Posted,
          postedAt: timestamp,
          updatedAt: timestamp,
        }),
      );
      await getAuditService().record({
        action: AuditAction.Post,
        entityType: 'payments',
        entityId: posted.id,
        entityLabel: paymentLabel(posted),
        summary: `ترحيل دفعة رقم ${number}`,
        before: payment,
        after: posted,
      });
      return posted;
    });
  }

  /**
   * Delete a DRAFT payment. Posted documents are immutable and are NEVER
   * deleted (continuous numbering + append-only audit); the guard enforces
   * this at the service even though the UI also disables the action. A draft
   * carries no number and no ledger effect, so its removal is
   * accounting-safe — and still recorded in the audit trail.
   */
  deleteDraft(id: string): AsyncResult<void> {
    return this.execute('payments.deleteDraft', async () => {
      const payment = await this.require(id);
      this.assertDraft(payment);
      this.unwrap(await this.repository.remove(id));
      await getAuditService().record({
        action: AuditAction.Delete,
        entityType: 'payments',
        entityId: id,
        entityLabel: paymentLabel(payment),
        summary: 'حذف مسودة دفعة',
        before: payment,
      });
    });
  }

  /** Next Payment number (BDR-01: the type's own plain sequence). */
  private async nextNumber(): Promise<number> {
    const payments = this.unwrap(await this.repository.findAll());
    return (
      payments.reduce((max, p) => (p.number !== null && p.number > max ? p.number : max), 0) + 1
    );
  }

  private sanitize(input: PaymentDraftInput) {
    return {
      supplierId: input.supplierId.trim(),
      date: input.date.trim(),
      amount: input.amount === null ? 0 : roundAmount(input.amount),
      discount: input.discount == null ? 0 : roundAmount(input.discount),
      method: input.method.trim(),
      reference: input.reference?.trim() ?? '',
      notes: input.notes?.trim() ?? '',
    };
  }

  private validateDraftInput(input: PaymentDraftInput): void {
    if (!isNonEmptyString(input.supplierId)) {
      throw ErrorFactory.validation('Supplier is required', { field: 'supplierId' });
    }
    if (!isValidIsoDate(input.date)) {
      throw ErrorFactory.validation('A valid date is required', { field: 'date' });
    }
  }

  private assertDraft(payment: Payment): void {
    if (payment.status !== PaymentStatus.Draft) {
      throw ErrorFactory.conflict('Posted payments are immutable', { id: payment.id });
    }
  }

  private unwrap<T>(result: Result<T>): T {
    if (!result.ok) {
      throw result.error;
    }
    return result.value;
  }

  private async require(id: string): Promise<Payment> {
    const payment = this.unwrap(await this.repository.findById(id));
    if (payment === null) {
      throw ErrorFactory.notFound(`Payment '${id}' was not found`, { id });
    }
    return payment;
  }
}

let service: PaymentService | undefined;

/** Module singleton used by the Payments screens. */
export function getPaymentService(): PaymentService {
  if (service === undefined) {
    service = new PaymentService();
  }
  return service;
}
