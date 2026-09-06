/**
 * Where the app's auth token lives.
 *
 * One module, called once at startup, so no screen ever reaches for a token.
 * That matters more here than usual: a token read in a screen is a token
 * someone eventually logs, and this one grants access to a couple's answers.
 *
 * expo-secure-store, not MMKV or AsyncStorage. The token goes in the iOS
 * keychain, which survives app restarts, is encrypted at rest, and is not
 * included in unencrypted device backups. MMKV is the right tool for cached
 * results and drafts; it is the wrong tool for a credential.
 */

import * as SecureStore from 'expo-secure-store';
import { configureApi } from '@/api/client';

const TOKEN_KEY = 'attune.session.token';

let cached: string | null | undefined;

export async function getToken(): Promise<string | null> {
  // Cached in memory after the first read: SecureStore hits the keychain,
  // which is fast but not free, and the client asks on every request.
  if (cached !== undefined) return cached;
  try {
    cached = await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    // A keychain read can fail on a locked device. Treated as signed out
    // rather than crashing: the screen then shows the sign-in state, which is
    // the honest thing to show when we cannot prove who this is.
    cached = null;
  }
  return cached;
}

export async function setToken(token: string): Promise<void> {
  cached = token;
  try { await SecureStore.setItemAsync(TOKEN_KEY, token); } catch { /* memory-only for this session */ }
}

export async function clearToken(): Promise<void> {
  cached = null;
  try { await SecureStore.deleteItemAsync(TOKEN_KEY); } catch { /* already gone */ }
}

export function isSignedIn(): boolean {
  return !!cached;
}

/**
 * Called once from the root layout, before any screen renders.
 *
 * baseUrl points at production because there is no staging environment. When
 * one exists this is the single place that changes.
 */
export function initSession(opts: { refresh?: () => Promise<boolean> } = {}) {
  configureApi({
    // Passed in by the root layout rather than imported here: auth.ts already
    // imports from this file, so importing it back would close a cycle.
    refresh: opts.refresh,
    // www, not the apex. The apex 307-redirects to www, and React Native's
    // fetch does not carry the Authorization header across a redirect, so
    // every request arrived with no credentials and the API correctly
    // answered "missing auth token". Browsers follow the redirect and resend
    // the header, which is why the website never showed this.
    baseUrl: 'https://www.attune-relationships.com',
    getToken,
  });
}
