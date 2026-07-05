// Application-level composition: providers, navigation config, shell frame,
// and the navigation-system utilities (route registry + breadcrumb builder).

export { AppProviders } from './app-providers';
export { AppShellFrame } from './app-shell-frame';
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
