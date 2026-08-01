import { CreditNoteForm } from '@/components/modules/credit-notes';

/**
 * Route /credit-notes/new — create a credit-note draft (BDD-011).
 * `?purchase=<id>` pre-selects the corrected purchase (from S-21 «إنشاء إشعار دائن»).
 */
export default async function NewCreditNotePage({
  searchParams,
}: {
  searchParams: Promise<{ purchase?: string }>;
}) {
  const { purchase } = await searchParams;
  return <CreditNoteForm initialPurchaseId={purchase} />;
}
