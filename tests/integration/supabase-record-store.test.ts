import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, describe, expect, it } from 'vitest';
import { SupabaseRecordStore, collectionToTable } from '@/lib/modules/shared/supabase-record-store';
import type { StoredRecord } from '@/lib/modules/shared/local-record-store';

/**
 * LIVE integration test of the exact adapter the app uses (SupabaseRecordStore)
 * against the real project schema — CRUD parity, camelCase columns, jsonb
 * lines, numeric round-trip, and error mapping. Uses the SERVICE-ROLE key so
 * adapter parity stays independent of the RLS mode (post-0002, the anon key
 * is deliberately blocked; in the app the adapter runs with the signed-in
 * administrator's JWT instead). Runs only when `.env.local` provides the
 * service key; skips cleanly in CI. All rows use 'verify-' ids and are
 * removed afterwards.
 */
function loadEnv(): { url: string; serviceKey: string } | null {
  const fromProcess = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  };
  if (fromProcess.url && fromProcess.serviceKey && !fromProcess.url.includes('placeholder')) {
    return fromProcess;
  }
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
    const vars: Record<string, string> = {};
    for (const line of raw.split(/\r?\n/)) {
      const match = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim());
      if (match) {
        vars[match[1]] = match[2];
      }
    }
    if (vars.NEXT_PUBLIC_SUPABASE_URL && vars.SUPABASE_SERVICE_ROLE_KEY) {
      return { url: vars.NEXT_PUBLIC_SUPABASE_URL, serviceKey: vars.SUPABASE_SERVICE_ROLE_KEY };
    }
  } catch {
    /* no .env.local — skip */
  }
  return null;
}

const env = loadEnv();
const run = Date.now();

interface TestSupplier extends StoredRecord {
  readonly name: string;
  readonly status: string;
  readonly phone: string;
  readonly address: string;
  readonly taxReference: string;
  readonly notes: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

describe.skipIf(env === null)('SupabaseRecordStore (live)', () => {
  const client: SupabaseClient = createClient(env?.url ?? 'http://x', env?.serviceKey ?? 'x', {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const createdIds: { table: string; id: string }[] = [];

  afterAll(async () => {
    for (const { table, id } of createdIds) {
      await client.from(table).delete().eq('id', id);
    }
  });

  it('maps collection names to tables', () => {
    expect(collectionToTable('aldaftar.suppliers')).toBe('suppliers');
    expect(collectionToTable('aldaftar.purchase-returns')).toBe('purchase_returns');
  });

  it('create → findById → update → findAll → remove round-trip (suppliers)', async () => {
    const store = new SupabaseRecordStore<TestSupplier>(client, 'aldaftar.suppliers');
    const id = `verify-${run}-supplier`;
    createdIds.push({ table: 'suppliers', id });
    const record: TestSupplier = {
      id,
      name: `مورد تحقق ${run}`,
      status: 'active',
      phone: '050',
      address: '',
      taxReference: '',
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const created = await store.create(record);
    expect(created.ok).toBe(true);

    const found = await store.findById(id);
    expect(found.ok && found.value?.name === record.name).toBe(true);

    const updated = await store.update(id, { phone: '059' });
    expect(updated.ok && updated.value.phone === '059').toBe(true);
    // update must never change the id or drop fields.
    expect(updated.ok && updated.value.id === id && updated.value.name === record.name).toBe(true);

    const all = await store.findAll();
    expect(all.ok && all.value.some((s) => s.id === id)).toBe(true);

    const removed = await store.remove(id);
    expect(removed.ok).toBe(true);
    const gone = await store.findById(id);
    expect(gone.ok && gone.value === null).toBe(true);
  });

  it('round-trips jsonb lines and numeric amounts with JS-number parity', async () => {
    interface TestPurchase extends StoredRecord {
      readonly number: number | null;
      readonly status: string;
      readonly supplierId: string;
      readonly date: string;
      readonly supplierInvoiceRef: string;
      readonly withoutSupplierInvoice: boolean;
      readonly notes: string;
      readonly lines: readonly {
        id: string;
        productId: string;
        unitId: string;
        quantity: number;
        unitPrice: number;
        notes: string;
      }[];
      readonly createdAt: string;
      readonly updatedAt: string;
      readonly postedAt: string | null;
    }
    const store = new SupabaseRecordStore<TestPurchase>(client, 'aldaftar.purchases');
    const id = `verify-${run}-purchase`;
    createdIds.push({ table: 'purchases', id });
    const created = await store.create({
      id,
      number: null,
      status: 'draft',
      supplierId: 'verify',
      date: '2026-07-05',
      supplierInvoiceRef: 'V',
      withoutSupplierInvoice: false,
      notes: '',
      lines: [{ id: 'l1', productId: 'p', unitId: 'u', quantity: 3, unitPrice: 12.34, notes: '' }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      postedAt: null,
    });
    expect(created.ok).toBe(true);
    if (created.ok) {
      expect(created.value.lines[0].unitPrice).toBe(12.34);
      expect(typeof created.value.lines[0].quantity).toBe('number');
      expect(created.value.postedAt).toBeNull();
    }
    await store.remove(id);
  });

  it('maps a missing record on update to a typed failure', async () => {
    const store = new SupabaseRecordStore<TestSupplier>(client, 'aldaftar.suppliers');
    const result = await store.update(`verify-${run}-missing`, { phone: 'x' });
    expect(result.ok).toBe(false);
  });
});
