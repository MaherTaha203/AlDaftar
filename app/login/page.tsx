'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { getCurrentUser, signIn } from '@/lib/infrastructure';
import { AuditAction, getAuditService } from '@/lib/modules/audit';
import { Button, Field, Input, uiText } from '@/components/ui';
// Persistence must be registered in THIS page's module graph too: /login sits
// outside the (app) group, and the Login audit record below is the first
// repository consumer after a form sign-in. Without this import the audit
// singleton captured the local store and every later entry silently missed
// the database (defect proven 2026-07-05; see DL-033).
import '@/components/app/persistence-bootstrap';

/**
 * Login — the single-administrator sign-in screen (owner decision,
 * 2026-07-05): email + password only; no registration, no reset, no roles.
 * Sessions persist on the device ("remember me"), so this screen appears
 * once per device until the admin explicitly signs out. Outside the (app)
 * shell — no sidebar/header chrome.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in (persisted session) → straight to the app.
  useEffect(() => {
    void getCurrentUser().then((user) => {
      if (user) {
        router.replace('/');
      }
    });
  }, [router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const result = await signIn(email.trim(), password);
    if (!result.ok) {
      setPending(false);
      setError(uiText.auth.invalidCredentials);
      return;
    }
    // First producer of the reserved Login audit action (BDD-010).
    await getAuditService().record({
      action: AuditAction.Login,
      entityType: 'auth',
      entityId: result.value.email,
      entityLabel: result.value.email,
      summary: 'تسجيل دخول المدير',
    });
    router.replace('/');
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden p-lg">
      {/*
        Dawn Nebula atmosphere — the one expressive surface (approved).
        Deep emerald night ground with two soft dawn glows that breathe very
        slowly (18s, low intensity) behind the card; motion stops entirely
        under prefers-reduced-motion. No particles, no heavy glow.
      */}
      <style>{`
        @keyframes aldaftar-dawn {
          0%, 100% { opacity: .5; transform: translate3d(0,0,0) scale(1); }
          50% { opacity: .82; transform: translate3d(0,-2%,0) scale(1.06); }
        }
        .aldaftar-aurora { animation: aldaftar-dawn 18s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .aldaftar-aurora { animation: none; opacity: .68; }
        }
      `}</style>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: 'linear-gradient(160deg, #0a1a16 0%, #0c211c 55%, #101a20 100%)',
        }}
      >
        <div
          className="aldaftar-aurora absolute -top-1/4 start-[-10%] h-[70%] w-[70%] rounded-full blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(232,160,106,0.28), rgba(217,106,123,0.14) 45%, transparent 70%)',
          }}
        />
        <div
          className="aldaftar-aurora absolute bottom-[-20%] end-[-10%] h-[70%] w-[70%] rounded-full blur-3xl"
          style={{
            animationDelay: '-9s',
            background:
              'radial-gradient(circle, rgba(20,146,108,0.30), rgba(139,123,216,0.14) 45%, transparent 70%)',
          }}
        />
      </div>

      {/* Explicit max width: this project's @theme maps `max-w-sm` to the
          spacing token (8px), so the named container scale is unusable here. */}
      <section className="w-full max-w-[24rem] rounded-2xl border border-white/60 bg-white/92 p-xl shadow-[0_20px_60px_rgba(10,26,22,0.45)] backdrop-blur-xl">
        <div className="mb-lg flex flex-col items-center gap-xs">
          <span
            className="flex size-12 items-center justify-center rounded-xl text-2xl font-bold text-white shadow-[0_6px_16px_rgba(12,110,95,0.35)]"
            style={{ background: 'linear-gradient(135deg, #14926c, #0c6b66)' }}
            aria-hidden="true"
          >
            د
          </span>
          <h1 className="text-xl font-bold text-primary">الدفتر</h1>
          <h2 className="text-sm font-medium text-neutral-400">{uiText.auth.loginTitle}</h2>
        </div>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-md">
          <Field label={uiText.auth.email} required>
            <Input
              type="email"
              autoComplete="username"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label={uiText.auth.password} required>
            <Input
              type="password"
              autoComplete="current-password"
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            loading={pending}
            disabled={email === '' || password === ''}
            className="mt-xs"
          >
            {pending ? uiText.auth.signingIn : uiText.auth.submit}
          </Button>
        </form>
      </section>
    </main>
  );
}
