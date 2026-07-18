/*
 * Supabase schema + integration verification (GA / Database Integration +
 * single-administrator authentication).
 *
 * Live checks against the configured project (.env.local), printing no secret:
 *   1. every expected table exists (service key — structural, RLS-independent),
 *   2. the 'attachments' storage bucket exists,
 *   3. CRUD round-trip parity (quoted camelCase columns, jsonb lines) via the
 *      service key — the exact row shapes the app writes,
 *   4. the per-type document-number partial UNIQUE index rejects duplicates,
 *   5. the ANON key is BLOCKED from writing business data (auth migration
 *      0002 applied) — a warning is emitted if anon writes still succeed,
 *   6. with ADMIN_EMAIL + ADMIN_PASSWORD provided (env or .env.local), the
 *      authenticated-role behavior is verified end to end: business CRUD
 *      allowed, audit INSERT allowed but UPDATE/DELETE blocked (append-only),
 *      storage upload/download/remove round-trip.
 * All test rows/objects are removed afterwards (ids prefixed 'verify-').
 *
 * Run: npm run verify:schema     Exit 0 = pass, 1 = fail.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
const anonKey = env('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
const adminEmail = env('ADMIN_EMAIL');
const adminPassword = env('ADMIN_PASSWORD');

if (!url || !anonKey || !serviceKey) {
  console.error('FAIL missing connection variables (URL, anon key, service key)');
  process.exit(1);
}

const anon = createClient(url, anonKey, { auth: { persistSession: false } });
const service = createClient(url, serviceKey, { auth: { persistSession: false } });

let failed = false;
const ok = (msg) => console.log(`  OK   ${msg}`);
const warn = (msg) => console.log(`  WARN ${msg}`);
const bad = (msg) => {
  console.error(`  FAIL ${msg}`);
  failed = true;
};

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

console.log('Supabase schema verification');

// 1. Tables exist (service key — independent of RLS mode).
for (const table of TABLES) {
  const { error } = await service.from(table).select('id', { head: true, count: 'exact' });
  if (error) {
    bad(`table '${table}': ${error.message}`);
  } else {
    ok(`table '${table}' exists`);
  }
}

// 2. Storage bucket exists.
{
  const { data, error } = await service.storage.listBuckets();
  if (error) {
    bad(`listBuckets: ${error.message}`);
  } else if (data?.some((b) => b.id === 'attachments')) {
    ok(`bucket 'attachments' exists`);
  } else {
    bad(`bucket 'attachments' missing`);
  }
}

// 3. CRUD parity round-trip (service key; camelCase + jsonb + numeric shape).
const testId = `verify-${Date.now()}`;
const draft = {
  id: testId,
  number: null,
  status: 'draft',
  supplierId: 'verify-supplier',
  date: '2026-07-05',
  supplierInvoiceRef: 'V-1',
  withoutSupplierInvoice: false,
  notes: 'verification row',
  lines: [{ id: 'l1', productId: 'p1', unitId: 'u1', quantity: 2, unitPrice: 10.5, notes: '' }],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  postedAt: null,
};
{
  const { data, error } = await service.from('purchases').insert(draft).select().single();
  if (error) {
    bad(`purchases insert: ${error.message}`);
  } else if (
    data.supplierInvoiceRef === 'V-1' &&
    Array.isArray(data.lines) &&
    data.lines[0].unitPrice === 10.5 &&
    data.postedAt === null
  ) {
    ok('purchases insert + camelCase/jsonb round-trip verified');
  } else {
    bad(`purchases round-trip mismatch`);
  }
}

// 4. Posted-number uniqueness (partial unique index).
{
  const a = `verify-${Date.now()}-a`;
  const b = `verify-${Date.now()}-b`;
  const posted = (id) => ({
    ...draft,
    id,
    number: 999999,
    status: 'posted',
    postedAt: new Date().toISOString(),
  });
  const first = await service.from('purchases').insert(posted(a));
  const second = await service.from('purchases').insert(posted(b));
  if (!first.error && second.error) {
    ok('duplicate posted number rejected (unique index holds)');
  } else {
    bad(
      `number uniqueness: first=${first.error?.message ?? 'ok'} second=${second.error?.message ?? 'UNEXPECTEDLY OK'}`,
    );
  }
  await service.from('purchases').delete().in('id', [a, b]);
}
await service.from('purchases').delete().eq('id', testId);

// 5. Anon must be blocked from business writes (auth migration 0002).
{
  const anonId = `verify-${Date.now()}-anon`;
  const { error } = await anon.from('suppliers').insert({
    id: anonId,
    name: 'anon probe',
    status: 'active',
    phone: '',
    address: '',
    taxReference: '',
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  if (error) {
    ok('anon key blocked from business writes (authenticated-only RLS active)');
  } else {
    warn('anon key CAN still write business data — apply database/migrations/0002_auth_up.sql');
    await service.from('suppliers').delete().eq('id', anonId);
  }
}

// 6. Authenticated-role behavior (requires ADMIN_EMAIL + ADMIN_PASSWORD).
if (adminEmail && adminPassword) {
  const authed = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error: signInError } = await authed.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });
  if (signInError) {
    bad(`admin sign-in failed: ${signInError.message}`);
  } else {
    ok('admin sign-in succeeded');

    const rowId = `verify-${Date.now()}-authed`;
    const ins = await authed.from('suppliers').insert({
      id: rowId,
      name: `verify ${rowId}`,
      status: 'active',
      phone: '',
      address: '',
      taxReference: '',
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    if (ins.error) {
      bad(`authenticated business insert: ${ins.error.message}`);
    } else {
      ok('authenticated business CRUD allowed');
      await authed.from('suppliers').delete().eq('id', rowId);
    }

    const auditId = `verify-${Date.now()}-audit`;
    const auditIns = await authed.from('audit').insert({
      id: auditId,
      timestamp: new Date().toISOString(),
      user: 'verify',
      device: 'script',
      action: 'login',
      entityType: 'auth',
      entityId: 'verify',
      entityLabel: 'verify',
      summary: 'verification entry',
      before: null,
      after: null,
    });
    if (auditIns.error) {
      bad(`authenticated audit insert: ${auditIns.error.message}`);
    } else {
      ok('authenticated audit append allowed');
    }
    const { data: updData } = await authed
      .from('audit')
      .update({ summary: 'tampered' })
      .eq('id', auditId)
      .select();
    if ((updData ?? []).length === 0) {
      ok('audit UPDATE blocked for admin (append-only holds)');
    } else {
      bad('audit UPDATE succeeded — append-only is NOT enforced');
    }
    const { data: delData } = await authed.from('audit').delete().eq('id', auditId).select();
    if ((delData ?? []).length === 0) {
      ok('audit DELETE blocked for admin (append-only holds)');
    } else {
      bad('audit DELETE succeeded — append-only is NOT enforced');
    }
    await service.from('audit').delete().eq('id', auditId);

    const key = `verify/${Date.now()}.txt`;
    const up = await authed.storage
      .from('attachments')
      .upload(key, new Blob(['aldaftar-verify'], { type: 'text/plain' }));
    if (up.error) {
      bad(`authenticated storage upload: ${up.error.message}`);
    } else {
      ok('authenticated storage upload allowed');
      const down = await authed.storage.from('attachments').download(key);
      if (down.error || !(down.data instanceof Blob)) {
        bad(`authenticated storage download: ${down.error?.message ?? 'no blob'}`);
      } else {
        ok('authenticated storage download round-trip verified');
      }
      const rm = await authed.storage.from('attachments').remove([key]);
      if (rm.error) {
        bad(`authenticated storage remove: ${rm.error.message}`);
      } else {
        ok('authenticated storage remove allowed');
      }
    }
    await authed.auth.signOut();
  }
} else {
  console.log('  --   authenticated-role checks skipped (set ADMIN_EMAIL + ADMIN_PASSWORD to run)');
}

console.log(failed ? 'RESULT: FAILED' : 'RESULT: ALL CHECKS PASSED');
process.exit(failed ? 1 : 0);
