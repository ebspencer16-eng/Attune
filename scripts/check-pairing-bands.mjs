#!/usr/bin/env node
/**
 * The band a couple is told they are in is the band they are counted in.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * One number, their average gap across the ten dimensions, banded into four
 * buckets twice with different cut points.
 *
 *   `overallPairingLabel` in src/App.jsx, which the couple reads on their
 *   results page: 0.75, 1.50, 2.25.
 *
 *   a `gapTier` expression a few thousand lines further down, which is what
 *   /api/track-type stores and the admin charts: 1.0, 1.8, 2.5.
 *
 * Measured across the plausible range, those two put the same couple in
 * different buckets 19% of the time, and always in the same direction: the
 * admin counted a couple as more aligned than they had been told. A couple at
 * 0.9 reads "Compatible" and was counted "aligned". At 1.6, "Complementary"
 * counted as "compatible". At 2.4, "Distinctly different" counted as
 * "complementary".
 *
 * Neither number was wrong on its own and nothing failed. Ellie reads the admin
 * to find out what customers are like, so the chart was answering a question
 * about a different product from the one people saw. This is the same shape as
 * the admin scoring with a plain average where the engine weights: a figure she
 * trusts, computed by a second rule.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * By running both, not by reading them. Every value either side of every cut
 * point by a hundredth, plus a sweep: the label and the tier have to name the
 * same band. A grid of round numbers is the wrong shape for a rule made of
 * thresholds, which is why the boundaries are tested by name rather than hoped
 * for; that lesson cost check-feedback-mirror two blind plants.
 *
 * And that nobody bands the average gap themselves. Matched by what the code
 * does, because the copy that drifted was an inline ternary chain with no name
 * at all: three numeric comparisons returning one of four strings.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the cut points are the right ones, which is Ellie's. They are
 * multiples of STRENGTH in comms-plan.js, so they move with the threshold that
 * already decides whether one dimension reads as a strength, and
 * check-feedback-mirror holds that threshold against the website.
 *
 * And the per-dimension bands, which are that same threshold pair and are
 * check-feedback-mirror's subject. This is the whole-couple average only.
 *
 * Counts already in the store were tiered under the old cut points, so a
 * historic "aligned" may be a couple this would now call "compatible". The
 * labels did not change, only the lines between them, which means old and new
 * counts mix silently. That is named in TASKS.md rather than mended here.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { PAIRING_BANDS, PAIRING_TIERS, pairingLabel, pairingTier } from '../api/_lib/pairing.js';
import { STRENGTH } from '../api/_lib/comms-plan.js';
import {
  READ_BANDS, UNDERSTANDING_BANDS, readBandFor, understandingBandFor,
} from '../api/_lib/results.js';

const ROOT = new URL('..', import.meta.url).pathname;
const HOME = 'api/_lib/pairing.js';
const fails = [];

/* A gate that has lost its subject must never report success. */
if (PAIRING_BANDS.length !== 4 || PAIRING_TIERS.length !== 4) {
  console.error(`[check-pairing-bands] ${HOME} no longer describes four bands. Refusing to pass.`);
  process.exit(1);
}
if (PAIRING_BANDS[0].upTo !== STRENGTH) {
  console.error(`[check-pairing-bands] the first band closes at ${PAIRING_BANDS[0].upTo} and`
    + ` STRENGTH is ${STRENGTH}. The bands are meant to be multiples of that threshold, so that`
    + ' moving it moves them. Refusing to pass.');
  process.exit(1);
}

/** The label and the tier name the same band, at and around every cut. */
const cuts = PAIRING_BANDS.map((b) => b.upTo).filter((v) => Number.isFinite(v));
const probes = new Set([0, 0.01, 10]);
for (const c of cuts) {
  probes.add(Number((c - 0.01).toFixed(2)));
  probes.add(c);
  probes.add(Number((c + 0.01).toFixed(2)));
}
for (let g = 0; g <= 4.0001; g += 0.05) probes.add(Number(g.toFixed(2)));

const labelOf = new Map(PAIRING_BANDS.map((b) => [b.label, b.tier]));
let checked = 0;
for (const g of [...probes].sort((a, b) => a - b)) {
  checked += 1;
  const label = pairingLabel(g);
  const tier = pairingTier(g);
  if (labelOf.get(label) !== tier) {
    fails.push(`an average gap of ${g} reads as "${label}" and is counted as "${tier}",`
      + ' which are different bands.');
  }
}

