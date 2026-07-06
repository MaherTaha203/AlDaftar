/*
 * Centralized environment validation.
 * This module performs minimal, framework-level validation only and throws
 * a clear error when required runtime variables are missing. No business logic.
 */

type Env = {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  /**
   * Server-only (never NEXT_PUBLIC): present in Node contexts that loaded
   * `.env.local` (scripts, server build); always undefined in the browser.
   * Optional — nothing in the application requires it; migration tooling does.
   */
  SUPABASE_SERVICE_ROLE_KEY: string | undefined;
  NODE_ENV: string;
};

const missing: string[] = [];

const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!NEXT_PUBLIC_SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL');

const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!NEXT_PUBLIC_SUPABASE_ANON_KEY) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');

const NODE_ENV = process.env.NODE_ENV || 'development';

if (missing.length) {
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}. See .env.example and project documentation.`,
  );
}

export const env: Env = {
  NEXT_PUBLIC_SUPABASE_URL: NEXT_PUBLIC_SUPABASE_URL as string,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NODE_ENV,
};

export const isProd = env.NODE_ENV === 'production';
