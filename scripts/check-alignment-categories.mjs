/**
 * What may be drawn as an alignment category, on either surface.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Ellie: "Take it off the overview as a catagory."
 *
 * What It Is For asks which two of six things physical intimacy is mostly
 * about. The gap between two answers is how much the two sets overlap, so the
 * figure has four reachable values and over half of all the ways two people
 * can answer it come out at nought. Two people each naming something true and
 * naming different things was drawn as complete misalignment, and it is not a
 * disagreement at all.
 *
 * So an aspect goes on the overview's alignment list only if it has a position
 * on a scale. This gate holds four things:
 *
 *   1. The predicate is derived from the instrument, not a list of ids: it
 *      answers no for a dimension whose only questions are multi-select, and
 *      yes for one with any scale question, on dimensions invented here rather
 *      than read out of the product.
 *   2. Exactly the aspects it admits appear on the overview, on BOTH surfaces,
 *      measured by what each one iterates rather than by reading for a name.
 *   3. The whole-exercise figure and the action plan leave the others out,
 *      measured by running them.
 *   4. The excluded aspect keeps its own page. Taking it off the overview must
 *      not take away the chips, which are the honest way to show it.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the chips look right, and whether the remaining five are the right
 * five. The first is a design question and the second is Ellie's.
 */
import { readFileSync } from 'fs';
import {
  INTIMACY_DIMENSIONS, INTIMACY_QUESTIONS, isAlignmentCategory, summarizeIntimacy,
} from '../api/_intimacy-questions.js';
import { intimacyActionPlan } from '../api/_lib/intimacy-results.js';

const fails = [];
const fail = (m) => fails.push(m);

// ── 1: the predicate, on cases of our own ────────────────────────────────
// Read from the instrument, so a dimension that is all multi-select answers no
// however it is spelled. These ids are not in the product: the point is that
// the rule is about the questions rather than about a remembered name.
{
  const real = INTIMACY_DIMENSIONS.map((d) => d.id);
  if (real.some((id) => ['__scaleonly', '__multionly'].includes(id))) {
    fail('a test dimension id collides with a real one; rename it');
  }
  INTIMACY_QUESTIONS.push(
    { id: '__q1', dimension: '__scaleonly', kind: 'scale', options: [] },
    { id: '__q2', dimension: '__multionly', kind: 'multi', options: [] },
    { id: '__q3', dimension: '__multionly', kind: 'multi', options: [] },
  );
  if (!isAlignmentCategory('__scaleonly')) fail('a dimension with a scale question is not admitted');
  if (isAlignmentCategory('__multionly')) fail('a dimension whose questions are all multi-select is admitted');
  if (isAlignmentCategory('__nothing')) fail('a dimension with no questions at all is admitted');
  INTIMACY_QUESTIONS.length -= 3;
}

const admitted = INTIMACY_DIMENSIONS.filter((d) => isAlignmentCategory(d.id)).map((d) => d.id);
const excluded = INTIMACY_DIMENSIONS.filter((d) => !isAlignmentCategory(d.id)).map((d) => d.id);

if (!excluded.length) {
  fail('no aspect is excluded, so this gate is asserting nothing about the product.'
    + ' If What It Is For gained a scale question that is a decision, not a refactor.');
}

