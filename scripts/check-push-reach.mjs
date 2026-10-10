#!/usr/bin/env node
/**
 * A push notification has to be wanted, addressed, and worth the interruption.
 *
 * ── WHY THIS GATE EXISTS ───────────────────────────────────────────────────
 * Ellie approved six push notifications and wrote the copy for all six. Push
 * is the one thing in this product that reaches somebody who is not looking at
 * it, so it has three ways to be wrong that nothing else has:
 *
 *   1. It arrives for someone who never said yes. That is the whole of the
 *      trust in this feature, and it is one boolean away.
 *   2. It arrives too often. iOS does not warn anyone: people turn
 *      notifications off, permanently, and the partner-sharing loop stops.
 *   3. It arrives with nothing behind it. A kind that may push and that
 *      nothing raises is a sentence nobody will ever receive, and it reads in
 *      the code as a shipped feature.
 *
 * ── HOW IT CHECKS ──────────────────────────────────────────────────────────
 * By running the code. The consent half runs sendPush against a stubbed
 * Supabase and a stubbed Expo and counts whether Expo was called at all; the
 * rate half puts inputs either side of each threshold by a minute, rather than
 * sweeping a grid and hoping to land on one, which is the mistake
 * check-feedback-mirror was built on.
 *
 * ── AND THE ONE THING THAT IS A SOURCE CHECK ───────────────────────────────
 * The app may not import expo-notifications at the top of a file. It is a
 * native module, an over-the-air update cannot add one to a build that lacks
 * it, and a module that throws on import takes the app down before anything
 * renders: src/api/last-seen.ts carries that lesson from MMKV. A static import
 * here would turn the next routine update into an app that will not open on
 * every phone running the current build. That cannot be run from a build step,
 * so it is read, and it is read strictly.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (f) => readFileSync(join(ROOT, f), 'utf8');
const code = (f) => read(f)
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

const problems = [];

process.env.SUPABASE_URL = 'https://stub.invalid';
process.env.SUPABASE_SERVICE_KEY = 'stub-key';

const { shouldNotify, COOLDOWN_DAYS, MAX_PER_MONTH, notificationFor } =
  await import('../api/_lib/notifications.js');
const { sendPush } = await import('../api/_lib/push.js');

const DAY = 86400000;
const MINUTE = 60000;

/* Every kind the product can build copy for, read out of the module. */
const kinds = [...read('api/_lib/notifications.js').matchAll(/case\s+'([a-z0-9_]+)':/g)].map((m) => m[1]);
/* Every kind that may interrupt somebody, from the table itself. */
const pushable = [...code('api/_lib/notifications.js')
  .matchAll(/^\s{2}([a-z0-9_]+)\s*:\s*\{\s*urgency:/gm)].map((m) => m[1]);
if (pushable.length < 3) {
  problems.push('could not read the pushable table out of api/_lib/notifications.js.'
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
}

// ── 1. Nothing is sent to somebody who did not say yes ────────────────────
{
  const cases = [
    ['never asked', { push_opt_in: null }, ['ExponentPushToken[aaa]'], false],
    ['said no', { push_opt_in: false }, ['ExponentPushToken[aaa]'], false],
    ['said yes but has no device', { push_opt_in: true }, [], false],
    ['said yes', { push_opt_in: true }, ['ExponentPushToken[aaa]'], true],
  ];
  for (const [what, profile, tokens, shouldReach] of cases) {
    let expoCalls = 0;
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (url, opts = {}) => {
      const u = String(url);
      if (/exp\.host/.test(u)) {
        expoCalls += 1;
        return new Response(JSON.stringify({ data: [{ status: 'ok' }] }), { status: 200 });
      }
      if (/\/rest\/v1\/profiles/.test(u)) return new Response(JSON.stringify([profile]), { status: 200 });
      if (/\/rest\/v1\/push_tokens/.test(u)) {
        return new Response(JSON.stringify(tokens.map((t) => ({ token: t, platform: 'ios' }))), { status: 200 });
      }
      if (/\/rest\/v1\/push_sends/.test(u) && (opts.method || 'GET') === 'POST') {
        return new Response('{}', { status: 201 });
      }
      if (/\/rest\/v1\/push_sends/.test(u)) return new Response('[]', { status: 200 });
      return new Response('[]', { status: 200 });
    };
    const alert = notificationFor('partner_finished', { partnerName: 'Sam' });
    const res = await sendPush('person-1', alert).catch((e) => ({ sent: false, reason: String(e?.message) }));
    globalThis.fetch = realFetch;

    if (!shouldReach && expoCalls > 0) {
      problems.push(`${what}: a push was handed to Expo anyway. Consent is the whole of the`
        + ' trust in this feature and it is one boolean away.');
    }
    if (shouldReach && expoCalls === 0) {
      problems.push(`${what}: nothing was sent (${res.reason}). Somebody who said yes and has a`
        + ' device is the one case that must work, or the feature is decoration.');
    }
  }
}

// ── 2. The rate limits, at their edges ────────────────────────────────────
{
  const event = notificationFor('partner_finished', { partnerName: 'Sam' });
  const now = Date.now();
  const base = { pushEnabled: true, lastOpenedAt: null };

  const justInside = shouldNotify(event, {
    ...base, sentAt: [new Date(now - (COOLDOWN_DAYS * DAY - MINUTE)).toISOString()],
  }, now);
  if (justInside.send) {
    problems.push(`a second push a minute short of the ${COOLDOWN_DAYS} day cooldown is allowed.`
      + ' The cooldown is what stops people turning notifications off for good.');
  }
  const justOutside = shouldNotify(event, {
    ...base, sentAt: [new Date(now - (COOLDOWN_DAYS * DAY + MINUTE)).toISOString()],
  }, now);
  if (!justOutside.send) {
    problems.push(`a push a minute past the ${COOLDOWN_DAYS} day cooldown is refused, so the`
      + ` cooldown is longer than ${COOLDOWN_DAYS} days and nothing says so.`);
  }

  /* The cap, counted over the window, with the cooldown satisfied. */
  const spread = (n) => Array.from({ length: n }, (_, i) =>
    new Date(now - (COOLDOWN_DAYS * DAY + MINUTE) - i * 5 * DAY).toISOString());
  const atCap = shouldNotify(event, { ...base, sentAt: spread(MAX_PER_MONTH) }, now);
  if (atCap.send) {
    problems.push(`a ${MAX_PER_MONTH + 1}th push inside the month is allowed; the cap does nothing.`);
  }
  const underCap = shouldNotify(event, { ...base, sentAt: spread(MAX_PER_MONTH - 1) }, now);
  if (!underCap.send) {
    problems.push(`the ${MAX_PER_MONTH}th push inside the month is refused, so the cap is`
      + ` ${MAX_PER_MONTH - 1} and the constant says ${MAX_PER_MONTH}.`);
  }

  /* Opening the app counts as having seen what happened, and does not count as
     having done something they have not done. Both halves, because the second
     one was wrong first: it was `urgency < 9`, which conflated how important an
     event is with whether the reader can already know about it. */
  const openedToday = { ...base, sentAt: [], lastOpenedAt: new Date(now - 2 * 3600000).toISOString() };
  if (shouldNotify(notificationFor('partner_shared', { partnerName: 'Sam' }), openedToday, now).send) {
    problems.push('something that already has a card on the home screen is pushed to somebody'
      + ' who opened the app two hours ago, which is the same prompt printed twice.');
  }
  const streak = notificationFor('journal_streak', { streakDays: 5 });
  if (!shouldNotify(streak, openedToday, now).send) {
    problems.push('a journal streak about to expire is suppressed because they opened the app.'
      + ' Opening the app is not writing an entry, and telling them their streak is safe'
      + ' because they looked at a screen would be false.');
  }
}

// ── 3. Every kind that may push is raised by something ────────────────────
{
  /* Where a kind is raised: the server, anywhere. Read from the tree rather
     than listed, because a list in a gate goes stale the first time a trigger
     moves and goes stale silently. */
  const raisedIn = new Map();
  (function walk(d) {
    for (const f of readdirSync(join(ROOT, d))) {
      const rel = join(d, f);
      if (statSync(join(ROOT, rel)).isDirectory()) { walk(rel); continue; }
      if (!/\.(js|mjs)$/.test(f)) continue;
      if (rel === 'api/_lib/notifications.js') continue;   // where the copy lives
      const src = code(rel);
      for (const m of src.matchAll(/kind:\s*'([a-z0-9_]+)'/g)) {
        const list = raisedIn.get(m[1]) || [];
        list.push(rel);
        raisedIn.set(m[1], list);
      }
    }
  })('api');

  for (const kind of pushable) {
    if (!kinds.includes(kind)) {
      problems.push(`${kind} may push and has no copy in notificationFor, so it would arrive blank.`);
      continue;
    }
    if (!raisedIn.has(kind)) {
      problems.push(`${kind} may push and nothing under api/ raises it. A kind with no caller`
        + ' reads in the code as a shipped feature and is a sentence nobody will receive.');
    }
  }

  /* Her six, by name. She chose these; a refactor that quietly drops one from
     the pushable table would otherwise pass everything above. */
  const HERS = ['partner_shared', 'journal_streak', 'results_ready',
    'workbook_ready', 'exercise_unfinished', 'new_post'];
  for (const kind of HERS) {
    if (!pushable.includes(kind)) {
      problems.push(`${kind} is one of the six Ellie approved on 2026-10-10 and it is no longer`
        + ' in the pushable table, so it cannot reach a phone.');
    }
  }
}

// ── 4. The app cannot import the native module at the top of a file ───────
{
  const APP = 'attune-app/src';
  (function walk(d) {
    for (const f of readdirSync(join(ROOT, d))) {
      const rel = join(d, f);
      if (statSync(join(ROOT, rel)).isDirectory()) {
        if (/node_modules|\.expo|ios|android/.test(rel)) continue;
        walk(rel);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(f)) continue;
      const src = code(rel);
      /* A static import, in any of its forms. The dynamic one, inside a try,
         is the only safe shape and it reads as `import(` with a bracket. */
      if (/^\s*import[^(\n]*['"]expo-notifications['"]/m.test(src)) {
        problems.push(`${rel} imports expo-notifications statically.`
          + '\n      An over-the-air update cannot add a native module to a build without one,'
          + '\n      and this one throws on import, so the next update would make the app fail'
          + '\n      to open on every phone running the current build. Load it with'
          + '\n      `await import(...)` inside a try, as src/api/push.ts does.');
      }
    }
  })(APP);

  const push = read('attune-app/src/api/push.ts');
  if (!/await import\('expo-notifications'\)/.test(push)) {
    problems.push('attune-app/src/api/push.ts no longer loads the module dynamically, so either'
      + ' it moved or the one safe shape has been replaced.');
  }
  if (!/catch/.test(push)) {
    problems.push('attune-app/src/api/push.ts loads a native module with nothing catching the throw.');
  }

  /* No copy in the app. Every sentence that lands on a lock screen is Ellie's
     and lives on the server; a title typed into the app is a second voice
     nobody reviews. */
  const appPush = code('attune-app/src/api/push.ts');
  const sentences = [...appPush.matchAll(/['"`]([A-Z][a-z][^'"`]{14,})['"`]/g)].map((m) => m[1]);
  for (const sentence of sentences) {
    problems.push(`attune-app/src/api/push.ts carries what looks like notification copy:`
      + ` "${sentence}". The words live in api/_lib/notifications.js.`);
  }

  /* And a way to turn it off, which is the other half of consent. */
  if (!/turnPushOff/.test(code('attune-app/src/components/settings.tsx'))) {
    problems.push('Settings has no way to turn notifications off. Consent that cannot be'
      + ' withdrawn in the app is consent that gets withdrawn at the OS level, for ever.');
  }
}

if (problems.length) {
  console.error('[check-push-reach] push notifications are not safe to send:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(`[check-push-reach] ${pushable.length} kinds may push, all with copy and a caller;`
  + ` consent is required, the ${COOLDOWN_DAYS} day cooldown and the cap of ${MAX_PER_MONTH} hold at`
  + ' their edges, and the app loads the native module safely.');
