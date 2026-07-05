'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  getPaymentService,
  paymentTotalCredit,
  PaymentStatus,
  type Payment,
} from '@/lib/modules/payments';
import { BOOK_CURRENCY } from '@/lib/modules/shared/money';
import { getSupplierService, type Supplier } from '@/lib/modules/suppliers';
import { AttachmentOwnerTypes } from '@/lib/modules/attachments';
import { PageLayout } from '../../app';
import { AttachmentsSection } from '../attachments';
import { useOperation } from '../../framework';
import { Button, Card, DocumentStatus, ErrorState, MoneyDisplay, Skeleton } from '../../ui';

/**
 * PaymentDetail — screen S-41. Read-only payment view (amount + separate
 * discount, method, reference). Drafts get an edit action; posted payments
 * get none (immutability). Both offer a Print action → the S-44 voucher view.
 */
export interface PaymentDetailProps {
  paymentId: string;
}

export function PaymentDetail({ paymentId }: PaymentDetailProps) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [suppliers, setSuppliers] = useState<readonly Supplier[]>([]);

  const { run: load, error } = useOperation((id: string) => getPaymentService().getById(id));
  const { run: loadSuppliers } = useOperation(() => getSupplierService().list());

  useEffect(() => {
    void load(paymentId).then((r) => r.ok && setPayment(r.value));
    void loadSuppliers().then((r) => r.ok && setSuppliers(r.value));
  }, [paymentId, load, loadSuppliers]);

  const supplierName = useMemo(() => new Map(suppliers.map((s) => [s.id, s.name])), [suppliers]);

  if (error !== null) {
    return (
      <PageLayout>
        <ErrorState message={error} onRetry={() => void load(paymentId)} />
      </PageLayout>
    );
  }

  if (payment === null) {
    return (
      <PageLayout>
        <Card>
          <div className="flex flex-col gap-sm">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </Card>
      </PageLayout>
    );
  }

  const isDraft = payment.status === PaymentStatus.Draft;
  const title = isDraft ? 'مسودة دفعة' : `سند دفع رقم ${payment.number}`;
  const hasDiscount = payment.discount > 0;

  return (
    <PageLayout leafLabel={title}>
      <Card
        title={
          <span className="flex items-center gap-sm">
            {title}
            <DocumentStatus state={payment.status} />
          </span>
        }
        actions={
          <span className="flex items-center gap-sm">
            <Link href={`/payments/${payment.id}/print`}>
              <Button variant="secondary" size="sm">
                طباعة
              </Button>
            </Link>
            {isDraft ? (
              <Link href={`/payments/${payment.id}/edit`}>
                <Button variant="secondary" size="sm">
                  تعديل
                </Button>
              </Link>
            ) : null}
          </span>
        }
      >
        <dl className="grid grid-cols-1 gap-md md:grid-cols-3">
          <div className="flex flex-col gap-xs">
            <dt className="text-xs text-neutral-400">المورد</dt>
            <dd className="text-sm">{supplierName.get(payment.supplierId) ?? '—'}</dd>
          </div>
          <div className="flex flex-col gap-xs">
            <dt className="text-xs text-neutral-400">التاريخ</dt>
            <dd className="text-sm">
              <bdi dir="ltr">{payment.date}</bdi>
            </dd>
          </div>
          <div className="flex flex-col gap-xs">
            <dt className="text-xs text-neutral-400">طريقة الدفع</dt>
            <dd className="text-sm">
              {payment.method || '—'}
              {payment.reference !== '' ? (
                <>
                  {' '}
                  · <bdi dir="ltr">{payment.reference}</bdi>
                </>
              ) : null}
            </dd>
          </div>
          <div className="flex flex-col gap-xs">
            <dt className="text-xs text-neutral-400">المبلغ المدفوع</dt>
            <dd className="text-sm font-semibold">
              <MoneyDisplay value={payment.amount} currencyLabel={BOOK_CURRENCY.symbol} />
            </dd>
          </div>
          {hasDiscount ? (
            <div className="flex flex-col gap-xs">
              <dt className="text-xs text-neutral-400">خصم عند الدفع</dt>
              <dd className="text-sm">
                <MoneyDisplay value={payment.discount} currencyLabel={BOOK_CURRENCY.symbol} />
              </dd>
            </div>
          ) : null}
          {hasDiscount ? (
            <div className="flex flex-col gap-xs">
              <dt className="text-xs text-neutral-400">إجمالي الائتمان للمورد</dt>
              <dd className="text-sm font-semibold">
                <MoneyDisplay
                  value={paymentTotalCredit(payment)}
                  currencyLabel={BOOK_CURRENCY.symbol}
                />
              </dd>
            </div>
          ) : null}
          {payment.notes !== '' ? (
            <div className="flex flex-col gap-xs md:col-span-3">
              <dt className="text-xs text-neutral-400">ملاحظات</dt>
              <dd className="text-sm">{payment.notes}</dd>
            </div>
          ) : null}
        </dl>
      </Card>

      <AttachmentsSection
        owner={{ type: AttachmentOwnerTypes.Payment, id: payment.id }}
        allowDelete={isDraft}
      />
    </PageLayout>
  );
}
