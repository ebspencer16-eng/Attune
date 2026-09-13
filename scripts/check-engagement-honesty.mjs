// Fails the build when the Engagement tab could show a measure as zero that
// is simply not collected.
//
// ── WHY THIS IS THE RULE ───────────────────────────────────────────────────
// Ellie asked for nine measures. Four come from what the product stores. Five
// would need the site to start recording things it does not record: visits,
// downloads, and how long someone spent on a page.
//
// An empty chart and a chart of zeros look the same. A dashboard that cannot
// tell "nobody did this" from "we do not measure this" is how a business ends
// up confident about a number nobody produced, and this repo has the same
// story already: a copy-review document showed ten action items the product
// has never rendered, and ten pieces of copy were approved that nobody would
// ever read.
//
// So: every measure the endpoint reports as unavailable must reach the page as
// a sentence saying what collecting it would take, and never as a series.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// 1. Every unavailable measure carries a `needs` explaining itself.
// 2. The page renders each of them in the "Not measured yet" list.
// 3. No unavailable measure is passed to a chart.
//
// ── WHAT IT DOES NOT COVER ─────────────────────────────────────────────────
// Whether the four live measures are counted correctly. They are arithmetic
// over rows and the endpoint says what each one counts; this is about the
// difference between a fact and a blank.

import { readFileSync } from 'fs';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (f) => readFileSync(`${ROOT}${f}`, 'utf8');

const api = read('api/admin-engagement.js');
const html = read('public/admin.html');

const problems = [];

// Every measure that can come back unavailable, by the name it is returned
// under. Two shapes, because four of them are measured when there is data and
// unavailable when there is not:
//
//   siteVisits: unavailable('...')        always unavailable
//   siteVisits: notYet,                   unavailable only while empty
//
// Derived from the source, so one added tomorrow is covered tomorrow.
const UNAVAILABLE = [...new Set([
  ...[...api.matchAll(/^\s*(\w+):\s*unavailable\(/gm)].map((m) => m[1]),
  ...[...api.matchAll(/^\s*(\w+):\s*notYet,/gm)].map((m) => m[1]),
])];

if (UNAVAILABLE.length < 3) {
  console.error(`[check-engagement-honesty] only found ${UNAVAILABLE.length} measures that can be`);
  console.error('  unavailable; the shape they are declared in has changed. Refusing to pass.');
  process.exit(1);
}

// ── 1. Each says what it would take ───────────────────────────────────────
for (const m of api.matchAll(/unavailable\(\s*'([^']*)'/g)) {
  if (m[1].trim().length >= 40) continue;
  problems.push(`an unavailable measure explains itself in ${m[1].length} characters: "${m[1]}"`);
}
// Every unavailable() call carries a sentence, which is what the tile shows.
const explained = [...api.matchAll(/unavailable\(\s*'/g)].length;
const calls = [...api.matchAll(/unavailable\(/g)].length;
if (explained !== calls) {
  problems.push(
    `${calls} calls to unavailable() and ${explained} of them say why.\n`
    + '      A tile that says "not measured" and stops is a tile nobody can act on.');
}

// ── 2. The page lists every one of them ───────────────────────────────────
// Two ways a measure may reach the page honestly: the MISSING list, which
// prints the sentence, or drawTimeTile, which prints it when the measure says
// it is unavailable and draws only when it does not.
const missingBlock = (() => {
  const at = html.indexOf('const MISSING = [');
  if (at < 0) return null;
  return html.slice(at, html.indexOf('].filter', at) + 1 || html.indexOf('];', at));
})();
const tiles = [...html.matchAll(/drawTimeTile\([^;]*?d\.(\w+)/g)].map((m) => m[1]);

if (!missingBlock) {
  problems.push('public/admin.html has no MISSING list, so the unmeasured ones reach the page as nothing at all.');
} else {
  for (const name of UNAVAILABLE) {
    if (missingBlock.includes(`d.${name}`) || tiles.includes(name)) continue;
    problems.push(
      `${name} can come back not collected and the Engagement page never shows it.\n`
      + '      It disappears instead of saying what it would take.');
  }
}

// Every tile is wired to a measure, not to nothing.
//
// This is a narrower fault than the one above and it survived the first
// version: a tile handed `null` draws the "not measured" sentence, so the page
// never shows a blank as a number. It shows the opposite, a measure that
// exists reported as missing, which is the same confusion pointed the other
// way.
for (const m of html.matchAll(/drawTimeTile\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*([^,]+),/g)) {
  const [, canvas, , measure] = m;
  if (/^d\.\w+$/.test(measure.trim())) continue;
  problems.push(
    `the tile on #${canvas} is passed ${measure.trim()} rather than a measure.\n`
    + '      It will always say "not measured", whether or not it is.');
}

// drawTimeTile is the only thing allowed to decide; it has to be the thing
// that checks. Without this the helper could draw a chart of nothing and every
// name would still appear to be handled.
if (!/measure\.available === false/.test(html)) {
  problems.push(
    'drawTimeTile does not check `available` before drawing.\n'
    + '      A measure that is not collected would reach a chart as an empty one.');
}

// ── 3. None of them is drawn as a series ──────────────────────────────────
const charts = [...html.matchAll(/mkChart\(document\.getElementById\('chart-eng-[^']*'\), \{[\s\S]*?\n  \}\);/g)]
  .map((m) => m[0]).join('\n');
for (const name of UNAVAILABLE) {
  if (!new RegExp(`\\bd\\.${name}\\b`).test(charts)) continue;
  problems.push(
    `${name} is not collected and is passed to a chart.\n`
    + '      It would draw as zero, which is the one thing this must not do.');
}

if (problems.length) {
  console.error('[check-engagement-honesty] the Engagement tab could show a blank as a number:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(
  `[check-engagement-honesty] ${UNAVAILABLE.length} measures can come back uncollected; `
  + 'every one says what it would take, and none is drawn as a chart.');
