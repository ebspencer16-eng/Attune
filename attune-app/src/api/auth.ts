/**
 * Sign in, sign out, and keeping the token fresh.
 *
 * Talks to Supabase's auth REST API directly rather than pulling in
 * @supabase/supabase-js. The library is 100kb+ and brings a realtime client,
 * a storage client and a postgrest client we do not use; the two calls we need
 * are plain HTTP. Every native dependency is also a build round trip through
 * a Mac, which is a real cost on this project.
 *
 * Config comes from EXPO_PUBLIC_ variables, which Expo inlines at build time.
 * The anon key is designed to be public and already ships in the website's
 * bundle: it grants nothing on its own, because row-level security decides what
 * a request can touch. It is in a .env file rather than committed so the repo
 * carries no keys at all.
 */

import { clearToken, setToken } from '@/api/session';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export type AuthResult =
  | { ok: true }
  | { ok: false; message: string };

/** True when the app has been given its Supabase config. */
export function isAuthConfigured(): boolean {
  return !!SUPABASE_URL && !!ANON_KEY;
}

/**
 * Email and password sign-in.
 *
 * Error copy is written here rather than passed through from Supabase.
 * "Invalid login credentials" is accurate and unhelpful; a person needs to
 * know whether to retry, reset, or check the address.
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!isAuthConfigured()) {
    return { ok: false, message: 'The app is not configured to sign in yet.' };
  }

  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });
  } catch {
    return { ok: false, message: "Couldn't reach Attune. Check your connection and try again." };
  }

  if (res.status === 400 || res.status === 401) {
    return { ok: false, message: "That email and password don't match. Check both and try again." };
  }
  if (!res.ok) {
    return { ok: false, message: 'Something went wrong on our end. Try again in a moment.' };
  }

  let body: { access_token?: string; refresh_token?: string };
  try { body = await res.json(); } catch { return { ok: false, message: 'Unexpected response. Try again.' }; }

  if (!body.access_token) {
    return { ok: false, message: 'Signed in, but no session came back. Try again.' };
  }

  await setToken(body.access_token);
  if (body.refresh_token) await setRefresh(body.refresh_token);
  return { ok: true };
}

export async function signOut(): Promise<void> {
  await clearToken();
  await setRefresh(null);
}

// ── Refresh ────────────────────────────────────────────────────────────────
// Supabase access tokens expire after an hour. Without refresh, the app works
// for one session and then shows "sign in again" forever, which reads as the
// app forgetting you rather than a token expiring.

import * as SecureStore from 'expo-secure-store';
const REFRESH_KEY = 'attune.session.refresh';

async function setRefresh(token: string | null) {
  try {
    if (token) await SecureStore.setItemAsync(REFRESH_KEY, token);
    else await SecureStore.deleteItemAsync(REFRESH_KEY);
  } catch { /* memory-only for this session */ }
}

/**
 * Exchange the refresh token for a new access token.
 *
 * Returns false when there is nothing to refresh or the refresh itself failed,
 * which the caller should treat as genuinely signed out.
 */
export async function refreshSession(): Promise<boolean> {
  if (!isAuthConfigured()) return false;
  let refresh: string | null = null;
  try { refresh = await SecureStore.getItemAsync(REFRESH_KEY); } catch { return false; }
  if (!refresh) return false;

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) return false;
    const body = await res.json();
    if (!body.access_token) return false;
    await setToken(body.access_token);
    if (body.refresh_token) await setRefresh(body.refresh_token);
    return true;
  } catch {
    return false;
  }
}
