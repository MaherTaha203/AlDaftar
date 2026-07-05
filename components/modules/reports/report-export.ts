import { formatDate } from '@/components/ui/format';
import type { ReportColumn, ReportRow } from './report-model';

/**
 * CSV export for reports (BDR-10 output channel "Excel"). We emit a UTF-8 CSV
 * with a BOM, which Excel opens directly with Arabic text intact; amounts and
 * quantities are written as plain numbers (dot decimal) so Excel treats them
 * as numeric, dates as the approved DD/MM/YYYY form (BDR-18). A native `.xlsx`
 * writer can replace this behind the same call site later (TD-005) without
 * touching the reports.
 */
function cellToText(value: ReportRow[string], kind: ReportColumn['kind']): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (kind === 'date') {
    return formatDate(String(value));
  }
  if (typeof value === 'number') {
    return kind === 'amount' ? value.toFixed(2) : String(value);
  }
  return guardFormula(String(value));
}

/**
 * Neutralizes spreadsheet formula injection (CWE-1236): a text cell that begins
 * with a formula trigger (`=`, `+`, `-`, `@`, tab, or CR) is prefixed with an
 * apostrophe so Excel/Sheets treat it as literal text, never an executable
 * formula. Applied only to text cells — numeric cells stay unguarded so genuine
 * negative amounts remain numbers.
 */
function guardFormula(text: string): string {
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

function escapeCsv(text: string): string {
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildReportCsv(
  columns: readonly ReportColumn[],
  rows: readonly ReportRow[],
  footer?: ReportRow | null,
): string {
  const lines: string[][] = [columns.map((column) => column.header)];
  for (const row of rows) {
    lines.push(columns.map((column) => cellToText(row[column.key], column.kind)));
  }
  if (footer) {
    lines.push(columns.map((column) => cellToText(footer[column.key], column.kind)));
  }
  return lines.map((cells) => cells.map(escapeCsv).join(',')).join('\r\n');
}

/** Triggers a browser download of the CSV (UTF-8 BOM for Excel + Arabic). */
export function downloadCsv(filename: string, csv: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
