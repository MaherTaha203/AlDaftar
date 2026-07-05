import { describe, expect, it } from 'vitest';
import { buildReportCsv } from '@/components/modules/reports/report-export';
import type { ReportColumn, ReportRow } from '@/components/modules/reports/report-model';

/**
 * buildReportCsv: the "Excel" export channel (BDR-10). Asserts numeric/date
 * formatting, RFC-4180 quoting, and — importantly — CSV formula-injection
 * neutralization (CWE-1236) for text cells that begin with a formula trigger.
 */
const columns: readonly ReportColumn[] = [
  { key: 'name', header: 'الاسم', kind: 'text' },
  { key: 'amount', header: 'المبلغ', kind: 'amount' },
  { key: 'date', header: 'التاريخ', kind: 'date' },
];

function lines(csv: string): string[] {
  return csv.split('\r\n');
}

describe('buildReportCsv', () => {
  it('emits a header row and formats amounts and dates', () => {
    const rows: ReportRow[] = [{ name: 'مورد', amount: 1234.5, date: '2026-07-05' }];
    const out = lines(buildReportCsv(columns, rows));
    expect(out[0]).toBe('الاسم,المبلغ,التاريخ');
    expect(out[1]).toBe('مورد,1234.50,05/07/2026');
  });

  it('quotes cells containing an ASCII comma or a quote (RFC 4180)', () => {
    const rows: ReportRow[] = [{ name: 'A, B', amount: 0, date: '' }];
    expect(lines(buildReportCsv(columns, rows))[1]).toBe('"A, B",0.00,');
    const quoted: ReportRow[] = [{ name: 'say "hi"', amount: 0, date: '' }];
    expect(lines(buildReportCsv(columns, quoted))[1]).toBe('"say ""hi""",0.00,');
  });

  it('neutralizes formula injection in text cells (CWE-1236)', () => {
    const rows: ReportRow[] = [
      { name: '=SUM(A1:A2)', amount: 5, date: '2026-07-05' },
      { name: '+1+1', amount: 5, date: '2026-07-05' },
      { name: '@cmd', amount: 5, date: '2026-07-05' },
    ];
    const out = lines(buildReportCsv(columns, rows));
    expect(out[1].startsWith("'=SUM(A1:A2)")).toBe(true);
    expect(out[2].startsWith("'+1+1")).toBe(true);
    expect(out[3].startsWith("'@cmd")).toBe(true);
  });

  it('does not prefix a genuine negative amount (numeric cells stay numeric)', () => {
    const rows: ReportRow[] = [{ name: 'خصم', amount: -12.5, date: '' }];
    const out = lines(buildReportCsv(columns, rows));
    expect(out[1]).toBe('خصم,-12.50,');
  });

  it('appends the footer row when provided', () => {
    const rows: ReportRow[] = [{ name: 'مورد', amount: 10, date: '2026-07-05' }];
    const footer: ReportRow = { name: 'الإجمالي', amount: 10 };
    const out = lines(buildReportCsv(columns, rows, footer));
    expect(out[out.length - 1]).toBe('الإجمالي,10.00,');
  });
});
