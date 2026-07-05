import { ReturnForm } from '@/components/modules/purchase-returns';

/**
 * Route /purchase-returns/new — screen S-32 (create return draft).
 * `?purchase=<id>` pre-selects the originating purchase (S-21 «إنشاء مرتجع»).
 */
export default async function NewPurchaseReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ purchase?: string }>;
}) {
  const { purchase } = await searchParams;
  return <ReturnForm initialPurchaseId={purchase} />;
}
