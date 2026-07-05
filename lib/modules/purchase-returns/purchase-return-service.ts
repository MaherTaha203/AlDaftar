import { ApplicationService } from '@/lib/application';
import { ErrorFactory, type AsyncResult, type Result } from '@/lib/core';
import { getPurchaseService, PurchaseStatus, type Purchase } from '../purchases';
import { newRecordId, nowIso, type LocalRecordStore } from '../shared/local-record-store';
import { RepositoryFactory } from '../shared/repository-factory';
import { isValidIsoDate } from '../shared/dates';
import { AuditAction, getAuditService } from '../audit';
import {
  ReturnStatus,
  type PurchaseReturn,
  type ReturnDraftInput,
  type ReturnLine,
} from './purchase-return';

/** Human reference for a return in the audit trail. */
function returnLabel(record: PurchaseReturn): string {
  return record.number === null ? 'مسودة' : `رقم ${record.number}`;
}

/**
 * PurchaseReturnService — the return document per frozen docs/purchase/06:
 * referenced-only returns; returnable(line) = posted purchase quantity −
 * Σ(already returned by POSTED returns); posted returns are immutable and
 * mirror the purchase's effects (balance/inventory read models subtract
 * them). BDR-16 interim: posting BLOCKS quantities above the returnable
 * remainder (conservative, reversible; a warn-only decision later only
 * loosens this — recorded in docs/technical-debt.md interim state).
 */
export type PurchaseReturnRepository = Pick<
  LocalRecordStore<PurchaseReturn>,
  'findAll' | 'findById' | 'create' | 'update'
>;

export function getPurchaseReturnRepository(): PurchaseReturnRepository {
  return RepositoryFactory.get<PurchaseReturn>('aldaftar.purchase-returns');
}

/** Data the return form needs: the posted purchase + returned-so-far per line. */
export interface ReturnBasis {
  readonly purchase: Purchase;
  /** purchaseLineId → quantity already returned by POSTED returns. */
  readonly returnedByLine: Readonly<Record<string, number>>;
}

export class PurchaseReturnService extends ApplicationService {
  private readonly repository: PurchaseReturnRepository;

  constructor(repository: PurchaseReturnRepository = getPurchaseReturnRepository()) {
    super('purchase-returns');
    this.repository = repository;
  }

  /** All returns, newest first. */
  list(): AsyncResult<readonly PurchaseReturn[]> {
    return this.execute('purchase-returns.list', async () => {
      const returns = this.unwrap(await this.repository.findAll());
      return [...returns].sort(
        (a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt),
      );
    });
  }

  getById(id: string): AsyncResult<PurchaseReturn> {
    return this.execute('purchase-returns.getById', async () => this.require(id));
  }

