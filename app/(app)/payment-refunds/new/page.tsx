import { RefundForm } from '@/components/modules/payment-refunds';

/**
 * Route /payment-refunds/new — create a refund draft (BDD-011).
 * `?payment=<id>` pre-selects the refunded payment (from the payment detail).
 */
export default async function NewPaymentRefundPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const { payment } = await searchParams;
  return <RefundForm initialPaymentId={payment} />;
}
