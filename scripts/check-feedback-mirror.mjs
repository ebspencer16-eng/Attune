#!/usr/bin/env node
/**
 * The per-dimension verdict is computed twice, and the two have to agree.
 *
 * ── WHAT THE TWO COPIES ARE ───────────────────────────────────────────────
 * `generatePersonalityFeedback` in src/App.jsx and `personalityFeedback` in
 * api/_lib/comms-plan.js. Same rule: take two people's scores on a dimension,
 * decide whether they are matched, close, or genuinely apart, and pick the
 * sentence that goes with that. The website runs its copy; the app is served
 * the server's through the comms plan.
 *
 * Neither can import the other. src/App.jsx is JSX and an Expo project cannot
 * read api/, which is the same wall every entry in this directory is about.
 *
 * ── WHY IT IS WORTH A GATE WITH NOTHING CURRENTLY WRONG ───────────────────
 * This was found by asking O480's question and following it: does the website's
 * composition agree with the server's over one couple? Three things that looked
 * like divergences turned out not to be, and each took a measurement to rule
 * out rather than a reading:
 *
 *   The couple type differed, WZ against WY. That was my error: the demo path
 *   types from four archetypes, not from Sarah and James, so I had compared two
 *   different couples. See api/_lib/demo-archetypes.js.
 *
 *   The website looked like it fed blended scores where the server feeds
 *   self-report, which would change the gap and therefore the sentence. All
 *   three call sites use calcDimScores. The blend is used for the couple type,
 *   which is correct and is said in a comment beside each one.
 *
 *   The thresholds looked like they differed, 1.5 on the server against 0.75 on
 *   the website. Different fields: ALIGNMENT_THRESHOLD drives
 *   content.dimensions[].shift, and the tile both surfaces draw comes from this
 *   pair of functions, which use the same two numbers.
 *
 * So they agree today, in every respect, and nothing says they must. That is
 * the state every duplicated rule in this repo was in on the day before it
 * drifted. The labels and the two thresholds are each written out in both
 * files.
 *
 * ── HOW IT DECIDES ────────────────────────────────────────────────────────
 * By running them, not by reading them. The website's copy is lifted out of
 * src/App.jsx by brace depth, the same way check-card-type-clipping lifts the
 * app's card sizer, and both are run over every pair of scores the product can
 * produce. A gate that describes a rule can be satisfied by code that does
 * something else; one that executes both copies and compares the answers
 * cannot.
 *
 * The grid is every (a, b) in 1..5 at quarter steps, which is 289 pairs per
 * dimension and 2890 in total, and it covers both threshold boundaries from
 * each side. Scores are means of five answers, so quarter steps are finer than
 * the product can actually land on.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Which of the two verdicts is right. They are the same rule and this only
 * proves they stay the same rule.
 *
 * Where either result is rendered. The website's goes through dimAdviceFor and
 * the app's through the comms plan's tiles, and those are different surfaces
 * with different layouts, which is allowed. check-section-blocks is what holds
 * the two pages to the same inventory.
 *
 * content.dimensions[].shift and .aligned, which are a third selection on a
 * stricter threshold. They are read by nothing: added in 897bff6b so the app
 * would stop saying "One of your wider differences", then orphaned eleven days
 * later when 0b0eee75 rebuilt the communication pages around one tile per
 * domain. Named here rather than checked, because a gate over a field nobody
 * renders would be protecting nothing.
 */

import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';

import { personalityFeedback } from '../api/_lib/comms-plan.js';
import { contentFor } from '../api/_content/index.js';
import { DIMENSION_DISPLAY_ORDER } from '../api/_lib/comm-domains.js';
import { DIM_META as SHARED_DIM_META } from '../api/_workbook-content.js';
import { getDimShift } from '../api/_lib/dimension-copy.js';

const ROOT = new URL('..', import.meta.url).pathname;
const src = readFileSync(`${ROOT}src/App.jsx`, 'utf8');

/**
 * Lift a top-level declaration out of src/App.jsx by brace depth.
 *
 * Throws rather than returning empty. A gate that has lost its subject must
 * never report success, and the way this one would lose its subject is a
 * rename, which is silent.
 */
