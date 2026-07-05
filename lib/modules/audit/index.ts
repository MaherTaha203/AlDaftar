// Audit module — immutable append-only business audit trail (BDD-010 / DL-021).

export {
  AuditAction,
  AUDIT_ACTION_LABEL,
  AUDIT_ENTITY_LABEL,
  type AuditEntry,
} from './audit-entry';
export {
  AuditService,
  getAuditService,
  getAuditRepository,
  AUDIT_USER,
  type AuditRepository,
  type AuditRecordInput,
} from './audit-service';
