/*
 * AlDaftar — full offline backup (database + attachment binaries).
 *
 * WHY: the ledger is the business. A single owner has no ops team, so recovery
 * must be one command. This writes EVERY table (paginated, so large tables are
 * never truncated) plus every attachment binary to a timestamped folder under
 * ./backups/, with a manifest of counts. Pair it with scripts/restore.mjs.
 *
 * Usage:   npm run backup
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (.env.local
 * or the environment). The service-role key bypasses RLS so the backup is
 * complete; keep it secret and never commit it. Backups contain full financial
 * data — store them encrypted/offline.
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { Buffer } from 'node:buffer';
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

// Table order is irrelevant for backup (no cross-table reads); listed for parity
// with the schema. 'audit' is included — the trail is part of the record.
const TABLES = [
  'suppliers',
  'categories',
  'units',
  'currencies',
  'products',
  'purchases',
  'purchase_returns',
  'payments',
  'custody',
  'custody_returns',
  'attachments',
  'audit',
  'settings',
];
const BUCKET = 'attachments';
const PAGE = 1000;

const client = createClient(url, serviceKey, { auth: { persistSession: false } });

async function fetchAll(table) {
  const all = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from(table)
      .select('*')
      .range(from, from + PAGE - 1);
    if (error) {
      throw new Error(`read '${table}': ${error.message}`);
    }
    const page = data ?? [];
    all.push(...page);
    if (page.length < PAGE) {
      break;
    }
  }
  return all;
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const dir = resolve(process.cwd(), 'backups', stamp);
mkdirSync(join(dir, 'storage'), { recursive: true });

const manifest = {
  createdAt: new Date().toISOString(),
  schema: '0001+0002+0003',
  tables: {},
  storage: { files: 0, failed: [] },
};

for (const table of TABLES) {
  const rows = await fetchAll(table);
  writeFileSync(join(dir, `${table}.json`), JSON.stringify(rows, null, 2));
  manifest.tables[table] = rows.length;
  console.log(`  table ${table}: ${rows.length}`);
}

// Attachment binaries: download each object referenced by an attachments row.
const attachments = JSON.parse(readFileSync(join(dir, 'attachments.json'), 'utf8'));
for (const row of attachments) {
  const key = row.storageKey;
  const { data, error } = await client.storage.from(BUCKET).download(key);
  if (error || !data) {
    manifest.storage.failed.push(key);
    console.error(`  WARN file ${key}: ${error ? error.message : 'no data'}`);
    continue;
  }
  const outPath = join(dir, 'storage', key);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, Buffer.from(await data.arrayBuffer()));
  manifest.storage.files += 1;
}

writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));

const totalRows = Object.values(manifest.tables).reduce((a, b) => a + b, 0);
console.log(`\nBackup complete → ${dir}`);
console.log(`  ${totalRows} rows, ${manifest.storage.files} files.`);
if (manifest.storage.failed.length > 0) {
  console.error(`  ${manifest.storage.failed.length} attachment binaries FAILED (see manifest).`);
  process.exit(2);
}
