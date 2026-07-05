import { SupplierDetail } from '@/components/modules/suppliers';

/** Route /suppliers/[id] — screen S-11 (supplier detail). */
export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SupplierDetail supplierId={id} />;
}
