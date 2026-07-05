import { ReturnDetail } from '@/components/modules/purchase-returns';

/** Route /purchase-returns/[id] — screen S-31 (return detail). */
export default async function PurchaseReturnDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReturnDetail returnId={id} />;
}
