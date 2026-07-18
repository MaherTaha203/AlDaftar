import { CustodyDetail } from '@/components/modules/custody';

/** Route /custody/[id] — custody voucher detail. */
export default async function CustodyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustodyDetail custodyId={id} />;
}
