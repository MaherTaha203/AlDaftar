import { PurchaseForm } from '@/components/modules/purchases';

/** Route /purchases/[id]/edit — screen S-23 (edit purchase draft). */
export default async function EditPurchasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PurchaseForm purchaseId={id} />;
}
