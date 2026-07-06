'use client';

import { useEffect, useRef } from 'react';
import { AUDIT_RECORD_FAILED_EVENT } from '@/lib/modules/audit';
import { useToast } from '../ui';

/**
 * AuditFailureNotifier — listens for the audit service's record-failure
 * event and warns the owner with a persistent error toast. The audit trail
 * is best-effort at the edge (never rolls back the business action), but a
 * gap must never be silent (BDD-010) — before this listener, a failed append
 * was visible only in the developer console.
 */
const NOTIFY_COOLDOWN_MS = 60_000;

export function AuditFailureNotifier() {
  const toast = useToast();
  const lastShownAt = useRef(0);

  useEffect(() => {
    const handler = () => {
      const now = Date.now();
      if (now - lastShownAt.current < NOTIFY_COOLDOWN_MS) {
        return;
      }
      lastShownAt.current = now;
      toast.show({
        variant: 'error',
        message:
          'تعذّر تسجيل العملية في سجل التدقيق — اكتملت العملية نفسها، لكن السجل لم يُحدَّث. قد تكون مساحة التخزين ممتلئة.',
      });
    };
    window.addEventListener(AUDIT_RECORD_FAILED_EVENT, handler);
    return () => window.removeEventListener(AUDIT_RECORD_FAILED_EVENT, handler);
  }, [toast]);

  return null;
}
