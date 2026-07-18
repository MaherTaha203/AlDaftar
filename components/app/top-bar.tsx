'use client';

import { useRouter } from 'next/navigation';
import { useState, useSyncExternalStore } from 'react';
import {
  BellIcon,
  Dialog,
  DownloadIcon,
  GearIcon,
  HelpIcon,
  PlusIcon,
  SearchIcon,
  UserIcon,
  Menu,
  cn,
} from '../ui';
import { backupStore, backupAgo } from './backup-store';
import { commandPalette, shortcutGuide } from './overlay-store';
import { notifications, unreadCount, type NotificationKind } from './notifications-store';

/**
 * Top-bar controls (Visual Identity #1) — the redesigned header cluster. Every
 * control is wired to something real: the search and quick-create open the
 * existing command palette / create routes, help opens the shortcuts guide,
 * notifications reflect the honest event log, the System Center gathers the
 * system utilities, and the user menu carries the single-administrator
 * identity. Nothing here is decorative.
 */

/** Global search — opens the command palette (Ctrl+K). Fills the header center. */
export function GlobalSearch() {
  return (
    <button
      type="button"
      onClick={() => commandPalette.open()}
      className={cn(
        'flex h-9 w-full items-center gap-sm rounded-lg border border-neutral-300 bg-white/70 px-md',
        'text-sm text-neutral-400 transition-colors hover:border-neutral-400/80 hover:bg-white',
        'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary',
      )}
    >
      <SearchIcon width={15} height={15} className="shrink-0" />
      <span className="truncate">ابحث عن مستند، مورد، منتج…</span>
      {/* Keyboard hint is meaningless on touch — hide it on phones. */}
      <kbd
        dir="ltr"
        className="ms-auto rounded-md border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 text-[10.5px] font-medium tabular-nums text-neutral-400 max-md:hidden"
      >
        Ctrl K
      </kbd>
    </button>
  );
}

/** Quick create — the create actions from the palette, one click away. */
export function QuickCreate() {
  const router = useRouter();
  return (
    <Menu
      label="إنشاء سريع"
      trigger={<PlusIcon />}
      items={[
        {
          key: 'purchase',
          label: 'فاتورة شراء جديدة',
          onSelect: () => router.push('/purchases/new'),
        },
        {
          key: 'return',
          label: 'مرتجع شراء جديد',
          onSelect: () => router.push('/purchase-returns/new'),
        },
        { key: 'payment', label: 'دفعة جديدة', onSelect: () => router.push('/payments/new') },
        { key: 'supplier', label: 'مورد جديد', onSelect: () => router.push('/suppliers/new') },
      ]}
    />
  );
}

/** Help — opens the keyboard-shortcuts guide. */
export function HelpButton() {
  return (
    <button
      type="button"
      aria-label="مساعدة واختصارات"
      title="مساعدة واختصارات"
      onClick={() => shortcutGuide.open()}
      className="inline-flex size-9 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <HelpIcon width={17} height={17} />
    </button>
  );
}

const KIND_ICON: Record<NotificationKind, string> = {
  error: 'var(--color-danger)',
  warning: 'var(--color-warning)',
  success: 'var(--color-success)',
  info: 'var(--color-primary)',
};

/** Notifications — the honest event log; badge shows the unread count. */
export function NotificationsBell() {
  const list = useSyncExternalStore(
    notifications.subscribe,
    notifications.getSnapshot,
    notifications.getServerSnapshot,
  );
  const count = unreadCount(list);
  const items =
    list.length === 0
      ? [{ key: 'empty', label: 'لا تنبيهات', onSelect: () => {}, disabled: true }]
      : [
          ...list.map((item) => ({
            key: item.id,
            label: item.title,
            icon: (
              <span
                aria-hidden="true"
                className="inline-block size-2 rounded-full"
                style={{ background: KIND_ICON[item.kind] }}
              />
            ),
            onSelect: () => {},
          })),
          { key: 'read', label: 'تحديد الكل كمقروء', onSelect: () => notifications.markAllRead() },
        ];
  return (
    <span className="relative inline-flex">
      <Menu label="التنبيهات" trigger={<BellIcon width={17} height={17} />} items={items} />
      {count > 0 ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute end-1 top-1 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white tabular-nums"
          style={{ height: '16px' }}
        >
          {count}
        </span>
      ) : null}
    </span>
  );
}

/** System Center — the copper utility hub: activity log, backup, about. */
export function SystemCenter() {
  const router = useRouter();
  const [aboutOpen, setAboutOpen] = useState(false);
  return (
    <>
      <Menu
        label="مركز النظام"
        trigger={<GearIcon width={16} height={16} />}
        triggerClassName="text-white bg-[linear-gradient(160deg,var(--color-copper),color-mix(in_srgb,var(--color-copper)_72%,#000))] shadow-sm hover:text-white hover:brightness-105"
        items={[
          { key: 'audit', label: 'سجل العمليات', onSelect: () => router.push('/audit-log') },
          { key: 'backup', label: 'النسخ الاحتياطي', onSelect: () => router.push('/settings') },
          { key: 'settings', label: 'الإعدادات', onSelect: () => router.push('/settings') },
          { key: 'about', label: 'حول التطبيق', onSelect: () => setAboutOpen(true) },
        ]}
      />
      <Dialog open={aboutOpen} onClose={() => setAboutOpen(false)} title="حول الدفتر" size="sm">
        <div className="flex flex-col gap-sm text-sm">
          <p className="font-semibold">الدفتر — نظام مشتريات ومحاسبة للمورّدين</p>
          <p className="text-neutral-500">
            دفتر مالي عربي واحد المستخدم: مشتريات، مرتجعات، مدفوعات، وأرصدة الموردين — بأثر تدقيق
            غير قابل للتعديل.
          </p>
          <dl className="mt-sm grid grid-cols-[auto_1fr] gap-x-lg gap-y-1 text-neutral-500">
            <dt>الإصدار</dt>
            <dd className="tabular-nums text-neutral-600">١٫٠٫٠</dd>
            <dt>الهوية</dt>
            <dd className="text-neutral-600">الزمرّدي الملكي</dd>
          </dl>
        </div>
      </Dialog>
    </>
  );
}

/** Backup status — reflects the real last download; opens the Backup Center. */
export function BackupStatus() {
  const router = useRouter();
  const last = useSyncExternalStore(
    backupStore.subscribe,
    backupStore.getSnapshot,
    backupStore.getServerSnapshot,
  );
  return (
    <button
      type="button"
      onClick={() => router.push('/settings')}
      title="النسخ الاحتياطي — آخر نسخة"
      className={cn(
        'inline-flex h-8 items-center gap-2 rounded-full border border-neutral-200 bg-white px-3',
        'text-xs text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-700',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        'max-lg:hidden',
      )}
    >
      <DownloadIcon width={13} height={13} className={last ? 'text-success' : 'text-neutral-400'} />
      <span className="tabular-nums">{backupAgo(last, Date.now())}</span>
    </button>
  );
}

/** User menu — the single-administrator identity + quick links. */
export function UserMenu() {
  const router = useRouter();
  return (
    <Menu
      label="حساب المدير"
      trigger={<UserIcon width={17} height={17} />}
      items={[
        { key: 'who', label: 'المدير', onSelect: () => {}, disabled: true },
        {
          key: 'shortcuts',
          label: 'اختصارات لوحة المفاتيح',
          onSelect: () => shortcutGuide.open(),
        },
        { key: 'settings', label: 'الإعدادات', onSelect: () => router.push('/settings') },
      ]}
    />
  );
}
