/**
 * Push notifications, from the phone's side.
 *
 * ── WHY EVERY REFERENCE TO expo-notifications IS LAZY ─────────────────────
 * expo-notifications is a native module. src/api/last-seen.ts carries the
 * lesson at length: an over-the-air update cannot add a native module to a
 * build that does not have one, and a module that throws on import takes the
 * app down before anything renders. So this file never imports it at the top.
 * It loads it inside a try, once, and if that fails push is simply absent:
 * every function here answers "not available" and nothing else changes.
 *
 * That is not a nicety. The build on Ellie's phone today has no notifications
 * module in it, and this file ships to that build in the next update. It has
 * to be inert there and alive in the build after it, with no edit in between.
 *
 * ── WHAT THE SERVER IS TOLD ───────────────────────────────────────────────
 * One token per device and the answer to being asked. Nothing else: no
 * identifier of our own, no device name. api/push-token.js takes the person
 * from the session token and never from the body.
 *
 * ── WHERE THE WORDS COME FROM ─────────────────────────────────────────────
 * Not here. Every sentence that arrives on a lock screen is Ellie's, in
 * api/_lib/notifications.js, and the server builds it. This file has no copy
 * in it at all, which is the thing to keep true.
 */

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';

import { savePushToken } from './client';

type Mod = typeof import('expo-notifications');

let mod: Mod | null = null;
let loaded = false;

/** The module, or null in a build without it. Tried once. */
async function notifications(): Promise<Mod | null> {
  if (loaded) return mod;
  loaded = true;
  try {
    mod = await import('expo-notifications');
  } catch {
    mod = null;
  }
  return mod;
}

/** True when this build can receive a push at all. */
export async function pushAvailable(): Promise<boolean> {
  return !!(await notifications()) && Device.isDevice;
}

/**
 * The last answer we reported, so a launch that changes nothing says nothing.
 *
 * Without it, every launch posts the same token and the same yes, which is a
 * write on a path that runs on every cold start. expo-secure-store rather than
 * MMKV, for the reason last-seen.ts gives.
 */
const REPORTED = 'attune.push.reported';
async function alreadyReported(value: string) {
  try { return (await SecureStore.getItemAsync(REPORTED)) === value; } catch { return false; }
}
async function remember(value: string) {
  try { await SecureStore.setItemAsync(REPORTED, value); } catch { /* best effort */ }
}

/** Expo needs the project it is sending on behalf of. */
function projectId(): string | null {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId || (Constants as unknown as { easConfig?: { projectId?: string } })
    .easConfig?.projectId || null;
}

export type PushState = 'unavailable' | 'not_asked' | 'granted' | 'denied';

/**
 * Where this person stands, without asking them anything.
 *
 * `not_asked` and `denied` are different states and the app must not conflate
 * them: one is a question we have not put yet, the other is an answer we have
 * to respect.
 */
export async function pushState(): Promise<PushState> {
  const n = await notifications();
  if (!n || !Device.isDevice) return 'unavailable';
  try {
    const { status, canAskAgain } = await n.getPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (status === 'undetermined' || canAskAgain) return 'not_asked';
    return 'denied';
  } catch {
    return 'unavailable';
  }
}

/**
 * Register this device, asking for permission only if told to.
 *
 * `ask` is the whole of the "when do we ask" decision, and it is made by the
 * screen that knows where the reader is, not here. Called with ask: false on
 * every launch, this only refreshes a token for someone who has already said
 * yes, which is what keeps the address current after a reinstall.
 */
export async function registerForPush({ ask = false } = {}): Promise<PushState> {
  const n = await notifications();
  if (!n || !Device.isDevice) return 'unavailable';

  let state = await pushState();
  if (state === 'not_asked') {
    if (!ask) return state;
    try {
      const { status } = await n.requestPermissionsAsync();
      state = status === 'granted' ? 'granted' : 'denied';
    } catch {
      return 'unavailable';
    }
  }

  if (state !== 'granted') {
    /* A no is worth telling the server once: it is what stops anything being
       sent, and it forgets the tokens of every device they own. */
    if (!(await alreadyReported('denied'))) {
      await savePushToken({ optIn: false }).catch(() => undefined);
      await remember('denied');
    }
    return state;
  }

  try {
    const id = projectId();
    const { data: token } = await n.getExpoPushTokenAsync(id ? { projectId: id } : undefined);
    if (!token) return state;
    if (await alreadyReported(token)) return state;
    const res = await savePushToken({
      token,
      platform: Device.osName === 'Android' ? 'android' : 'ios',
      optIn: true,
    });
    if (res.ok) await remember(token);
  } catch { /* a token we could not deliver is not a failure the reader sees */ }
  return state;
}

/** Turn it off from Settings: the server forgets every device they own. */
export async function turnPushOff(): Promise<void> {
  await savePushToken({ optIn: false }).catch(() => undefined);
  await remember('denied');
}

/**
 * What a tap on a notification should open.
 *
 * ── WHY THE SERVER DECIDES, NOT THIS FILE ─────────────────────────────────
 * The payload carries `target`, which is appTargetFor's answer: the same
 * object a home-screen card carries. So a tap is routed by the code that
 * routes a card, and a kind of event cannot land in one place from a card and
 * another from a notification. Writing a resolver here would be the second
 * copy of that rule, and this codebase's whole failure mode is second copies.
 */
export type PushTap = { app?: Record<string, unknown>; deepLink?: string };

function tapFrom(data: unknown): PushTap | null {
  const d = (data || {}) as { target?: Record<string, unknown>; deepLink?: string };
  if (!d.target && !d.deepLink) return null;
  return { app: d.target, deepLink: d.deepLink };
}

/**
 * A tap that happened while the app was closed, if there was one.
 *
 * iOS delivers it as the response that launched the app, which is readable
 * once and has to be asked for on mount.
 */
export async function pushThatOpenedTheApp(): Promise<PushTap | null> {
  const n = await notifications();
  if (!n) return null;
  try {
    const last = await n.getLastNotificationResponseAsync();
    return tapFrom(last?.notification?.request?.content?.data);
  } catch {
    return null;
  }
}

/** Taps while the app is running. Returns a function that stops listening. */
export async function onPushTap(handle: (tap: PushTap) => void): Promise<() => void> {
  const n = await notifications();
  if (!n) return () => {};
  try {
    const sub = n.addNotificationResponseReceivedListener((res) => {
      const tap = tapFrom(res?.notification?.request?.content?.data);
      if (tap) handle(tap);
    });
    return () => sub.remove();
  } catch {
    return () => {};
  }
}
