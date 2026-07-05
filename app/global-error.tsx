'use client';

/**
 * Root-level error boundary (Next.js): catches errors thrown in the root
 * layout itself, so it must render its own <html>/<body> and cannot rely on
 * the app stylesheet. Kept self-contained with inline styles and Arabic RTL.
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <main
          style={{
            display: 'flex',
            minHeight: '100vh',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            padding: '2rem',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>حدث خطأ غير متوقع</h1>
          <p style={{ color: '#6b7280' }}>نعتذر، حدث خطأ في التطبيق.</p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '0.375rem',
              border: '1px solid #d1d5db',
              cursor: 'pointer',
            }}
          >
            إعادة المحاولة
          </button>
        </main>
      </body>
    </html>
  );
}
