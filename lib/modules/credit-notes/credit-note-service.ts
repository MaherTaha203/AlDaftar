import { ApplicationService } from '@/lib/application';
import { ErrorFactory, type AsyncResult, type Result } from '@/lib/core';
import { getPurchaseService, purchaseTotal, PurchaseStatus, type Purchase } from '../purchases';
import {
  getPurchaseReturnService,
  returnTotal,
  ReturnStatus,
  type PurchaseReturn,
} from '../purchase-returns';
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
  CreditNoteReason,
  CreditNoteStatus,
  type CreditNote,
  type CreditNoteDraftInput,
  type CreditNoteAttribution,
} from './credit-note';

/** Human reference for a credit note in the audit trail. */
function noteLabel(record: CreditNote): string {
  return record.number === null ? 'مسودة' : `رقم ${record.number}`;
}

/**
 * CreditNoteService — «إشعار دائن للمورد» per BDD-011 (resolves BDR-07):
 * a value-only, decrease-only correction document against exactly one posted
 * purchase. Built on the document-kit (numbering, immutability guard,
 * remaining-basis cap). The SHARED NO-NEGATIVE CAP is the load-bearing rule:
 * posting blocks when the note would push
 * `purchase total − posted returns value − posted prior notes` below zero,
 * so no combination of returns and notes can ever make a purchase's net
 * value negative.
 */
export type CreditNoteRepository = Pick<
  LocalRecordStore<CreditNote>,
  'findAll' | 'findById' | 'create' | 'update' | 'remove'
>;

export function getCreditNoteRepository(): CreditNoteRepository {
  return RepositoryFactory.get<CreditNote>('aldaftar.supplier-credit-notes');
}

/** Data the credit-note form needs: the posted purchase + what is still correctable. */
export interface CreditNoteBasis {
  readonly purchase: Purchase;
  /** Value still creditable: purchase − posted returns − posted prior notes. */
  readonly remainingValue: number;
}

export class CreditNoteService extends ApplicationService {
  private readonly repository: CreditNoteRepository;
  private readonly purchaseById: (id: string) => AsyncResult<Purchase>;
  private readonly returnsByPurchase: (
    purchaseId: string,
  ) => AsyncResult<readonly PurchaseReturn[]>;

  constructor(
    repository: CreditNoteRepository = getCreditNoteRepository(),
    purchaseById: (id: string) => AsyncResult<Purchase> = (id) => getPurchaseService().getById(id),
    returnsByPurchase: (purchaseId: string) => AsyncResult<readonly PurchaseReturn[]> = (
      purchaseId,
    ) => getPurchaseReturnService().listByPurchase(purchaseId),
  ) {
    super('credit-notes');
    this.repository = repository;
    this.purchaseById = purchaseById;
    this.returnsByPurchase = returnsByPurchase;
  }

  /** All credit notes, newest first. */
  list(): AsyncResult<readonly CreditNote[]> {
    return this.execute('credit-notes.list', async () => {
      const notes = this.unwrap(await this.repository.findAll());
      return [...notes].sort(
        (a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt),
      );
    });
  }

  getById(id: string): AsyncResult<CreditNote> {
    return this.execute('credit-notes.getById', async () => this.require(id));
  }

