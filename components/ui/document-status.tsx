import { StatusBadge } from './status-badge';

/**
 * DocumentStatus — 04_Component_Library.md §3. Maps the approved document
 * lifecycle states (01_System_Workflow.md §0.1: Draft → Posted) onto
 * StatusBadge tones with fixed Arabic labels, so every screen renders states
 * identically. A voided state is deliberately absent pending BDR-07.
 *
 * `MissingInvoiceBadge` is the informational «بدون فاتورة مورد» badge shown
 * on purchases received without a supplier invoice (a core monitoring
 * purpose of the system).
 */
export type DocumentState = 'draft' | 'posted';

const stateBadge: Record<DocumentState, { tone: 'warning' | 'success'; label: string }> = {
  draft: { tone: 'warning', label: 'مسودة' },
  posted: { tone: 'success', label: 'مرحّل' },
};

export interface DocumentStatusProps {
  state: DocumentState;
  className?: string;
}

export function DocumentStatus({ state, className }: DocumentStatusProps) {
  const badge = stateBadge[state];
  return (
    <StatusBadge tone={badge.tone} className={className}>
      {badge.label}
    </StatusBadge>
  );
}

export function MissingInvoiceBadge({ className }: { className?: string }) {
  return (
    <StatusBadge tone="info" className={className}>
      بدون فاتورة مورد
    </StatusBadge>
  );
}
