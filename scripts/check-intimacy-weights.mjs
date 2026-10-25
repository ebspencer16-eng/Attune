/**
 * Physical Intimacy question weights: the promise, not the current table.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Ellie: "Can we weight the intimacy questions the way we did for the comms
 * exercise so that you don't come out on those even intervals?"
 *
 * Every option in this exercise is worth 1, 0.75, 0.5, 0.25 or 0, so every gap
 * a scale question can produce is a multiple of a quarter. Under a plain mean a
 * dimension's bar could therefore only ever be a mean of quarters, which did
 * two bad things: it parked couples on round figures (Adventurousness had a one
 * in two chance of a round quarter), and it made two couples who disagree by
 * one step on DIFFERENT questions read identically.
 *
 * So this gate holds four things:
 *
 *   1. Every dimension with more than one question is weighted, the weights sum
 *      to 1, and they name exactly that dimension's questions.
 *   2. No dimension's weights are all equal. An equal table is this bug put
 *      back, and it would pass every other check here.
 *   3. A skipped question renormalises. Without that, every skip drags the bar
 *      towards perfect agreement and a couple who answered one of three reads
 *      as better aligned than a couple who answered three and disagreed.
 *   4. The weighting measurably reduces the chance of a round quarter, measured
 *      against the equal-split version of the same instrument, per dimension.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The numbers themselves. Whether Appetite deserves 0.60 is a methodology
 * judgement and it is Ellie's; this proves the shape of the table and what the
 * table does to the output, not that one question is more diagnostic than
 * another. The ceilings below are typed out as the product's promise rather
 * than read from INTIMACY_WEIGHTS, because a gate that reads its threshold from
 * the module it is checking is a gate comparing a function with itself.
 *
 * What It Is For is out of scope and that is not an oversight: it has one
 * question, so its weight is 1 whatever any table says and its bar still has
 * four possible values. Weighting cannot reach it. Whether it belongs on the
 * overview as an alignment category at all is W141 in TASKS.md.
 */
import {
  INTIMACY_QUESTIONS, INTIMACY_DIMENSIONS, INTIMACY_WEIGHTS,
  summarizeIntimacy,
} from '../api/_intimacy-questions.js';

const fails = [];
const fail = (m) => fails.push(m);

/** Each dimension's questions, from the instrument rather than from the table. */
const QS = {};
for (const d of INTIMACY_DIMENSIONS) {
  QS[d.id] = INTIMACY_QUESTIONS.filter((q) => q.dimension === d.id).map((q) => q.id);
}

// ── 1 and 2: the shape of the table ──────────────────────────────────────
for (const d of INTIMACY_DIMENSIONS) {
  const ids = QS[d.id];
  const table = INTIMACY_WEIGHTS[d.id];
  if (ids.length < 2) {
    if (table) fail(`${d.id} has one question but carries weights; a weight there reads as a decision that was made`);
    continue;
  }
  if (!table) { fail(`${d.id} has ${ids.length} questions and no weights, so it is back on an equal mean`); continue; }
  const sum = Object.values(table).reduce((a, w) => a + w, 0);
  if (Math.abs(sum - 1) > 1e-9) fail(`${d.id} weights sum to ${sum}, must be 1.0`);
  const listed = Object.keys(table).sort().join(',');
  if (listed !== [...ids].sort().join(',')) {
    fail(`${d.id} weights name [${listed}] but the dimension has [${[...ids].sort().join(',')}]`);
  }
  const vals = Object.values(table);
  if (vals.every((w) => Math.abs(w - vals[0]) < 1e-9)) {
    fail(`${d.id} weights are all ${vals[0]}, which is the equal mean this exists to replace`);
  }
}

// ── The gaps one question can produce, for the measurement below ─────────
function gapsFor(q) {
  if (q.kind !== 'multi') return [0, 0.25, 0.5, 0.75, 1];
  const opts = (q.options || []).filter((o) => o.value != null).map((o) => o.value);
  const maxSel = q.maxSelect || opts.length;
  const sets = [];
  const rec = (start, cur) => {
    if (cur.length) sets.push([...cur]);
    if (cur.length === maxSel) return;
    for (let i = start; i < opts.length; i++) { cur.push(opts[i]); rec(i + 1, cur); cur.pop(); }
  };
  rec(0, []);
  const out = new Set();
  for (const A of sets) for (const B of sets) {
    const sb = new Set(B);
    const inter = A.filter((x) => sb.has(x)).length;
    out.add(1 - inter / new Set([...A, ...B]).size);
  }
  return [...out];
}

/** Every reachable bar for a dimension, with how many ways it is reached. */
function barSpread(dimId, weights) {
  const qs = INTIMACY_QUESTIONS.filter((q) => q.dimension === dimId);
  const grids = qs.map(gapsFor);
  const bars = new Map();
  const walk = (i, acc) => {
    if (i === qs.length) {
      const bar = Math.round((1 - acc) * 100);
      bars.set(bar, (bars.get(bar) || 0) + 1);
      return;
    }
    const w = weights ? weights[qs[i].id] : 1 / qs.length;
    for (const g of grids[i]) walk(i + 1, acc + g * w);
  };
  walk(0, 0);
  let tot = 0, onQuarter = 0;
  for (const [bar, n] of bars) { tot += n; if (bar % 25 === 0) onQuarter += n; }
  return { distinct: bars.size, quarterPct: (100 * onQuarter) / tot };
}

