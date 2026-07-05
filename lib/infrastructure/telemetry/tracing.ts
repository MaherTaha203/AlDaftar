import { noop } from '@/lib/core';

/*
 * Forward seam for distributed tracing. The interfaces mirror the minimal
 * span model (OpenTelemetry-compatible in shape) so instrumentation written
 * now keeps working if a real tracer is adopted later. Until then the no-op
 * tracer is the only implementation — no external providers.
 */

export interface ISpan {
  setAttribute(key: string, value: string | number | boolean): void;
  end(): void;
}

export interface ITracer {
  startSpan(name: string): ISpan;
}

const noopSpan: ISpan = Object.freeze({
  setAttribute: noop,
  end: noop,
});

export const noopTracer: ITracer = Object.freeze({
  startSpan: () => noopSpan,
});