function lift(opening) {
  const start = src.indexOf(opening);
  if (start === -1) {
    throw new Error(`src/App.jsx no longer contains \`${opening}\`.\n`
      + '  Either it was renamed, in which case point this gate at the new name, or\n'
      + '  the website stopped computing its own per-dimension verdict, in which case\n'
      + '  there is one copy of the rule and this file should be deleted with it.\n'
      + '  Refusing to pass either way.');
  }
  let depth = 0;
  for (let i = src.indexOf('{', start); i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error(`could not find the end of \`${opening}\` in src/App.jsx.`);
}

/**
 * The two names the lifted function reaches for that are not lifted with it.
 *
 * Imported from the same modules src/App.jsx imports them from, by absolute
 * path because this runs as a data: URL and has no directory of its own. If
 * the website ever stopped importing these and declared its own, that would be
 * a duplication this gate could not see, which is why they are named here
 * rather than stubbed: a stub would make the comparison vacuous.
 */
const deps = `
import { DIMENSION_DISPLAY_ORDER } from '${new URL('../api/_lib/comm-domains.js', import.meta.url).href}';
import { getDimShift } from '${new URL('../api/_lib/dimension-copy.js', import.meta.url).href}';
`;

const websiteSource = `
${deps}
${lift('const DIM_META = {')};
${lift('function generatePersonalityFeedback(')}
export { generatePersonalityFeedback };
`;

/* Types stripped rather than parsed: this is plain JavaScript, but running it
   through esbuild is what makes the lift robust to a stray annotation. */
const compiled = transformSync(websiteSource, { loader: 'jsx', format: 'esm' }).code;
const mod = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const websiteFeedback = mod.generatePersonalityFeedback;

const copy = contentFor(null);
const YOU = 'Sarah';
const THEM = 'James';

/**
 * The server's labels come from the server's module, not from the website's.
 *
 * The first version of this lifted DIM_META out of src/App.jsx and passed those
 * labels to BOTH copies, which made the comparison vacuous for every sentence
 * that names an end of a scale: changing "Responsive" to "Attentive" in the
 * website's table changed the server's input too, both sides moved together,
 * and the gate reported agreement. Planted against, and it passed.
 *
 * api/results.js builds its dimension list from api/_workbook-content.js, so
 * that is where these have to come from. The website reading its own copy of
 * the same ten labels is exactly the duplication under test.
 */
const DIM_LABELS = {};
for (const [key, m] of Object.entries(SHARED_DIM_META)) {
  DIM_LABELS[key] = { label: m.label, left: m.left, right: m.right };
}

const fails = [];
let compared = 0;

/**
 * ── THE TEN LABELS, WHICH ARE ALSO WRITTEN OUT TWICE ──────────────────────
 * DIM_META exists in src/App.jsx and in api/_workbook-content.js, with the same
 * ten dimensions, the same display names and the same pair of ends. The website
 * reads its copy; everything the app sees comes from the other.
 *
 * The sentences below cannot see a difference in capitalisation, because every
 * one of them lowercases the label before using it. Planted against with "Bids
 * for Connection" changed to "Bids For Connection" and the comparison passed,
 * while the two surfaces would have been printing different headings. The
 * sentence check is not the label check; this is.
 */
{
  const site = {};
  const meta = lift('const DIM_META = {');
  for (const m of meta.matchAll(/(\w+):\s*\{[^}]*?label:\s*"([^"]*)"[^}]*?ends:\s*\["([^"]*)","([^"]*)"\]/g)) {
    site[m[1]] = { label: m[2], left: m[3], right: m[4] };
  }
  if (!Object.keys(site).length) {
    console.error("[check-feedback-mirror] could not read a single dimension out of the"
      + " website's DIM_META. Refusing to pass: a gate that has lost its subject must"
      + ' never report success.');
    process.exit(1);
  }
  for (const key of new Set([...Object.keys(site), ...DIMENSION_DISPLAY_ORDER])) {
    const a = site[key];
    const b = SHARED_DIM_META[key];
    if (!a) { fails.push(`${key} is a dimension the server knows and the website's DIM_META does not.`); continue; }
    if (!b) { fails.push(`${key} is in the website's DIM_META and not in the shared one.`); continue; }
    for (const [field, x, y] of [['label', a.label, b.label], ['left end', a.left, b.left], ['right end', a.right, b.right]]) {
      if (x === y) continue;
      fails.push(`${key}: the ${field} is ${JSON.stringify(x)} on the website and`
        + ` ${JSON.stringify(y)} on the server, so the same dimension is named two ways.`);
    }
  }
}

