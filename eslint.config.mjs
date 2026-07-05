import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

/**
 * ESLint flat configuration (ESLint 9 / Next.js 15).
 *
 * The project lints via the ESLint CLI (`eslint .`), not the deprecated
 * `next lint` command. Build artifacts and generated files are ignored here
 * because the CLI, unlike `next lint`, does not exclude them automatically.
 */
const eslintConfig = [
  {
    ignores: ['.next/**', 'node_modules/**', 'out/**', 'build/**', 'coverage/**', 'next-env.d.ts'],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
];

export default eslintConfig;
