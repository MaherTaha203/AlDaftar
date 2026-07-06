// Authentication boundary — single-administrator Supabase Auth (no roles,
// no registration, no multi-user; owner decision 2026-07-05).

export { getCurrentUser, onAuthChange, signIn, signOut, type AuthUser } from './auth-service';
