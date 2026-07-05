import { PaymentForm } from '@/components/modules/payments';

/**
 * Route /payments/new — screen S-42 (create payment draft).
 * `?supplier=<id>` pre-selects the supplier (from the supplier detail «دفع»).
 */
export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ supplier?: string }>;
}) {
  const { supplier } = await searchParams;
  return <PaymentForm initialSupplierId={supplier} />;
}
