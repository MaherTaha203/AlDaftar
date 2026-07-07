// Application-level composition: providers, navigation config, shell frame,
// and the navigation-system utilities (route registry + breadcrumb builder).

export { AppProviders } from './app-providers';
export { AppShellFrame } from './app-shell-frame';
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
