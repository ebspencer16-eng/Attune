/**
 * One place can draw a number on a bar, and it is off by default.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Ellie, three times:
 *   "I don't want labels inside of the columns on package split over time,
 *    just have the hover ability."
 *   "remove data labels anywhere they exist in admin, I want hover instead on
 *    everything."
 *   "No data labels above the columns on self v partner view gap. I mentioned
 *    earlier but please remove those anywhere they exist in admin."
 *
 * She mentioned it earlier and it was still there, because admin.html had TWO
 * implementations: the `valueLabels` plugin mkChart gives every bar chart, and
 * `svValueOnTop` inside svBarChart, written for its own reason. Turning off the
 * first and reporting the labels gone is the exact shape this repo keeps
 * failing in, and it took a third report to find the second copy.
 *
 * This is the earlier instruction kept too, because it is why the one plugin
 * still exists rather than being deleted:
 *
 *   "I want all of the columns to be labeled in the self vs partner view gap on
 *    responses page - on all columns throughout admin I want that."
 *
 * ── WHAT IT HOLDS ─────────────────────────────────────────────────────────
 *   1. Exactly one place in admin.html writes text onto a chart canvas.
 *   2. It is the `valueLabels` plugin, and it is opt-in: the guard reads
 *      `=== true`, so a chart gets labels only by asking.
 *   3. Nothing asks today.
 *
 * ── WHAT IT DOES NOT COVER ────────────────────────────────────────────────
 * Axis ticks and tooltips, which are Chart.js drawing its own furniture and
 * are the readout she asked for instead. And text drawn by the website or the
 * app: this is scoped to the admin, which is where she reported it.
 */
import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const src = readFileSync(`${ROOT}public/admin.html`, 'utf8');
const fails = [];

/* Comments quote her instruction and name the plugin, so a sentence about why
   labels are gone must not read as drawing one. Blanked, not removed, so the
   line numbers below still point at the file. */
const code = src
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/^\s*\/\/.*$/gm, '');

const lines = code.split('\n');

// ── 1: who writes text on a canvas ───────────────────────────────────────
const writers = [];
lines.forEach((l, i) => { if (/\.fillText\s*\(|\.strokeText\s*\(/.test(l)) writers.push(i + 1); });

/* Which plugin each one is inside: the nearest `id: '...'` above it. */
const pluginOf = (lineNo) => {
  for (let i = lineNo - 1; i >= 0 && i > lineNo - 80; i--) {
    const m = /\bid:\s*'([^']+)'/.exec(lines[i]);
    if (m) return m[1];
  }
  return null;
};

const ALLOWED = 'valueLabels';
const byPlugin = new Map();
for (const ln of writers) {
  const id = pluginOf(ln);
  if (!byPlugin.has(id)) byPlugin.set(id, []);
  byPlugin.get(id).push(ln);
}
for (const [id, at] of byPlugin) {
  if (id !== ALLOWED) {
    fails.push(`a second place draws text on a chart canvas: plugin ${id === null ? '(unnamed)' : `\`${id}\``}`
      + ` at line${at.length > 1 ? 's' : ''} ${at.join(', ')}.`
      + ` Only \`${ALLOWED}\` may, and it is off by default. This is how the labels survived two rounds of`
      + ' being removed: one copy was turned off and the other went on drawing.');
  }
}

// ── 2: it is opt-in, not opt-out ─────────────────────────────────────────
const guard = /if\s*\(\s*cfg\.type\s*===\s*'bar'\s*&&\s*o\.plugins\.valueLabels\s*===\s*true\s*\)/.test(code);
if (!guard) {
  if (/o\.plugins\.valueLabels\s*!==\s*false/.test(code)) {
    fails.push('the valueLabels guard reads `!== false`, which labels every bar chart unless it opts out.'
      + ' She asked for the opposite: hover on everything, labels only where asked for.');
  } else {
    fails.push('the valueLabels guard is not `=== true`, so whether a chart gets labels is no longer a'
      + ' question the chart asks.');
  }
}

// ── 3: nothing asks ──────────────────────────────────────────────────────
const asks = [...code.matchAll(/valueLabels\s*:\s*true/g)].length;
if (asks) {
  fails.push(`${asks} chart(s) ask for valueLabels: true. Nothing should today; if one is meant to, this`
    + ' line is where to record that she asked for it.');
}

if (fails.length) {
  console.error('[check-no-bar-labels] admin.html is drawing numbers on bars again:');
  for (const f of fails) console.error('  ✖ ' + f);
  process.exit(1);
}

console.log(`[check-no-bar-labels] one place in admin.html can write on a chart canvas, \`${ALLOWED}\`,`
  + ' guarded on `=== true` so a chart has to ask; nothing asks. Axis ticks and tooltips are untouched,'
  + ' because the hover is the readout she asked for in their place.');
