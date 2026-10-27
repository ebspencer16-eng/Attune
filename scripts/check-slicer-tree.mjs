#!/usr/bin/env node
/**
 * Every tile slicer is Ellie's taxonomy, and a derived cut actually cuts.
 *
 * ── WHAT SHE ASKED FOR ────────────────────────────────────────────────────
 * "I think the slicer dropdown in each tile should show high-level with arrows
 * to click into that section, the indented list below shows which sections
 * have more clicks or which are the final destination. There should be a back
 * arrow in the top left when you click into a detailed section, and users can
 * click to exactly what they're looking for" — followed by the whole taxonomy,
 * six sections and four levels deep in places.
 *
 * ── WHY THIS DRIVES RATHER THAN READS ─────────────────────────────────────
 * Two of the three things worth checking are invisible in the source.
 *
 * A branch that is drawn and does nothing when clicked looks finished. So the
 * check opens a real slicer, clicks a section, asserts something is under it
 * and that the back arrow returns.
 *
 * And most of her rows are not a column. "Children or No Children" regroups
 * five stored answers; "Energy & Recharge - Independent" is a band of a score;
 * "Household - aligned" is a percentage either side of a line. Each is a
 * predicate held in the page, and a predicate that matches everybody and a
 * predicate nothing consults produce the same screen: the tile keeps showing
 * the whole population. The only way to tell is to pick one and read the
 * count. CUTTEST does that, and reads every OTHER tile at the same time,
 * because "that selection should only change that tile" is her instruction
 * too and a shared filter is how it gets broken.
 *
 * ── WHAT IT DOES NOT COVER ────────────────────────────────────────────────
 * Whether the taxonomy matches her list row for row. That is a document, it
 * changes when she changes her mind, and a gate that encoded it would have to
 * be edited every time she did. What is held here is the mechanism: sections
 * that open, a way back, and a cut that cuts.
 */
import { execFileSync } from 'node:child_process';

const fail = [];
const run = (env) => {
  try {
    return execFileSync('node', ['scripts/probe-admin.mjs', 'demographics'], {
      env: { ...process.env, OUT: '/dev/null', ...env },
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 180000,
    });
  } catch (e) {
    fail.push('could not drive the admin: ' + String(e.message).split('\n')[0]);
    return '';
  }
};

/* ── THE SHAPE ─────────────────────────────────────────────────────────── */
const shape = run({ PICKER: 'slz-age' }).split('\n').filter((l) => l.trim().startsWith('picker '));
if (!fail.length && shape.length !== 1) {
  fail.push(`expected one picker report, got ${shape.length}. A gate that has lost its subject must not pass.`);
}
for (const line of shape) {
  let p;
  try { p = JSON.parse(line.trim().replace(/^picker /, '')); }
  catch (e) { fail.push('could not read the picker report'); continue; }
  if (p.err) { fail.push(p.err); continue; }
  if (!p.open) fail.push('the slicer did not open');
  /* Six sections is her list. Fewer than four means whole exercises have
     dropped out of the taxonomy, which is what a blank cube looks like too,
     and both are worth failing on. */
  if (!(p.sections >= 4)) fail.push(`only ${p.sections} sections in a tile slicer; her taxonomy has six`);
  if (p.bands !== p.sections) fail.push(`${p.sections} sections and ${p.bands} drawn`);
  if (p.missing) fail.push(`${p.missing} of ${p.leaves} leaves have no option in the select, so they cannot be chosen`);
  if (p.extra) fail.push(`${p.extra} options in the select that no row offers, so they are unreachable`);
  if (!p.drilled) fail.push('clicking a section opened nothing, or left no back arrow');
  if (!p.wentBack) fail.push('the back arrow did not return to the sections');
  if (!p.closes) fail.push('the panel did not close again');
}

/* ── THE CUT ───────────────────────────────────────────────────────────── */
const cuts = run({ CUTTEST: 'slz-age' }).split('\n').filter((l) => l.trim().startsWith('cuttest '));
if (!fail.length && cuts.length !== 1) fail.push(`expected one cuttest report, got ${cuts.length}`);
for (const line of cuts) {
  let c;
  try { c = JSON.parse(line.trim().replace(/^cuttest /, '')); }
  catch (e) { fail.push('could not read the cuttest report'); continue; }
  if (c.err) { fail.push(c.err); continue; }
  const before = c.before || [], after = c.after || [];
  if (before.length !== after.length || !before.length) { fail.push('no tiles reported a count'); continue; }
  const mine = c.mine;
  if (!(mine >= 0)) { fail.push('could not tell which tile the slicer belongs to'); continue; }
  if (!(after[mine] < before[mine])) {
    fail.push(`"${c.label}" left its own tile at n=${after[mine]}: a derived cut that changes nothing is a cut nothing consults`);
  }
  if (after[mine] === 0) {
    fail.push(`"${c.label}" emptied its tile, which is a predicate that matches nobody`);
  }
  before.forEach((n, i) => {
    if (i !== mine && n !== after[i]) {
      fail.push(`choosing a cut on one tile changed another: tile ${i} went from n=${n} to n=${after[i]}`);
    }
  });
}

if (fail.length) {
  console.error('check-slicer-tree FAILED');
  for (const f of fail) console.error('  - ' + f);
  process.exit(1);
}
console.log('[check-slicer-tree] a tile slicer opens on her sections, drills in and back out, '
  + 'and a derived cut narrows its own tile and no other.');
