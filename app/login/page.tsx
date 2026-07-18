'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { getCurrentUser, setRememberSession, signIn } from '@/lib/infrastructure';
import { AuditAction, getAuditService } from '@/lib/modules/audit';
import { Button, Field, Input, uiText } from '@/components/ui';
// Persistence must be registered in THIS page's module graph too: /login sits
// outside the (app) group, and the Login audit record below is the first
// repository consumer after a form sign-in. Without this import the audit
// singleton captured the local store and every later entry silently missed
// the database (defect proven 2026-07-05; see DL-033).
import '@/components/app/persistence-bootstrap';

/**
 * Login — the single-administrator sign-in screen (owner decision, 2026-07-05):
 * email + password only; no registration, no reset, no roles. There is
 * deliberately no "forgot password" — recovery is via the Supabase dashboard
 * (single-admin design).
 *
 * Optimized for PERCEIVED SPEED: renders instantly, no entrance or background
 * animation, no backdrop blur — a static gradient and only fast (≤150ms) CSS
 * micro-interactions on inputs and the button (which respect
 * prefers-reduced-motion via the design-system components). Beauty comes from
 * type, spacing, and proportion, not motion.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
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
    // Record the choice BEFORE sign-in so the session token is written to the
    // right store (localStorage when remembered, sessionStorage otherwise).
    setRememberSession(remember);
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
    <main
      className="flex min-h-dvh items-center justify-center p-lg"
      style={{
        // Static premium ground — no motion, no blur (perceived-speed priority).
        background: 'linear-gradient(160deg, #0a1a16 0%, #0c211c 55%, #101a20 100%)',
      }}
    >
      {/* Explicit max width: this project's @theme maps `max-w-sm` to the
          spacing token, so the named container scale is unusable here. */}
      <section className="w-full max-w-[24rem] rounded-2xl border border-white/10 bg-white p-xl shadow-[0_18px_50px_rgba(10,26,22,0.35)]">
        <div className="mb-lg flex flex-col items-center gap-xs">
          <span
            className="flex size-14 items-center justify-center rounded-2xl text-3xl font-bold text-white shadow-[0_6px_16px_rgba(12,110,95,0.35)]"
            style={{ background: 'linear-gradient(135deg, #14926c, #0c6b66)' }}
            aria-hidden="true"
          >
            د
          </span>
          <h1 className="text-xl font-bold text-primary">الدفتر</h1>
          <p className="text-sm font-medium text-neutral-400">{uiText.auth.subtitle}</p>
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
          <label className="flex cursor-pointer items-center gap-sm text-sm text-neutral-500">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="size-4 accent-primary"
            />
            {uiText.auth.rememberMe}
          </label>
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
