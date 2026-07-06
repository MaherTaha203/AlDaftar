import { ApplicationService } from '@/lib/application';
import { type AsyncResult, type Result } from '@/lib/core';
import { newRecordId, nowIso, type LocalRecordStore } from '../shared/local-record-store';
import { RepositoryFactory } from '../shared/repository-factory';
import { AuditAction, type AuditEntry } from './audit-entry';

/**
 * AuditService — the append-only business audit trail (BDD-010 / DL-021).
 * Immutable by construction: the repository surface exposes only `findAll` and
 * `create` (no update, no remove), so an entry can never be changed or erased.
 *
 * Writing modules call `record(...)` from within their own operations; a
 * recording failure is logged with its action/entity and then swallowed so it
 * can never roll back a successful business action (the trail is best-effort at
 * the edge, never a gate — but a gap is never silent). The Audit Log screen and
 * the Audit Log Report read it read-only.
 */
export type AuditRepository = Pick<LocalRecordStore<AuditEntry>, 'findAll' | 'create'>;

export function getAuditRepository(): AuditRepository {
  return RepositoryFactory.get<AuditEntry>('aldaftar.audit');
}

/** Single-owner identity (PD-18); a constant until multi-user is promoted. */
export const AUDIT_USER = 'المالك';

export interface AuditRecordInput {
  readonly action: AuditAction;
  readonly entityType: string;
  readonly entityId: string;
  readonly entityLabel: string;
  readonly summary: string;
  readonly before?: unknown;
  readonly after?: unknown;
}

function currentDevice(): string {
  return typeof navigator !== 'undefined' ? navigator.userAgent : '';
}

function snapshot(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

export class AuditService extends ApplicationService {
  private readonly injected: AuditRepository | undefined;

  constructor(repository?: AuditRepository) {
    super('audit');
    this.injected = repository;
  }

  /**
   * Resolved PER OPERATION (unless a test injected one): capturing the
   * repository at construction let a singleton created before the Supabase
   * provider registration hold the local store forever — the proven cause of
   * audit entries silently missing the database (DL-033). Per-call resolution
   * always reflects the currently registered provider.
   */
  private get repository(): AuditRepository {
    return this.injected ?? getAuditRepository();
  }

  /** Appends one immutable entry. Never throws (returns a Result). */
  record(input: AuditRecordInput): AsyncResult<AuditEntry> {
    return this.execute('audit.record', async () => {
      const entry: AuditEntry = {
        id: newRecordId(),
        timestamp: nowIso(),
        user: AUDIT_USER,
        device: currentDevice(),
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        entityLabel: input.entityLabel,
        summary: input.summary,
        before: snapshot(input.before),
        after: snapshot(input.after),
      };
      const result = await this.repository.create(entry);
      if (!result.ok) {
        // Best-effort at the edge (never a gate), but a gap must be detectable:
        // record which action/entity failed so it surfaces in the structured log.
        this.logger.warn('audit entry was not recorded', {
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
        });
        throw result.error;
      }
      return result.value;
    });
  }

  /** All entries, newest first (read-only Audit Log). */
  list(): AsyncResult<readonly AuditEntry[]> {
    return this.execute('audit.list', async () => {
      const all = this.unwrap(await this.repository.findAll());
      return [...all].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    });
  }

  private unwrap<T>(result: Result<T>): T {
    if (!result.ok) {
      throw result.error;
    }
    return result.value;
  }
}

let service: AuditService | undefined;

export function getAuditService(): AuditService {
  if (service === undefined) {
    service = new AuditService();
  }
  return service;
}
