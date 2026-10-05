#!/usr/bin/env node
/**
 * "Does this visitor need a consent banner" is asked once per session.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * Three files asked it: public/_flags.js, public/_track.js and src/main.jsx.
 * Each had its own fetch of /api/region. Two cached the answer in
 * sessionStorage and the banner's never did, so every page load made at least
 * one request and a cold one made two or three, racing.
 *
 * Measured on the deployed site rather than reasoned about: /api/region appears
 * twice in one page load's resource timeline, 393ms and 394ms. Two callers, one
 * millisecond apart.
 *
 * It is the oldest shape in this codebase. One rule, maintained in three
 * places, where nothing checked that they agreed, and they did not: one of the
 * three had quietly lost its cache.
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────
 * public/_flags.js answers it, because it loads first. Everyone else reads
 * window.__attuneConsentRequired(). This drives a real page and counts the
 * requests, because the thing that went wrong is not visible in any one file.
 *
 * ── WHY DRIVEN AND NOT READ ───────────────────────────────────────────────
 * The first fix put the helper inside the app-banner block, which returns early
 * on `document.getElementById('root')`, so on /app it was never defined at all:
 * both readers fell back to their safe answer and the banner stopped drawing.
 * Every file read correctly. Nothing threw. Only loading the page and asking
 * for the function showed it.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the banner's copy or its two buttons are right; check-consent-gate
 * holds those. And it drives the built site, so it says nothing about a page
 * that is not in the build.
 */

import { spawn } from 'node:child_process';

import { launch } from './_lib/browser.mjs';

const BASE = 'http://localhost:4178';
const fails = [];

/* vite preview binds localhost and not 127.0.0.1, which costs half an hour
   every time it is forgotten. scripts/smoke.mjs says so too. */
const server = spawn('npx', ['vite', 'preview', '--port', '4178'], {
  cwd: new URL('..', import.meta.url).pathname,
  stdio: 'ignore',
});
const stop = () => { try { server.kill(); } catch { /* already gone */ } };
process.on('exit', stop);

let ready = false;
for (let i = 0; i < 40 && !ready; i += 1) {
  await new Promise((r) => setTimeout(r, 250));
  try {
    const res = await fetch(`${BASE}/`);
    ready = res.ok;
  } catch { /* not up yet */ }
}
if (!ready) {
  console.error('[check-region-once] vite preview did not come up on 4178, so nothing was driven.'
    + ' Run `npx vite build` first.'
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  stop();
  process.exit(1);
}

const page = await launch({ width: 1100, height: 800 });
try {
  /**
   * Both worlds. /app is the React app, where the first fix silently did
   * nothing; /home is a static page, where the banner is the only reason this
   * file is loaded at all. A helper that works on one and not the other is
   * exactly what shipped.
   */
  for (const path of ['/app', '/home']) {
    await page.goto(`${BASE}${path}`);
    await page.wait(1800);

    const got = await page.evaluate(() => ({
      helper: typeof window.__attuneConsentRequired,
      calls: performance.getEntriesByType('resource')
        .filter((r) => r.name.includes('/api/region')).length,
      cached: (() => {
        try { return sessionStorage.getItem('attune_region_consent_required'); } catch { return null; }
      })(),
      banner: !!document.querySelector('[aria-label="Privacy notice"]'),
    }));

    if (got.helper !== 'function') {
      fails.push(`on ${path} window.__attuneConsentRequired is ${got.helper}.`
        + '\n      public/_flags.js defines it and loads before everything, so this means it sits'
        + '\n      below an early return again. Both readers then fall back to "consent required"'
        + '\n      and the banner never draws.');
      continue;
    }
    if (got.calls > 1) {
      fails.push(`${path} asks /api/region ${got.calls} times in one load. One asker, in`
        + ' public/_flags.js; _track.js and src/main.jsx read its answer.');
    }
    if (got.cached !== '0' && got.cached !== '1') {
      fails.push(`${path} did not cache the region answer (sessionStorage holds`
        + ` ${JSON.stringify(got.cached)}), so every page load asks again for something that`
        + ' cannot change inside a session.');
    }
    if (!got.banner) {
      fails.push(`${path} drew no privacy notice. The helper exists and the banner is what it is`
        + ' for, so something between the two is broken.');
    }

    /* And a second load inside the same session asks nothing at all. */
    await page.goto(`${BASE}${path}`);
    await page.wait(1200);
    const again = await page.evaluate(() => performance.getEntriesByType('resource')
      .filter((r) => r.name.includes('/api/region')).length);
    if (again > 0) {
      fails.push(`a second load of ${path} in the same session asks /api/region again`
        + ` (${again} times). The answer is cached for the session.`);
    }
  }
} finally {
  await page.close();
  stop();
}

if (fails.length) {
  console.error('\n check-region-once: the consent region is asked more than once.\n');
  for (const f of [...new Set(fails)]) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log('[check-region-once] /api/region is asked once per session on both the app and a'
  + ' static page, the answer is cached, and the notice draws from it.');
