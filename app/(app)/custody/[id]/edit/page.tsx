import { CustodyForm } from '@/components/modules/custody';

/** Route /custody/[id]/edit — edit a custody voucher draft. */
export default async function EditCustodyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustodyForm custodyId={id} />;
}