// ── 2: both surfaces iterate the admitted set, and nothing wider ─────────
// Matched on the iteration itself with its filter, not on a name appearing
// somewhere in the file: `data.dimensions.map(` with no filter is the bug.
{
  const app = readFileSync(new URL('../attune-app/src/components/results.tsx', import.meta.url), 'utf8');
  const site = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

  if (!/data\.dimensions\s*\.filter\(\(d\)\s*=>\s*d\.alignmentCategory\s*!==\s*false\)\s*\.map\(/.test(app.replace(/\s+/g, ' ').replace(/ \./g, '.'))) {
    fail('the app draws the overview list from data.dimensions without asking'
      + ' alignmentCategory, so it draws every aspect as a category');
  }
  if (!/INTIMACY_DIMENSIONS\.filter\(d\s*=>\s*isAlignmentCategory\(d\.id\)\)\.map\(/.test(site.replace(/\s+/g, ' '))) {
    fail('the website draws the overview list from INTIMACY_DIMENSIONS without'
      + ' asking isAlignmentCategory, so it draws every aspect as a category');
  }
  // The headline figure is the same mistake one line further on.
  if (!/isAlignmentCategory\(d\.id\)/.test(site.slice(site.indexOf('intimacyAlignRows') - 400, site.indexOf('intimacyAlignPct') + 400))) {
    fail('the website averages the headline intimacy percentage over aspects it'
      + ' does not treat as categories');
  }
}

// ── 3: the figures leave the others out, by running them ────────────────
{
  const opt = (id, v) => {
    const q = INTIMACY_QUESTIONS.find((x) => x.id === id);
    const o = (q.options || []).find((x) => x.value === v);
    return o ? o.label : null;
  };
  /*
   * Agree on everything inside an alignment category, and pick completely
   * different things on the multi-select questions of the aspects that are
   * NOT categories.
   *
   * The first version disagreed on every multi question and read 0.03 rather
   * than 0, which was the fixture rather than the product: Comfort & Safety
   * contains a multi question of its own, and that one is inside a category,
   * so its gap belongs in the figure. Only What It Is For is being taken out,
   * so only What It Is For may be disagreed about here.
   */
  const mine = {}, theirs = {};
  for (const q of INTIMACY_QUESTIONS) {
    const vals = (q.options || []).filter((o) => o.value != null).map((o) => o.value);
    if (q.kind === 'multi') {
      if (vals.length < 2) continue;
      const apart = excluded.includes(q.dimension);
      mine[q.id] = [vals[0]];
      theirs[q.id] = [apart ? vals[vals.length - 1] : vals[0]];
    } else {
      const label = opt(q.id, 0.5) ?? opt(q.id, 1);
      if (label) { mine[q.id] = label; theirs[q.id] = label; }
    }
  }
  const summary = summarizeIntimacy(mine, theirs);
  if (summary.overall !== 0) {
    fail(`two people who agree on every scale question read ${summary.overall} overall,`
      + ' not 0: a set-overlap gap is reaching the whole-exercise figure');
  }
  // And the excluded aspect is still measured on its own row, because its page
  // shows it. Not measuring it would be a different bug.
  for (const id of excluded) {
    const row = summary.dimSummary.find((d) => d.id === id);
    if (!row) { fail(`${id} is missing from dimSummary entirely`); continue; }
    if (row.avgGap == null) fail(`${id} has no figure of its own, so its page has nothing to draw`);
  }

  // The action plan ranks by distance, so a non-category must not be in it
  // even when it is the furthest apart thing on the board.
  const rows = INTIMACY_DIMENSIONS.map((d) => ({
    id: d.id, label: d.label, section: 'intimacy-' + d.id,
    alignmentCategory: isAlignmentCategory(d.id),
    state: 'different', distancePct: excluded.includes(d.id) ? 100 : 10,
  }));
  const plan = intimacyActionPlan(rows);
  const named = (plan || []).map((r) => r.id ?? r.dimension ?? r.section ?? '');
  for (const id of excluded) {
    if (named.some((n) => String(n).includes(id))) {
      fail(`${id} is in the action plan at the top, ranked by a distance that is`
        + ' set-overlap rather than a distance along anything');
    }
  }
  if (!named.length) fail('the action plan came back empty for five misaligned categories');
}

// ── 4: the excluded aspect keeps its own page ───────────────────────────
{
  const sections = readFileSync(new URL('../api/_lib/results-sections.js', import.meta.url), 'utf8');
  for (const id of excluded) {
    if (!sections.includes(`intimacy-${id}`) && !sections.includes('INTIMACY_DOMAINS')) {
      fail(`intimacy-${id} is no longer a section, so taking it off the overview took its page too`);
    }
  }
}

if (fails.length) {
  console.error('[check-alignment-categories] FAILED');
  for (const f of fails) console.error('  ✖ ' + f);
  process.exit(1);
}

console.log(`[check-alignment-categories] ${admitted.length} of ${INTIMACY_DIMENSIONS.length} aspects`
  + ` are alignment categories (${admitted.join(', ')}); ${excluded.join(', ')} is not, because its only`
  + ' questions are multi-select and a pick from a list has no position on a scale. Both overviews'
  + ' iterate the admitted set, the whole-exercise figure and the action plan leave the other out when'
  + ' run, and it keeps its own page and its own figure.');