/* And nobody bands it themselves. */
function files(dir, out = []) {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, name);
    if (statSync(join(ROOT, rel)).isDirectory()) {
      if (/node_modules|\.expo|dist/.test(name)) continue;
      files(rel, out);
      continue;
    }
    if (/\.(js|jsx|ts|tsx)$/.test(name)) out.push(rel);
  }
  return out;
}
const TIER_RE = new RegExp(PAIRING_TIERS.map((t) => `["']${t}["']`).join('[\\s\\S]{0,200}?'));
const LABEL_RE = new RegExp(PAIRING_BANDS.map((b) => `["']${b.label}["']`).join('[\\s\\S]{0,200}?'));
let scanned = 0;
for (const rel of ['api', 'src', 'attune-app/src'].flatMap((d) => files(d))) {
  if (rel === HOME) continue;
  scanned += 1;
  const src = readFileSync(join(ROOT, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + ' '.repeat(m.length - p.length));
  for (const [what, re] of [['the four tiers', TIER_RE], ['the four labels', LABEL_RE]]) {
    const m = re.exec(src);
    if (!m) continue;
    /* A list of the four is fine; deciding BETWEEN them from a number is not. */
    if (!/[<>]=?\s*[\d.]/.test(m[0])) continue;
    fails.push(`${rel}:${src.slice(0, m.index).split('\n').length} chooses between ${what} by`
      + ' comparing a number.'
      + `\n      pairingLabel and pairingTier in ${HOME} do that, from one set of cut points.`
      + '\n      The copy that drifted was an unnamed ternary chain: three comparisons, four'
      + '\n      strings, and nothing to grep for.');
  }
}

/**
 * ── THE OTHER TWO NUMBERS BANDED AT THE COUPLE LEVEL ──────────────────────
 * Found by sweeping for the same pattern once the pairing bug was fixed: every
 * place a number is banded into named strings by a chain of comparisons. There
 * were two more, and between them four copies.
 *
 *   how well one person reads the other, `reads_them_well / mixed /
 *   misreads_them`, in _lib/results.js and again in admin-data.js with display
 *   labels;
 *
 *   how well the two read each other, `understand_each_other / partial /
 *   misunderstand_each_other`, in _lib/results.js, again in admin-data.js and
 *   a third time in admin-explore.js.
 *
 * All four agreed on 0.5 and 1.0. That is precisely the state the pairing bands
 * were in until they did not, and the admin was recomputing a band that
 * readAccuracy already returns, which is the same shape as this file once
 * scoring with a plain average where the engine weights. A figure Ellie trusts,
 * computed by a second rule.
 *
 * The keys are what a results row stores and are frozen; the labels are for a
 * screen. Both live beside the cut points now.
 */
for (const [what, bands, fn] of [
  ['the reader bands', READ_BANDS, readBandFor],
  ['the understanding bands', UNDERSTANDING_BANDS, understandingBandFor],
]) {
  if (bands.length !== 3) {
    fails.push(`${what}: expected three, found ${bands.length}.`);
    continue;
  }
  const edges = bands.map((b) => b.under).filter(Number.isFinite);
  for (const c of edges) {
    for (const g of [Number((c - 0.01).toFixed(2)), c, Number((c + 0.01).toFixed(2))]) {
      const got = fn(g);
      const want = bands.find((b) => g < b.under) || bands[bands.length - 1];
      if (got.key !== want.key) {
        fails.push(`${what}: ${g} reads as "${got.key}" and the band list says "${want.key}".`);
      }
    }
  }
  /* And nobody bands it again. Matched on the keys and the labels together,
     because the copies that existed used the labels and the original used the
     keys, so looking for either alone finds one half. */
  const words = bands.flatMap((b) => [b.key, b.label]);
  for (const rel of ['api', 'src', 'attune-app/src'].flatMap((d) => files(d))) {
    if (rel === 'api/_lib/results.js') continue;
    const src = readFileSync(join(ROOT, rel), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
      .replace(/(^|[^:])\/\/[^\n]*/g, (m, pre) => pre + ' '.repeat(m.length - pre.length));
    for (const line of src.split('\n')) {
      const named = words.filter((w) => line.includes(`'${w}'`) || line.includes(`"${w}"`)).length;
      if (named >= 2 && /[<>]=?\s*[\d.]/.test(line)) {
        fails.push(`${rel} bands ${what} itself: ${line.trim().slice(0, 90)}`
          + '\n      readBandFor and understandingBandFor in api/_lib/results.js do that.');
        break;
      }
    }
  }
}

/**
 * ── AND THE ENDPOINT ACCEPTS EVERY TIER ───────────────────────────────────
 * The scan above only flags a list of tiers when a number is compared beside
 * it, because a list on its own is a legitimate thing to have. That left a
 * hole, found by planting it: dropping 'distinct' from the validator in
 * track-type.js passed both this gate and check-type-telemetry, and the
 * consequence is that the couples furthest apart are refused and counted
 * nowhere. The most different couples are the ones Ellie would most want to
 * see.
 *
 * So the validator has to BE the list, not resemble it.
 */
{
  const rel = 'api/track-type.js';
  const src = readFileSync(join(ROOT, rel), 'utf8');
  if (!/PAIRING_TIERS/.test(src)) {
    fails.push(`${rel} does not use PAIRING_TIERS, so the tiers it accepts are written somewhere`
      + ' else and a band can be dropped without anything noticing.');
  } else {
    const m = /const validGapTiers\s*=\s*([^;]+);/.exec(src);
    if (m && !/PAIRING_TIERS/.test(m[1])) {
      fails.push(`${rel} imports PAIRING_TIERS and validates against \`${m[1].trim()}\` instead.`);
    }
  }
}

if (fails.length) {
  console.error('[check-pairing-bands] The band a couple reads is not the band they are counted in:');
  for (const f of fails) console.error(`  ${f}`);
  console.error('');
  console.error(`One banding: ${HOME}, whose cut points are multiples of STRENGTH.`);
  process.exit(1);
}

console.log(`  the reader and understanding bands at ${READ_BANDS.filter((b) => Number.isFinite(b.under)).map((b) => b.under).join(' and ')}`
  + ' have one home too, keys and labels together, after four copies of them were found.');
console.log(`[check-pairing-bands] ${PAIRING_BANDS.length} bands at`
  + ` ${cuts.join(', ')}, multiples of STRENGTH; ${checked} average gaps including both sides of`
  + ` every cut, label and tier naming the same band every time; ${scanned} files band it nowhere`
  + ' else.');
