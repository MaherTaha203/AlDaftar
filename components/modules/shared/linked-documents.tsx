import Link from 'next/link';
import type { ReactNode } from 'react';
import { Card } from '../../ui';

/**
 * LinkedDocumentsSection — «المستندات المرتبطة» (BDD-011, owner decision #5):
 * every parent document lists ALL documents derived from it with direct
 * navigation, and every derived document links back from its own detail —
 * the books never hide a relationship. Presentation-only: parents fetch
 * their derived documents (returns, credit notes, refunds) and pass rows.
 */
export interface LinkedDocumentRow {
  readonly key: string;
  readonly href: string;
  /** e.g. «مرتجع رقم 3» or «مسودة إشعار دائن». */
  readonly title: string;
  /** e.g. the document kind or its reason label. */
  readonly subtitle?: string;
  /** Right-aligned figure (amount/status chip). */
  readonly aside?: ReactNode;
}

export function LinkedDocumentsSection({ rows }: { rows: readonly LinkedDocumentRow[] }) {
  return (
    <Card title="المستندات المرتبطة">
      {rows.length === 0 ? (
        <p className="text-sm text-neutral-400">لا توجد مستندات مشتقة من هذا المستند بعد.</p>
      ) : (
        <ul className="flex flex-col gap-xs">
          {rows.map((row) => (
            <li key={row.key}>
              <Link
                href={row.href}
                className="flex items-center justify-between gap-md rounded-md border border-neutral-200 px-sm py-xs text-sm transition-colors hover:border-primary/40 hover:bg-neutral-100"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium text-primary">{row.title}</span>
                  {row.subtitle ? (
                    <span className="truncate text-xs text-neutral-400">{row.subtitle}</span>
                  ) : null}
                </span>
                {row.aside ? <span className="shrink-0">{row.aside}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
