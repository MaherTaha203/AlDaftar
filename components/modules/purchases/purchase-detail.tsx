'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getProductService, type Product } from '@/lib/modules/products';
import {
  getPurchaseService,
  purchaseLineTotal,
  purchaseTotal,
  PurchaseStatus,
  type Purchase,
  type PurchaseLine,
} from '@/lib/modules/purchases';
import { BOOK_CURRENCY } from '@/lib/modules/shared/money';
import { getSupplierService, type Supplier } from '@/lib/modules/suppliers';
import { getUnitService, type Unit } from '@/lib/modules/units';
import { AttachmentOwnerTypes } from '@/lib/modules/attachments';
import { PageLayout, useShortcut } from '../../app';
import { AttachmentsSection } from '../attachments';
import { useOperation } from '../../framework';
import {
  Card,
  DataTable,
  DocumentActionBar,
  DocumentStatus,
  ErrorState,
  MissingInvoiceBadge,
  MoneyDisplay,
  PaperclipIcon,
  PencilIcon,
  PrinterIcon,
  RotateIcon,
  Skeleton,
  formatDate,
  type DataTableColumn,
} from '../../ui';

/**
 * PurchaseDetail — screen S-21. Read-only document view: header (number,
 * status, supplier, date, invoice ref / no-invoice badge), immutable lines
 * table, calculated total. Drafts get an edit action; posted documents get
 * none (immutability) except the "create return" action. Both offer a Print
 * action → the S-24 invoice view.
 */
export interface PurchaseDetailProps {
  purchaseId: string;
}

export function PurchaseDetail({ purchaseId }: PurchaseDetailProps) {
  const router = useRouter();
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [suppliers, setSuppliers] = useState<readonly Supplier[]>([]);
  const [products, setProducts] = useState<readonly Product[]>([]);
  const [units, setUnits] = useState<readonly Unit[]>([]);

  const { run: load, error } = useOperation((id: string) => getPurchaseService().getById(id));
  const { run: loadSuppliers } = useOperation(() => getSupplierService().list());
  const { run: loadProducts } = useOperation(() => getProductService().list());
  const { run: loadUnits } = useOperation(() => getUnitService().list());

  useEffect(() => {
    void load(purchaseId).then((r) => r.ok && setPurchase(r.value));
    void loadSuppliers().then((r) => r.ok && setSuppliers(r.value));
    void loadProducts().then((r) => r.ok && setProducts(r.value));
    void loadUnits().then((r) => r.ok && setUnits(r.value));
  }, [purchaseId, load, loadSuppliers, loadProducts, loadUnits]);

  const productName = useMemo(() => new Map(products.map((p) => [p.id, p.name])), [products]);
  const unitName = useMemo(() => new Map(units.map((u) => [u.id, u.name])), [units]);
  const supplierName = useMemo(() => new Map(suppliers.map((s) => [s.id, s.name])), [suppliers]);

  // F2 edits the document while it is still a draft (posted documents are
  // immutable, so no edit/delete is offered).
  useShortcut(
    'edit',
    () => router.push(`/purchases/${purchaseId}/edit`),
    purchase?.status === PurchaseStatus.Draft,
  );

  const lineColumns = useMemo<readonly DataTableColumn<PurchaseLine>[]>(
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
        header: 'الإجمالي',
        align: 'left',
        render: (l) => <MoneyDisplay value={purchaseLineTotal(l)} />,
      },
    ],
    [productName, unitName],
  );

  if (error !== null) {
    return (
      <PageLayout>
        <ErrorState message={error} onRetry={() => void load(purchaseId)} />
      </PageLayout>
    );
  }

  if (purchase === null) {
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

  const isDraft = purchase.status === PurchaseStatus.Draft;
  const title = isDraft ? 'مسودة شراء' : `شراء رقم ${purchase.number}`;

  return (
    <PageLayout leafLabel={title}>
      <Card
        title={
          <span className="flex items-center gap-sm">
            {title}
            <DocumentStatus state={purchase.status} />
            {purchase.withoutSupplierInvoice ? <MissingInvoiceBadge /> : null}
          </span>
        }
        actions={
          <DocumentActionBar
            actions={[
              {
                key: 'print',
                label: 'طباعة',
                icon: <PrinterIcon />,
                variant: 'outline',
                onSelect: () => router.push(`/purchases/${purchase.id}/print`),
              },
              ...(isDraft
                ? [
                    {
                      key: 'edit',
                      label: 'تعديل',
                      icon: <PencilIcon />,
                      variant: 'secondary' as const,
                      onSelect: () => router.push(`/purchases/${purchase.id}/edit`),
                    },
                  ]
                : [
                    {
                      key: 'return',
                      label: 'إنشاء مرتجع',
                      icon: <RotateIcon />,
                      variant: 'secondary' as const,
                      onSelect: () => router.push(`/purchase-returns/new?purchase=${purchase.id}`),
                    },
                  ]),
              {
                key: 'attachments',
                label: 'المرفقات',
                icon: <PaperclipIcon />,
                overflow: true,
                onSelect: () =>
                  document.getElementById('attachments')?.scrollIntoView({ behavior: 'smooth' }),
              },
            ]}
          />
        }
      >
        <dl className="grid grid-cols-1 gap-md md:grid-cols-3">
          <div className="flex flex-col gap-xs">
            <dt className="text-xs text-neutral-400">المورد</dt>
            <dd className="text-sm">{supplierName.get(purchase.supplierId) ?? '—'}</dd>
          </div>
          <div className="flex flex-col gap-xs">
            <dt className="text-xs text-neutral-400">التاريخ</dt>
            <dd className="text-sm">
              <bdi dir="ltr">{formatDate(purchase.date)}</bdi>
            </dd>
          </div>
          <div className="flex flex-col gap-xs">
            <dt className="text-xs text-neutral-400">مرجع فاتورة المورد</dt>
            <dd className="text-sm">
              {purchase.withoutSupplierInvoice ? (
                'بدون فاتورة'
              ) : purchase.supplierInvoiceRef === '' ? (
                '—'
              ) : (
                <bdi dir="ltr">{purchase.supplierInvoiceRef}</bdi>
              )}
            </dd>
          </div>
          {purchase.notes !== '' ? (
            <div className="flex flex-col gap-xs md:col-span-3">
              <dt className="text-xs text-neutral-400">ملاحظات</dt>
              <dd className="text-sm">{purchase.notes}</dd>
            </div>
          ) : null}
        </dl>
      </Card>

      <Card title="الأصناف">
        <DataTable columns={lineColumns} rows={purchase.lines} rowKey={(line) => line.id} />
        <p className="mt-md text-end text-sm font-semibold">
          الإجمالي:{' '}
          <MoneyDisplay
            value={purchaseTotal(purchase.lines)}
            currencyLabel={BOOK_CURRENCY.symbol}
          />
        </p>
      </Card>

      <div id="attachments" className="scroll-mt-md">
        <AttachmentsSection
          owner={{ type: AttachmentOwnerTypes.Purchase, id: purchase.id }}
          allowDelete={isDraft}
        />
      </div>
    </PageLayout>
  );
}
