/*
 * AlDaftar — restore from a backup produced by scripts/backup.mjs.
 *
 * WHY: a backup you cannot restore is not a backup. This re-inserts every table
 * and re-uploads every attachment binary into the configured Supabase project.
 * Idempotent: rows upsert by id, so re-running never duplicates; the audit
 * table is INSERT-only (ignoreDuplicates) to honour its append-only rule.
 * Disaster recovery: create a new project, apply migrations 0001→0003, run
 * `npm run admin:create`, then run this against the latest backup.
 *
 * Usage:   npm run restore -- backups/<timestamp>
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. The
 * service-role key bypasses RLS so restore works before the admin signs in.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative, sep } from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnvLocal() {
  const vars = {};
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const match = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim());
      if (match) {
        vars[match[1]] = match[2].replace(/^["']|["']$/g, '');
      }
    }
  } catch {
    /* fall back to process.env */
  }
  return vars;
}

const fileEnv = loadEnvLocal();
const env = (name) => process.env[name] ?? fileEnv[name] ?? '';

const url = env('NEXT_PUBLIC_SUPABASE_URL');
const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
if (!url || !serviceKey) {
  console.error('FAIL: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}

const backupArg = process.argv[2];
if (!backupArg) {
  console.error('Usage: npm run restore -- <backup-dir>   (e.g. backups/2026-07-05T...)');
  process.exit(1);
}
const dir = resolve(process.cwd(), backupArg);
if (!existsSync(join(dir, 'manifest.json'))) {
  console.error(`FAIL: no manifest.json in '${dir}' — not a backup folder.`);
  process.exit(1);
}

// Restore order is irrelevant (no DB foreign keys); audit is append-only.
const TABLES = [
  'suppliers',
  'categories',
  'units',
  'currencies',
  'products',
  'purchases',
  'purchase_returns',
  'payments',
  'attachments',
  'audit',
  'settings',
];
const BUCKET = 'attachments';
const CHUNK = 500;

const client = createClient(url, serviceKey, { auth: { persistSession: false } });

for (const table of TABLES) {
  const file = join(dir, `${table}.json`);
  if (!existsSync(file)) {
    console.error(`  WARN ${table}: missing in backup, skipped.`);
    continue;
  }
  const rows = JSON.parse(readFileSync(file, 'utf8'));
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await client
      .from(table)
      .upsert(chunk, { onConflict: 'id', ignoreDuplicates: table === 'audit' });
    if (error) {
      console.error(`FAIL restore '${table}': ${error.message}`);
      process.exit(2);
    }
  }
  console.log(`  table ${table}: ${rows.length}`);
}

// Attachment binaries: walk backup/storage and re-upload each to its key.
function walk(root) {
  const out = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!existsSync(current)) {
      continue;
    }
    for (const entry of readdirSync(current)) {
      const full = join(current, entry);
      if (statSync(full).isDirectory()) {
        stack.push(full);
      } else {
        out.push(full);
      }
    }
  }
  return out;
}

const storageRoot = join(dir, 'storage');
let uploaded = 0;
const failed = [];
for (const file of walk(storageRoot)) {
  const key = relative(storageRoot, file).split(sep).join('/');
  const { error } = await client.storage
    .from(BUCKET)
    .upload(key, readFileSync(file), { upsert: true });
  if (error) {
    failed.push(key);
    console.error(`  WARN file ${key}: ${error.message}`);
  } else {
    uploaded += 1;
  }
}

console.log(`\nRestore complete from ${dir}`);
console.log(`  ${uploaded} files uploaded.`);
if (failed.length > 0) {
  console.error(`  ${failed.length} files FAILED.`);
  process.exit(2);
}
