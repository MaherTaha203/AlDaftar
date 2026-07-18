'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CustodyStatus, getCustodyService, type CustodyBasis } from '@/lib/modules/custody';
import {
  getSettingsService,
  EMPTY_COMPANY_PROFILE,
  type CompanyProfile,
} from '@/lib/modules/settings';
import { useOperation } from '@/components/framework';
import { PrintLayout } from '@/components/layout';
import { formatDate, Spinner } from '@/components/ui';
import { CompanyHeader } from '../shared/company-header';

/**
 * CustodyPrint — the printable custody voucher (سند عهدة): company header +
 * logo, recipient, number/date, the delivered items with their remaining
 * balance, recipient + issuer signature lines, and a future-ready QR
 * placeholder. No money — this is a handover record, not an invoice.
 */
export function CustodyPrint({ custodyId }: { custodyId: string }) {
  const router = useRouter();
  const [basis, setBasis] = useState<CustodyBasis | null>(null);
  const [profile, setProfile] = useState<CompanyProfile>(EMPTY_COMPANY_PROFILE);

  const { run: load } = useOperation((id: string) => getCustodyService().basis(id));
  const { run: loadProfile } = useOperation(() => getSettingsService().getProfile());

  useEffect(() => {
    void load(custodyId).then((r) => r.ok && setBasis(r.value));
    void loadProfile().then((r) => r.ok && setProfile(r.value));
  }, [custodyId, load, loadProfile]);

  if (basis === null) {
    return (
      <div className="flex justify-center py-2xl">
        <Spinner />
      </div>
    );
  }

  const { custody, balances } = basis;
  const isDraft = custody.status === CustodyStatus.Draft;

  return (
    <PrintLayout
      title={isDraft ? 'سند عهدة (مسودة)' : `سند عهدة رقم ${custody.number}`}
      draft={isDraft}
      companyHeader={<CompanyHeader profile={profile} />}
      meta={
        <span>
          التاريخ: {formatDate(custody.date)}
          {custody.expectedReturnDate !== null
            ? ` · الإرجاع المتوقع: ${formatDate(custody.expectedReturnDate)}`
            : ''}
        </span>
      }
      printedOn={`طُبع في ${formatDate(new Date().toISOString().slice(0, 10))}`}
      onBack={() => router.back()}
      signature={
        <div className="flex items-end justify-between gap-2xl">
          <div className="flex flex-1 flex-col gap-2xl">توقيع المُستلِم: ______________</div>
          <div className="flex flex-1 flex-col gap-2xl">توقيع المُسلِّم: ______________</div>
          {/* Future-ready QR placeholder (no encoder yet — deliberate). */}
          <div className="flex flex-col items-center gap-xs">
            <div className="flex size-20 items-center justify-center rounded-sm border border-dashed border-neutral-300 text-[10px] text-neutral-400">
              QR
            </div>
            <span className="text-[10px] text-neutral-400">رمز التحقق (لاحقًا)</span>
          </div>
        </div>
      }
    >
      <div className="flex flex-wrap justify-between gap-md text-sm">
        <div>
          المُستلِم: <span className="font-medium">{custody.recipient || '—'}</span>
        </div>
        {custody.phone ? (
          <div>
            الهاتف:{' '}
            <bdi dir="ltr" className="font-medium">
              {custody.phone}
            </bdi>
          </div>
        ) : null}
      </div>

      <table className="w-full border-collapse text-sm">
        <thead className="print-repeat-head">
          <tr className="border-b-2 border-neutral-300 text-neutral-500">
            <th className="py-xs text-start">الصنف</th>
            <th className="py-xs text-start">الوصف</th>
            <th className="py-xs text-left">المُسلَّمة</th>
            <th className="py-xs text-left">المتبقّية</th>
          </tr>
        </thead>
        <tbody>
          {balances.map((b) => (
            <tr key={b.line.id} className="border-b border-neutral-200">
              <td className="py-xs">{b.line.item || '—'}</td>
              <td className="py-xs">{b.line.description || '—'}</td>
              <td className="py-xs text-left tabular-nums">
                <bdi dir="ltr">{b.delivered}</bdi>
              </td>
              <td className="py-xs text-left tabular-nums">
                <bdi dir="ltr">{b.remaining}</bdi>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {custody.notes ? <p className="text-sm text-neutral-500">ملاحظات: {custody.notes}</p> : null}
    </PrintLayout>
  );
}
