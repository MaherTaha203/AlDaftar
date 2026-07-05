'use client';

import { ErrorState } from '@/components/ui';

/**
 * Arabic RTL error boundary for the route subtree (03 §7): a render/runtime
 * error shows the shared retry card in Arabic instead of a blank or
 * English screen. Renders inside the RTL root layout.
 */
export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center p-lg">
      <ErrorState message="حدث خطأ غير متوقع. حاول مرة أخرى." onRetry={reset} />
    </main>
  );
}
