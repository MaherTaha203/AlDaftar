import { CreditNotePrint } from '@/components/modules/credit-notes';

/** Route /credit-notes/[id]/print — printable credit note (BDD-011). */
export default async function CreditNotePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CreditNotePrint noteId={id} />;
}
