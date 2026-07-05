import Link from 'next/link';

/**
 * Arabic RTL 404 — replaces Next.js's default English not-found screen so an
 * unknown URL stays consistent with the rest of the application (03 §7).
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-md p-lg text-center">
      <p className="text-2xl font-bold">الصفحة غير موجودة</p>
      <p className="text-sm text-neutral-500">تعذّر العثور على الصفحة المطلوبة.</p>
      <Link href="/" className="text-sm font-medium text-primary underline">
        العودة إلى الرئيسية
      </Link>
    </main>
  );
}
