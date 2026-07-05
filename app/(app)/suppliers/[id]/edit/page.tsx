import { SupplierForm } from '@/components/modules/suppliers';

/** Route /suppliers/[id]/edit — screen S-13 (edit supplier). */
export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SupplierForm supplierId={id} />;
}
