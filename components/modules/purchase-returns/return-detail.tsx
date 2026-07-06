'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getProductService, type Product } from '@/lib/modules/products';
import {
  getPurchaseReturnService,
  returnLineTotal,
  returnTotal,
  ReturnStatus,
  type PurchaseReturn,
  type ReturnLine,
} from '@/lib/modules/purchase-returns';
import { getPurchaseService, type Purchase } from '@/lib/modules/purchases';
import { BOOK_CURRENCY } from '@/lib/modules/shared/money';
import { getSupplierService, type Supplier } from '@/lib/modules/suppliers';
import { getUnitService, type Unit } from '@/lib/modules/units';
import { AttachmentOwnerTypes } from '@/lib/modules/attachments';
import { PageLayout } from '../../app';
import { AttachmentsSection } from '../attachments';
import { useOperation } from '../../framework';
import {
  Button,
  Card,
  DataTable,
  DocumentStatus,
  ErrorState,
  MoneyDisplay,
  Skeleton,
  formatDate,
  type DataTableColumn,
} from '../../ui';

/**
 * ReturnDetail — screen S-31. Read-only return view with a link back to the
 * originating purchase (frozen 06 §5 bidirectional traceability). Drafts get
 * an edit action; posted returns get none (immutability).
 */
export interface ReturnDetailProps {
  returnId: string;
}

export function ReturnDetail({ returnId }: ReturnDetailProps) {
  const [record, setRecord] = useState<PurchaseReturn | null>(null);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [suppliers, setSuppliers] = useState<readonly Supplier[]>([]);
  const [products, setProducts] = useState<readonly Product[]>([]);
  const [units, setUnits] = useState<readonly Unit[]>([]);

  const { run: load, error } = useOperation((id: string) => getPurchaseReturnService().getById(id));
  const { run: loadPurchase } = useOperation((id: string) => getPurchaseService().getById(id));
  const { run: loadSuppliers } = useOperation(() => getSupplierService().list());
  const { run: loadProducts } = useOperation(() => getProductService().list());
  const { run: loadUnits } = useOperation(() => getUnitService().list());

  useEffect(() => {
    void load(returnId).then((r) => {
      if (r.ok) {
        setRecord(r.value);
        void loadPurchase(r.value.purchaseId).then((p) => p.ok && setPurchase(p.value));
      }
    });
    void loadSuppliers().then((r) => r.ok && setSuppliers(r.value));
    void loadProducts().then((r) => r.ok && setProducts(r.value));
    void loadUnits().then((r) => r.ok && setUnits(r.value));
  }, [returnId, load, loadPurchase, loadSuppliers, loadProducts, loadUnits]);

  const productName = useMemo(() => new Map(products.map((p) => [p.id, p.name])), [products]);
  const unitName = useMemo(() => new Map(units.map((u) => [u.id, u.name])), [units]);
  const supplierName = useMemo(() => new Map(suppliers.map((s) => [s.id, s.name])), [suppliers]);

  const lineColumns = useMemo<readonly DataTableColumn<ReturnLine>[]>(
    () => [
      { key: 'product', header: 'المنتج', render: (l) => productName.get(l.productId) ?? '—' },
      { key: 'unit', header: 'الوحدة', render: (l) => unitName.get(l.unitId) ?? '—' },
      {
        key: 'quantity',
        header: 'الكمية',
        align: 'left',
        render: (l) => <bdi dir="ltr">{l.quantity}</bdi>,
      },
      {
        key: 'price',
        header: 'سعر الوحدة',
        align: 'left',
        render: (l) => <MoneyDisplay value={l.unitPrice} />,
      },
      {
        key: 'total',
        header: 'قيمة الإرجاع',
        align: 'left',
        render: (l) => <MoneyDisplay value={returnLineTotal(l)} />,
      },
    ],
    [productName, unitName],
  );

  if (error !== null) {
    return (
      <PageLayout>
        <ErrorState message={error} onRetry={() => void load(returnId)} />
      </PageLayout>
    );
  }

  if (record === null) {
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

  const isDraft = record.status === ReturnStatus.Draft;
  const title = isDraft ? 'مسودة مرتجع' : `مرتجع رقم ${record.number}`;

  return (
    <PageLayout leafLabel={title}>
      <Card
        title={
          <span className="flex items-center gap-sm">
            {title}
            <DocumentStatus state={record.status} />
          </span>
        }
        actions={
          <span className="flex items-center gap-sm">
            <Link href={`/purchase-returns/${record.id}/print`}>
              <Button variant="secondary" size="sm">
                طباعة
              </Button>
            </Link>
            {isDraft ? (
              <Link href={`/purchase-returns/${record.id}/edit`}>
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
            <dd className="text-sm">{supplierName.get(record.supplierId) ?? '—'}</dd>
          </div>
          <div className="flex flex-col gap-xs">
            <dt className="text-xs text-neutral-400">التاريخ</dt>
            <dd className="text-sm">
              <bdi dir="ltr">{formatDate(record.date)}</bdi>
            </dd>
          </div>
          <div className="flex flex-col gap-xs">
            <dt className="text-xs text-neutral-400">مستند الشراء</dt>
            <dd className="text-sm">
              <Link
                href={`/purchases/${record.purchaseId}`}
                className="text-primary hover:underline"
              >
                {purchase?.number != null ? `شراء رقم ${purchase.number}` : 'عرض الشراء'}
              </Link>
            </dd>
          </div>
          {record.notes !== '' ? (
            <div className="flex flex-col gap-xs md:col-span-3">
              <dt className="text-xs text-neutral-400">ملاحظات</dt>
              <dd className="text-sm">{record.notes}</dd>
            </div>
          ) : null}
        </dl>
      </Card>

      <Card title="الأصناف المرتجعة">
        <DataTable columns={lineColumns} rows={record.lines} rowKey={(line) => line.id} />
        <p className="mt-md text-end text-sm font-semibold">
          إجمالي المرتجع:{' '}
          <MoneyDisplay value={returnTotal(record.lines)} currencyLabel={BOOK_CURRENCY.symbol} />
        </p>
      </Card>

      <AttachmentsSection
        owner={{ type: AttachmentOwnerTypes.PurchaseReturn, id: record.id }}
        allowDelete={isDraft}
      />
    </PageLayout>
  );
}
