'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { cn } from '../ui/cn';
import { CloseIcon, MinusIcon } from '../ui/icons';
import { calculatorWindow } from './calculator-store';

/**
 * Calculator — a lightweight floating accounting calculator built into
 * Al Daftar (never the OS calculator). Non-modal and draggable; it stays
 * available while navigating because it is mounted once above the router
 * (in AppProviders). Keyboard-first: once focused it handles the full
 * Numpad — digits, + − × ÷, Enter/=, Backspace, Escape/C — so it works like
 * a dedicated desk accounting calculator with no need to click. It captures
 * keys only while focused, so it never interrupts data entry in a form.
 *
 * Left-to-right evaluation (no operator precedence), matching a physical desk
 * calculator: 1250 +350 −75 ×1.16 = 1769.00.
 */
type Op = '+' | '-' | '×' | '÷';

interface CalcState {
  acc: number | null;
  op: Op | null;
  entry: string;
  overwrite: boolean;
}

const INITIAL: CalcState = { acc: null, op: null, entry: '', overwrite: true };

const GROUP = new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 });

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 1e10) / 1e10;
}

function compute(a: number, op: Op, b: number): number {
  switch (op) {
    case '+':
      return round(a + b);
    case '-':
      return round(a - b);
    case '×':
      return round(a * b);
    case '÷':
      return b === 0 ? NaN : round(a / b);
  }
}

function currentValue(state: CalcState): number {
  return state.entry === '' ? (state.acc ?? 0) : Number(state.entry);
}

function reduceDigit(state: CalcState, digit: string): CalcState {
  if (state.overwrite) {
    return { ...state, entry: digit, overwrite: false };
  }
  const entry = state.entry === '0' ? digit : state.entry + digit;
  return { ...state, entry };
}

function reduceDot(state: CalcState): CalcState {
  if (state.overwrite) {
    return { ...state, entry: '0.', overwrite: false };
  }
  if (state.entry.includes('.')) {
    return state;
  }
  return { ...state, entry: state.entry === '' ? '0.' : `${state.entry}.` };
}

function reduceOp(state: CalcState, op: Op): CalcState {
  const value = currentValue(state);
  const acc = state.acc === null ? value : state.op ? compute(state.acc, state.op, value) : value;
  return { acc, op, entry: '', overwrite: true };
}

function reduceEquals(state: CalcState): CalcState {
  if (state.op === null) {
    return state;
  }
  const value = currentValue(state);
  const acc = compute(state.acc ?? 0, state.op, value);
  return { acc, op: null, entry: Number.isFinite(acc) ? String(acc) : '', overwrite: true };
}

function reduceBackspace(state: CalcState): CalcState {
  if (state.overwrite || state.entry === '') {
    return state;
  }
  return { ...state, entry: state.entry.slice(0, -1) };
}

/** The value shown on the main display. */
function displayValue(state: CalcState): string {
  if (state.entry !== '') {
    return state.entry;
  }
  const value = state.acc ?? 0;
  return Number.isFinite(value) ? GROUP.format(value) : 'خطأ';
}

/** The raw numeric result, for Copy Result. */
function resultString(state: CalcState): string {
  const value = currentValue(state);
  return Number.isFinite(value) ? String(value) : '';
}

const KEYPAD: readonly (readonly { label: string; kind: string; wide?: boolean }[])[] = [
  [
    { label: 'C', kind: 'clear' },
    { label: '⌫', kind: 'back' },
    { label: '÷', kind: 'op:÷' },
    { label: '×', kind: 'op:×' },
  ],
  [
    { label: '7', kind: 'd:7' },
    { label: '8', kind: 'd:8' },
    { label: '9', kind: 'd:9' },
    { label: '−', kind: 'op:-' },
  ],
  [
    { label: '4', kind: 'd:4' },
    { label: '5', kind: 'd:5' },
    { label: '6', kind: 'd:6' },
    { label: '+', kind: 'op:+' },
  ],
  [
    { label: '1', kind: 'd:1' },
    { label: '2', kind: 'd:2' },
    { label: '3', kind: 'd:3' },
    { label: '=', kind: 'eq' },
  ],
  [
    { label: '0', kind: 'd:0', wide: true },
    { label: '.', kind: 'dot' },
  ],
];

