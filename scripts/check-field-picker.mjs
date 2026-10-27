/**
 * The Explore field pickers are a drill-down, and every section is a painted
 * banner you can click into and back out of.
 *
 * ── WHAT ELLIE ASKED FOR, TWICE ───────────────────────────────────────────
 * First: "Seven coloured sections in the row and column pickers." Then, of the
 * attempt: "Not seeing the colored banners." Then, of the second attempt:
 * "This is good, but I can't see the color yet, I'd like for it to be a full
 * color banner not just a square."
 *
 * She was right every time, and the reason is worth keeping: a native <select>
 * popup is drawn by the operating system rather than by the page, so a colour
 * set on an optgroup is advice the list may ignore, and on macOS it does. The
 * block character was a way round that and could never have been a banner: it
 * is one glyph in a line of text. No amount of CSS makes a <select> paint a
 * bar. The third attempt is a list of our own.
 *
 * ── WHAT THIS CHECKS, AND WHY IT DRIVES RATHER THAN READS ─────────────────
 * The picker renders a hidden <select> instead of holding its own copy of the
 * field list, which is the only arrangement where the two cannot drift. So
 * what is worth asserting is that they agree, and that the colour is actually
 * PAINTED: a band whose background resolves to transparent is exactly the bug
 * she reported, and it reads identically in the markup to one that works.
 * Reading the source cannot tell those apart. This opens the picker in a
 * browser and measures what is on screen.
 *
 * It runs scripts/probe-admin.mjs rather than standing up a second admin and a
 * second stub. A fixture that mirrors an existing one is a second version of a
 * rule: the two drift, and the weaker one wins because it still passes.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the colours are the right colours, which is api/_lib/explore-sections
 * and Ellie's call. Only that each section has one, that it is painted, and
 * that no two sections share one, since two sections in one colour read as one
 * section.
 */
import { execFileSync } from 'node:child_process';

const fail = [];
let lines = [];
try {
  const out = execFileSync('node', ['scripts/probe-admin.mjs', 'explore'], {
    env: { ...process.env, PICKER: 'xp-row-field,xp-col-field' },
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 180000,
  });
  lines = out.split('\n').filter((l) => l.trim().startsWith('picker '));
} catch (e) {
  fail.push('could not drive the admin: ' + String(e.message).split('\n')[0]);
}

if (!fail.length && lines.length !== 2) {
  fail.push(`expected both field pickers to report, got ${lines.length}. A gate that has lost its subject must not pass.`);
}

for (const line of lines) {
  let p;
  try { p = JSON.parse(line.trim().replace(/^picker /, '')); }
  catch (e) { fail.push('could not read a picker report: ' + line.trim().slice(0, 80)); continue; }
  const who = p.id;
  if (p.err) { fail.push(`${who}: ${p.err}`); continue; }
  if (!p.open) fail.push(`${who}: the panel did not open when its button was clicked`);
  if (!p.closes) fail.push(`${who}: the panel did not close when its button was clicked again`);
  /* The two halves agreeing is the whole reason the select is still there:
     the tree is what is drawn and the select is what everything else reads. */
  if (p.bands !== p.sections) fail.push(`${who}: ${p.sections} sections in the tree and ${p.bands} bands drawn`);
  if (p.missing) fail.push(`${who}: ${p.missing} of ${p.leaves} leaves have no option in the select, so they cannot be chosen`);
  if (p.extra) fail.push(`${who}: ${p.extra} options in the select that no row offers, so they are unreachable`);
  if (!p.bands) fail.push(`${who}: no section bands at all`);
  /* The bug she reported three times: a band with no colour on it. */
  if (p.flat) fail.push(`${who}: ${p.flat} of ${p.bands} bands have no painted background, which is the banner she could not see`);
  if (p.distinct !== p.bands) fail.push(`${who}: ${p.bands} bands share ${p.distinct} colours, so two sections read as one`);
  /* "A full color banner", not a swatch: the bar spans the list. */
  if (p.panelWide && p.wide < p.panelWide * 0.8) {
    fail.push(`${who}: a band is ${p.wide}px in a ${p.panelWide}px panel, which is a swatch rather than a banner`);
  }
  /* ── THE PART THAT MAKES IT A DRILL-DOWN ────────────────────────────────
     Ellie: "high-level with arrows to click into that section... a back arrow
     in the top left when you click into a detailed section." A list of
     sections that does nothing when one is clicked looks finished and is not,
     which is the same shape as a band with no colour. */
  if (!p.drilled) fail.push(`${who}: clicking a section opened nothing, or left no back arrow`);
  if (!p.rowsInside) fail.push(`${who}: a section opened onto no rows`);
  if (!p.crumb) fail.push(`${who}: nothing says which section is open`);
  if (!p.wentBack) fail.push(`${who}: the back arrow did not return to the sections`);
  /* Her one extra row per exercise section. */
  if (!p.allQuestions) fail.push(`${who}: no section offers "All questions", so the full list is unreachable`);
  if (!p.btnText) fail.push(`${who}: the button shows no field name, so the picker cannot say what is selected`);
}

if (fail.length) {
  console.error('check-field-picker FAILED');
  for (const f of fail) console.error('  - ' + f);
  process.exit(1);
}
console.log(`[check-field-picker] both Explore pickers open onto one full-width painted banner per section, `
  + `drill in and back out, carry an All questions row, and offer exactly the options their select holds.`);
