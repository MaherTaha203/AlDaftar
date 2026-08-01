import { RefundForm } from '@/components/modules/payment-refunds';

/** Route /payment-refunds/[id]/edit — edit a refund draft (BDD-011). */
export default async function EditPaymentRefundPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RefundForm refundId={id} />;
}
