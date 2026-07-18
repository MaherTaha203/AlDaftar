import {
  PresentedCustodyStatus,
  type PresentedCustodyStatus as Status,
} from '@/lib/modules/custody';
import { StatusBadge, type BadgeTone } from '../../ui';

/**
 * CustodyStatusBadge — maps the DERIVED custody status onto badge tones with
 * fixed Arabic labels, so every screen renders the six presented states (draft,
 * issued, partially/fully returned, overdue, cancelled) identically. Unlike the
 * accounting DocumentStatus, most of these are computed at read time, not
 * stored (see lib/modules/custody).
 */
const statusBadge: Record<Status, { tone: BadgeTone; label: string }> = {
  [PresentedCustodyStatus.Draft]: { tone: 'neutral', label: 'مسودة' },
  [PresentedCustodyStatus.Issued]: { tone: 'info', label: 'صادر' },
  [PresentedCustodyStatus.PartiallyReturned]: { tone: 'warning', label: 'مُرجَع جزئيًا' },
  [PresentedCustodyStatus.FullyReturned]: { tone: 'success', label: 'مكتمل الإرجاع' },
  [PresentedCustodyStatus.Overdue]: { tone: 'danger', label: 'متأخر' },
  [PresentedCustodyStatus.Cancelled]: { tone: 'neutral', label: 'ملغى' },
};

export interface CustodyStatusBadgeProps {
  status: Status;
  className?: string;
}

export function CustodyStatusBadge({ status, className }: CustodyStatusBadgeProps) {
  const badge = statusBadge[status];
  return (
    <StatusBadge tone={badge.tone} className={className}>
      {badge.label}
    </StatusBadge>
  );
}

/**
 * ReturnProgress — a compact, accessible progress meter for the list/detail.
 * `value` is a fraction 0..1; the bar fills logically from the start edge (RTL
 * aware) and announces the percentage.
 */
export function ReturnProgress({ value }: { value: number }) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="flex items-center gap-sm" title={`${percent}%`}>
      <div
        className="h-1.5 w-20 overflow-hidden rounded-full bg-neutral-100"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-success transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-neutral-500">
        <bdi dir="ltr">{percent}%</bdi>
      </span>
    </div>
  );
}
