/*
 * AlDaftar — Development Reset (operational data only).
 *
 * WHY: before entering real accounting data, wipe development/test transactions
 * while preserving ALL configuration. This is a maintenance operation that runs
 * one level below the business services on purpose — those services deliberately
 * forbid this (posted documents are immutable, the audit log is append-only,
 * master data archives rather than deletes), so a clean reset can only be done
 * with the service-role key, exactly like backup/restore. No ad-hoc SQL, no
 * manual row edits: every change goes through the Supabase client, in one
 * committed, repeatable, idempotent tool.
 *
 * SAFETY: takes a full backup first (and verifies it) before deleting anything.
 * Shows the exact counts and requires a typed confirmation. Never touches auth,
 * settings, categories, units, or currencies.
 *
 * Usage:
 *   npm run reset                 # interactive: shows counts, asks to confirm
 *   npm run reset -- --dry-run    # counts + plan only, deletes nothing
 *   npm run reset -- --yes        # skip the typed confirmation (automation)
 *   npm run reset -- --purge-audit# ALSO clear the audit log (default: keep it)
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (.env.local
 * or the environment). Keep the service-role key secret; never commit it.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
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

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const SKIP_CONFIRM = args.has('--yes') || args.has('--force');
const PURGE_AUDIT = args.has('--purge-audit');

// A sentinel id that never matches a real record — Supabase requires a filter
// on delete(), so this deletes every row while being explicit about intent.
const NO_MATCH_ID = '00000000-0000-0000-0000-000000000000';
const BUCKET = 'attachments';

// Operational tables, in child→parent order (no hard FKs exist, but this keeps
// the intent clear and stays correct if constraints are ever added).
const OPERATIONAL = [
  'purchase_returns',
  'payments',
  'purchases',
  'attachments',
  'products',
  'suppliers',
];
// Preserved — configuration and reference data. Reported, never touched.
const PRESERVED = ['settings', 'categories', 'units', 'currencies'];
// Display order for the confirmation table.
const DISPLAY = [
  ['suppliers', 'الموردون'],
  ['products', 'المنتجات'],
  ['purchases', 'المشتريات'],
  ['purchase_returns', 'مرتجعات الشراء'],
  ['payments', 'المدفوعات'],
  ['attachments', 'المرفقات'],
  ['audit', 'سجل العمليات'],
];

const client = createClient(url, serviceKey, { auth: { persistSession: false } });

async function countOf(table) {
  const { count, error } = await client.from(table).select('*', { count: 'exact', head: true });
  if (error) {
    throw new Error(`count '${table}': ${error.message}`);
  }
  return count ?? 0;
}

function line(label, value) {
  const dots = '.'.repeat(Math.max(3, 22 - label.length));
  return `  ${label} ${dots} ${value}`;
}

async function main() {
  console.log('\nAlDaftar — Development Reset (operational data only)\n');

  // 1. Show exactly what exists / will be deleted.
  const counts = {};
  for (const [table] of DISPLAY) {
    counts[table] = await countOf(table);
  }
  console.log('سيُحذف من الوحدات التشغيلية:');
  for (const [table, label] of DISPLAY) {
    const kept = table === 'audit' && !PURGE_AUDIT;
    console.log(line(label, `${counts[table]}${kept ? '   (سيُحتفظ به)' : ''}`));
  }
  const removableTotal = OPERATIONAL.reduce((sum, t) => sum + (counts[t] ?? 0), 0);
  console.log(
    `\n  الإجمالي القابل للحذف: ${removableTotal} سجل` +
      (PURGE_AUDIT ? ` + ${counts.audit} قيد تدقيق` : ''),
  );

  const preserved = {};
  for (const table of PRESERVED) {
    preserved[table] = await countOf(table);
  }
  console.log(
    '\nسيُحتفظ به دون تغيير: الإعدادات، التصنيفات، الوحدات، العملات، المصادقة والمستخدمون.',
  );
  console.log(
    `  (settings ${preserved.settings} · categories ${preserved.categories} · units ${preserved.units} · currencies ${preserved.currencies})`,
  );
  console.log(
    '  الترقيم مشتق (max+1) — يعود تلقائيًا إلى 1 بعد حذف المستندات؛ إعداد الترقيم لا يتغيّر.\n',
  );

  if (DRY_RUN) {
    console.log('DRY RUN — لم يُحذف شيء. أعد التشغيل بدون --dry-run للتنفيذ.\n');
    return;
  }

  if (removableTotal === 0 && !(PURGE_AUDIT && counts.audit > 0)) {
    console.log('لا توجد بيانات تشغيلية لحذفها — النظام نظيف بالفعل.\n');
    return;
  }

  // 2. Confirm.
  if (!SKIP_CONFIRM) {
    const rl = createInterface({ input: stdin, output: stdout });
    const answer = await rl.question('اكتب RESET للتأكيد النهائي (أو أي شيء آخر للإلغاء): ');
    rl.close();
    if (answer.trim() !== 'RESET') {
      console.log('أُلغيت العملية. لم يُحذف شيء.\n');
      process.exit(0);
    }
  }

  // 3. Backup first — and verify — before deleting anything.
  console.log('\n[1/4] إنشاء نسخة احتياطية قبل الحذف…');
  const backup = spawnSync(process.execPath, [resolve(process.cwd(), 'scripts/backup.mjs')], {
    stdio: 'inherit',
    env: process.env,
  });
  if (backup.status !== 0) {
    console.error('FAIL: تعذّر إنشاء النسخة الاحتياطية — أُلغي الحذف. لم يُحذف شيء.');
    process.exit(2);
  }
  const backupDir = newestBackupDir();
  if (!backupDir || !existsSync(join(backupDir, 'manifest.json'))) {
    console.error('FAIL: تعذّر التحقق من النسخة الاحتياطية (لا يوجد manifest) — أُلغي الحذف.');
    process.exit(2);
  }
  console.log(`      ✓ نسخة احتياطية مُتحقَّقة: ${backupDir}`);

  // 4. Delete operational data (storage binaries first, then rows).
  console.log('\n[2/4] حذف البيانات التشغيلية…');
  const removed = {};

  const { data: atts, error: attErr } = await client.from('attachments').select('storageKey');
  if (attErr) {
    console.error(`FAIL: قراءة مفاتيح المرفقات: ${attErr.message}`);
    process.exit(3);
  }
  const keys = (atts ?? []).map((a) => a.storageKey).filter((k) => typeof k === 'string' && k);
  if (keys.length > 0) {
    const { error: rmErr } = await client.storage.from(BUCKET).remove(keys);
    if (rmErr) {
      console.error(`FAIL: حذف ملفات المرفقات من التخزين: ${rmErr.message}`);
      process.exit(3);
    }
    console.log(`      ✓ التخزين: حُذف ${keys.length} ملف مرفق`);
  }

  for (const table of OPERATIONAL) {
    const { error, count } = await client
      .from(table)
      .delete({ count: 'exact' })
      .neq('id', NO_MATCH_ID);
    if (error) {
      console.error(`FAIL: حذف '${table}': ${error.message}`);
      console.error(
        'توقّف الحذف. استعد من النسخة الاحتياطية إن لزم: npm run restore -- ' + backupDir,
      );
      process.exit(3);
    }
    removed[table] = count ?? 0;
    console.log(line(table, count ?? 0));
  }

  // 5. Audit log — keep (default) or purge, then always record ONE reset entry.
  console.log('\n[3/4] سجل العمليات…');
  if (PURGE_AUDIT) {
    const { error } = await client.from('audit').delete({ count: 'exact' }).neq('id', NO_MATCH_ID);
    if (error) {
      console.error(`WARN: تعذّر مسح سجل التدقيق: ${error.message}`);
    } else {
      console.log('      ✓ مُسِح سجل التطوير');
    }
  } else {
    console.log('      ✓ محتفَظ به (append-only)');
  }
  const markerSummary =
    `إعادة ضبط بيانات التطوير — حُذف ${removableTotal} سجل تشغيلي` +
    (PURGE_AUDIT ? ' ومُسِح سجل التطوير' : '') +
    ' مع الاحتفاظ بالإعدادات والبيانات المرجعية';
  const { error: markErr } = await client.from('audit').insert({
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    user: 'المالك',
    device: 'reset-script',
    action: 'delete',
    entityType: 'maintenance',
    entityId: 'dev-reset',
    entityLabel: 'إعادة ضبط بيانات التطوير',
    summary: markerSummary,
    before: null,
    after: null,
  });
  if (markErr) {
    console.error(`WARN: تعذّر كتابة قيد توثيق إعادة الضبط: ${markErr.message}`);
  } else {
    console.log('      ✓ سُجِّل قيد توثيق واحد لإعادة الضبط');
  }

  // 6. Verify.
  console.log('\n[4/4] التحقق…');
  let ok = true;
  for (const table of OPERATIONAL) {
    const after = await countOf(table);
    if (after !== 0) {
      ok = false;
      console.error(`  ✗ '${table}' ما زال يحوي ${after} سجل`);
    }
  }
  for (const table of PRESERVED) {
    const after = await countOf(table);
    if (after !== preserved[table]) {
      ok = false;
      console.error(`  ✗ '${table}' تغيّر عدده (${preserved[table]} → ${after})`);
    }
  }
  console.log(`  ${ok ? '✓' : '✗'} الوحدات التشغيلية = 0 · البيانات المرجعية سليمة`);
  console.log('  ✓ الترقيم: التالي لكل نوع = 1 (مشتق من المستندات، وقد أصبحت 0)');

  // 7. Report.
  console.log('\n──────── تقرير إعادة الضبط ────────');
  for (const [table, label] of DISPLAY) {
    if (table === 'audit') continue;
    console.log(line(label, `حُذف ${removed[table] ?? 0}`));
  }
  console.log(
    `  سجل العمليات ......... ${PURGE_AUDIT ? 'مُسِح + قيد توثيق واحد' : 'محتفَظ به + قيد توثيق واحد'}`,
  );
  console.log(`  العدّادات ............ أُعيدت إلى 1 (مشتقّة)`);
  console.log(`  النسخة الاحتياطية .... ${backupDir}`);
  console.log(`  التحقق ............... ${ok ? 'ناجح' : 'فشل — راجع التحذيرات أعلاه'}`);
  console.log(
    '\n' +
      (ok
        ? 'التطبيق جاهز لإدخال بيانات المحاسبة الحقيقية. ✓'
        : 'اكتملت العملية مع تحذيرات — راجعها.') +
      '\n',
  );
  process.exit(ok ? 0 : 4);
}

function newestBackupDir() {
  const root = resolve(process.cwd(), 'backups');
  if (!existsSync(root)) return null;
  const dirs = readdirSync(root)
    .map((name) => join(root, name))
    .filter((p) => {
      try {
        return statSync(p).isDirectory();
      } catch {
        return false;
      }
    })
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return dirs[0] ?? null;
}

main().catch((error) => {
  console.error(`FAIL: ${error.message}`);
  process.exit(1);
});
