'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AttachmentOwnerTypes } from '@/lib/modules/attachments';
import { getSupplierService, SupplierStatus, type Supplier } from '@/lib/modules/suppliers';
import { PageLayout, useShortcut } from '../../app';
import { AttachmentsSection } from '../attachments';
import { useOperation } from '../../framework';
import { Button, Card, ConfirmDialog, ErrorState, Skeleton, StatusBadge, useToast } from '../../ui';

/**
 * SupplierDetail — screen S-11 (info scope). Header card with identity,
 * status, and actions (edit / archive / reactivate with confirmation, per
 * 01 §1.3) plus the Info section. The statement / purchases / returns /
 * payments / attachments tabs are added by their own modules (tracked
 * interim state) — the archive-with-balance warning (D-04) likewise
 * activates when document modules exist, since no balance source exists yet.
 */
export interface SupplierDetailProps {
  supplierId: string;
}

const infoRows: readonly { label: string; key: 'phone' | 'address' | 'taxReference' | 'notes' }[] =
  [
    { label: 'الهاتف', key: 'phone' },
    { label: 'العنوان', key: 'address' },
    { label: 'الرقم الضريبي / السجل', key: 'taxReference' },
    { label: 'ملاحظات', key: 'notes' },
  ];

export function SupplierDetail({ supplierId }: SupplierDetailProps) {
  const router = useRouter();
  const toast = useToast();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Current-record shortcuts (Productivity Sprint #3, activated in Batch B):
  // F2 edits, Delete opens the archive confirmation while the supplier is
  // active. Both no-op until the record has loaded.
  useShortcut('edit', () => router.push(`/suppliers/${supplierId}/edit`), supplier !== null);
  useShortcut(
    'delete',
    () => setConfirming(true),
    supplier !== null && supplier.status === SupplierStatus.Active,
  );

  const { run: loadSupplier, error: loadError } = useOperation((id: string) =>
    getSupplierService().getById(id),
  );
  const toggleStatus = useOperation((id: string, archive: boolean) =>
    archive ? getSupplierService().archive(id) : getSupplierService().reactivate(id),
  );

  useEffect(() => {
    void loadSupplier(supplierId).then((result) => {
      if (result.ok) {
        setSupplier(result.value);
      }
    });
  }, [supplierId, loadSupplier]);

  if (loadError !== null) {
    return (
      <PageLayout>
        <ErrorState message={loadError} onRetry={() => void loadSupplier(supplierId)} />
      </PageLayout>
    );
  }

  if (supplier === null) {
    return (
      <PageLayout>
        <Card>
          <div className="flex flex-col gap-sm">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </Card>
      </PageLayout>
    );
  }

  const isActive = supplier.status === SupplierStatus.Active;

  async function handleToggleStatus() {
    if (supplier === null) {
      return;
    }
    const result = await toggleStatus.run(supplier.id, isActive);
    setConfirming(false);
    if (result.ok) {
      setSupplier(result.value);
      toast.show({
        variant: 'success',
        message: isActive ? 'تمت أرشفة المورد' : 'تمت إعادة تنشيط المورد',
      });
    } else {
      toast.show({ variant: 'error', message: toggleStatus.error ?? 'تعذر تنفيذ العملية' });
    }
  }

  return (
    <PageLayout leafLabel={supplier.name}>
      <Card
        title={
          <span className="flex items-center gap-sm">
            {supplier.name}
            <StatusBadge tone={isActive ? 'success' : 'neutral'}>
              {isActive ? 'نشط' : 'مؤرشف'}
            </StatusBadge>
          </span>
        }
        actions={
          <>
            {isActive ? (
              <Link href={`/payments/new?supplier=${supplier.id}`}>
                <Button variant="secondary" size="sm">
                  دفع
                </Button>
              </Link>
            ) : null}
            <Link href={`/suppliers/${supplier.id}/edit`}>
              <Button variant="secondary" size="sm">
                تعديل
              </Button>
            </Link>
            <Button
              variant={isActive ? 'ghost' : 'secondary'}
              size="sm"
              onClick={() => setConfirming(true)}
            >
              {isActive ? 'أرشفة' : 'إعادة تنشيط'}
            </Button>
          </>
        }
      >
        <dl className="grid grid-cols-1 gap-md md:grid-cols-2">
          {infoRows.map((row) => (
            <div key={row.key} className="flex flex-col gap-xs">
              <dt className="text-xs text-neutral-400">{row.label}</dt>
              <dd className="text-sm">
                {supplier[row.key] === '' ? (
                  '—'
                ) : row.key === 'phone' || row.key === 'taxReference' ? (
                  <bdi dir="ltr">{supplier[row.key]}</bdi>
                ) : (
                  supplier[row.key]
                )}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <AttachmentsSection
        owner={{ type: AttachmentOwnerTypes.Supplier, id: supplier.id }}
        allowDelete={false}
      />

      <ConfirmDialog
        open={confirming}
        title={isActive ? 'أرشفة المورد' : 'إعادة تنشيط المورد'}
        confirmLabel={isActive ? 'أرشفة' : 'إعادة تنشيط'}
        danger={isActive}
        busy={toggleStatus.pending}
        onConfirm={() => void handleToggleStatus()}
        onCancel={() => setConfirming(false)}
      >
        {isActive
          ? `سيُخفى «${supplier.name}» من قوائم الاختيار ولن يُحذف أي سجل.`
          : `سيعود «${supplier.name}» للظهور في قوائم الاختيار.`}
      </ConfirmDialog>
    </PageLayout>
  );
}
