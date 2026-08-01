import { CreditNoteForm } from '@/components/modules/credit-notes';

/** Route /credit-notes/[id]/edit — edit a credit-note draft (BDD-011). */
export default async function EditCreditNotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CreditNoteForm noteId={id} />;
}
