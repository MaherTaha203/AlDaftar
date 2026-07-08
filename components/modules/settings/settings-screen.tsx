'use client';

import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  getSettingsService,
  EMPTY_COMPANY_PROFILE,
  type CompanyProfile,
} from '@/lib/modules/settings';
import { BOOK_CURRENCY } from '@/lib/modules/shared/money';
import { DensityControl, PageLayout } from '@/components/app';
import { useOperation } from '@/components/framework';
import { Button, Field, FormSkeleton, Input } from '@/components/ui';

/**
 * SettingsScreen — screen S-70 (01_System_Workflow.md §7). v1 delivers the
 * company profile (used on printed documents, P21). Currency, numbering, and
 * display format are fixed approved constants shown read-only; attachment
 * limits (BDR-08) and backup (BDR-12) remain pending owner decisions and are
 * shown as such.
 */
const MAX_LOGO_BYTES = 512 * 1024;

/** The settings sections, in order — drives both the index and the anchors. */
const SECTIONS = [
  { id: 'company', title: 'ملف الشركة' },
  { id: 'currency', title: 'العملة' },
  { id: 'numbering', title: 'الترقيم والعرض' },
  { id: 'display', title: 'تفضيلات العرض' },
  { id: 'backup', title: 'المرفقات والنسخ الاحتياطي' },
] as const;

/** Sticky index so a settings page reads as a premium console, not a long list. */
function SectionIndex() {
  return (
    <nav
      aria-label="أقسام الإعدادات"
      className="sticky top-md flex h-max flex-col gap-xs rounded-lg border border-neutral-200 bg-white p-sm shadow-sm max-lg:hidden"
    >
      {SECTIONS.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          className="rounded-md px-sm py-xs text-sm text-neutral-500 transition-colors hover:bg-primary/[0.06] hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
        >
          {section.title}
        </a>
      ))}
    </nav>
  );
}

function Section({
  id,
  title,
  locked = false,
  children,
}: {
  id: string;
  title: string;
  locked?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-md rounded-lg border border-neutral-200 bg-white shadow-sm"
    >
      <h2 className="flex items-center justify-between gap-sm border-b border-neutral-200 px-lg py-md text-sm font-semibold text-neutral-500">
        {title}
        {locked ? (
          <span className="rounded-full bg-[color-mix(in_srgb,var(--color-copper)_14%,transparent)] px-sm py-0.5 text-[11px] font-medium text-copper">
            قرار مقفل
          </span>
        ) : null}
      </h2>
      <div className="flex flex-col gap-md p-lg">{children}</div>
    </section>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-md border-b border-neutral-100 py-xs text-sm last:border-b-0">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium text-neutral-700">{value}</span>
    </div>
  );
}

