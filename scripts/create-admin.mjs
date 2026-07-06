/*
 * One-time administrator account creation (single-user authentication).
 *
 * Creates THE single Supabase Auth account (owner decision 2026-07-05: one
 * administrator, email + password, no registration/reset/roles). Refuses to
 * run when ANY account already exists — the single-admin rule is enforced
 * here, not by a user-management UI (none exists by design).
 *
 * Usage:  node scripts/create-admin.mjs <email> <password>
 * Requires SUPABASE_SERVICE_ROLE_KEY (server-only) in .env.local or the env.
 * Prints no secret. Exit 0 = created; 1 = refused/failed.
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
const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
const [, , email, password] = process.argv;

if (!url || !serviceKey) {
  console.error('FAIL: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}
if (!email || !password) {
  console.error('Usage: node scripts/create-admin.mjs <email> <password>');
  process.exit(1);
}
if (password.length < 8) {
  console.error('FAIL: password must be at least 8 characters.');
  process.exit(1);
}

const client = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data: existing, error: listError } = await client.auth.admin.listUsers();
if (listError) {
  console.error(`FAIL: could not check existing accounts: ${listError.message}`);
  process.exit(1);
}
if (existing.users.length > 0) {
  console.error(
    `REFUSED: ${existing.users.length} account(s) already exist — the system allows exactly one administrator. ` +
      'Manage the existing account in the Supabase dashboard.',
  );
  process.exit(1);
}

const { data, error } = await client.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (error) {
  console.error(`FAIL: ${error.message}`);
  process.exit(1);
}
console.log(`OK: administrator account created (${data.user.email}). You can sign in at /login.`);