  /** Notes referencing one purchase (Linked Documents section, BDD-011). */
  listByPurchase(purchaseId: string): AsyncResult<readonly CreditNote[]> {
    return this.execute('credit-notes.listByPurchase', async () => {
      const notes = this.unwrap(await this.repository.findAll());
      return notes
        .filter((n) => n.purchaseId === purchaseId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    });
  }

  /** The form basis: posted purchase + the value still creditable. */
  basisForPurchase(purchaseId: string): AsyncResult<CreditNoteBasis> {
    return this.execute('credit-notes.basis', async () => {
      const purchase = await this.requirePostedPurchase(purchaseId);
      return { purchase, remainingValue: await this.remainingValue(purchase) };
    });
  }

  createDraft(input: CreditNoteDraftInput): AsyncResult<CreditNote> {
    return this.execute('credit-notes.createDraft', async () => {
      const purchase = await this.requirePostedPurchase(input.purchaseId);
      this.validateContent(input, purchase);
      const timestamp = nowIso();
      const draft: CreditNote = {
        id: newRecordId(),
        number: null,
        status: CreditNoteStatus.Draft,
        purchaseId: purchase.id,
        supplierId: purchase.supplierId,
        ...this.sanitize(input),
        createdAt: timestamp,
        updatedAt: timestamp,
        postedAt: null,
        cancelledAt: null,
        cancelReason: '',
      };
      const created = this.unwrap(await this.repository.create(draft));
      await getAuditService().record({
        action: AuditAction.Create,
        entityType: 'credit-notes',
        entityId: created.id,
        entityLabel: noteLabel(created),
        summary: 'إنشاء مسودة إشعار دائن للمورد',
        after: created,
      });
      return created;
    });
  }

  /** Draft-only edit; the purchase reference is fixed at creation. */
  updateDraft(id: string, input: CreditNoteDraftInput): AsyncResult<CreditNote> {
    return this.execute('credit-notes.updateDraft', async () => {
      const existing = await this.require(id);
      this.assertDraft(existing);
      if (input.purchaseId !== existing.purchaseId) {
        throw ErrorFactory.conflict('The purchase reference of a credit note cannot change', {
          id,
        });
      }
      const purchase = await this.requirePostedPurchase(existing.purchaseId);
      this.validateContent(input, purchase);
      const updated = this.unwrap(
        await this.repository.update(id, {
          ...this.sanitize(input),
          updatedAt: nowIso(),
        }),
      );
      await getAuditService().record({
        action: AuditAction.Update,
        entityType: 'credit-notes',
        entityId: updated.id,
        entityLabel: noteLabel(updated),
        summary: 'تعديل مسودة إشعار دائن للمورد',
        before: existing,
        after: updated,
      });
      return updated;
    });
  }

  /** POST — atomically: validations + the shared no-negative cap + number. */
  post(id: string): AsyncResult<CreditNote> {
    return this.execute('credit-notes.post', async () => {
      // 1. State.
      const draft = await this.require(id);
      this.assertDraft(draft);

      // 2. Referenced purchase exists and is posted.
      const purchase = await this.requirePostedPurchase(draft.purchaseId);

      // 3. Content valid (amount, reason, date, attributions).
      this.validateContent(draft, purchase);

      // 4. The shared no-negative cap (BDD-011): value still creditable after
      //    posted returns and prior posted notes.
      const remaining = await this.remainingValue(purchase);
      if (draft.amount > remaining) {
        throw ErrorFactory.validation('Credit note amount exceeds the correctable remainder', {
          amount: draft.amount,
          remaining,
        });
      }

      // Effects atomically: the type's own sequence number + state + postedAt.
      const timestamp = nowIso();
      const number = await this.nextNumber();
      const posted = this.unwrap(
        await this.repository.update(id, {
          number,
          status: CreditNoteStatus.Posted,
          postedAt: timestamp,
          updatedAt: timestamp,
        }),
      );
      await getAuditService().record({
        action: AuditAction.Post,
        entityType: 'credit-notes',
        entityId: posted.id,
        entityLabel: noteLabel(posted),
        summary: `ترحيل إشعار دائن للمورد رقم ${number}`,
        before: draft,
        after: posted,
      });
      return posted;
    });
  }

  /** Delete a DRAFT note; posted notes are immutable and never deleted. */
  deleteDraft(id: string): AsyncResult<void> {
    return this.execute('credit-notes.deleteDraft', async () => {
      const record = await this.require(id);
      this.assertDraft(record);
      this.unwrap(await this.repository.remove(id));
      await getAuditService().record({
        action: AuditAction.Delete,
        entityType: 'credit-notes',
        entityId: id,
        entityLabel: noteLabel(record),
        summary: 'حذف مسودة إشعار دائن',
        before: record,
      });
    });
  }

  /**
   * Reversal cancellation (BDD-011 amendment, owner-approved 2026-08-01):
   * a POSTED note's financial effect is removed while its content, number,
   * and history stay frozen forever — the cancellation itself is a recorded,
   * reasoned event (audited with before/after), never an edit or a delete.
   * Every derived figure excludes it automatically (posted-only filters),
   * and the cancelled value returns to the purchase's correctable remainder.
   */
  cancel(id: string, reason: string): AsyncResult<CreditNote> {
    return this.execute('credit-notes.cancel', async () => {
      const record = await this.require(id);
      if (record.status === CreditNoteStatus.Cancelled) {
        throw ErrorFactory.conflict('The credit note is already cancelled', { id });
      }
      if (record.status !== CreditNoteStatus.Posted) {
        throw ErrorFactory.conflict(
          'Only posted credit notes can be cancelled — drafts are deleted',
          {
            id,
          },
        );
      }
      const trimmed = reason.trim();
      if (trimmed === '') {
        throw ErrorFactory.validation('A cancellation reason is required', { field: 'reason' });
      }
      const timestamp = nowIso();
      const cancelled = this.unwrap(
        await this.repository.update(id, {
          status: CreditNoteStatus.Cancelled,
          cancelledAt: timestamp,
          cancelReason: trimmed,
          updatedAt: timestamp,
        }),
      );
      await getAuditService().record({
        action: AuditAction.Update,
        entityType: 'credit-notes',
        entityId: cancelled.id,
        entityLabel: noteLabel(cancelled),
        summary: `إلغاء إشعار دائن رقم ${record.number} — ${trimmed}`,
        before: record,
        after: cancelled,
      });
      return cancelled;
    });
  }

  /** Next CREDIT-NOTE number (BDR-01: the type's own plain sequence). */
  private async nextNumber(): Promise<number> {
    return nextDocumentNumber(this.unwrap(await this.repository.findAll()));
  }

  /** Value still creditable on a purchase (the shared no-negative cap basis). */
  private async remainingValue(purchase: Purchase): Promise<number> {
    const returns = this.unwrap(await this.returnsByPurchase(purchase.id));
    const returnedValue = returns
      .filter((r) => r.status === ReturnStatus.Posted)
      .reduce((sum, r) => sum + returnTotal(r.lines), 0);
    const notes = this.unwrap(await this.repository.findAll());
    const credited = consumptionByKey(
      notes.filter((n) => n.purchaseId === purchase.id && n.status === CreditNoteStatus.Posted),
      (note) => [[note.purchaseId, note.amount] as const],
    );
    return roundAmount(
      remainingBasis(purchaseTotal(purchase.lines), returnedValue + (credited[purchase.id] ?? 0)),
    );
  }

  /** Shared content validation for draft create/update and posting. */
  private validateContent(
    input: Pick<CreditNoteDraftInput, 'date' | 'amount' | 'reasonType' | 'attributions'>,
    purchase: Purchase,
  ): void {
    if (!isValidIsoDate(input.date)) {
      throw ErrorFactory.validation('A valid date is required', { field: 'date' });
    }
    if (!Number.isFinite(input.amount) || !(input.amount > 0)) {
      throw ErrorFactory.validation('Credit note amount must be greater than zero', {
        field: 'amount',
      });
    }
    if (!Object.values(CreditNoteReason).includes(input.reasonType)) {
      throw ErrorFactory.validation('A correction reason is required', { field: 'reasonType' });
    }
    const attributions = input.attributions ?? [];
    for (const attribution of attributions) {
      if (!purchase.lines.some((line) => line.id === attribution.purchaseLineId)) {
        throw ErrorFactory.validation('Attribution references an unknown purchase line', {
          purchaseLineId: attribution.purchaseLineId,
        });
      }
      if (!Number.isFinite(attribution.amount) || !(attribution.amount > 0)) {
        throw ErrorFactory.validation('Attribution amount must be greater than zero', {
          purchaseLineId: attribution.purchaseLineId,
        });
      }
    }
    if (attributions.length > 0) {
      const total = roundAmount(
        attributions.reduce((sum, attribution) => sum + attribution.amount, 0),
      );
      if (total !== roundAmount(input.amount)) {
        throw ErrorFactory.validation('Attributions must sum to the credit note amount', {
          amount: input.amount,
          attributed: total,
        });
      }
    }
  }

  /** Normalized document content from a draft input (BDD-011 fields). */
  private sanitize(input: CreditNoteDraftInput): {
    date: string;
    amount: number;
    reasonType: CreditNoteReason;
    reasonNote: string;
    notes: string;
    attributions: readonly CreditNoteAttribution[];
  } {
    return {
      date: input.date.trim(),
      amount: roundAmount(input.amount),
      reasonType: input.reasonType,
      reasonNote: input.reasonNote?.trim() ?? '',
      notes: input.notes?.trim() ?? '',
      attributions: (input.attributions ?? []).map((attribution) => ({
        id: newRecordId(),
        purchaseLineId: attribution.purchaseLineId,
        amount: roundAmount(attribution.amount),
        note: attribution.note?.trim() ?? '',
      })),
    };
  }

  private async requirePostedPurchase(purchaseId: string): Promise<Purchase> {
    const result = await this.purchaseById(purchaseId);
    if (!result.ok) {
      throw result.error;
    }
    if (result.value.status !== PurchaseStatus.Posted) {
      throw ErrorFactory.validation('Credit notes can only reference a posted purchase', {
        purchaseId,
      });
    }
    return result.value;
  }

  private assertDraft(record: CreditNote): void {
    assertMutableDraft(record, CreditNoteStatus.Draft, 'Posted credit notes are immutable');
  }

  private unwrap<T>(result: Result<T>): T {
    if (!result.ok) {
      throw result.error;
    }
    return result.value;
  }

  private async require(id: string): Promise<CreditNote> {
    const record = this.unwrap(await this.repository.findById(id));
    if (record === null) {
      throw ErrorFactory.notFound(`Credit note '${id}' was not found`, { id });
    }
    return record;
  }
}

let service: CreditNoteService | undefined;

/** Module singleton used by the credit-note screens. */
export function getCreditNoteService(): CreditNoteService {
  if (service === undefined) {
    service = new CreditNoteService();
  }
  return service;
}
