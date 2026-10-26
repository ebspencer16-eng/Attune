/**
 * A tab switcher hides tab panels, not everything named like one.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * Ellie: "Who does what agreement by question chart is empty so I don't know
 * if I have changes."
 *
 * It was not empty. It held five rows of real content and `display: none`.
 * setTab found the five tab panels with `[id^="resp-"]`, and the chart's own
 * container is called `resp-agree-bars`, so every tab switch hid it and
 * nothing ever showed it again: only the panel whose id was asked for gets
 * turned back on.
 *
 * The oldest mistake in this repo wearing markup. Matching a NAME instead of
 * the thing the name is for. `resp-agree-bars` is not a tab panel; it just
 * starts with the same five letters. Any chart added to that page with a
 * sensible id would have vanished the same way, silently, and looked like a
 * measure with no data.
 *
 * ── WHAT IT HOLDS ─────────────────────────────────────────────────────────
 *   1. No tab switcher finds its panels by an id prefix.
 *   2. Every target named by a tab exists and declares itself a panel.
 *   3. Nothing else declares itself a panel, so the class stays meaningful.
 *
 * ── WHAT IT DOES NOT COVER ────────────────────────────────────────────────
 * Whether the right panel opens, which is behaviour and wants a browser.
 * check-dash-tabs-render drives tabs. This is about the selector that decides
 * what gets hidden, which is where the content went.
 */
import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const src = readFileSync(`${ROOT}public/admin.html`, 'utf8');
const fails = [];

const code = src
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/^\s*\/\/.*$/gm, '');

// ── 1: no panel found by the shape of its name ───────────────────────────
for (const m of code.matchAll(/querySelectorAll\(\s*(['"`])\[id\^=[^)]*\)/g)) {
  fails.push('a selector finds elements by an id prefix: ' + m[0].slice(0, 70)
    + '. That is how the who-does-what chart came to be hidden by the tab switcher:'
    + ' it is not a panel, it just starts with the same letters.');
}

// ── 2: every tab names a target that declares itself ─────────────────────
const targets = [...code.matchAll(/setTab\(\s*this\s*,\s*'([^']+)'\s*\)/g)].map((m) => m[1]);
if (!targets.length) {
  console.error('[check-tab-panels] no setTab calls found in admin.html; the matcher has lost its subject.');
  process.exit(1);
}
for (const id of [...new Set(targets)]) {
  const tag = new RegExp('<div[^>]*id="' + id + '"[^>]*>').exec(src);
  if (!tag) { fails.push(`a tab opens #${id} and no element has that id.`); continue; }
  if (!/class="[^"]*\btab-panel\b/.test(tag[0])) {
    fails.push(`#${id} is opened by a tab and does not carry class="tab-panel", so the switcher cannot find`
      + ' it without going back to guessing from its name.');
  }
}

// ── 3: the class means one thing ─────────────────────────────────────────
const panels = [...src.matchAll(/<div[^>]*class="[^"]*\btab-panel\b[^"]*"[^>]*id="([^"]+)"|<div[^>]*id="([^"]+)"[^>]*class="[^"]*\btab-panel\b/g)]
  .map((m) => m[1] || m[2]);
for (const id of panels) {
  if (!targets.includes(id)) {
    fails.push(`#${id} is marked tab-panel and no tab opens it, so it is hidden on every switch and never`
      + ' shown. That is the same disappearance, arrived at from the other side.');
  }
}

if (fails.length) {
  console.error('[check-tab-panels] the tab switcher can hide things that are not tabs:');
  for (const f of [...new Set(fails)]) console.error('  ✖ ' + f);
  process.exit(1);
}

console.log(`[check-tab-panels] ${new Set(targets).size} tab panels, each named by a tab and each declaring`
  + ' itself with a class; no switcher finds a panel by the shape of its id. A chart on a tabbed page can be'
  + ' called anything without disappearing.');
