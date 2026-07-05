import { PaymentPrint } from '@/components/modules/payments';

/** Route /payments/[id]/print — print view S-44. */
export default async function PaymentPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PaymentPrint paymentId={id} />;
}