export function SettingsScreen() {
  const [profile, setProfile] = useState<CompanyProfile>(EMPTY_COMPANY_PROFILE);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  const { run: load } = useOperation(() => getSettingsService().getProfile());
  const {
    run: save,
    pending: saving,
    error,
  } = useOperation((p: CompanyProfile) => getSettingsService().saveProfile(p));

  useEffect(() => {
    void load().then((r) => {
      if (r.ok) {
        setProfile(r.value);
      }
      setLoaded(true);
    });
  }, [load]);

  const set = (key: keyof CompanyProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  function onLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setLogoError(null);
    if (!file) {
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError('حجم الشعار يتجاوز 512 كيلوبايت.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      set('logoDataUrl', typeof reader.result === 'string' ? reader.result : '');
    reader.readAsDataURL(file);
  }

  async function onSave() {
    const result = await save(profile);
    if (result.ok) {
      setSaved(true);
    }
  }

  if (!loaded) {
    return (
      <PageLayout title="الإعدادات">
        <FormSkeleton fields={5} />
      </PageLayout>
    );
  }

  return (
    <PageLayout title="الإعدادات" description="ملف الشركة، القرارات المعتمدة، وتفضيلات العرض.">
      <div className="grid gap-lg lg:grid-cols-[200px_1fr]">
        <SectionIndex />
        <div className="flex min-w-0 flex-col gap-lg">
          <Section id="company" title="ملف الشركة">
            <Field label="اسم الشركة">
              <Input
                value={profile.companyName}
                onChange={(e) => set('companyName', e.target.value)}
                placeholder="اسم الشركة كما يظهر على المطبوعات"
              />
            </Field>
            <Field label="العنوان">
              <Input value={profile.address} onChange={(e) => set('address', e.target.value)} />
            </Field>
            <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
              <Field label="الهاتف">
                <Input value={profile.phone} onChange={(e) => set('phone', e.target.value)} />
              </Field>
              <Field label="الرقم الضريبي / السجل">
                <Input
                  value={profile.taxReference}
                  onChange={(e) => set('taxReference', e.target.value)}
                />
              </Field>
            </div>

            <div className="flex flex-col gap-xs">
              <span className="text-sm font-medium text-neutral-700">الشعار (للطباعة)</span>
              <div className="flex items-center gap-md">
                {profile.logoDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.logoDataUrl}
                    alt="شعار الشركة"
                    className="h-16 w-16 rounded-md border border-neutral-200 object-contain"
                  />
                ) : null}
                <input
                  type="file"
                  accept="image/*"
                  aria-label="اختيار ملف الشعار"
                  onChange={onLogoChange}
                  className="text-sm"
                />
                {profile.logoDataUrl ? (
                  <Button variant="secondary" size="sm" onClick={() => set('logoDataUrl', '')}>
                    إزالة
                  </Button>
                ) : null}
              </div>
              {logoError ? <p className="text-sm text-danger">{logoError}</p> : null}
            </div>

            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <div className="flex items-center gap-md">
              <Button onClick={() => void onSave()} loading={saving}>
                حفظ
              </Button>
              {saved ? <span className="text-sm text-success">تم الحفظ</span> : null}
            </div>
          </Section>

          <Section id="currency" title="العملة" locked>
            <ReadOnlyRow
              label="عملة الدفتر"
              value={`${BOOK_CURRENCY.code} (${BOOK_CURRENCY.symbol})`}
            />
            <ReadOnlyRow label="المنازل العشرية" value={String(BOOK_CURRENCY.precision)} />
            <ReadOnlyRow label="التقريب" value="نصفي للأعلى" />
            <p className="text-xs text-neutral-400">
              قرار معتمد (BDD-006) — غير قابل للتغيير في هذه النسخة.
            </p>
          </Section>

          <Section id="numbering" title="الترقيم والعرض" locked>
            <ReadOnlyRow label="ترقيم المستندات" value="تسلسل رقمي مستقل لكل نوع، يبدأ من 1" />
            <ReadOnlyRow label="الأرقام" value="أرقام لاتينية (0-9)" />
            <ReadOnlyRow label="التاريخ" value="يوم/شهر/سنة (DD/MM/YYYY)" />
            <p className="text-xs text-neutral-400">
              قرارات معتمدة (BDD-005 / BDR-17 / BDR-18) — ثابتة في هذه النسخة.
            </p>
          </Section>

          <Section id="display" title="تفضيلات العرض">
            <div className="flex flex-wrap items-center justify-between gap-md">
              <div className="flex flex-col gap-xs">
                <span className="text-sm font-medium text-neutral-700">كثافة الواجهة</span>
                <span className="text-xs text-neutral-400">
                  يضبط المسافات وارتفاع صفوف الجداول وحجم عناصر الإدخال — يُحفظ لكل جهاز.
                </span>
              </div>
              <DensityControl />
            </div>
          </Section>

          <Section id="backup" title="المرفقات والنسخ الاحتياطي">
            <p className="text-sm text-neutral-500">
              حدود المرفقات (BDR-08) وسياسة النسخ الاحتياطي (BDR-12) بانتظار قرار المالك، ولم
              تُفعَّل خيارات التحكم بها بعد.
            </p>
          </Section>
        </div>
      </div>
    </PageLayout>
  );
}
