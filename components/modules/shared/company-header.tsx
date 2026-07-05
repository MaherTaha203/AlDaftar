import type { CompanyProfile } from '@/lib/modules/settings';

/**
 * CompanyHeader — the print header block (05_Printing_Specification.md §1),
 * fed by the Settings company profile (P19). Business-blind presentation: it
 * renders whatever the owner saved (name, logo, address, phone, tax ref) and
 * shows nothing extra when a field is empty. Used only inside PrintLayout's
 * `companyHeader` slot.
 */
export function CompanyHeader({ profile }: { profile: CompanyProfile }) {
  const hasContact = profile.address || profile.phone || profile.taxReference;
  if (!profile.companyName && !profile.logoDataUrl && !hasContact) {
    return null;
  }
  return (
    <div className="flex items-center gap-md">
      {profile.logoDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.logoDataUrl} alt="" className="h-16 w-16 object-contain" />
      ) : null}
      <div className="flex flex-col gap-xs">
        {profile.companyName ? (
          <span className="text-base font-bold">{profile.companyName}</span>
        ) : null}
        {profile.address ? (
          <span className="text-xs text-neutral-500">{profile.address}</span>
        ) : null}
        <div className="flex flex-wrap gap-md text-xs text-neutral-500">
          {profile.phone ? (
            <span>
              هاتف: <bdi dir="ltr">{profile.phone}</bdi>
            </span>
          ) : null}
          {profile.taxReference ? (
            <span>
              رقم ضريبي: <bdi dir="ltr">{profile.taxReference}</bdi>
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
