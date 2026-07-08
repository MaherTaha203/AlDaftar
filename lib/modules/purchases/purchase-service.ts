import { ApplicationService } from '@/lib/application';
import { ErrorFactory, isNonEmptyString, type AsyncResult, type Result } from '@/lib/core';
import { getProductRepository } from '../products';
import { getSupplierRepository } from '../suppliers';
import { getUnitRepository } from '../units';
import { MasterStatus } from '../shared/master-data';
import { newRecordId, nowIso, type LocalRecordStore } from '../shared/local-record-store';
import { RepositoryFactory } from '../shared/repository-factory';
import { isValidIsoDate } from '../shared/dates';
import { AuditAction, getAuditService } from '../audit';
import {
  PurchaseStatus,
  type Purchase,
  type PurchaseDraftInput,
  type PurchaseLine,
} from './purchase';

/** Human reference for a purchase in the audit trail. */
function purchaseLabel(purchase: Purchase): string {
  return purchase.number === null ? 'مسودة' : `رقم ${purchase.number}`;
}

/**
 * PurchaseService — implements the frozen Purchase Architecture exactly:
 * lifecycle 01, posting rules 04 (validation order, atomic effects,
 * idempotence), editing rules 05 (draft-only mutation). Balance and
 * inventory are calculated elsewhere from posted purchases — posting here
 * mutates nothing but the document itself (approved calculated-values
 * principle). The audit-entry posting effect lands with the Audit module
 * (Phase 20) reading from the same posted documents (tracked interim state).
 */
export type PurchaseRepository = Pick<
  LocalRecordStore<Purchase>,
  'findAll' | 'findById' | 'create' | 'update' | 'remove'
>;

export function getPurchaseRepository(): PurchaseRepository {
  return RepositoryFactory.get<Purchase>('aldaftar.purchases');
}

export class PurchaseService extends ApplicationService {
  private readonly repository: PurchaseRepository;

  constructor(repository: PurchaseRepository = getPurchaseRepository()) {
    super('purchases');
    this.repository = repository;
  }

  /** All purchases, newest first (date desc, then updatedAt desc). */
  list(): AsyncResult<readonly Purchase[]> {
    return this.execute('purchases.list', async () => {
      const purchases = this.unwrap(await this.repository.findAll());
      return [...purchases].sort(
        (a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt),
      );
    });
  }

  getById(id: string): AsyncResult<Purchase> {
    return this.execute('purchases.getById', async () => this.require(id));
  }

  /** Creates a draft (lifecycle 01: (new) → Draft). Supplier + date required at save. */
  createDraft(input: PurchaseDraftInput): AsyncResult<Purchase> {
    return this.execute('purchases.createDraft', async () => {
      this.validateDraftInput(input);
      const timestamp = nowIso();
      const purchase: Purchase = {
        id: newRecordId(),
        number: null,
        status: PurchaseStatus.Draft,
        ...this.sanitizeDraft(input),
        createdAt: timestamp,
        updatedAt: timestamp,
        postedAt: null,
      };
      const created = this.unwrap(await this.repository.create(purchase));
      await getAuditService().record({
        action: AuditAction.Create,
        entityType: 'purchases',
        entityId: created.id,
        entityLabel: purchaseLabel(created),
        summary: 'إنشاء مسودة فاتورة شراء',
        after: created,
      });
      return created;
    });
  }

  /** Replaces draft content (lifecycle 01: Draft → Draft). Posted is immutable (05). */
  updateDraft(id: string, input: PurchaseDraftInput): AsyncResult<Purchase> {
    return this.execute('purchases.updateDraft', async () => {
      const existing = await this.require(id);
      this.assertDraft(existing);
      this.validateDraftInput(input);
      const updated = this.unwrap(
        await this.repository.update(id, { ...this.sanitizeDraft(input), updatedAt: nowIso() }),
      );
      await getAuditService().record({
        action: AuditAction.Update,
        entityType: 'purchases',
        entityId: updated.id,
        entityLabel: purchaseLabel(updated),
        summary: 'تعديل مسودة فاتورة شراء',
        before: existing,
        after: updated,
      });
      return updated;
    });
  }

