'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getPaymentService, PaymentStatus, type Payment } from '@/lib/modules/payments';
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

/** PaymentPrint — print view S-44 (05 §4): payment voucher document. */
export function PaymentPrint({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [suppliers, setSuppliers] = useState<readonly Supplier[]>([]);
  const [profile, setProfile] = useState<CompanyProfile>(EMPTY_COMPANY_PROFILE);

  const { run: load } = useOperation((id: string) => getPaymentService().getById(id));
  const { run: loadSuppliers } = useOperation(() => getSupplierService().list());
  const { run: loadProfile } = useOperation(() => getSettingsService().getProfile());

  useEffect(() => {
    void load(paymentId).then((r) => r.ok && setPayment(r.value));
    void loadSuppliers().then((r) => r.ok && setSuppliers(r.value));
    void loadProfile().then((r) => r.ok && setProfile(r.value));
  }, [paymentId, load, loadSuppliers, loadProfile]);

  const supplierName = useMemo(() => new Map(suppliers.map((s) => [s.id, s.name])), [suppliers]);

  if (payment === null) {
    return (
      <div className="flex justify-center py-2xl">
        <Spinner />
      </div>
    );
  }

  const isDraft = payment.status === PaymentStatus.Draft;

  return (
    <PrintLayout
      title={isDraft ? 'سند دفع (مسودة)' : `سند دفع رقم ${payment.number}`}
      draft={isDraft}
      companyHeader={<CompanyHeader profile={profile} />}
      meta={`التاريخ: ${formatDate(payment.date)}`}
      printedOn={`طُبع في ${formatDate(new Date().toISOString().slice(0, 10))}`}
      onBack={() => router.back()}
      totals={
        <div className="flex flex-col gap-xs">
          <div className="flex justify-between text-base font-semibold">
            <span>المبلغ المدفوع</span>
            <MoneyDisplay value={payment.amount} currencyLabel={BOOK_CURRENCY.symbol} />
          </div>
          {payment.discount > 0 ? (
            <div className="flex justify-between text-sm text-neutral-500">
              <span>خصم تسوية</span>
              <MoneyDisplay value={payment.discount} currencyLabel={BOOK_CURRENCY.symbol} />
            </div>
          ) : null}
          <div className="text-sm text-neutral-500">
            فقط {amountInWords(payment.amount)} لا غير.
          </div>
        </div>
      }
      signature={
        <div className="flex flex-wrap gap-2xl">
          <span>المستلم: ______________</span>
          <span>الدافع: ______________</span>
        </div>
      }
    >
      <dl className="grid grid-cols-2 gap-md text-sm">
        <div>
          <dt className="text-neutral-500">المورد</dt>
          <dd className="font-medium">{supplierName.get(payment.supplierId) ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-neutral-500">الطريقة</dt>
          <dd className="font-medium">{payment.method || '—'}</dd>
        </div>
        {payment.reference ? (
          <div>
            <dt className="text-neutral-500">المرجع</dt>
            <dd className="font-medium">
              <bdi dir="ltr">{payment.reference}</bdi>
            </dd>
          </div>
        ) : null}
        {payment.notes ? (
          <div className="col-span-2">
            <dt className="text-neutral-500">ملاحظات</dt>
            <dd>{payment.notes}</dd>
          </div>
        ) : null}
      </dl>
    </PrintLayout>
  );
}
