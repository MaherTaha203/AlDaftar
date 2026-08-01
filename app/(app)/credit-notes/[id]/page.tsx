import { CreditNoteDetail } from '@/components/modules/credit-notes';

/** Route /credit-notes/[id] — credit-note detail (BDD-011). */
export default async function CreditNoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CreditNoteDetail noteId={id} />;
}
