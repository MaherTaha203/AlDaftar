import { RefundDetail } from '@/components/modules/payment-refunds';

/** Route /payment-refunds/[id] — refund detail (BDD-011). */
export default async function PaymentRefundDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RefundDetail refundId={id} />;
}
