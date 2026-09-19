/**
 * The last thing a screen was shown, so it can be shown again straight away.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Ellie: "When I open the testflight attune app, it takes a long time to load
 * my dashboard each time."
 *
 * Measured rather than guessed. Warm, /api/home answers in a third of a
 * second. Cold, it took between one and three and a half, three times running,
 * and a function nobody has called for an hour is always cold. The app asked
 * for it on every launch and drew a spinner until it arrived, so every launch
 * was a cold start with a person watching it.
 *
 * So the last payload is kept, read on mount, and drawn the moment it arrives
 * while the request runs behind it. The screen is there before the network is.
 *
 * ── WHY NOT MMKV ──────────────────────────────────────────────────────────
 * It is in package.json and it is the obvious tool: synchronous, so the very
 * first render could have the data. It is also a native module that is not
 * linked in the dev client, and where it is missing it throws on import and
 * takes the app down before anything renders. A require inside a try did not
 * help; the throw still escaped.
 *
 * That matters beyond the dev client, because this ships over the air. An
 * update cannot add a native module to a build that lacks one, so a cache
 * that depends on a native module can turn a routine update into an app that
 * will not open. expo-secure-store is already in the app and already working,
 * which is worth more here than being synchronous: a read takes a few
 * milliseconds against a cold start of one to three seconds.
 *
 * ── WHAT IS SAFE TO KEEP HERE ─────────────────────────────────────────────
 * Only what the person it belongs to has already seen on their own screen, and
 * only what is cheap to be wrong about for a second. A greeting, a prompt, a
 * finding. Never a partner's answers, and never anything that decides what
 * someone is allowed to see: entitlements are re-read from the server, because
 * a stale yes is a different kind of mistake from a stale sentence.
 *
 * It is cleared on sign-out for the same reason `lastSection` is: the next
 * person to open the app on this phone must not meet the last one's screen.
 */

import * as SecureStore from 'expo-secure-store';

/** Every screen that keeps one, so sign-out can clear them all by name. */
const KEPT = ['home'] as const;
export type KeptScreen = (typeof KEPT)[number];

/** Namespaced so a new cached screen cannot collide with an old one. */
const key = (name: KeptScreen) => `attune.last_seen.${name}`;

/**
 * What was last drawn on this screen, or null.
 *
 * Never throws. A cache that can take the app down on launch is worse than no
 * cache, and every failure here has the same answer: draw the spinner, which
 * is what happened before this existed.
 */
export async function lastSeen<T>(name: KeptScreen): Promise<T | null> {
  try {
    const raw = await SecureStore.getItemAsync(key(name));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Keep what is on screen now, for the next launch. */
export async function keepLastSeen(name: KeptScreen, value: unknown): Promise<void> {
  try {
    await SecureStore.setItemAsync(key(name), JSON.stringify(value));
  } catch {
    /* A cache that cannot be written is a cache that is not used. */
  }
}

/**
 * Forget everything.
 *
 * Called on sign-out, beside forgetLastSection. Whoever opens the app next may
 * not be the person who closed it.
 *
 * By name rather than by wiping the store: the session token lives in the same
 * keychain and is cleared by the code that owns it, not by this.
 */
export async function forgetLastSeen(): Promise<void> {
  await Promise.all(KEPT.map(async (name) => {
    try {
      await SecureStore.deleteItemAsync(key(name));
    } catch {
      /* Nothing worth failing a sign-out over. */
    }
  }));
}
