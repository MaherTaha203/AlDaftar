import { PurchaseDetail } from '@/components/modules/purchases';

/** Route /purchases/[id] — screen S-21 (purchase detail). */
export default async function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PurchaseDetail purchaseId={id} />;
}
