#!/usr/bin/env node
/**
 * An exercise's first screen in the app fits the phone it is opened on.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Ellie: "Exercise cover pages should fit on one screen/window without having
 * to scroll. Size should adapt based on device and viewing window size." And,
 * asked whether the app's half was worth building (A163f): "Worth it to me,
 * please build appropriate height based on device type user is using."
 *
 * check-cover-fits holds the website to that. This holds the app.
 *
 * ── WHAT IT MEASURES ──────────────────────────────────────────────────────
 * Every exercise in api/_exercises.js, at six iPhones from the smallest the
 * app runs on to the largest, each with its own window, status bar inset and
 * home indicator. insights.tsx draws an open exercise in place of the tab's
 * content and the native tab bar stays on screen, drawn over the bottom of a
 * screen that runs the full height. So what can be seen ends at the bar's top
 * edge, and that is the line Start has to be above.
 *
 * The real components draw it, through the Expo web build: ExerciseShell and
 * ExerciseOpening, mounted by src/components/probe-host.tsx when the address
 * carries `?probe=cover`. Its words are what /api/questions sends, built here
 * by calling the same exerciseIntro and reading the same registry, not typed.
 *
 * Two things fail it: the cover's scroll area needing more height than it has,
 * and the Start button ending below the bottom of what can be seen.
 *
 * ── WHAT IT DOES NOT COVER ────────────────────────────────────────────────
 *   - The largest accessibility text sizes. CoverPage keeps its ScrollView on
 *     purpose for those, and scrolling there is the right answer.
 *   - iPad and landscape. The app is a phone app first; say so here rather
 *     than imply the cover was measured on a tablet.
 *   - Font rendering is the browser's, not iOS's. The faces are the same files,
 *     but line breaks can differ by a word. The margin below allows for one
 *     line, not for a layout that is wrong.
 *
 * ── WHY IT IS IN THE SMOKE RUN ────────────────────────────────────────────
 * It starts the Expo web server, which takes most of a minute to bundle, so it
 * is too slow for `npm run check`. Same reason check-exercise-flow lives there.
 */
import { spawn } from 'node:child_process';
import { launch } from './_lib/browser.mjs';
import { EXERCISES } from '../api/_exercises.js';
import { exerciseIntro } from '../api/_lib/exercise-intro.js';

const ROOT = new URL('..', import.meta.url).pathname;
const PORT = Number(process.env.APP_WEB_PORT || 8098);
const BASE = `http://localhost:${PORT}`;

/* Points, portrait. Insets are Apple's published safe areas. The tab bar is
   49 points on every iPhone, above the home indicator. */
const PHONES = [
  { name: 'iPhone SE',          width: 375, height: 667, top: 20, bottom: 0 },
  { name: 'iPhone 13 mini',     width: 375, height: 812, top: 50, bottom: 34 },
  { name: 'iPhone 16',          width: 393, height: 852, top: 59, bottom: 34 },
  { name: 'iPhone 16 Pro',      width: 402, height: 874, top: 62, bottom: 34 },
  { name: 'iPhone 16 Plus',     width: 430, height: 932, top: 59, bottom: 34 },
  { name: 'iPhone 16 Pro Max',  width: 440, height: 956, top: 62, bottom: 34 },
];
const TAB_BAR = 49;

/* What /api/questions sends: exerciseDescriptor's label and resultsGroup, and
   the intro for a partner with no name on file, which is the server's own
   default. */
const covers = EXERCISES.map((e) => ({
  key: e.key,
  label: e.fullLabel || e.label,
  resultsGroup: e.resultsGroup ?? null,
  intro: exerciseIntro(e.key, { partner: 'your partner' }),
}));
const missing = covers.filter((c) => !c.intro);
if (missing.length) {
  console.error(`[check-app-cover-fits] no intro for ${missing.map((c) => c.key).join(', ')}, so those covers cannot be drawn.`);
  process.exit(1);
}

