import type { SidebarGroup } from '../layout';
import {
  ArchiveIcon,
  AuditLogIcon,
  CategoriesIcon,
  CurrenciesIcon,
  CustodyIcon,
  DashboardIcon,
  PaymentsIcon,
  ProductsIcon,
  PurchasesIcon,
  ReportsIcon,
  ReturnsIcon,
  SettingsIcon,
  SuppliersIcon,
  UnitsIcon,
} from './nav-icons';

/**
 * Application navigation configuration.
 *
 * The single source of truth for the sidebar, derived verbatim from the
 * approved design documents: the sidebar inventory in `02_Screen_Flow.md` §1
 * and the grouping in `03_UI_Specification.md` §2 (Overview · Documents ·
 * Master data · Archive · Insight · System). Routes match the design-level URL
 * structure in `02_Screen_Flow.md` §6.
 *
 * Pure data (no hooks, no side effects) so it can be unit-tested and consumed
 * by the server layout. Adding or moving a nav item is a documentation change
 * first (update the two design sections), then this file.
 */

/** App name shown in the sidebar brand slot. */
export const APP_BRAND = 'الدفتر';

export const navigationGroups: readonly SidebarGroup[] = [
  {
    label: 'عام',
    items: [{ label: 'لوحة التحكم', href: '/', icon: <DashboardIcon /> }],
  },
  {
    label: 'المستندات',
    items: [
      { label: 'المشتريات', href: '/purchases', icon: <PurchasesIcon /> },
      { label: 'مرتجعات الشراء', href: '/purchase-returns', icon: <ReturnsIcon /> },
      { label: 'المدفوعات', href: '/payments', icon: <PaymentsIcon /> },
      { label: 'سندات استلام البضاعة', href: '/custody', icon: <CustodyIcon /> },
    ],
  },
  {
    label: 'البيانات الأساسية',
    items: [
      { label: 'الموردون', href: '/suppliers', icon: <SuppliersIcon /> },
      { label: 'المنتجات', href: '/products', icon: <ProductsIcon /> },
      { label: 'التصنيفات', href: '/categories', icon: <CategoriesIcon /> },
      { label: 'الوحدات', href: '/units', icon: <UnitsIcon /> },
      { label: 'العملات', href: '/currencies', icon: <CurrenciesIcon /> },
    ],
  },
  {
    label: 'الأرشيف',
    items: [{ label: 'الأرشيف', href: '/attachments', icon: <ArchiveIcon /> }],
  },
  {
    label: 'المتابعة',
    items: [
      { label: 'التقارير', href: '/reports', icon: <ReportsIcon /> },
      { label: 'سجل العمليات', href: '/audit-log', icon: <AuditLogIcon /> },
    ],
  },
  {
    label: 'النظام',
    items: [{ label: 'الإعدادات', href: '/settings', icon: <SettingsIcon /> }],
  },
];
