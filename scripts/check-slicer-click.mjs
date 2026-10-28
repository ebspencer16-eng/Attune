#!/usr/bin/env node
/**
 * A cut made the way a person makes one: open the panel, walk down, click.
 *
 * ── THE BUG THIS ENCODES ──────────────────────────────────────────────────
 * Ellie: "Just made a slicer selection but the chart didnt change and slicer
 * still says everyone."
 *
 * Seven slicers were like that, and every gate here passed. The reason is the
 * same one in all of them: every test of a cut ASSIGNED `sel.value` in code,
 * which skips the panel, the walk, pick(), the label and the event. Nothing
 * had ever driven the control a person uses, so nothing could see that the
 * list the panel offered and the list the select could hold were different
 * lists.
 *
 * Two faults underneath. Some tiles do not filter anything: they read a
 * bundle the server pre-computed per segment, and offering a cut with no
 * bundle meant falling back to the whole population, which looks exactly like
 * a click that did nothing. And `initAllSlicers`, which fills every slicer so
 * none sits empty while its tile draws, went on replacing the tile's own list
 * with its wider one every time the page was opened.
 *
 * ── WHAT IT DRIVES ────────────────────────────────────────────────────────
 * Every slicer on every admin page, in one browser, TWICE: once to the first
 * real leaf, which is always a plain `field::value` cut, and once to the
 * first DERIVED cut, which is a predicate the page holds rather than a column
 * anybody has. Then read what the select holds, what the button says, and
 * whether the tile behind it moved. A choice that does not stick is the
 * failure; a tile that does not move is reported but not failed, because a
 * cut can legitimately leave a chart looking the same.
 *
 * ── WHY THE SECOND PASS EXISTS ────────────────────────────────────────────
 * The first pass takes the first branch and the first leaf, and on every
 * slicer here that is Demographics -> Age -> 18-24. So this gate drove 68
 * slicers and only ever tested the one kind of cut that was never broken.
 * Twelve Engagement slicers answered a score band, an alignment either side
 * of a line or a horseman with a confident zero, because that endpoint took
 * the cut as a field name and no row has a field called `g`. A zero reads as
 * a finding, which is worse than a click that does nothing, and this gate
 * said all 68 were fine throughout.
 *
 * ── WHAT IT COSTS ────────────────────────────────────────────────────────
 * Four minutes on an idle machine, ten on one in swap, measured both ways on
 * the run that added the second pass. 134 cuts, each one a panel open, a walk
 * and a click in a real browser with a settle after it.
 *
 * Written down because a gate whose cost is a surprise is a gate somebody
 * switches off, and because the obvious saving is dropping one of the two
 * passes. Do not: the value pass has never found anything, and the derived
 * pass found a page-wide zero the first time it ran.
 */
import { execFileSync } from 'node:child_process';

const fail = [];
let lines = [];
try {
  const out = execFileSync('node', ['scripts/probe-admin.mjs', 'overview'], {
    env: { ...process.env, OUT: '/dev/null', CLICKCUT: 'every', DERIVED: '1' },
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 600000,
  });
  lines = out.split('\n').map((l) => l.trim())
    .filter((l) => l.startsWith('clickcut ') || l.startsWith('derivedcut '));
} catch (e) {
  fail.push('could not drive the admin: ' + String(e.message).split('\n')[0]);
}

/* A run that found a handful of slicers has lost its subject: the admin has
   dozens, and a selector that stops matching them would otherwise pass. */
if (!fail.length && lines.length < 60) {
  fail.push(`only ${lines.length} cuts were driven; the admin has dozens of slicers and each one is driven twice, so this gate is looking at the wrong thing`);
}
/* And both passes have to have happened. Running one of them twice, or losing
   the derived pass to a renamed label, would otherwise read as a clean run:
   the count above would still be met by the value pass alone. */
