import { PaymentDetail } from '@/components/modules/payments';

/** Route /payments/[id] — screen S-41 (payment detail). */
export default async function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PaymentDetail paymentId={id} />;
}
