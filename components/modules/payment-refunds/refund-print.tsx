'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  getPaymentRefundService,
  PaymentRefundStatus,
  PAYMENT_REFUND_REASON_LABELS,
  refundTotalDebit,
  type PaymentRefund,
} from '@/lib/modules/payment-refunds';
import { getPaymentService, type Payment } from '@/lib/modules/payments';
import { getSupplierService, type Supplier } from '@/lib/modules/suppliers';
import {
  getSettingsService,
  EMPTY_COMPANY_PROFILE,
  type CompanyProfile,
} from '@/lib/modules/settings';
import { amountInWords } from '@/lib/modules/shared/amount-in-words';
import { BOOK_CURRENCY } from '@/lib/modules/shared/money';
import { useOperation } from '@/components/framework';
import { PrintLayout } from '@/components/layout';
import { formatDate, MoneyDisplay, Spinner } from '@/components/ui';
import { CompanyHeader } from '../shared/company-header';

/** RefundPrint — printable «سند استرداد دفعة» referencing the original payment (BDD-011). */
export function RefundPrint({ refundId }: { refundId: string }) {
  const router = useRouter();
  const [record, setRecord] = useState<PaymentRefund | null>(null);
  const [payments, setPayments] = useState<readonly Payment[]>([]);
  const [suppliers, setSuppliers] = useState<readonly Supplier[]>([]);
  const [profile, setProfile] = useState<CompanyProfile>(EMPTY_COMPANY_PROFILE);

  const { run: load } = useOperation((id: string) => getPaymentRefundService().getById(id));
  const { run: loadPayments } = useOperation(() => getPaymentService().list());
  const { run: loadSuppliers } = useOperation(() => getSupplierService().list());
  const { run: loadProfile } = useOperation(() => getSettingsService().getProfile());

  useEffect(() => {
    void load(refundId).then((r) => r.ok && setRecord(r.value));
    void loadPayments().then((r) => r.ok && setPayments(r.value));
    void loadSuppliers().then((r) => r.ok && setSuppliers(r.value));
    void loadProfile().then((r) => r.ok && setProfile(r.value));
  }, [refundId, load, loadPayments, loadSuppliers, loadProfile]);

  const supplierName = useMemo(() => new Map(suppliers.map((s) => [s.id, s.name])), [suppliers]);
  const paymentNumber = useMemo(() => new Map(payments.map((p) => [p.id, p.number])), [payments]);

  if (record === null) {
    return (
      <div className="flex justify-center py-2xl">
        <Spinner />
      </div>
    );
  }

  const isDraft = record.status === PaymentRefundStatus.Draft;
  const total = refundTotalDebit(record);
  const originalNumber = paymentNumber.get(record.paymentId);

  return (
    <PrintLayout
      title={isDraft ? 'سند استرداد دفعة (مسودة)' : `سند استرداد دفعة رقم ${record.number}`}
      draft={isDraft}
      companyHeader={<CompanyHeader profile={profile} />}
      meta={`التاريخ: ${formatDate(record.date)}`}
      printedOn={`طُبع في ${formatDate(new Date().toISOString().slice(0, 10))}`}
      onBack={() => router.back()}
      totals={
        <div className="flex flex-col gap-xs">
          {record.discountReversal > 0 ? (
            <>
              <div className="flex justify-between text-sm">
                <span>المبلغ المسترد نقدًا</span>
                <MoneyDisplay value={record.amount} />
              </div>
              <div className="flex justify-between text-sm">
                <span>إلغاء خصم التسوية</span>
                <MoneyDisplay value={record.discountReversal} />
              </div>
            </>
          ) : null}
          <div className="flex justify-between text-base font-semibold">
            <span>إجمالي السند</span>
            <MoneyDisplay value={total} currencyLabel={BOOK_CURRENCY.symbol} />
          </div>
          <div className="text-sm text-neutral-500">فقط {amountInWords(total)} لا غير.</div>
        </div>
      }
      signature={<div className="flex flex-col gap-2xl">المستلم: ______________</div>}
    >
      <div className="flex flex-wrap justify-between gap-md text-sm">
        <div>
          المورد: <span className="font-medium">{supplierName.get(record.supplierId) ?? '—'}</span>
        </div>
        <div>
          الدفعة الأصلية:{' '}
          <bdi dir="ltr" className="font-medium">
            {originalNumber ?? '—'}
          </bdi>
        </div>
      </div>

      <p className="text-sm">
        سبب الاسترداد:{' '}
        <span className="font-medium">{PAYMENT_REFUND_REASON_LABELS[record.reasonType]}</span>
        {record.reasonNote !== '' ? ` — ${record.reasonNote}` : ''}
      </p>

      {record.method !== '' ? (
        <p className="text-sm">
          طريقة الإرجاع: {record.method}
          {record.reference !== '' ? (
            <>
              {' · المرجع: '}
              <bdi dir="ltr">{record.reference}</bdi>
            </>
          ) : null}
        </p>
      ) : null}

      {record.notes ? <p className="text-sm text-neutral-500">ملاحظات: {record.notes}</p> : null}
    </PrintLayout>
  );
}
