// Application-level composition: providers, navigation config, shell frame,
// and the navigation-system utilities (route registry + breadcrumb builder).

export { AppProviders } from './app-providers';
export { AppShellFrame } from './app-shell-frame';
export { BrandMark, type BrandMarkProps } from './brand-mark';
export { AuthGate } from './auth-gate';
export { APP_BRAND, navigationGroups } from './navigation';
export {
  ROUTE_ACTION_LABEL,
  getRouteTitle,
  isRouteActionSegment,
  matchTopLevelRoute,
  pathSegments,
  type RouteActionSegment,
  type RouteEntry,
} from './routes';
export { buildBreadcrumbs, type BuildBreadcrumbsOptions } from './breadcrumbs';
export { PageLayout, type PageLayoutProps } from './page-layout';
export { DensityControl } from './density-control';
export { recentRow } from './recent-row-store';
export { useShortcut } from './use-shortcut';
export { type ShortcutAction } from './shortcut-registry';
export { focusMode } from './focus-store';
export { FocusToggle } from './focus-toggle';
export { notifications, unreadCount, type AppNotification } from './notifications-store';
export { backupStore, backupAgo, LAST_BACKUP_KEY } from './backup-store';
