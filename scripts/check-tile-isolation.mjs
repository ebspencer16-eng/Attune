#!/usr/bin/env node
/**
 * A control changes its own tile, and a page opens with no cut on it.
 *
 * ── TWO RULES, BOTH ASKED FOR TWICE ───────────────────────────────────────
 * Ellie: "Why are the other charts changing when I select a different pill
 * from the detailed results pages tile? That selection should only change
 * that tile." Reported, fixed, and reported again, because the first fix was
 * real and was not the cause: a shared axis ceiling was flattening the other
 * four, AND the pill's handler called the function that draws all five. The
 * numbers were right and the page moved.
 *
 * And: "VERY important to me that slices reset when you navigate out of a
 * page to a different one. Every time you open a page the slices should be
 * reset to everyone."
 *
 * ── WHY IT DRIVES ─────────────────────────────────────────────────────────
 * Neither is visible in the source. A handler that redraws four tiles with
 * the same numbers looks identical in the markup to one that redraws nothing,
 * and a reset that sets `.value` without telling the tile looks identical to
 * one that works. So this taps a real pill in a real browser and reads every
 * chart's instance id: mkChart destroys and rebuilds, so a redrawn tile has a
 * new id even when its data has not moved. That redraw, with its animation,
 * is what "the others are changing" looked like.
 */
import { execFileSync } from 'node:child_process';

const fail = [];
const run = (page, env) => {
  try {
    return execFileSync('node', ['scripts/probe-admin.mjs', page], {
      env: { ...process.env, OUT: '/dev/null', ...env },
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 180000,
    });
  } catch (e) {
    fail.push('could not drive the admin: ' + String(e.message).split('\n')[0]);
    return '';
  }
};

/* ── ONE PILL, ONE TILE ─────────────────────────────────────────────────── */
const pill = run('engagement', { PILLPROBE: '1' }).split('\n')
  .map((l) => l.trim()).filter((l) => l.startsWith('pillprobe '));
if (!fail.length && pill.length !== 1) fail.push(`expected one pillprobe report, got ${pill.length}`);
for (const line of pill) {
  let p;
  try { p = JSON.parse(line.replace(/^pillprobe /, '')); } catch (e) { fail.push('could not read the pillprobe report'); continue; }
  if (!p.tapped) { fail.push('there was no second pill to tap; this gate has lost its subject'); continue; }
  if (p.charts < 4) fail.push(`only ${p.charts} charts on the Engagement page; the probe is looking at the wrong page`);
  if (!p.changed.includes('chart-eng-det')) {
    fail.push('tapping a pill did not change the tile it belongs to, so the pill does nothing');
  }
  const others = p.changed.filter((c) => c !== 'chart-eng-det');
  if (others.length) {
    fail.push(`tapping a pill also redrew ${others.join(', ')}. A selection changes its own tile and no other.`);
  }
}

/* ── A PAGE OPENS WITH NO CUT ON IT ─────────────────────────────────────── */
/* ── ON A PAGE THAT DOES NOT REDRAW ITSELF ────────────────────────────────
   Demographics re-renders every tile on open, deliberately, so its tiles come
   back correct whether the reset told them or not: the plant that removed the
   change event passed there. Order Details builds its charts once, so a reset
   that does not reach the tile is visible. Choose the page where the thing
   can fail. */
const reset = run('orders', { RESETPROBE: 'slz-pdisc:demographics' }).split('\n')
  .map((l) => l.trim()).filter((l) => l.startsWith('resetprobe '));
if (!fail.length && reset.length !== 1) fail.push(`expected one resetprobe report, got ${reset.length}`);
for (const line of reset) {
  let r;
  try { r = JSON.parse(line.replace(/^resetprobe /, '')); } catch (e) { fail.push('could not read the resetprobe report'); continue; }
  if (r.err) { fail.push(r.err); continue; }
  if (!r.set) { fail.push('nothing could be selected, so the reset was never tested'); continue; }
  if (r.after.value) fail.push(`the cut survived leaving the page: the slicer still holds ${r.after.value}`);
  if (r.after.button && r.after.button !== 'Everyone') {
    fail.push(`the slicer's button still reads "${r.after.button}" after coming back`);
  }
  /* ── AND THE TILE HAS TO HEAR ABOUT IT ────────────────────────────────
     A reset that sets `.value` without dispatching a change leaves the
     dropdown saying Everyone over a chart still drawing the cut. Reading the
     control alone passed exactly that plant, so the tile's own data is read
     before the cut and after coming back, and they have to match. */
  if (r.tileSame === false) {
    fail.push(`the slicer says Everyone and its tile is still showing the cut `
      + `(it read "${r.uncutSub}" before and "${r.backSub}" after)`);
  }
  if (r.tileSame == null) fail.push('could not read the tile behind that slicer, so the reset is unmeasured');
}

if (fail.length) {
  console.error('check-tile-isolation FAILED');
  for (const f of fail) console.error('  - ' + f);
  process.exit(1);
}
console.log('[check-tile-isolation] a pill redraws its own tile and no other, and a cut does not survive leaving the page.');