/**
 * Positions, and the gaps that matter.
 *
 * A grid of round numbers is the wrong shape for a rule made of thresholds. The
 * first version stepped by 0.25, so the closest it ever came to the 0.75 line
 * was 0.75 itself, and moving the website's threshold to 0.80 changed nothing
 * it could see: the plant landed, the file changed, and the gate passed. A
 * plant that changes nothing proves nothing, and neither does a grid that
 * cannot straddle the line it is checking.
 *
 * So the gaps are chosen around the two thresholds rather than swept: either
 * side of each by a hundredth, plus the ordinary spread. The positions still
 * sweep, because which end of the scale each person sits on decides the wording
 * and that turns on 3, not on the gap.
 */
const GAPS = [0, 0.3, 0.74, 0.749, 0.75, 0.751, 0.76, 0.8, 1, 1.2, 1.49, 1.499, 1.5, 1.501, 1.51, 1.6, 2, 2.5, 3, 4];
const POSITIONS = [];
for (let a = 1; a <= 5.0001; a += 0.25) POSITIONS.push(Number(a.toFixed(2)));

for (const dim of DIMENSION_DISPLAY_ORDER) {
  const meta = DIM_LABELS[dim];
  if (!meta) {
    fails.push(`${dim} is in DIMENSION_DISPLAY_ORDER and the shared DIM_META has no`
      + ' entry for it, so the server is labelling it from a fallback.');
    continue;
  }
  for (const a of POSITIONS) {
    for (const g of GAPS) {
      for (const b of [Number((a + g).toFixed(3)), Number((a - g).toFixed(3))]) {
        if (b < 1 || b > 5) continue;
      const site = websiteFeedback({ [dim]: a }, { [dim]: b }, YOU, THEM, copy)
        .find((f) => f.dim === dim);
      const server = personalityFeedback({
        dimensions: [{ key: dim, label: meta.label, left: meta.left, right: meta.right, a, b }],
        viewer: 'a',
        youName: YOU,
        themName: THEM,
        copy,
      })[0];
      compared += 1;

      for (const field of ['isStrength', 'isNote', 'isOpportunity', 'strengthText', 'insightText', 'adviceText']) {
        if (site[field] === server[field]) continue;
        if (fails.length > 8) continue;
        fails.push(`${dim} at ${a} and ${b}: \`${field}\` differs.\n`
          + `      website: ${JSON.stringify(site[field])?.slice(0, 150)}\n`
          + `      server : ${JSON.stringify(server[field])?.slice(0, 150)}`);
      }
      }
    }
  }
}

if (!compared) {
  console.error('[check-feedback-mirror] compared nothing. Refusing to pass: a gate that'
    + ' has lost its subject must never report success.');
  process.exit(1);
}

if (fails.length) {
  console.error('\n check-feedback-mirror: the two copies of the per-dimension verdict'
    + ' no longer agree.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  console.error('  src/App.jsx decides this for the website and api/_lib/comms-plan.js'
    + ' decides it for\n  the app. The same couple now reads two different things about'
    + ' the same dimension\n  depending on which screen they opened.\n');
  process.exit(1);
}

console.log(`[check-feedback-mirror] ${DIMENSION_DISPLAY_ORDER.length} dimensions:`
  + ' the two copies of DIM_META name them identically, and over'
  + ` ${compared} score pairs straddling both thresholds the website's verdict and the`
  + " server's agree on the band and on all three sentences.");
