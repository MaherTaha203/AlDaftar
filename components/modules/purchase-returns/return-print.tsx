'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getProductService, type Product } from '@/lib/modules/products';
import {
  getPurchaseReturnService,
  returnLineTotal,
  returnTotal,
  ReturnStatus,
  type PurchaseReturn,
} from '@/lib/modules/purchase-returns';
import { getPurchaseService, type Purchase } from '@/lib/modules/purchases';
import { getUnitService, type Unit } from '@/lib/modules/units';
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

/** ReturnPrint — print view S-34 (05 §3): purchase-return document. */
export function ReturnPrint({ returnId }: { returnId: string }) {
  const router = useRouter();
  const [record, setRecord] = useState<PurchaseReturn | null>(null);
  const [purchases, setPurchases] = useState<readonly Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<readonly Supplier[]>([]);
  const [products, setProducts] = useState<readonly Product[]>([]);
  const [units, setUnits] = useState<readonly Unit[]>([]);
  const [profile, setProfile] = useState<CompanyProfile>(EMPTY_COMPANY_PROFILE);

  const { run: load } = useOperation((id: string) => getPurchaseReturnService().getById(id));
  const { run: loadPurchases } = useOperation(() => getPurchaseService().list());
  const { run: loadSuppliers } = useOperation(() => getSupplierService().list());
  const { run: loadProducts } = useOperation(() => getProductService().list());
  const { run: loadUnits } = useOperation(() => getUnitService().list());
  const { run: loadProfile } = useOperation(() => getSettingsService().getProfile());

  useEffect(() => {
    void load(returnId).then((r) => r.ok && setRecord(r.value));
    void loadPurchases().then((r) => r.ok && setPurchases(r.value));
    void loadSuppliers().then((r) => r.ok && setSuppliers(r.value));
    void loadProducts().then((r) => r.ok && setProducts(r.value));
    void loadUnits().then((r) => r.ok && setUnits(r.value));
    void loadProfile().then((r) => r.ok && setProfile(r.value));
  }, [returnId, load, loadPurchases, loadSuppliers, loadProducts, loadUnits, loadProfile]);

  const productName = useMemo(() => new Map(products.map((p) => [p.id, p.name])), [products]);
  const unitName = useMemo(() => new Map(units.map((u) => [u.id, u.name])), [units]);
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

  const isDraft = record.status === ReturnStatus.Draft;
  const total = returnTotal(record.lines);
  const originalNumber = purchaseNumber.get(record.purchaseId);

  return (
    <PrintLayout
      title={isDraft ? 'مرتجع شراء (مسودة)' : `مرتجع شراء رقم ${record.number}`}
      draft={isDraft}
      companyHeader={<CompanyHeader profile={profile} />}
      meta={`التاريخ: ${formatDate(record.date)}`}
      printedOn={`طُبع في ${formatDate(new Date().toISOString().slice(0, 10))}`}
      onBack={() => router.back()}
      totals={
        <div className="flex flex-col gap-xs">
          <div className="flex justify-between text-base font-semibold">
            <span>إجمالي المرتجع</span>
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
          فاتورة الشراء الأصلية:{' '}
          <bdi dir="ltr" className="font-medium">
            {originalNumber ?? '—'}
          </bdi>
        </div>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead className="print-repeat-head">
          <tr className="border-b-2 border-neutral-300 text-neutral-500">
            <th className="py-xs text-start">المنتج</th>
            <th className="py-xs text-start">الوحدة</th>
            <th className="py-xs text-left">الكمية</th>
            <th className="py-xs text-left">سعر الوحدة</th>
            <th className="py-xs text-left">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {record.lines.map((line) => (
            <tr key={line.id} className="border-b border-neutral-200">
              <td className="py-xs">{productName.get(line.productId) ?? '—'}</td>
              <td className="py-xs">{unitName.get(line.unitId) ?? '—'}</td>
              <td className="py-xs text-left tabular-nums">
                <bdi dir="ltr">{line.quantity}</bdi>
              </td>
              <td className="py-xs text-left tabular-nums">
                <MoneyDisplay value={line.unitPrice} />
              </td>
              <td className="py-xs text-left tabular-nums">
                <MoneyDisplay value={returnLineTotal(line)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {record.notes ? <p className="text-sm text-neutral-500">ملاحظات: {record.notes}</p> : null}
    </PrintLayout>
  );
}
