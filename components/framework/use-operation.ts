'use client';

import { useCallback, useRef, useState } from 'react';
import type { AsyncResult } from '@/lib/core';
import { getErrorMessage } from './error-messages';

/**
 * useOperation — the module-side service-consumption pattern.
 *
 * Wraps a call to an `ApplicationService` operation (anything returning
 * `AsyncResult<T>`) with the pending flag and the Arabic error message every
 * screen needs, so modules never hand-roll loading/error state. The Result
 * is also returned to the caller for success flows (navigation, toasts).
 *
 * Services never throw (ApplicationService.execute guarantees it), so this
 * hook deals only in Results. Stale protection: if `run` is invoked again
 * before the previous call settles, the older call's outcome no longer
 * updates state.
 */
export interface OperationState {
  /** True while a run is in flight. */
  readonly pending: boolean;
  /** Arabic message of the last failure; null when none or cleared. */
  readonly error: string | null;
}

export function useOperation<TArgs extends readonly unknown[], TValue>(
  operation: (...args: TArgs) => AsyncResult<TValue>,
) {
  const [state, setState] = useState<OperationState>({ pending: false, error: null });
  const callSeq = useRef(0);
  const operationRef = useRef(operation);
  operationRef.current = operation;

  const run = useCallback(async (...args: TArgs) => {
    const seq = ++callSeq.current;
    setState({ pending: true, error: null });
    const result = await operationRef.current(...args);
    if (seq === callSeq.current) {
      setState({ pending: false, error: result.ok ? null : getErrorMessage(result.error) });
    }
    return result;
  }, []);

  const clearError = useCallback(() => {
    setState((current) => (current.error === null ? current : { ...current, error: null }));
  }, []);

  return { run, clearError, pending: state.pending, error: state.error };
}
