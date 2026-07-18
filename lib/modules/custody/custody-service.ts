import { ApplicationService } from '@/lib/application';
import { ErrorFactory, isNonEmptyString, type AsyncResult, type Result } from '@/lib/core';
import { newRecordId, nowIso, type LocalRecordStore } from '../shared/local-record-store';
import { RepositoryFactory } from '../shared/repository-factory';
import { isValidIsoDate } from '../shared/dates';
import { AuditAction, getAuditService } from '../audit';
import {
  CustodyStatus,
  lineBalances,
  presentedStatus,
  returnProgress,
  totalDelivered,
  totalReturned,
  type Custody,
  type CustodyDraftInput,
  type CustodyLine,
  type CustodyLineBalance,
  type CustodyReturn,
  type CustodyReturnInput,
  type CustodyReturnLine,
  type PresentedCustodyStatus,
} from './custody';

/** Human reference for a voucher in the audit trail. */
function custodyLabel(record: Custody): string {
  return record.number === null ? 'مسودة' : `رقم ${record.number}`;
}

/**
 * CustodyService — the custody voucher (سند استلام بضاعة) and its return events.
 *
 * A voucher's Draft → Issued → Cancelled lifecycle mirrors the accounting
 * modules' Draft → Posted guardrails (issued content is immutable, drafts are
 * editable/deletable), but a custody voucher carries NO money. Return events
 * are folded into this service on purpose: they are transactions OF the voucher
 * aggregate, not standalone documents — so `recordReturn` lives here and each
 * event is immutable/append-only, matching "the complete history must remain
 * forever". Returned/remaining quantities are always derived from the events,
 * never stored (see custody.ts).
 */
export type CustodyRepository = Pick<
  LocalRecordStore<Custody>,
  'findAll' | 'findById' | 'create' | 'update' | 'remove'
>;

export type CustodyReturnRepository = Pick<
  LocalRecordStore<CustodyReturn>,
  'findAll' | 'findById' | 'create'
>;

export function getCustodyRepository(): CustodyRepository {
  return RepositoryFactory.get<Custody>('aldaftar.custody');
}

export function getCustodyReturnRepository(): CustodyReturnRepository {
  return RepositoryFactory.get<CustodyReturn>('aldaftar.custody-returns');
}

/** Everything the detail screen and the Record-Return dialog need. */
export interface CustodyBasis {
  readonly custody: Custody;
  readonly returns: readonly CustodyReturn[];
  readonly balances: readonly CustodyLineBalance[];
}

/** One list row with its derived status and progress (computed, not stored). */
export interface CustodySummary {
  readonly custody: Custody;
  readonly status: PresentedCustodyStatus;
  readonly itemCount: number;
  readonly delivered: number;
  readonly returned: number;
  readonly remaining: number;
  /** Fraction returned, 0..1. */
  readonly progress: number;
}

export class CustodyService extends ApplicationService {
  private readonly repository: CustodyRepository;
  private readonly returns: CustodyReturnRepository;

  constructor(
    repository: CustodyRepository = getCustodyRepository(),
    returns: CustodyReturnRepository = getCustodyReturnRepository(),
  ) {
    super('custody');
    this.repository = repository;
    this.returns = returns;
  }

  /** All vouchers, newest first (date desc, then updatedAt desc). */
  list(): AsyncResult<readonly Custody[]> {
    return this.execute('custody.list', async () => {
      const vouchers = this.unwrap(await this.repository.findAll());
      return [...vouchers].sort(
        (a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt),
      );
    });
  }

  getById(id: string): AsyncResult<Custody> {
    return this.execute('custody.getById', async () => this.require(id));
  }

  /** Return events for one voucher, newest first. */
  listReturns(custodyId: string): AsyncResult<readonly CustodyReturn[]> {
    return this.execute('custody.listReturns', async () => this.returnsFor(custodyId));
  }

  /** Voucher + its events + per-line balances (detail screen / return dialog). */
  basis(custodyId: string): AsyncResult<CustodyBasis> {
    return this.execute('custody.basis', async () => {
      const custody = await this.require(custodyId);
      const returns = await this.returnsFor(custodyId);
      return { custody, returns, balances: lineBalances(custody, returns) };
    });
  }

