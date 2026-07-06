/*
 * Supabase connectivity verification (GA Foundation phase).
 *
 * Verifies — without printing any secret — that:
 *   1. the required environment variables exist (.env.local or process env),
 *   2. the Supabase project URL is reachable,
 *   3. the anon key authenticates against the Auth health endpoint,
 *   4. the service-role key (if present) authenticates against PostgREST.
 *
 * Run: npm run verify:supabase
 * Exit code 0 = all checks passed; 1 = a check failed.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
    /* .env.local absent — fall back to process.env only */
  }
  return vars;
}

const fileEnv = loadEnvLocal();
const env = (name) => process.env[name] ?? fileEnv[name] ?? '';

const URL_VAR = 'NEXT_PUBLIC_SUPABASE_URL';
const ANON_VAR = 'NEXT_PUBLIC_SUPABASE_ANON_KEY';
const SERVICE_VAR = 'SUPABASE_SERVICE_ROLE_KEY';

let failed = false;
const ok = (msg) => console.log(`  OK   ${msg}`);
const bad = (msg) => {
  console.error(`  FAIL ${msg}`);
  failed = true;
};

console.log('Supabase connectivity verification');

// 1. Required variables present.
const url = env(URL_VAR);
const anonKey = env(ANON_VAR);
const serviceKey = env(SERVICE_VAR);
if (url) {
  ok(`${URL_VAR} present`);
} else {
  bad(`${URL_VAR} missing`);
}
if (anonKey) {
  ok(`${ANON_VAR} present`);
} else {
  bad(`${ANON_VAR} missing`);
}
if (serviceKey) {
  ok(`${SERVICE_VAR} present (server-only)`);
} else {
  console.log(`  --   ${SERVICE_VAR} not set (optional; needed for migrations)`);
}

if (!url || !anonKey) {
  console.error('Aborting: connection variables missing.');
  process.exit(1);
}

// 2 + 3. Reachability + anon-key auth (Auth health endpoint).
try {
  const res = await fetch(`${url}/auth/v1/health`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  });
  if (res.ok) {
    ok(`project reachable; anon key accepted (auth health ${res.status})`);
  } else {
    bad(`auth health returned ${res.status} — anon key rejected or project paused`);
  }
} catch (error) {
  bad(`project unreachable: ${error?.message ?? error}`);
}

// 4. Service-role key auth (PostgREST root; 200 expected with a valid key).
if (serviceKey) {
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    if (res.ok) {
      ok(`service-role key accepted (rest ${res.status})`);
    } else {
      bad(`rest returned ${res.status} — service-role key rejected`);
    }
  } catch (error) {
    bad(`rest endpoint unreachable: ${error?.message ?? error}`);
  }
}

console.log(failed ? 'RESULT: FAILED' : 'RESULT: ALL CHECKS PASSED');
process.exit(failed ? 1 : 0);
