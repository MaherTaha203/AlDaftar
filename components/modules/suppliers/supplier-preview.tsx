'use client';

import { SupplierStatus, type Supplier } from '@/lib/modules/suppliers';
import { HoverPreview, StatusBadge } from '../../ui';

/**
 * SupplierReference (Productivity Sprint #6) — a supplier name that reveals a
 * rich preview card on hover / focus: identity, status, phone, and tax
 * reference at a glance, without leaving the current screen. Presentational;
 * the caller passes the already-loaded supplier (no fetch). Falls back to plain
 * text (em dash) when the supplier is unknown.
 */
export function SupplierReference({ supplier }: { supplier: Supplier | undefined }) {
  if (supplier === undefined) {
    return <>—</>;
  }
  const active = supplier.status === SupplierStatus.Active;
  return (
    <HoverPreview
      content={
        <div className="flex flex-col gap-sm">
          <div className="flex items-center justify-between gap-sm">
            <span className="text-sm font-semibold">{supplier.name}</span>
            <StatusBadge tone={active ? 'success' : 'neutral'}>
              {active ? 'نشط' : 'مؤرشف'}
            </StatusBadge>
          </div>
          <dl className="flex flex-col gap-xs text-xs">
            <div className="flex justify-between gap-md">
              <dt className="text-neutral-400">الهاتف</dt>
              <dd>{supplier.phone === '' ? '—' : <bdi dir="ltr">{supplier.phone}</bdi>}</dd>
            </div>
            <div className="flex justify-between gap-md">
              <dt className="text-neutral-400">الرقم الضريبي</dt>
              <dd>
                {supplier.taxReference === '' ? '—' : <bdi dir="ltr">{supplier.taxReference}</bdi>}
              </dd>
            </div>
            {supplier.address !== '' ? (
              <div className="flex justify-between gap-md">
                <dt className="text-neutral-400">العنوان</dt>
                <dd className="text-end">{supplier.address}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      }
    >
      {supplier.name}
    </HoverPreview>
  );
}
