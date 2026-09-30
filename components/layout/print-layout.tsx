'use client';

import type { ReactNode } from 'react';
import { useShortcut } from '../app/use-shortcut';
import { Button, cn, uiText } from '../ui';

/**
 * Shared print scaffolding. Business content is caller-supplied; this component
 * owns only the common page mechanics and print chrome.
 */
export interface PrintLayoutProps {
  title: ReactNode;
  companyHeader?: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  totals?: ReactNode;
  signature?: ReactNode;
  printedOn?: ReactNode;
  footerNote?: ReactNode;
  orientation?: 'portrait' | 'landscape';
  draft?: boolean;
  onPrint?: () => void;
  onBack?: () => void;
  /** Prevents printing until every required data source has finished loading. */
  ready?: boolean;
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
  ready = true,
}: PrintLayoutProps) {
  function handlePrint() {
    if (!ready) {
      return;
    }
    if (onPrint) {
      onPrint();
      return;
    }
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  useShortcut('print', handlePrint);

  return (
    <>
      <div className="screen-only sticky top-0 z-10 flex items-center justify-start gap-sm border-b border-neutral-200 bg-white px-lg py-md">
        <Button onClick={handlePrint} disabled={!ready}>
          {uiText.print.print}
        </Button>
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

        <header className="print-page-header flex flex-col gap-sm border-b border-neutral-200 pb-md">
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

        <footer className="print-page-footer mt-auto flex flex-wrap items-center justify-between gap-sm border-t border-neutral-200 pt-md text-xs text-neutral-500">
          <span>{footerNote}</span>
          {printedOn ? <span>{printedOn}</span> : null}
        </footer>
      </article>
    </>
  );
}
