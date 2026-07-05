'use client';

import type { ReactNode } from 'react';
import { Button, cn, uiText } from '../ui';

/**
 * PrintLayout — the shared print scaffolding (04_Component_Library.md §4,
 * 05_Printing_Specification.md). Every print view (S-24/34/44/82/83) renders
 * through it so all printed output obeys the same approved page mechanics: A4
 * geometry and margins, RTL flow, a monochrome-safe sheet, the fixed
 * internal-document footer note, and the draft watermark. The browser print
 * dialog is the mechanism (05 §7).
 *
 * Business-blind: it owns only the chrome. The company header, document
 * title/number line, body, totals, signature, and printed-on timestamp are all
 * caller-supplied slots — this scaffold neither invents nor formats any
 * business content. The pending decisions that touch print (company profile
 * P19, digit style BDR-17, date display BDR-18, amount-in-words BDR-19,
 * per-report columns/orientation BDR-10) all enter through those slots, never
 * through the scaffold.
 */
export interface PrintLayoutProps {
  /** Document/report title, e.g. «فاتورة شراء» or a report name. Caller-supplied. */
  title: ReactNode;
  /** Company header block (name/logo from Settings, P19). Caller-supplied. */
  companyHeader?: ReactNode;
  /** Number / date / parameter-summary line under the title. Caller-formatted. */
  meta?: ReactNode;
  /** Main printable content (lines table, statement, report table). */
  children: ReactNode;
  /** Totals block; kept from breaking away from the last content rows (05 §1). */
  totals?: ReactNode;
  /** Signature strip; labels vary per document (05 §2–4), caller-supplied. */
  signature?: ReactNode;
  /** Printed-on timestamp, pre-formatted by the caller (BDR-18). */
  printedOn?: ReactNode;
  /**
   * Footer note; defaults to the approved fixed internal-document line (05 §1).
   */
  footerNote?: ReactNode;
  /** A4 orientation; landscape is declared per report (05 §1, 07). */
  orientation?: 'portrait' | 'landscape';
  /** Draft documents always watermark; posted never do (05 §7). */
  draft?: boolean;
  /** Screen-only print trigger; defaults to the browser print dialog (05 §7). */
  onPrint?: () => void;
  /** Screen-only back action; the button renders only when provided. */
  onBack?: () => void;
}

export function PrintLayout({
  title,
  companyHeader,
  meta,
  children,
  totals,
  signature,
  printedOn,
  footerNote = uiText.print.internalNote,
  orientation = 'portrait',
  draft = false,
  onPrint,
  onBack,
}: PrintLayoutProps) {
  function handlePrint() {
    if (onPrint) {
      onPrint();
      return;
    }
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  return (
    <>
      {/* Screen-only action bar — never printed (`.screen-only`). */}
      <div className="screen-only sticky top-0 z-10 flex items-center justify-start gap-sm border-b border-neutral-200 bg-white px-lg py-md">
        <Button onClick={handlePrint}>{uiText.print.print}</Button>
        {onBack ? (
          <Button variant="secondary" onClick={onBack}>
            {uiText.print.back}
          </Button>
        ) : null}
      </div>

      <article
        className={cn(
          'print-sheet relative flex flex-col gap-lg text-sm',
          orientation === 'landscape' && 'print-landscape',
        )}
      >
        {draft ? (
          <div aria-hidden className="print-watermark">
            <span>{uiText.print.draftWatermark}</span>
          </div>
        ) : null}

        <header className="flex flex-col gap-sm border-b border-neutral-200 pb-md">
          {companyHeader}
          <div className="flex flex-wrap items-baseline justify-between gap-sm">
            <h1 className="text-lg font-semibold">{title}</h1>
            {meta ? <div className="text-sm text-neutral-500">{meta}</div> : null}
          </div>
        </header>

        <div className="flex flex-col gap-md">{children}</div>

        {totals ? <div className="print-avoid-break flex flex-col gap-sm">{totals}</div> : null}

        {signature ? (
          <div className="print-avoid-break mt-lg flex flex-wrap gap-xl pt-lg">{signature}</div>
        ) : null}

        <footer className="mt-auto flex flex-wrap items-center justify-between gap-sm border-t border-neutral-200 pt-md text-xs text-neutral-500">
          <span>{footerNote}</span>
          {printedOn ? <span>{printedOn}</span> : null}
        </footer>
      </article>
    </>
  );
}