/* ── THE SERVER ─────────────────────────────────────────────────────────── */
const server = spawn('npx', ['expo', 'start', '--web', '--port', String(PORT)], {
  cwd: `${ROOT}attune-app`,
  env: { ...process.env, CI: '1', BROWSER: 'none', EXPO_NO_TELEMETRY: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true,
});
let serverLog = '';
server.stdout.on('data', (d) => { serverLog += d; });
server.stderr.on('data', (d) => { serverLog += d; });
const stop = () => { try { process.kill(-server.pid, 'SIGTERM'); } catch { /* already gone */ } };
process.on('exit', stop);
process.on('SIGINT', () => { stop(); process.exit(130); });

const up = async () => {
  for (let i = 0; i < 120; i += 1) {
    try { const r = await fetch(BASE); if (r.ok) return true; } catch { /* not yet */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
};
if (!(await up())) {
  console.error('[check-app-cover-fits] the Expo web server did not answer in two minutes. This is "unavailable", not a failing cover.');
  console.error(serverLog.slice(-1500));
  stop();
  process.exit(1);
}

/* ── THE MEASUREMENT ────────────────────────────────────────────────────── */
const fails = [];
const rows = [];
let first = true;
for (const phone of PHONES) {
  const page = await launch({ width: phone.width, height: phone.height });
  try {
    for (const cover of covers) {
      const probe = { ...cover, width: phone.width, height: phone.height,
        insets: { top: phone.top, bottom: phone.bottom }, tabBar: TAB_BAR };
      await page.onNewDocument(`window.__PROBE__ = ${JSON.stringify(probe)};`);
      await page.goto(`${BASE}/?probe=cover&ex=${cover.key}`);
      /* The first load bundles the whole app, which is most of a minute. */
      let m = null;
      for (let i = 0; i < (first ? 150 : 40); i += 1) {
        m = await page.evaluate((bar) => {
          const scroll = document.querySelector('[data-testid="cover-scroll"]');
          const start = document.querySelector('[data-testid="exercise-start"]');
          const room = document.querySelector('[data-testid="probe-room"]');
          if (!scroll || !start || !room) return null;
          const sr = scroll.getBoundingClientRect();
          const br = start.getBoundingClientRect();
          return {
            winW: window.innerWidth, winH: window.innerHeight,
            room: Math.round(room.getBoundingClientRect().height),
            scrollH: scroll.scrollHeight, clientH: scroll.clientHeight,
            visibleBottom: Math.round(Math.min(sr.bottom, window.innerHeight - bar)),
            buttonBottom: Math.round(br.bottom), buttonH: Math.round(br.height),
            text: (start.textContent || '').trim(),
          };
        }, TAB_BAR + phone.bottom);
        if (m) break;
        await page.wait(1000);
      }
      first = false;
      if (!m) {
        /* Broken or unavailable? In the smoke run on a machine deep in swap,
           covers drew for two phones and then "never drew" for the rest: the
           Expo server had stopped answering, and the cover was fine. Ask the
           server before blaming the cover. */
        const alive = await fetch(BASE).then((r) => r.ok).catch(() => false);
        fails.push(alive
          ? `${cover.key} on ${phone.name}: the cover never drew, so nothing was measured.`
          : `${cover.key} on ${phone.name}: the Expo server stopped answering. This is "unavailable", not a cover that does not fit; run the check on its own.`);
        if (!alive) break;
        continue;
      }
      /* The harness's own size, checked once per run rather than believed.
         CLAUDE.md: launch({ width: 320 }) once gave a 500 point viewport. */
      if (m.winW !== phone.width || m.winH !== phone.height) {
        fails.push(`${phone.name}: asked for ${phone.width}x${phone.height}, got ${m.winW}x${m.winH}. The measurement is about the wrong screen.`);
        break;
      }
      const over = m.scrollH - m.clientH;
      rows.push({ phone: phone.name, key: cover.key, over, spare: m.visibleBottom - m.buttonBottom });
      if (!m.buttonH) {
        fails.push(`${cover.key} on ${phone.name}: the Start button has no height.`);
      } else if (over > 2) {
        fails.push(`${cover.key} on ${phone.name}: the cover needs ${m.scrollH} points in ${m.clientH}, so it scrolls by ${over}.`);
      } else if (m.buttonBottom > m.visibleBottom) {
        fails.push(`${cover.key} on ${phone.name}: "${m.text}" ends at ${m.buttonBottom}, below the visible bottom at ${m.visibleBottom}.`);
      }
    }
  } finally {
    await page.close?.();
  }
}
stop();

if (fails.length) {
  console.error('[check-app-cover-fits] an exercise cover does not fit its phone:\n');
  for (const f of fails) console.error('  ' + f);
  console.error('\nEllie: "please build appropriate height based on device type user is using."');
  process.exit(1);
}
const tight = rows.reduce((a, b) => (b.spare < a.spare ? b : a), rows[0]);
console.log(`[check-app-cover-fits] ${covers.length} exercise covers on ${PHONES.length} iPhones, SE to Pro Max, `
  + `each inside the room left by the status bar and the tab bar with Start on screen. `
  + `Tightest: ${tight.key} on ${tight.phone}, ${tight.spare} points under the button.`);
process.exit(0);
