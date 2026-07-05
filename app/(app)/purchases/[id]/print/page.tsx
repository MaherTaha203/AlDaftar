import { PurchasePrint } from '@/components/modules/purchases';

/** Route /purchases/[id]/print — print view S-24. */
export default async function PurchasePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PurchasePrint purchaseId={id} />;
}