export function Calculator() {
  const windowState = useSyncExternalStore(
    calculatorWindow.subscribe,
    calculatorWindow.getSnapshot,
    calculatorWindow.getServerSnapshot,
  );
  const [calc, setCalc] = useState<CalcState>(INITIAL);
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  const apply = useCallback((kind: string) => {
    setCopied(false);
    setCalc((state) => {
      if (kind === 'clear') return INITIAL;
      if (kind === 'back') return reduceBackspace(state);
      if (kind === 'eq') return reduceEquals(state);
      if (kind === 'dot') return reduceDot(state);
      if (kind.startsWith('d:')) return reduceDigit(state, kind.slice(2));
      if (kind.startsWith('op:')) return reduceOp(state, kind.slice(3) as Op);
      return state;
    });
  }, []);

  const copyResult = useCallback(() => {
    setCalc((state) => {
      const text = resultString(state);
      if (text && typeof navigator !== 'undefined' && navigator.clipboard) {
        void navigator.clipboard.writeText(text).then(
          () => setCopied(true),
          () => setCopied(false),
        );
      }
      return state;
    });
  }, []);

  // Auto-focus the panel when it opens (so the keyboard works immediately).
  useEffect(() => {
    if (windowState.open && !windowState.minimized) {
      panelRef.current?.focus();
    }
  }, [windowState.open, windowState.minimized]);

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const { key, code } = event;
    if ((event.ctrlKey || event.metaKey) && (key === 'c' || key === 'C')) {
      copyResult();
      event.preventDefault();
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    let kind: string | null = null;
    // Prefer event.code for the Numpad so it works even with NumLock off
    // (a dedicated desk calculator is NumLock-independent). Fall back to
    // event.key for the main keyboard and NumLock-on numpads.
    if (/^Numpad[0-9]$/.test(code)) kind = `d:${code.slice(6)}`;
    else if (code === 'NumpadDecimal') kind = 'dot';
    else if (code === 'NumpadAdd') kind = 'op:+';
    else if (code === 'NumpadSubtract') kind = 'op:-';
    else if (code === 'NumpadMultiply') kind = 'op:×';
    else if (code === 'NumpadDivide') kind = 'op:÷';
    else if (code === 'NumpadEnter') kind = 'eq';
    else if (/^[0-9]$/.test(key)) kind = `d:${key}`;
    else if (key === '.' || key === ',' || key === 'Decimal') kind = 'dot';
    else if (key === '+') kind = 'op:+';
    else if (key === '-') kind = 'op:-';
    else if (key === '*' || key === 'x' || key === 'X') kind = 'op:×';
    else if (key === '/') kind = 'op:÷';
    else if (key === 'Enter' || key === '=') kind = 'eq';
    else if (key === 'Backspace') kind = 'back';
    else if (key === 'Escape' || key === 'c' || key === 'C') kind = 'clear';
    if (kind) {
      apply(kind);
      event.preventDefault();
    }
  }

  function onDragStart(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    // Don't hijack clicks on the strip's own controls (minimize/close):
    // capturing the pointer here would swallow their click.
    if ((event.target as HTMLElement).closest('button')) return;
    drag.current = { dx: event.clientX - windowState.x, dy: event.clientY - windowState.y };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }
  function onDragMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const maxX = window.innerWidth - 120;
    const maxY = window.innerHeight - 48;
    const x = Math.min(Math.max(0, event.clientX - drag.current.dx), Math.max(0, maxX));
    const y = Math.min(Math.max(0, event.clientY - drag.current.dy), Math.max(0, maxY));
    calculatorWindow.setPosition(x, y);
  }
  function onDragEnd(event: ReactPointerEvent<HTMLDivElement>) {
    drag.current = null;
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
  }

  if (!windowState.open) {
    return null;
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="الآلة الحاسبة"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="screen-only fixed z-[60] w-64 select-none rounded-xl border border-neutral-200 bg-white/95 shadow-lg outline-none backdrop-blur-md"
      style={{ insetInlineStart: windowState.x, top: windowState.y }}
    >
      {/* Title strip — drag handle + minimize/close. */}
      <div
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        className="flex cursor-move items-center justify-between gap-sm rounded-t-xl border-b border-neutral-200 bg-neutral-100/70 px-sm py-xs"
      >
        <span className="text-xs font-semibold text-neutral-500">الآلة الحاسبة</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="تصغير"
            onClick={() => calculatorWindow.setMinimized(!windowState.minimized)}
            className="rounded-sm p-1 text-neutral-400 hover:text-neutral-600 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <MinusIcon width={14} height={14} />
          </button>
          <button
            type="button"
            aria-label="إغلاق"
            onClick={() => calculatorWindow.close()}
            className="rounded-sm p-1 text-neutral-400 hover:text-danger focus-visible:outline-2 focus-visible:outline-primary"
          >
            <CloseIcon width={14} height={14} />
          </button>
        </div>
      </div>

      {windowState.minimized ? null : (
        <div className="flex flex-col gap-sm p-sm">
          {/* Display: running tape + main value, LTR tabular figures. */}
          <div className="rounded-lg bg-neutral-100/70 px-sm py-xs text-left" dir="ltr">
            <div className="h-4 text-xs text-neutral-400 tabular-nums">
              {calc.acc !== null && calc.op ? `${GROUP.format(calc.acc)} ${calc.op}` : ' '}
            </div>
            <div className="truncate text-xl font-semibold text-neutral-600 tabular-nums">
              {displayValue(calc)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-xs">
            <button
              type="button"
              onClick={copyResult}
              className="rounded-md border border-neutral-200 py-1 text-xs font-medium text-primary hover:bg-primary/[0.06] focus-visible:outline-2 focus-visible:outline-primary"
            >
              {copied ? 'تم النسخ ✓' : 'نسخ الناتج'}
            </button>
            <button
              type="button"
              onClick={() => apply('clear')}
              className="rounded-md border border-neutral-200 py-1 text-xs font-medium text-neutral-500 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-primary"
            >
              مسح
            </button>
          </div>

          {/* On-screen keypad for mouse users; the keyboard does everything. */}
          <div className="flex flex-col gap-xs">
            {KEYPAD.map((row, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-4 gap-xs">
                {row.map((key) => {
                  const isOp = key.kind.startsWith('op:') || key.kind === 'eq';
                  return (
                    <button
                      key={key.kind}
                      type="button"
                      tabIndex={-1}
                      onClick={() => apply(key.kind)}
                      className={cn(
                        'h-9 rounded-md text-sm font-medium tabular-nums transition-colors',
                        'focus-visible:outline-2 focus-visible:outline-primary',
                        key.wide && 'col-span-2',
                        key.kind === 'eq'
                          ? 'bg-primary text-white hover:bg-primary/90'
                          : isOp
                            ? 'bg-neutral-100 text-primary hover:bg-neutral-200'
                            : key.kind === 'clear' || key.kind === 'back'
                              ? 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                              : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200',
                      )}
                    >
                      {key.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="text-center text-[10px] text-neutral-400">
            لوحة المفاتيح ولوحة الأرقام مدعومتان بالكامل
          </p>
        </div>
      )}
    </div>
  );
}