  /**
   * POST — frozen posting rules 04: validation in exact order; on success,
   * number assignment + state change atomically (single record write);
   * nothing persists on failure; idempotence via the draft-state check.
   */
  post(id: string): AsyncResult<Purchase> {
    return this.execute('purchases.post', async () => {
      // 1. State.
      const purchase = await this.require(id);
      this.assertDraft(purchase);

      // 2. Supplier exists and is Active.
      const supplier = this.unwrap(await getSupplierRepository().findById(purchase.supplierId));
      if (supplier === null || supplier.status !== MasterStatus.Active) {
        throw ErrorFactory.validation('Supplier must exist and be active', {
          field: 'supplierId',
        });
      }

      // 3. Lines present.
      if (purchase.lines.length === 0) {
        throw ErrorFactory.validation('At least one line is required', { field: 'lines' });
      }

      // 4. Each line: product + unit active, quantity > 0, price ≥ 0.
      for (const line of purchase.lines) {
        const product = this.unwrap(await getProductRepository().findById(line.productId));
        if (product === null || product.status !== MasterStatus.Active) {
          throw ErrorFactory.validation('Line product must exist and be active', {
            lineId: line.id,
          });
        }
        const unit = this.unwrap(await getUnitRepository().findById(line.unitId));
        if (unit === null || unit.status !== MasterStatus.Active) {
          throw ErrorFactory.validation('Line unit must exist and be active', {
            lineId: line.id,
          });
        }
        if (!(line.quantity > 0)) {
          throw ErrorFactory.validation('Line quantity must be greater than zero', {
            lineId: line.id,
          });
        }
        if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) {
          throw ErrorFactory.validation('Line price must be zero or more', { lineId: line.id });
        }
      }

      // 5. Date present (period rules pending — none enforced).
      if (!isValidIsoDate(purchase.date)) {
        throw ErrorFactory.validation('A valid date is required', { field: 'date' });
      }

      // 6. Supplier-invoice info: reference OR the explicit no-invoice flag.
      if (purchase.supplierInvoiceRef === '' && !purchase.withoutSupplierInvoice) {
        throw ErrorFactory.validation(
          'Either a supplier-invoice reference or the without-invoice flag is required',
          { field: 'supplierInvoiceRef' },
        );
      }

      // Effects (atomic single write): number (BDR-01) + state + postedAt.
      const number = await this.nextNumber();
      const timestamp = nowIso();
      const posted = this.unwrap(
        await this.repository.update(id, {
          number,
          status: PurchaseStatus.Posted,
          postedAt: timestamp,
          updatedAt: timestamp,
        }),
      );
      await getAuditService().record({
        action: AuditAction.Post,
        entityType: 'purchases',
        entityId: posted.id,
        entityLabel: purchaseLabel(posted),
        summary: `ترحيل فاتورة شراء رقم ${number}`,
        before: purchase,
        after: posted,
      });
      return posted;
    });
  }

  /**
   * Delete a DRAFT purchase. Posted documents are immutable and never deleted
   * (continuous numbering + append-only audit); the guard enforces this even
   * though the UI also disables the action. A draft has no number and no
   * ledger effect, so its removal is accounting-safe — and audited.
   */
  deleteDraft(id: string): AsyncResult<void> {
    return this.execute('purchases.deleteDraft', async () => {
      const purchase = await this.require(id);
      this.assertDraft(purchase);
      this.unwrap(await this.repository.remove(id));
      await getAuditService().record({
        action: AuditAction.Delete,
        entityType: 'purchases',
        entityId: id,
        entityLabel: purchaseLabel(purchase),
        summary: 'حذف مسودة شراء',
        before: purchase,
      });
    });
  }

  /**
   * Next official number (BDR-01): max posted number + 1, starting at 1.
   * Derived from the documents themselves — posted purchases are immutable
   * and never deleted, so numbers are continuous and never reused. The
   * Supabase implementation will honor the same rule transactionally.
   */
  private async nextNumber(): Promise<number> {
    const purchases = this.unwrap(await this.repository.findAll());
    const highest = purchases.reduce(
      (max, p) => (p.number !== null && p.number > max ? p.number : max),
      0,
    );
    return highest + 1;
  }

  private sanitizeDraft(input: PurchaseDraftInput) {
    const withoutInvoice = input.withoutSupplierInvoice === true;
    return {
      supplierId: input.supplierId.trim(),
      date: input.date.trim(),
      supplierInvoiceRef: withoutInvoice ? '' : (input.supplierInvoiceRef?.trim() ?? ''),
      withoutSupplierInvoice: withoutInvoice,
      notes: input.notes?.trim() ?? '',
      lines: input.lines.map((line): PurchaseLine => ({
        id: newRecordId(),
        productId: line.productId,
        unitId: line.unitId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        notes: line.notes?.trim() ?? '',
      })),
    };
  }

  private validateDraftInput(input: PurchaseDraftInput): void {
    if (!isNonEmptyString(input.supplierId)) {
      throw ErrorFactory.validation('Supplier is required', { field: 'supplierId' });
    }
    if (!isValidIsoDate(input.date)) {
      throw ErrorFactory.validation('A valid date is required', { field: 'date' });
    }
  }

  private assertDraft(purchase: Purchase): void {
    if (purchase.status !== PurchaseStatus.Draft) {
      throw ErrorFactory.conflict('Posted purchases are immutable', { id: purchase.id });
    }
  }

  private unwrap<T>(result: Result<T>): T {
    if (!result.ok) {
      throw result.error;
    }
    return result.value;
  }

  private async require(id: string): Promise<Purchase> {
    const purchase = this.unwrap(await this.repository.findById(id));
    if (purchase === null) {
      throw ErrorFactory.notFound(`Purchase '${id}' was not found`, { id });
    }
    return purchase;
  }
}

let service: PurchaseService | undefined;

/** Module singleton used by the Purchases screens. */
export function getPurchaseService(): PurchaseService {
  if (service === undefined) {
    service = new PurchaseService();
  }
  return service;
}