  /** Returns referencing one purchase (S-21 related section, frozen 06 §5). */
  listByPurchase(purchaseId: string): AsyncResult<readonly PurchaseReturn[]> {
    return this.execute('purchase-returns.listByPurchase', async () => {
      const returns = this.unwrap(await this.repository.findAll());
      return returns
        .filter((r) => r.purchaseId === purchaseId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    });
  }

  /** The form basis: posted purchase + per-line posted-returned quantities. */
  basisForPurchase(purchaseId: string): AsyncResult<ReturnBasis> {
    return this.execute('purchase-returns.basis', async () => {
      const purchase = await this.requirePostedPurchase(purchaseId);
      return { purchase, returnedByLine: await this.postedReturnedByLine(purchaseId) };
    });
  }

  createDraft(input: ReturnDraftInput): AsyncResult<PurchaseReturn> {
    return this.execute('purchase-returns.createDraft', async () => {
      const purchase = await this.requirePostedPurchase(input.purchaseId);
      this.validateDate(input.date);
      const timestamp = nowIso();
      const draft: PurchaseReturn = {
        id: newRecordId(),
        number: null,
        status: ReturnStatus.Draft,
        purchaseId: purchase.id,
        supplierId: purchase.supplierId,
        date: input.date.trim(),
        notes: input.notes?.trim() ?? '',
        lines: this.buildLines(purchase, input.quantities),
        createdAt: timestamp,
        updatedAt: timestamp,
        postedAt: null,
      };
      const created = this.unwrap(await this.repository.create(draft));
      await getAuditService().record({
        action: AuditAction.Create,
        entityType: 'purchase-returns',
        entityId: created.id,
        entityLabel: returnLabel(created),
        summary: 'إنشاء مسودة مرتجع شراء',
        after: created,
      });
      return created;
    });
  }

  /** Draft-only edit; the purchase reference is fixed at creation. */
  updateDraft(id: string, input: ReturnDraftInput): AsyncResult<PurchaseReturn> {
    return this.execute('purchase-returns.updateDraft', async () => {
      const existing = await this.require(id);
      this.assertDraft(existing);
      if (input.purchaseId !== existing.purchaseId) {
        throw ErrorFactory.conflict('The purchase reference of a return cannot change', {
          id,
        });
      }
      const purchase = await this.requirePostedPurchase(existing.purchaseId);
      this.validateDate(input.date);
      const updated = this.unwrap(
        await this.repository.update(id, {
          date: input.date.trim(),
          notes: input.notes?.trim() ?? '',
          lines: this.buildLines(purchase, input.quantities),
          updatedAt: nowIso(),
        }),
      );
      await getAuditService().record({
        action: AuditAction.Update,
        entityType: 'purchase-returns',
        entityId: updated.id,
        entityLabel: returnLabel(updated),
        summary: 'تعديل مسودة مرتجع شراء',
        before: existing,
        after: updated,
      });
      return updated;
    });
  }

  /** POST — mirrors the frozen posting rules (04/06), atomically. */
  post(id: string): AsyncResult<PurchaseReturn> {
    return this.execute('purchase-returns.post', async () => {
      // 1. State.
      const draft = await this.require(id);
      this.assertDraft(draft);

      // 2. Referenced purchase exists and is posted.
      const purchase = await this.requirePostedPurchase(draft.purchaseId);

      // 3. Lines present, each quantity > 0.
      if (draft.lines.length === 0) {
        throw ErrorFactory.validation('At least one returned quantity is required', {
          field: 'lines',
        });
      }

      // 4. Each line within the returnable remainder (frozen formula; BDR-16
      //    interim: block on exceed).
      const returned = await this.postedReturnedByLine(draft.purchaseId);
      for (const line of draft.lines) {
        const purchaseLine = purchase.lines.find((l) => l.id === line.purchaseLineId);
        if (purchaseLine === undefined) {
          throw ErrorFactory.validation('Return line references an unknown purchase line', {
            lineId: line.id,
          });
        }
        if (!(line.quantity > 0)) {
          throw ErrorFactory.validation('Returned quantity must be greater than zero', {
            lineId: line.id,
          });
        }
        const returnable = purchaseLine.quantity - (returned[line.purchaseLineId] ?? 0);
        if (line.quantity > returnable) {
          throw ErrorFactory.validation('Returned quantity exceeds the returnable remainder', {
            lineId: line.id,
            returnable,
          });
        }
      }

      // 5. Date present.
      this.validateDate(draft.date);

      // Effects atomically: RETURN-sequence number + state + postedAt.
      const timestamp = nowIso();
      const number = await this.nextNumber();
      const posted = this.unwrap(
        await this.repository.update(id, {
          number,
          status: ReturnStatus.Posted,
          postedAt: timestamp,
          updatedAt: timestamp,
        }),
      );
      await getAuditService().record({
        action: AuditAction.Post,
        entityType: 'purchase-returns',
        entityId: posted.id,
        entityLabel: returnLabel(posted),
        summary: `ترحيل مرتجع شراء رقم ${number}`,
        before: draft,
        after: posted,
      });
      return posted;
    });
  }

  /** Next RETURN number (BDR-01: the type's own plain sequence). */
  private async nextNumber(): Promise<number> {
    const returns = this.unwrap(await this.repository.findAll());
    return (
      returns.reduce((max, r) => (r.number !== null && r.number > max ? r.number : max), 0) + 1
    );
  }

  private async postedReturnedByLine(purchaseId: string): Promise<Record<string, number>> {
    const returns = this.unwrap(await this.repository.findAll());
    const totals: Record<string, number> = {};
    for (const record of returns) {
      if (record.purchaseId !== purchaseId || record.status !== ReturnStatus.Posted) {
        continue;
      }
      for (const line of record.lines) {
        totals[line.purchaseLineId] = (totals[line.purchaseLineId] ?? 0) + line.quantity;
      }
    }
    return totals;
  }

  /** Builds return lines from positive quantities keyed by purchase line id. */
  private buildLines(
    purchase: Purchase,
    quantities: Readonly<Record<string, number>>,
  ): readonly ReturnLine[] {
    return purchase.lines
      .filter((line) => (quantities[line.id] ?? 0) > 0)
      .map((line) => ({
        id: newRecordId(),
        purchaseLineId: line.id,
        productId: line.productId,
        unitId: line.unitId,
        quantity: quantities[line.id] as number,
        unitPrice: line.unitPrice,
      }));
  }

  private async requirePostedPurchase(purchaseId: string): Promise<Purchase> {
    const result = await getPurchaseService().getById(purchaseId);
    if (!result.ok) {
      throw result.error;
    }
    if (result.value.status !== PurchaseStatus.Posted) {
      throw ErrorFactory.validation('Returns can only reference a posted purchase', {
        purchaseId,
      });
    }
    return result.value;
  }

  private validateDate(date: string): void {
    if (!isValidIsoDate(date)) {
      throw ErrorFactory.validation('A valid date is required', { field: 'date' });
    }
  }

  private assertDraft(record: PurchaseReturn): void {
    if (record.status !== ReturnStatus.Draft) {
      throw ErrorFactory.conflict('Posted returns are immutable', { id: record.id });
    }
  }

  private unwrap<T>(result: Result<T>): T {
    if (!result.ok) {
      throw result.error;
    }
    return result.value;
  }

  private async require(id: string): Promise<PurchaseReturn> {
    const record = this.unwrap(await this.repository.findById(id));
    if (record === null) {
      throw ErrorFactory.notFound(`Return '${id}' was not found`, { id });
    }
    return record;
  }
}

let service: PurchaseReturnService | undefined;

/** Module singleton used by the Purchase Returns screens. */
export function getPurchaseReturnService(): PurchaseReturnService {
  if (service === undefined) {
    service = new PurchaseReturnService();
  }
  return service;
}
