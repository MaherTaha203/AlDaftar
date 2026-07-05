/**
 * Attachments module — types (business-architecture M7, screens S-70/D-05/
 * D-06). Completely generic: an attachment links a stored file to an owning
 * record by an opaque (type, id) pair — the module knows no business
 * meaning. Reusable by Purchases, Purchase Returns, Payments, Suppliers,
 * and future modules without modification.
 *
 * BDR-08 interims (conservative, documented in docs/technical-debt.md):
 * accepted types images+PDF, 10 MB per file; deletion policy is the
 * CALLER's decision (the owning module knows its lifecycle) — the module
 * only exposes the operation.
 */
export interface AttachmentOwner {
  /** Opaque owner kind, e.g. 'supplier' | 'purchase' | 'purchase-return' | 'payment'. */
  readonly type: string;
  readonly id: string;
}

export interface Attachment {
  readonly id: string;
  readonly ownerType: string;
  readonly ownerId: string;
  /** Display title — defaults to the original file name. */
  readonly title: string;
  readonly contentType: string;
  /** File size in bytes. */
  readonly size: number;
  /** Key of the binary in the file store. */
  readonly storageKey: string;
  readonly createdAt: string;
}

/** BDR-08 interim guardrails — single constants, adjusted when decided. */
export const ATTACHMENT_ACCEPT = 'image/*,application/pdf';
export const ATTACHMENT_MAX_SIZE_BYTES = 10 * 1024 * 1024;

/** Canonical owner-type keys used across the app (labels live in the UI). */
export const AttachmentOwnerTypes = {
  Supplier: 'supplier',
  Purchase: 'purchase',
  PurchaseReturn: 'purchase-return',
  Payment: 'payment',
} as const;

/** Human file size, e.g. '824 KB' / '2.4 MB'. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
