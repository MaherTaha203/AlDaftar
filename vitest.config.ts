import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/*
 * Vitest configuration (TD-003: introduce a runner + unit tests for pure logic).
 *
 * Scope is the pure/technical logic layer — no DOM, no business decisions. The
 * `@` alias mirrors the tsconfig `@/*` → `./*` mapping so tests import modules
 * exactly as production code does. The React plugin transforms the `.tsx`
 * navigation config (transitively imported by the route/breadcrumb helpers),
 * overriding the tsconfig `jsx: preserve` setting that Next needs at build time.
 */
const repoRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': repoRoot,
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
