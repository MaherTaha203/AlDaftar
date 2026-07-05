import { ApplicationService } from '@/lib/application';
import { ErrorFactory, isNonEmptyString, type AsyncResult, type Result } from '@/lib/core';
import { newRecordId, nowIso } from './local-record-store';
import { AuditAction, getAuditService } from '../audit';

/**
 * REFERENCE FRAMEWORK — core (execution-contract Phase 8).
 *
 * The shared shape of every reference/master-data module (Suppliers,
 * Categories, Units, Currencies; business-architecture R1 "master data"):
 * Reference Entity (`MasterRecord`), Reference Repository contract
 * (`MasterRepository`), Reference Service (`MasterDataService`), Reference
 * Validation (name required + unique), Reference Status/Archive handling.
 * One implementation of the approved rules, instantiated per module so the
 * rules can never drift. Business-independent by contract: no module logic
 * lives here.
 *
 * Modules depend ONLY on `MasterRepository<T>` and obtain implementations
 * exclusively through `RepositoryFactory` (the single persistence entry
 * point and the Supabase swap seam — TD-004).
 */
export const MasterStatus = {
  Active: 'active',
  Archived: 'archived',
} as const;

export type MasterStatus = (typeof MasterStatus)[keyof typeof MasterStatus];

/** Base shape of every master-data record. */
export interface MasterRecord {
  readonly id: string;
  readonly name: string;
  readonly status: MasterStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Base input: every master-data form has at least the (required) name. */
export interface MasterInput {
  readonly name: string;
}

/** Persistence contract every master-data module depends on. No delete —
 * records are archived, never removed (approved workflow rule). */
export interface MasterRepository<T extends MasterRecord> {
  findAll(): AsyncResult<readonly T[]>;
  findById(id: string): AsyncResult<T | null>;
  create(record: T): AsyncResult<T>;
  update(id: string, changes: Partial<T>): AsyncResult<T>;
}

/**
 * Generic application service for master data. Subclasses provide only
 * `sanitize` (module fields from the input); everything else — validation,
 * uniqueness, lifecycle, sorting, logging via execute() — is shared.
 */
export abstract class MasterDataService<
  T extends MasterRecord,
  TInput extends MasterInput,
> extends ApplicationService {
  protected readonly repository: MasterRepository<T>;

  protected constructor(serviceName: string, repository: MasterRepository<T>) {
    super(serviceName);
    this.repository = repository;
  }

  /**
   * Module-specific fields derived from the input (name already trimmed and
   * validated). The result is merged with the base record fields.
   */
  protected abstract sanitize(
    input: TInput,
    name: string,
  ): Omit<T, 'id' | 'status' | 'createdAt' | 'updatedAt'>;

  /** All records: active first, then Arabic-collated by name. */
  list(): AsyncResult<readonly T[]> {
    return this.execute(`${this.serviceName}.list`, async () => {
      const records = this.unwrap(await this.repository.findAll());
      return [...records].sort(
        (a, b) =>
          (a.status === b.status ? 0 : a.status === MasterStatus.Active ? -1 : 1) ||
          a.name.localeCompare(b.name, 'ar'),
      );
    });
  }

  getById(id: string): AsyncResult<T> {
    return this.execute(`${this.serviceName}.getById`, async () => this.require(id));
  }

  create(input: TInput): AsyncResult<T> {
    return this.execute(`${this.serviceName}.create`, async () => {
      const name = this.validName(input.name);
      await this.assertNameAvailable(name);
      const timestamp = nowIso();
      const record = {
        ...this.sanitize(input, name),
        id: newRecordId(),
        status: MasterStatus.Active,
        createdAt: timestamp,
        updatedAt: timestamp,
        // The merge provably contains every T field (sanitize returns the
        // module fields; base fields are added here), but TypeScript cannot
        // verify a generic spread — hence the single cast.
      } as T;
      const created = this.unwrap(await this.repository.create(record));
      await getAuditService().record({
        action: AuditAction.Create,
        entityType: this.serviceName,
        entityId: created.id,
        entityLabel: created.name,
        summary: `إنشاء «${created.name}»`,
        after: created,
      });
      return created;
    });
  }

  update(id: string, input: TInput): AsyncResult<T> {
    return this.execute(`${this.serviceName}.update`, async () => {
      const before = await this.require(id);
      const name = this.validName(input.name);
      await this.assertNameAvailable(name, id);
      const changes = { ...this.sanitize(input, name), updatedAt: nowIso() } as Partial<T>;
      const updated = this.unwrap(await this.repository.update(id, changes));
      await getAuditService().record({
        action: AuditAction.Update,
        entityType: this.serviceName,
        entityId: updated.id,
        entityLabel: updated.name,
        summary: `تعديل «${updated.name}»`,
        before,
        after: updated,
      });
      return updated;
    });
  }

  archive(id: string): AsyncResult<T> {
    return this.setStatus(`${this.serviceName}.archive`, id, MasterStatus.Archived);
  }

  reactivate(id: string): AsyncResult<T> {
    return this.setStatus(`${this.serviceName}.reactivate`, id, MasterStatus.Active);
  }

  private setStatus(operation: string, id: string, status: MasterStatus): AsyncResult<T> {
    return this.execute(operation, async () => {
      const before = await this.require(id);
      const changes = { status, updatedAt: nowIso() } as Partial<T>;
      const updated = this.unwrap(await this.repository.update(id, changes));
      await getAuditService().record({
        action: AuditAction.Update,
        entityType: this.serviceName,
        entityId: updated.id,
        entityLabel: updated.name,
        summary:
          status === MasterStatus.Archived ? `أرشفة «${updated.name}»` : `تنشيط «${updated.name}»`,
        before,
        after: updated,
      });
      return updated;
    });
  }

  /** Unwraps a repository Result inside execute(); failures rethrow typed. */
  protected unwrap<TValue>(result: Result<TValue>): TValue {
    if (!result.ok) {
      throw result.error;
    }
    return result.value;
  }

  protected validName(raw: string): string {
    if (!isNonEmptyString(raw)) {
      throw ErrorFactory.validation('Name is required', { field: 'name' });
    }
    return raw.trim();
  }

  protected async require(id: string): Promise<T> {
    const record = this.unwrap(await this.repository.findById(id));
    if (record === null) {
      throw ErrorFactory.notFound(`Record '${id}' was not found`, { id });
    }
    return record;
  }

  protected async assertNameAvailable(name: string, exceptId?: string): Promise<void> {
    const records = this.unwrap(await this.repository.findAll());
    if (records.some((record) => record.id !== exceptId && record.name === name)) {
      throw ErrorFactory.conflict('A record with this name already exists', { field: 'name' });
    }
  }
}
