'use client';

import Link from 'next/link';
import { PageLayout } from '@/components/app';
import { cn } from '@/components/ui';
import { REPORT_GROUPS, REPORTS } from './report-registry';

/**
 * ReportsCatalog — screen S-80. The approved BDR-10 catalog (BDD-009) grouped
 * as the owner specified. Each report links to its parameterized view; the
 * deferred Supplier Aging is shown but disabled, with a note that its contents
 * await a business decision (never a broken link, never an invented report).
 */
export function ReportsCatalog() {
  return (
    <PageLayout title="التقارير">
      <div className="flex flex-col gap-lg">
        {REPORT_GROUPS.map((group) => {
          const reports = REPORTS.filter((report) => report.group === group);
          if (reports.length === 0) {
            return null;
          }
          return (
            <section key={group} className="flex flex-col gap-sm">
              <h2 className="text-sm font-semibold text-neutral-500">{group}</h2>
              <div className="grid grid-cols-1 gap-sm sm:grid-cols-2 lg:grid-cols-3">
                {reports.map((report) =>
                  report.deferred ? (
                    <div
                      key={report.id}
                      className={cn(
                        'flex flex-col gap-xs rounded-lg border border-dashed border-neutral-200',
                        'bg-neutral-100/50 px-md py-md text-neutral-400',
                      )}
                    >
                      <span className="font-medium">{report.title}</span>
                      <span className="text-xs">قيد الإعداد — بانتظار قرار عمل</span>
                    </div>
                  ) : (
                    <Link
                      key={report.id}
                      href={`/reports/${report.id}`}
                      className={cn(
                        'flex items-center rounded-lg border border-neutral-200 bg-white px-md py-md',
                        'font-medium text-neutral-700 transition-colors',
                        'hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-primary',
                      )}
                    >
                      {report.title}
                    </Link>
                  ),
                )}
              </div>
            </section>
          );
        })}
      </div>
    </PageLayout>
  );
}
