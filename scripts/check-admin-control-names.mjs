#!/usr/bin/env node
/**
 * Every control in the admin can say what it is.
 *
 * ── WHY THIS EXISTS SEPARATELY ────────────────────────────────────────────
 * check-control-names already holds this rule, over the 38 static pages, and
 * it has never looked at the admin: the admin is one page behind a login, it
 * draws most of its controls from JavaScript, and the static sweep loads URLs.
 * So the surface with the most controls on it was the one surface the rule did
 * not cover, which is the scope hole CLAUDE.md names — a gate that names one
 * file holds one surface.
 *
 * The first honest run found 165 unnamed controls: 120 "add a theme" boxes on
 * Testimonials, 35 question-weight sliders and 10 axis-weight sliders in the
 * typing sandbox. Every one of them is a bare <input> whose only text is a
 * placeholder, which a screen reader does not read as a name.
 *
 * ── HOW IT ASKS ───────────────────────────────────────────────────────────
 * Through probe-admin, in one browser, clicking the real navigation rather
 * than reloading: the admin's pages are client-side, and thirteen launches to
 * ask one question of each would be two minutes a build. A control counts as
 * named if it has an aria-label, a title, its own words, a <label>, or an
 * aria-labelledby. Invisible controls are skipped, because a control nobody
 * can reach is a different question and one the id sweep already asks.
 *
 * ── A PLANT THAT WAS NOT A BUG ────────────────────────────────────────────
 * Taking the aria-label off the slicer drill-down's button passes this, and
 * should: that button's own words are "Everyone", or the whole path of the cut
 * it holds, and a control that says what it is in its own text is named. The
 * plant that does fail it is a bare <input>, whose placeholder is not a name.
 */
import { execFileSync } from 'node:child_process';

let lines = [];
const fail = [];
try {
  const out = execFileSync('node', ['scripts/probe-admin.mjs', 'overview'], {
    env: { ...process.env, OUT: '/dev/null', NAMES: 'all' },
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 240000,
  });
  lines = out.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('names '));
} catch (e) {
  fail.push('could not drive the admin: ' + String(e.message).split('\n')[0]);
}

/* A run that visited one page, or none, has lost its subject. */
if (!fail.length && lines.length < 8) {
  fail.push(`only ${lines.length} admin pages reported; the navigation has changed or the probe stopped early`);
}

let controls = 0;
for (const line of lines) {
  const m = /^names (\S+): (\d+) visible controls, (\d+) with no name(?:: (.*))?$/.exec(line);
  if (!m) { fail.push('could not read a line: ' + line.slice(0, 80)); continue; }
  const [, page, total, unnamed, which] = m;
  controls += Number(total);
  if (Number(unnamed)) {
    fail.push(`${page}: ${unnamed} of ${total} controls have no name${which ? ' — ' + which : ''}`);
  }
}

if (fail.length) {
  console.error('check-admin-control-names FAILED');
  for (const f of fail) console.error('  - ' + f);
  process.exit(1);
}
console.log(`[check-admin-control-names] ${lines.length} admin pages, ${controls} visible controls, every one of them with a name a screen reader can say.`);