  /**
   * List rows with their derived status/progress — the whole list computed from
   * two reads (all vouchers + all return events), grouped in memory. `today`
   * (ISO yyyy-mm-dd) is passed in by the caller so "Overdue" stays a pure
   * derivation with no clock in the domain.
   */
  summaries(today: string): AsyncResult<readonly CustodySummary[]> {
    return this.execute('custody.summaries', async () => {
      const vouchers = this.unwrap(await this.repository.findAll());
      const allReturns = this.unwrap(await this.returns.findAll());
      const byCustody = new Map<string, CustodyReturn[]>();
      for (const event of allReturns) {
        const bucket = byCustody.get(event.custodyId);
        if (bucket === undefined) {
          byCustody.set(event.custodyId, [event]);
        } else {
          bucket.push(event);
        }
      }
      return [...vouchers]
        .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))
        .map((custody): CustodySummary => {
          const returns = byCustody.get(custody.id) ?? [];
          const delivered = totalDelivered(custody.lines);
          const returned = totalReturned(returns);
          return {
            custody,
            status: presentedStatus(custody, returns, today),
            itemCount: custody.lines.length,
            delivered,
            returned,
            remaining: Math.max(0, delivered - returned),
            progress: returnProgress(custody, returns),
          };
        });
    });
  }

  /** Creates a draft. Recipient + a valid date are required at save. */
  createDraft(input: CustodyDraftInput): AsyncResult<Custody> {
    return this.execute('custody.createDraft', async () => {
      this.validateDraftInput(input);
      const timestamp = nowIso();
      const custody: Custody = {
        id: newRecordId(),
        number: null,
        status: CustodyStatus.Draft,
        ...this.sanitizeDraft(input),
        createdAt: timestamp,
        updatedAt: timestamp,
        issuedAt: null,
        cancelledAt: null,
      };
      const created = this.unwrap(await this.repository.create(custody));
      await getAuditService().record({
        action: AuditAction.Create,
        entityType: 'custody',
        entityId: created.id,
        entityLabel: custodyLabel(created),
        summary: 'إنشاء مسودة سند استلام بضاعة',
        after: created,
      });
      return created;
    });
  }

  /** Replaces draft content. Issued/cancelled vouchers are immutable. */
  updateDraft(id: string, input: CustodyDraftInput): AsyncResult<Custody> {
    return this.execute('custody.updateDraft', async () => {
      const existing = await this.require(id);
      this.assertDraft(existing);
      this.validateDraftInput(input);
      const updated = this.unwrap(
        await this.repository.update(id, { ...this.sanitizeDraft(input), updatedAt: nowIso() }),
      );
      await getAuditService().record({
        action: AuditAction.Update,
        entityType: 'custody',
        entityId: updated.id,
        entityLabel: custodyLabel(updated),
        summary: 'تعديل مسودة سند استلام بضاعة',
        before: existing,
        after: updated,
      });
      return updated;
    });
  }

  /**
   * ISSUE — the commit step (analogous to posting): assigns the official
   * number and freezes the delivered quantities. Validation in order: draft
   * state, recipient, at least one line, each line named with quantity > 0,
   * valid dates. Effects land atomically in a single record write.
   */
  issue(id: string): AsyncResult<Custody> {
    return this.execute('custody.issue', async () => {
      const custody = await this.require(id);
      this.assertDraft(custody);

      if (!isNonEmptyString(custody.recipient)) {
        throw ErrorFactory.validation('Recipient is required', { field: 'recipient' });
      }
      if (custody.lines.length === 0) {
        throw ErrorFactory.validation('At least one item is required', { field: 'lines' });
      }
      for (const line of custody.lines) {
        if (!isNonEmptyString(line.item)) {
          throw ErrorFactory.validation('Each item needs a name', { lineId: line.id });
        }
        if (!(line.quantity > 0)) {
          throw ErrorFactory.validation('Item quantity must be greater than zero', {
            lineId: line.id,
          });
        }
      }
      if (!isValidIsoDate(custody.date)) {
        throw ErrorFactory.validation('A valid date is required', { field: 'date' });
      }
      if (custody.expectedReturnDate !== null && !isValidIsoDate(custody.expectedReturnDate)) {
        throw ErrorFactory.validation('The expected return date is invalid', {
          field: 'expectedReturnDate',
        });
      }

      const number = await this.nextNumber();
      const timestamp = nowIso();
      const issued = this.unwrap(
        await this.repository.update(id, {
          number,
          status: CustodyStatus.Issued,
          issuedAt: timestamp,
          updatedAt: timestamp,
        }),
      );
      await getAuditService().record({
        action: AuditAction.Post,
        entityType: 'custody',
        entityId: issued.id,
        entityLabel: custodyLabel(issued),
        summary: `إصدار سند استلام بضاعة رقم ${number}`,
        before: custody,
        after: issued,
      });
      return issued;
    });
  }

  /**
   * CANCEL an issued voucher — only while it has NO recorded returns (a clean
   * "issued by mistake" reversal). Once any return exists the history is
   * load-bearing and must be preserved, so cancel is blocked. A cancelled
   * voucher is kept forever (never deleted); its number is not reused.
   */
  cancel(id: string): AsyncResult<Custody> {
    return this.execute('custody.cancel', async () => {
      const custody = await this.require(id);
      if (custody.status !== CustodyStatus.Issued) {
        throw ErrorFactory.conflict('Only an issued voucher can be cancelled', { id });
      }
      const returns = await this.returnsFor(id);
      if (returns.length > 0) {
        throw ErrorFactory.conflict('A voucher with recorded returns cannot be cancelled', {
          id,
          returns: returns.length,
        });
      }
      const timestamp = nowIso();
      const cancelled = this.unwrap(
        await this.repository.update(id, {
          status: CustodyStatus.Cancelled,
          cancelledAt: timestamp,
          updatedAt: timestamp,
        }),
      );
      await getAuditService().record({
        action: AuditAction.Update,
        entityType: 'custody',
        entityId: cancelled.id,
        entityLabel: custodyLabel(cancelled),
        summary: `إلغاء سند استلام بضاعة ${custodyLabel(cancelled)}`,
        before: custody,
        after: cancelled,
      });
      return cancelled;
    });
  }

  /**
   * Delete a DRAFT voucher. Issued/cancelled vouchers are never deleted
   * (continuous numbering + append-only history); the guard enforces this even
   * though the UI also disables the action. A draft has no number and no
   * return events, so its removal is safe — and audited.
   */
  deleteDraft(id: string): AsyncResult<void> {
    return this.execute('custody.deleteDraft', async () => {
      const custody = await this.require(id);
      this.assertDraft(custody);
      this.unwrap(await this.repository.remove(id));
      await getAuditService().record({
        action: AuditAction.Delete,
        entityType: 'custody',
        entityId: id,
        entityLabel: custodyLabel(custody),
        summary: 'حذف مسودة سند استلام بضاعة',
        before: custody,
      });
    });
  }

  /**
   * Record a return against an issued voucher — an immutable, append-only
   * event. Each quantity must be > 0 and within the line's remaining balance;
   * at least one positive quantity is required. History is never overwritten.
   */
  recordReturn(input: CustodyReturnInput): AsyncResult<CustodyReturn> {
    return this.execute('custody.recordReturn', async () => {
      const custody = await this.require(input.custodyId);
      if (custody.status !== CustodyStatus.Issued) {
        throw ErrorFactory.conflict('Returns can only be recorded against an issued voucher', {
          id: custody.id,
        });
      }
      if (!isValidIsoDate(input.date)) {
        throw ErrorFactory.validation('A valid date is required', { field: 'date' });
      }

      const existing = await this.returnsFor(custody.id);
      const balances = lineBalances(custody, existing);
      const remainingByLine = new Map(balances.map((b) => [b.line.id, b.remaining]));

      const lines: CustodyReturnLine[] = [];
      for (const [custodyLineId, rawQuantity] of Object.entries(input.quantities)) {
        const quantity = Number(rawQuantity);
        if (!(quantity > 0)) {
          continue; // zero / blank rows are dropped, not errors
        }
        const remaining = remainingByLine.get(custodyLineId);
        if (remaining === undefined) {
          throw ErrorFactory.validation('Return references an unknown custody line', {
            custodyLineId,
          });
        }
        if (quantity > remaining) {
          throw ErrorFactory.validation('Returned quantity exceeds the outstanding balance', {
            custodyLineId,
            remaining,
          });
        }
        lines.push({ custodyLineId, quantity });
      }
      if (lines.length === 0) {
        throw ErrorFactory.validation('At least one returned quantity is required', {
          field: 'quantities',
        });
      }

      const event: CustodyReturn = {
        id: newRecordId(),
        custodyId: custody.id,
        date: input.date.trim(),
        notes: input.notes?.trim() ?? '',
        lines,
        createdAt: nowIso(),
      };
      const created = this.unwrap(await this.returns.create(event));
      await getAuditService().record({
        action: AuditAction.Create,
        entityType: 'custody-returns',
        entityId: created.id,
        entityLabel: custodyLabel(custody),
        summary: `تسجيل إرجاع على سند استلام بضاعة ${custodyLabel(custody)}`,
        after: created,
      });
      return created;
    });
  }

  /** Next official number: max issued number + 1, starting at 1 (per-type). */
  private async nextNumber(): Promise<number> {
    const vouchers = this.unwrap(await this.repository.findAll());
    return (
      vouchers.reduce((max, v) => (v.number !== null && v.number > max ? v.number : max), 0) + 1
    );
  }

  private async returnsFor(custodyId: string): Promise<readonly CustodyReturn[]> {
    const all = this.unwrap(await this.returns.findAll());
    return all
      .filter((event) => event.custodyId === custodyId)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }

  private sanitizeDraft(input: CustodyDraftInput) {
    const expected = input.expectedReturnDate?.trim();
    return {
      recipient: input.recipient.trim(),
      phone: input.phone?.trim() ?? '',
      date: input.date.trim(),
      expectedReturnDate: expected !== undefined && expected !== '' ? expected : null,
      notes: input.notes?.trim() ?? '',
      lines: input.lines.map((line): CustodyLine => ({
        id: newRecordId(),
        item: line.item.trim(),
        description: line.description?.trim() ?? '',
        quantity: line.quantity,
        remarks: line.remarks?.trim() ?? '',
      })),
    };
  }

  private validateDraftInput(input: CustodyDraftInput): void {
    if (!isNonEmptyString(input.recipient)) {
      throw ErrorFactory.validation('Recipient is required', { field: 'recipient' });
    }
    if (!isValidIsoDate(input.date)) {
      throw ErrorFactory.validation('A valid date is required', { field: 'date' });
    }
    if (
      input.expectedReturnDate !== undefined &&
      input.expectedReturnDate !== null &&
      input.expectedReturnDate.trim() !== '' &&
      !isValidIsoDate(input.expectedReturnDate.trim())
    ) {
      throw ErrorFactory.validation('The expected return date is invalid', {
        field: 'expectedReturnDate',
      });
    }
  }

  private assertDraft(custody: Custody): void {
    if (custody.status !== CustodyStatus.Draft) {
      throw ErrorFactory.conflict('Issued vouchers are immutable', { id: custody.id });
    }
  }

  private unwrap<T>(result: Result<T>): T {
    if (!result.ok) {
      throw result.error;
    }
    return result.value;
  }

  private async require(id: string): Promise<Custody> {
    const custody = this.unwrap(await this.repository.findById(id));
    if (custody === null) {
      throw ErrorFactory.notFound(`Custody voucher '${id}' was not found`, { id });
    }
    return custody;
  }
}

let service: CustodyService | undefined;

/** Module singleton used by the Custody screens. */
export function getCustodyService(): CustodyService {
  if (service === undefined) {
    service = new CustodyService();
  }
  return service;
}
