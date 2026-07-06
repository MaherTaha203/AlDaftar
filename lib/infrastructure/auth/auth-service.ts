import { failure, success, ErrorFactory, type AsyncResult } from '@/lib/core';
import { getSupabaseClient } from '../database/connection-factory';

/**
 * Authentication boundary — single-administrator model (owner decision,
 * 2026-07-05): exactly one Supabase Auth account, email + password, no
 * registration, no reset UI, no roles. Sessions persist in the browser
 * ("remember me"): the administrator stays signed in on their device until
 * they explicitly sign out (the client is configured with persistSession +
 * autoRefreshToken).
 *
 * Infrastructure only — knows nothing about screens or business modules.
 * Route protection lives in the app layer (AuthGate); data protection lives
 * in RLS (migration 0002: authenticated-only policies), which holds even if
 * the client gate were bypassed.
 */
export interface AuthUser {
  readonly email: string;
}

export async function signIn(email: string, password: string): AsyncResult<AuthUser> {
  try {
    const { data, error } = await getSupabaseClient().auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.user) {
      return failure(
        ErrorFactory.validation('Sign-in failed: invalid credentials', {
          status: error?.status,
        }),
      );
    }
    return success({ email: data.user.email ?? email });
  } catch (error) {
    return failure(ErrorFactory.fromUnknown(error, 'Sign-in failed'));
  }
}

export async function signOut(): AsyncResult<void> {
  try {
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) {
      return failure(ErrorFactory.fromUnknown(error, 'Sign-out failed'));
    }
    return success(undefined);
  } catch (error) {
    return failure(ErrorFactory.fromUnknown(error, 'Sign-out failed'));
  }
}

/** The signed-in administrator, or null when no session exists. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { data } = await getSupabaseClient().auth.getSession();
    const email = data.session?.user.email;
    return email ? { email } : null;
  } catch {
    return null;
  }
}

/**
 * Subscribes to sign-in/sign-out transitions; returns the unsubscribe
 * function. The callback receives the current user (null after sign-out).
 */
export function onAuthChange(callback: (user: AuthUser | null) => void): () => void {
  const { data } = getSupabaseClient().auth.onAuthStateChange((_event, session) => {
    const email = session?.user.email;
    callback(email ? { email } : null);
  });
  return () => data.subscription.unsubscribe();
}
