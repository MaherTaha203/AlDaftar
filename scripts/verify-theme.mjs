/*
 * Theme drift guard (DL-006 made mechanical).
 *
 * `lib/theme/*` is the canonical source of the design tokens; the `@theme`
 * block in `styles/globals.css` is their Tailwind projection, kept identical
 * by hand. This script derives the expected CSS-variable set from the tokens
 * and asserts the projection matches, so the two can never silently drift.
 *
 * Comparison is semantic: values are normalized (case, quotes, and whitespace
 * removed) so cosmetic formatting differences — e.g. `rgba(0,0,0,0.05)` vs
 * `rgba(0, 0, 0, 0.05)` — are treated as equal while real value changes fail.
 *
 * Dependency-free (Node ESM); run with `npm run verify:theme`. The mapping
 * below (token key → CSS variable) is the authoritative DL-006 binding.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const repoRoot = new URL('../', import.meta.url);
const readRepoFile = (relativePath) =>
  readFileSync(fileURLToPath(new URL(relativePath, repoRoot)), 'utf8');

const normalize = (value) => value.trim().toLowerCase().replace(/['"]/g, '').replace(/\s+/g, '');

/** Extracts `key: 'value'` string tokens from a token source file. */
function stringTokens(source) {
  const result = {};
  for (const match of source.matchAll(/(\w+):\s*'([^']*)'/g)) {
    result[match[1]] = match[2];
  }
  return result;
}

/** Extracts `key: number` tokens from a token source file. */
function numberTokens(source) {
  const result = {};
  for (const match of source.matchAll(/(\w+):\s*(\d+(?:\.\d+)?)\s*[,}]/g)) {
    result[match[1]] = match[2];
  }
  return result;
}

/** Builds the CSS variables the projection must contain, from the tokens. */
function buildExpected() {
  const expected = new Map();

  const colors = stringTokens(readRepoFile('lib/theme/colors.ts'));
  for (const [key, value] of Object.entries(colors)) {
    const name = /^\d+$/.test(key) ? `--color-neutral-${key}` : `--color-${key}`;
    expected.set(name, value);
  }

  const typographySource = readRepoFile('lib/theme/typography.ts');
  const typographyStrings = stringTokens(typographySource);
  const typographyNumbers = numberTokens(typographySource);
  expected.set('--font-sans', typographyStrings.fontFamilyBase);
  expected.set('--text-base', `${typographyNumbers.fontSizeBase}px`);
  expected.set('--leading-base', `${typographyNumbers.lineHeightBase}`);

  const pxScales = [
    ['lib/theme/spacing.ts', '--spacing-'],
    ['lib/theme/radius.ts', '--radius-'],
    ['lib/theme/breakpoints.ts', '--breakpoint-'],
  ];
  for (const [path, prefix] of pxScales) {
    for (const [key, value] of Object.entries(numberTokens(readRepoFile(path)))) {
      expected.set(`${prefix}${key}`, `${value}px`);
    }
  }

  for (const [key, value] of Object.entries(stringTokens(readRepoFile('lib/theme/shadows.ts')))) {
    expected.set(`--shadow-${key}`, value);
  }

  return expected;
}

/** Parses the `@theme { … }` block of globals.css into a variable map. */
function parseThemeBlock() {
  const css = readRepoFile('styles/globals.css');
  const start = css.indexOf('@theme');
  if (start === -1) {
    throw new Error('No @theme block found in styles/globals.css');
  }
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  const block = css.slice(open + 1, close);
  const vars = new Map();
  for (const match of block.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    vars.set(`--${match[1]}`, match[2].trim());
  }
  return vars;
}

function main() {
  const expected = buildExpected();
  const actual = parseThemeBlock();
  const problems = [];

  for (const [name, value] of expected) {
    if (!actual.has(name)) {
      problems.push(`missing in @theme: ${name} (expected ${value})`);
    } else if (normalize(actual.get(name)) !== normalize(value)) {
      problems.push(`mismatch: ${name} — token "${value}" vs @theme "${actual.get(name)}"`);
    }
  }
  for (const name of actual.keys()) {
    if (!expected.has(name)) {
      problems.push(`extra in @theme (no matching token): ${name}`);
    }
  }

  if (problems.length > 0) {
    console.error('Theme drift detected between lib/theme and styles/globals.css:');
    for (const problem of problems) {
      console.error(`  - ${problem}`);
    }
    process.exit(1);
  }

  console.log(`Theme in sync: ${expected.size} tokens match the @theme projection.`);
}

main();
