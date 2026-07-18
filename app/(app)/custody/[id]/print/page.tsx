import { CustodyPrint } from '@/components/modules/custody';

/** Route /custody/[id]/print — printable custody voucher. */
export default async function CustodyPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustodyPrint custodyId={id} />;
}
