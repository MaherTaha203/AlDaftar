'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  getCreditNoteService,
  CreditNoteStatus,
  CREDIT_NOTE_REASON_LABELS,
  type CreditNote,
} from '@/lib/modules/credit-notes';
import { getPurchaseService, type Purchase } from '@/lib/modules/purchases';
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

/** CreditNotePrint — printable «إشعار دائن للمورد» referencing the original purchase (BDD-011). */
export function CreditNotePrint({ noteId }: { noteId: string }) {
  const router = useRouter();
  const [record, setRecord] = useState<CreditNote | null>(null);
  const [purchases, setPurchases] = useState<readonly Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<readonly Supplier[]>([]);
  const [profile, setProfile] = useState<CompanyProfile>(EMPTY_COMPANY_PROFILE);

  const { run: load } = useOperation((id: string) => getCreditNoteService().getById(id));
  const { run: loadPurchases } = useOperation(() => getPurchaseService().list());
  const { run: loadSuppliers } = useOperation(() => getSupplierService().list());
  const { run: loadProfile } = useOperation(() => getSettingsService().getProfile());

  useEffect(() => {
    void load(noteId).then((r) => r.ok && setRecord(r.value));
    void loadPurchases().then((r) => r.ok && setPurchases(r.value));
    void loadSuppliers().then((r) => r.ok && setSuppliers(r.value));
    void loadProfile().then((r) => r.ok && setProfile(r.value));
  }, [noteId, load, loadPurchases, loadSuppliers, loadProfile]);

  const supplierName = useMemo(() => new Map(suppliers.map((s) => [s.id, s.name])), [suppliers]);
  const purchaseNumber = useMemo(
    () => new Map(purchases.map((p) => [p.id, p.number])),
    [purchases],
  );

  if (record === null) {
    return (
      <div className="flex justify-center py-2xl">
        <Spinner />
      </div>
    );
  }

  const isDraft = record.status === CreditNoteStatus.Draft;
  const originalNumber = purchaseNumber.get(record.purchaseId);

  return (
    <PrintLayout
      title={isDraft ? 'إشعار دائن للمورد (مسودة)' : `إشعار دائن للمورد رقم ${record.number}`}
      draft={isDraft}
      companyHeader={<CompanyHeader profile={profile} />}
      meta={`التاريخ: ${formatDate(record.date)}`}
      printedOn={`طُبع في ${formatDate(new Date().toISOString().slice(0, 10))}`}
      onBack={() => router.back()}
      totals={
        <div className="flex flex-col gap-xs">
          <div className="flex justify-between text-base font-semibold">
            <span>مبلغ الإشعار</span>
            <MoneyDisplay value={record.amount} currencyLabel={BOOK_CURRENCY.symbol} />
          </div>
          <div className="text-sm text-neutral-500">فقط {amountInWords(record.amount)} لا غير.</div>
        </div>
      }
      signature={<div className="flex flex-col gap-2xl">التوقيع: ______________</div>}
    >
      <div className="flex flex-wrap justify-between gap-md text-sm">
        <div>
          المورد: <span className="font-medium">{supplierName.get(record.supplierId) ?? '—'}</span>
        </div>
        <div>
          فاتورة الشراء الأصلية:{' '}
          <bdi dir="ltr" className="font-medium">
            {originalNumber ?? '—'}
          </bdi>
        </div>
      </div>

      <p className="text-sm">
        سبب التصحيح:{' '}
        <span className="font-medium">{CREDIT_NOTE_REASON_LABELS[record.reasonType]}</span>
        {record.reasonNote !== '' ? ` — ${record.reasonNote}` : ''}
      </p>

      <p className="text-sm text-neutral-500">
        تصحيح مالي على الفاتورة المذكورة (لا يمثل حركة بضاعة) — يُخصم المبلغ من رصيد المورد وفق
        سياسة مستندات التصحيح.
      </p>

      {record.notes ? <p className="text-sm text-neutral-500">ملاحظات: {record.notes}</p> : null}
    </PrintLayout>
  );
}
