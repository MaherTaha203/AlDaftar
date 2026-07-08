'use client';

import { useState, useSyncExternalStore } from 'react';
import { getSupabaseClient } from '@/lib/infrastructure';
import { backupStore, backupAgo, notifications } from '@/components/app';
import { Button, DownloadIcon, useToast } from '@/components/ui';

/**
 * BackupCenter (Visual Identity #21) — the in-app backup export. It calls the
 * server route (`/api/backup`), which holds the service-role key, and streams a
 * complete JSON of every table (including the append-only audit trail) to a
 * download. Records the real "last backup" time on success and never fails
 * silently. Export/download only — restore stays on the CLI by design.
 */
function filenameFrom(disposition: string | null): string | null {
  if (!disposition) return null;
  const match = /filename="?([^"]+)"?/.exec(disposition);
  return match ? match[1] : null;
}

export function BackupCenter() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const lastBackup = useSyncExternalStore(
    backupStore.subscribe,
    backupStore.getSnapshot,
    backupStore.getServerSnapshot,
  );

  async function handleDownload() {
    setBusy(true);
    try {
      const { data } = await getSupabaseClient().auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        throw new Error('الجلسة غير متاحة — سجّل الدخول من جديد.');
      }
      const response = await fetch('/api/backup', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const detail = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(detail.error ?? 'تعذّر إنشاء النسخة الاحتياطية.');
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download =
        filenameFrom(response.headers.get('content-disposition')) ?? 'aldaftar-backup.json';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);

      const iso = new Date().toISOString();
      backupStore.markNow(iso);
      notifications.push('success', 'تم إنشاء نسخة احتياطية وتنزيلها', new Date(iso).getTime());
      toast.show({ variant: 'success', message: 'تم إنشاء نسخة احتياطية وتنزيلها.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذّر إنشاء النسخة الاحتياطية.';
      notifications.push('error', `فشل النسخ الاحتياطي: ${message}`, Date.now());
      toast.show({ variant: 'error', message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-wrap items-center justify-between gap-md rounded-lg border border-neutral-200 bg-neutral-100/50 p-md">
        <div className="flex flex-col gap-xs">
          <span className="text-sm font-medium text-neutral-700">آخر نسخة احتياطية</span>
          <span className="text-sm text-neutral-500">
            {backupAgo(lastBackup, Date.now())}
            {lastBackup ? ' · من هذا الجهاز' : ''}
          </span>
        </div>
        <Button icon={<DownloadIcon />} loading={busy} onClick={() => void handleDownload()}>
          تنزيل نسخة احتياطية
        </Button>
      </div>
      <p className="text-xs text-neutral-400">
        النسخة ملف JSON كامل لكل السجلات (يشمل سجل التدقيق) — قابل للاستعادة عبر أمر{' '}
        <code dir="ltr" className="rounded bg-neutral-100 px-1 font-mono text-[11px]">
          npm run restore
        </code>
        . الملفات الثنائية للمرفقات تُصدَّر عبر أمر{' '}
        <code dir="ltr" className="rounded bg-neutral-100 px-1 font-mono text-[11px]">
          npm run backup
        </code>
        . الاستعادة داخل التطبيق غير مُفعّلة (إجراء هدّام — يبقى على سطر الأوامر بأمان).
      </p>
    </div>
  );
}