// ── 4: what the weighting is worth, per dimension ────────────────────────
// Typed out as the promise. Measured 10.4, 5.6, 5.0, 5.6, 20.0 when written.
const CEILING = { frequency: 15, initiating: 10, comfort: 10, communication: 10, adventure: 25 };
const measured = [];
for (const d of INTIMACY_DIMENSIONS) {
  if (QS[d.id].length < 2) continue;
  const equal = barSpread(d.id, null);
  const weighted = barSpread(d.id, INTIMACY_WEIGHTS[d.id] || null);
  measured.push({ id: d.id, equal, weighted });
  const ceil = CEILING[d.id];
  if (ceil == null) { fail(`${d.id} has no ceiling written down, so nothing holds its resolution`); continue; }
  if (weighted.quarterPct > ceil) {
    fail(`${d.id} lands on a round quarter ${weighted.quarterPct.toFixed(1)}% of the time, over its ${ceil}% ceiling`);
  }
  if (!(weighted.quarterPct < equal.quarterPct)) {
    fail(`${d.id} is no better weighted (${weighted.quarterPct.toFixed(1)}%) than on an equal mean (${equal.quarterPct.toFixed(1)}%)`);
  }
  if (!(weighted.distinct > equal.distinct)) {
    fail(`${d.id} reaches ${weighted.distinct} bars weighted and ${equal.distinct} equally, so it resolves no finer`);
  }
}

// ── Fixtures built from the instrument, so they cannot go stale ──────────
const opt = (id, v) => {
  const q = INTIMACY_QUESTIONS.find((x) => x.id === id);
  const o = (q.options || []).find((x) => x.value === v);
  if (!o) throw new Error(`no option worth ${v} on ${id}`);
  return o.label;
};
const barOf = (dimId, mine, theirs) => {
  const d = summarizeIntimacy(mine, theirs).dimSummary.find((x) => x.id === dimId);
  return d.avgGap == null ? null : Math.round((1 - d.avgGap) * 100);
};

// ── 3: a skip renormalises ───────────────────────────────────────────────
// Communication, three questions. One pair answers all three and is a step
// apart on each. The other answers only the lightest one and is a step apart
// on it. Both are "a step apart on everything they answered", so the partial
// pair must not read as better aligned than the complete one.
{
  const ids = ['iq_comm_open', 'iq_comm_moment', 'iq_comm_debrief'];
  const allA = {}, allB = {};
  for (const id of ids) { allA[id] = opt(id, 1); allB[id] = opt(id, 0.75); }
  const full = barOf('communication', allA, allB);
  const partA = { iq_comm_debrief: opt('iq_comm_debrief', 1) };
  const partB = { iq_comm_debrief: opt('iq_comm_debrief', 0.75) };
  const part = barOf('communication', partA, partB);
  if (full !== 75) fail(`a step apart on all three Communication questions reads ${full}%, expected 75%`);
  if (part !== 75) fail(`a step apart on the one answered question reads ${part}%, expected 75%: the skipped weight was not renormalised away`);
  // And an unanswered dimension is not agreement.
  if (barOf('communication', {}, {}) !== null) fail('an unanswered dimension reports a bar instead of nothing');
}

// ── 5: disagreeing about different things reads differently ──────────────
{
  const same = opt('iq_adv_suggest', 1);
  const heavy = barOf('adventure',
    { iq_adv_appetite: opt('iq_adv_appetite', 1), iq_adv_suggest: same },
    { iq_adv_appetite: opt('iq_adv_appetite', 0.75), iq_adv_suggest: same });
  const sameA = opt('iq_adv_appetite', 1);
  const light = barOf('adventure',
    { iq_adv_appetite: sameA, iq_adv_suggest: opt('iq_adv_suggest', 1) },
    { iq_adv_appetite: sameA, iq_adv_suggest: opt('iq_adv_suggest', 0.75) });
  if (heavy === light) {
    fail(`one step apart on Appetite reads ${heavy}% and one step apart on Suggest reads ${light}%: identical, so the weighting is not reaching the output`);
  }
  if (heavy >= light) {
    fail(`disagreeing on the heavier question (${heavy}%) should read further apart than on the lighter one (${light}%)`);
  }
}

// ── Agreement still means agreement, and opposite still means opposite ───
for (const d of INTIMACY_DIMENSIONS) {
  const qs = INTIMACY_QUESTIONS.filter((q) => q.dimension === d.id && q.kind !== 'multi' && q.kind !== 'selfref');
  if (!qs.length) continue;
  const top = {}, bottom = {};
  for (const q of qs) { top[q.id] = opt(q.id, 1); bottom[q.id] = opt(q.id, 0); }
  if (barOf(d.id, top, top) !== 100) fail(`${d.id}: identical answers do not read 100%`);
  if (barOf(d.id, top, bottom) !== 0) fail(`${d.id}: opposite ends do not read 0%`);
}

if (fails.length) {
  console.error('[check-intimacy-weights] FAILED');
  for (const f of fails) console.error('  ✖ ' + f);
  process.exit(1);
}

const line = measured
  .map((m) => `${m.id} ${m.equal.distinct}→${m.weighted.distinct} bars, quarter ${m.equal.quarterPct.toFixed(0)}→${m.weighted.quarterPct.toFixed(0)}%`)
  .join('; ');
console.log(`[check-intimacy-weights] ${measured.length} weighted dimensions, every table summing to 1 over its own questions and none of them equal: ${line}. A skipped question renormalises rather than reading as agreement, and disagreeing on the heavier question reads further apart than on the lighter one. What It Is For has one question and is out of scope by construction.`);
