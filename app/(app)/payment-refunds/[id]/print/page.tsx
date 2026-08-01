import { RefundPrint } from '@/components/modules/payment-refunds';

/** Route /payment-refunds/[id]/print — printable refund voucher (BDD-011). */
export default async function PaymentRefundPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RefundPrint refundId={id} />;
}
