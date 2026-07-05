import { PaymentForm } from '@/components/modules/payments';

/** Route /payments/[id]/edit — screen S-43 (edit payment draft). */
export default async function EditPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PaymentForm paymentId={id} />;
}
