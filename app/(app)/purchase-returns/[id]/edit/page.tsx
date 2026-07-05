import { ReturnForm } from '@/components/modules/purchase-returns';

/** Route /purchase-returns/[id]/edit — screen S-33 (edit return draft). */
export default async function EditPurchaseReturnPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReturnForm returnId={id} />;
}
