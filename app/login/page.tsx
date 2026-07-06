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
    <main className="flex min-h-dvh items-center justify-center bg-neutral-100/60 p-lg">
      <section className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-xl shadow-sm">
        <h1 className="mb-lg text-center text-xl font-bold text-primary">الدفتر</h1>
        <h2 className="mb-lg text-center text-sm font-medium text-neutral-500">
          {uiText.auth.loginTitle}
        </h2>
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
          <Button type="submit" loading={pending} disabled={email === '' || password === ''}>
            {pending ? uiText.auth.signingIn : uiText.auth.submit}
          </Button>
        </form>
      </section>
    </main>
  );
}