if (!fail.length) {
  const derived = lines.filter((l) => l.startsWith('derivedcut ')).length;
  const value = lines.filter((l) => l.startsWith('clickcut ')).length;
  if (value < 30) fail.push(`only ${value} plain cuts were driven`);
  if (derived < 30) fail.push(`only ${derived} derived cuts were driven; a derived cut is the half that was broken, so a run without them proves the wrong thing`);
}

let ok = 0;
let none = 0;
/**
 * ── AND A WHOLE PAGE WHOSE TILES NEVER MOVE ───────────────────────────────
 * Per tile, "the chart looks the same" is not a failure: a cut can
 * legitimately leave a chart identical, and a tile of text has nothing to
 * move. Per PAGE it is a different claim. Every page in this admin has
 * several tiles with figures on them, and if not one of them changes under
 * any cut, the cut is not reaching that page's data at all.
 *
 * That is the shape the Engagement page had for months: it took the cut as a
 * field name, a derived cut has none, so every tile answered zero or answered
 * the whole population. This gate drove all twelve of its slicers and passed
 * throughout, because each choice stuck. Both ends now refuse a cut that
 * resolved nobody, which turns that into a choice that does not stick and so
 * into a failure above; this is the second net, for a cut that is quietly
 * ignored rather than refused.
 */
const movedByPage = new Map();
const noteMove = (line) => {
  const m = /^(?:clickcut|derivedcut) (?:ok|FAIL) +(\S+) (\{.*)$/.exec(line);
  if (!m) return;
  const page = m[1].includes('/') ? m[1].split('/')[0] : '(open page)';
  let d = {};
  try { d = JSON.parse(m[2]); } catch (e) { return; }
  const seen = movedByPage.get(page) || { moved: 0, measurable: 0 };
  if (d.tileMoved === true) seen.moved += 1;
  if (d.tileMoved === true || d.tileMoved === false) seen.measurable += 1;
  movedByPage.set(page, seen);
};
for (const line of lines) {
  noteMove(line);
  if (line.startsWith('clickcut ok')) { ok += 1; continue; }
  /* "none" is a slicer that offers no derived cut at all, which the two
     Explore field pickers legitimately do not: they choose a FIELD, and a
     derived cut is a value. Counted, not failed, and reported so the day
     every slicer stops offering one is visible. */
  if (line.startsWith('derivedcut none')) { none += 1; continue; }
  if (line.startsWith('derivedcut ok')) { ok += 1; continue; }
  const m = /^(?:clickcut|derivedcut) FAIL (\S+) (.*)$/.exec(line);
  if (!m) { fail.push('could not read: ' + line.slice(0, 90)); continue; }
  let d = {};
  try { d = JSON.parse(m[2]); } catch (e) { /* the id alone is enough to report */ }
  fail.push(`${m[1]}: the choice did not stick. The button says "${d.button}" and the select holds "${d.value}". `
    + `Steps: ${(d.steps || []).join(' -> ')}`);
}

/* Pages with at least three tiles whose figures could be read. Below that the
   page may genuinely have one chart and a legitimate reason for it to look the
   same, and a gate that manufactures its own evidence is worse than none. */
let pagesChecked = 0;
for (const [page, seen] of movedByPage) {
  if (seen.measurable < 3) continue;
  pagesChecked += 1;
  if (!seen.moved) {
    fail.push(`${page}: ${seen.measurable} tiles were read before and after a cut and not one of them changed. `
      + 'The cut is not reaching that page\'s data: either it is being ignored, or it resolves to everybody.');
  }
}

if (fail.length) {
  console.error('check-slicer-click FAILED');
  for (const f of fail) console.error('  - ' + f);
  process.exit(1);
}
console.log(`[check-slicer-click] ${ok} cuts driven across the admin, every one opened, walked and clicked, and every choice stuck. `
  + `Each slicer twice: a plain field::value cut and a derived one. ${none} offered no derived cut, which is what a field picker is. `
  + `On each of ${pagesChecked} pages, at least one tile's figures moved.`);
