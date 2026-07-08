import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * GET /api/backup — server-side backup export (Visual Identity #21).
 *
 * The full-export path needs the service-role key, which must NEVER reach the
 * browser (it bypasses RLS). So it runs here, on the server:
 *   1. Verify the caller is the signed-in administrator — the client sends its
 *      Supabase access token as a Bearer header (sessions are localStorage-based,
 *      not cookies), which we validate before touching any data.
 *   2. Read every table with the service role and stream one JSON file back as a
 *      download. Attachment BINARIES are not bundled here (that needs the CLI
 *      `npm run backup`); the JSON carries the complete relational ledger,
 *      including the append-only audit trail.
 *
 * Export only — there is deliberately no restore endpoint (restore overwrites
 * live data; kept to the CLI for safety, per the approved scope).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
] as const;

const PAGE = 1000;

export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    return NextResponse.json(
      { error: 'خدمة النسخ الاحتياطي غير مُهيّأة على الخادم.' },
      { status: 500 },
    );
  }

  // 1. Authorize — validate the admin's bearer token before any data access.
  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return NextResponse.json({ error: 'مطلوب تسجيل الدخول.' }, { status: 401 });
  }
  const verifier = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await verifier.auth.getUser(token);
  if (userError || !userData?.user) {
    return NextResponse.json({ error: 'جلسة غير صالحة — سجّل الدخول من جديد.' }, { status: 401 });
  }

  // 2. Read everything with the service role (bypasses RLS; server-only).
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const tables: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};
  for (const table of TABLES) {
    const rows: unknown[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await admin
        .from(table)
        .select('*')
        .range(from, from + PAGE - 1);
      if (error) {
        return NextResponse.json(
          { error: `تعذّر قراءة الجدول «${table}»: ${error.message}` },
          { status: 500 },
        );
      }
      const page = data ?? [];
      rows.push(...page);
      if (page.length < PAGE) {
        break;
      }
    }
    tables[table] = rows;
    counts[table] = rows.length;
  }

  const createdAt = new Date().toISOString();
  const payload = {
    app: 'AlDaftar',
    kind: 'backup',
    createdAt,
    schema: '0001+0002+0003+0004',
    note: 'نسخة كاملة للسجلات العلائقية (تشمل سجل التدقيق). الملفات الثنائية للمرفقات تُصدَّر عبر أمر: npm run backup.',
    counts,
    tables,
  };
  const body = JSON.stringify(payload, null, 2);
  const stamp = createdAt.replace(/[:.]/g, '-');

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="aldaftar-backup-${stamp}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
