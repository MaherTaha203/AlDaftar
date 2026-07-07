/**
 * Calculator window store — open/minimized state and last screen position for
 * the floating accounting calculator. Kept in a module-level store (not React
 * context) so the top-bar toggle and the panel — which is mounted once above
 * the router so it survives navigation — share one source of truth. Position
 * and open/minimized state persist to localStorage, so the calculator
 * reappears where the accountant left it. Component-free: no import cycle.
 */
export interface CalculatorWindowState {
  readonly open: boolean;
  readonly minimized: boolean;
  readonly x: number;
  readonly y: number;
}

const STORAGE_KEY = 'aldaftar.calculator.window';
const DEFAULT_STATE: CalculatorWindowState = { open: false, minimized: false, x: 24, y: 96 };

let state: CalculatorWindowState = DEFAULT_STATE;
let loaded = false;
const listeners = new Set<() => void>();

function load(): void {
  if (loaded || typeof window === 'undefined') {
    return;
  }
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<CalculatorWindowState>;
      state = {
        open: Boolean(saved.open),
        minimized: Boolean(saved.minimized),
        x: typeof saved.x === 'number' ? saved.x : DEFAULT_STATE.x,
        y: typeof saved.y === 'number' ? saved.y : DEFAULT_STATE.y,
      };
    }
  } catch {
    state = DEFAULT_STATE;
  }
}

function persist(): void {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full/blocked — the window still works this session.
    }
  }
}

function set(next: Partial<CalculatorWindowState>): void {
  state = { ...state, ...next };
  persist();
  listeners.forEach((listener) => listener());
}

export const calculatorWindow = {
  toggleOpen(): void {
    set({ open: !state.open, minimized: false });
  },
  close(): void {
    set({ open: false });
  },
  setMinimized(minimized: boolean): void {
    set({ minimized });
  },
  setPosition(x: number, y: number): void {
    set({ x, y });
  },
  subscribe(listener: () => void): () => void {
    load();
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): CalculatorWindowState {
    return state;
  },
  getServerSnapshot(): CalculatorWindowState {
    return DEFAULT_STATE;
  },
};
