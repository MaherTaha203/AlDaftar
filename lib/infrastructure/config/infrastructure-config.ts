import { env, isProd } from '@/lib/config/environment';
import { deepFreeze } from '@/lib/core';

/*
 * Centralized infrastructure configuration.
 *
 * The single place where infrastructure modules obtain their settings. Values
 * are sourced exclusively from the centralized environment module (DL-003) —
 * no infrastructure code reads process.env directly.
 */

export interface DatabaseConfig {
  readonly url: string;
  readonly anonKey: string;
}

export interface TelemetryConfig {
  /** Master switch for metric emission. */
  readonly enabled: boolean;
  /** Emit fine-grained debug metrics (off in production). */
  readonly verbose: boolean;
}

export interface InfrastructureConfig {
  readonly database: DatabaseConfig;
  readonly telemetry: TelemetryConfig;
}

export const infrastructureConfig: InfrastructureConfig = deepFreeze({
  database: {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  telemetry: {
    enabled: true,
    verbose: !isProd,
  },
});
