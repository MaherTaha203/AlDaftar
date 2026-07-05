import { ReturnPrint } from '@/components/modules/purchase-returns';

/** Route /purchase-returns/[id]/print — print view S-34. */
export default async function ReturnPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReturnPrint returnId={id} />;
}
