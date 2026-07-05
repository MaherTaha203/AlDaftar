import { ReportView } from '@/components/modules/reports';

/** Route /reports/[report] — a single report view (S-81/S-82). */
export default async function ReportPage({ params }: { params: Promise<{ report: string }> }) {
  const { report } = await params;
  return <ReportView reportId={report} />;
}
