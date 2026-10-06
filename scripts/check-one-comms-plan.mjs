#!/usr/bin/env node
/**
 * There is one builder of the Communication action plan.
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────
 * Three surfaces show that plan: the Communication overview's three tiles, the
 * one instruction on each domain's detail page, and the Communication group on
 * What Comes Next. All three are the same three tiles. `commsActionPlan` in
 * api/_lib/comms-plan.js builds them.
 *
 * ── WHY IT NEEDED A GATE ──────────────────────────────────────────────────
 * Ellie, twice: "The what comes next page still isn't matching the action items
 * on the comms overview page."
 *
 * The first fix pointed What Comes Next at commsActionPlan and stopped there.
 * src/App.jsx went on building its own three tiles, under the name glancePlan,
 * and its own rule for which dimension leads a domain: widest gap, ties broken
 * toward the dimension weighted more heavily in the axis scoring. The server
 * breaks a tie by taking the first in the domain's own order.
 *
 * Ties are ordinary, not exotic: gap is the distance between two answers on a
 * one-to-five scale, and a domain holds three or four dimensions. Over 12,000
 * domain tiles the two rules chose a different lead dimension 11.1% of the
 * time, which is a different piece of advice on the two pages for the same
 * couple. The 89% that agreed is why it read as fine for months, and is the
 * reason this is a gate rather than a fix: values that agree today are the ones
 * nothing watches.
 *
 * Three more differences came out with that one, none of which had drifted yet.
 * The domain labels were typed again in src/App.jsx in sentence case against
 * the shared list's title case. The tile's colour was read off the domain's
 * first dimension rather than off the domain. And the extra line on "when
 * things get hard" was still sitting there after she asked for that prompt
 * removed from the overview everywhere.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * Three things, because deleting the function alone leaves the parts for the
 * next one lying beside each other:
 *
 *   1. No file outside comms-plan.js picks a dimension out of a Communication
 *      domain by its gap. That is the rule that differed, named by what it
 *      does rather than by what it was called, because the second person to
 *      write it will not call it `leadDimFor`.
 *   2. No file outside the shared list hand-types the three domain labels.
 *   3. src/App.jsx reads commsActionPlan's result on both of the surfaces it
 *      draws: the overview's tiles and the detail page's instruction. Checking
 *      only that the import exists would pass a file that calls it and then
 *      draws something else, which is what `if (false)` does to every gate
 *      that asks whether something APPEARS.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the two pages then agree about the rows, which is check-plans-agree,
 * run over four couples including one with tied gaps in every domain. That one
 * proves the lists match; this proves there is only one list. Neither can be
 * deleted: a single builder drawn on one page and ignored on the other is
 * exactly the bug that shipped, and two builders that happen to agree on the
 * fixture is the one before it.
 *
 * The app is out of scope. It cannot import from api/ and it does not build
 * this plan: it is handed `commsPlan.tiles` in the results payload, and
 * check-action-tile-fields holds every field of a tile to being drawn there.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const BUILDER = 'api/_lib/comms-plan.js';
const LABELS = 'api/_lib/tags.js';
const fails = [];

/** The three domains, from the shared list, so a fourth is covered the day it lands. */
const { COMM_DOMAINS } = await import('../api/_lib/tags.js');
const DOMAIN_IDS = COMM_DOMAINS.map((d) => d.id);

/* A gate that has lost its subject must never report success. */
{
  const src = readFileSync(join(ROOT, BUILDER), 'utf8');
  if (!/export function commsActionPlan/.test(src) || !/\.gap > m\.gap/.test(src)) {
    console.error(`[check-one-comms-plan] ${BUILDER} no longer exports a commsActionPlan that`
      + ' picks a lead dimension by gap. Refusing to pass.');
    process.exit(1);
  }
  if (DOMAIN_IDS.length < 3) {
    console.error('[check-one-comms-plan] COMM_DOMAINS came back with fewer than three domains.'
      + ' Refusing to pass.');
    process.exit(1);
  }
}

function files(dir, out = []) {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, name);
    if (statSync(join(ROOT, rel)).isDirectory()) {
      if (/node_modules|\.expo|dist/.test(name)) continue;
      files(rel, out);
      continue;
    }
    if (/\.(js|jsx|mjs)$/.test(name)) out.push(rel);
  }
  return out;
}

const lineOf = (src, i) => src.slice(0, i).split('\n').length;

/**
 * An expression that reaches into a Communication domain and chooses by gap.
 *
 * Both shapes, because they are the two ways to write it and the shipped bug
 * was the second: a `reduce` that keeps the larger gap, and a `sort` whose
 * comparator subtracts two gaps. Requiring a domain reference in the same
 * window is what keeps this off the places that legitimately order every
 * dimension by gap for display, which src/App.jsx does twice.
 */
/**
 * A callback that chooses among dimensions by their gap.
 *
 * By what it does, not by its name: the second person to write this will not
 * call it `leadDimFor`. The signature is a `sort` or `reduce` whose own body
 * reads `.gap` more than once, which is what comparing two dimensions is.
 *
 * The first version of this was three loose regexes over the whole file and it
 * flagged three places that were nothing of the kind: an alignment threshold
 * in admin-explore, and a sort of couple-type keys four hundred lines from the
 * word "inner" in src/App.jsx. A gate that matches too much is not the safe
 * direction. It gets loosened until it matches nothing, or it manufactures the
 * finding it was meant to look for. So the body is extracted by paren depth
 * and the test runs on that body alone.
 */
function callbackBodies(src, method) {
  const out = [];
  const opener = new RegExp(`\\.${method}\\(`, 'g');
  for (const m of src.matchAll(opener)) {
    let i = m.index + m[0].length - 1;
    let depth = 0;
    for (; i < src.length && i < m.index + 4000; i += 1) {
      const ch = src[i];
      if (ch === '(') depth += 1;
      else if (ch === ')') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    if (depth === 0) out.push({ at: m.index, body: src.slice(m.index, i + 1) });
  }
  return out;
}

/** A reference to a Communication domain's dimension list, however it is reached. */
const NAMES_A_DOMAIN = new RegExp(
  '(COMM_DOMAINS|DOMAIN_OF|DOMAIN_DIMS|domainDims|\\.dims\\b|'
  + DOMAIN_IDS.map((d) => `["']${d}["']`).join('|') + ')',
);

let scanned = 0;
for (const rel of ['api', 'src'].flatMap((d) => files(d))) {
  if (rel === BUILDER) continue;
  scanned += 1;
  const src = readFileSync(join(ROOT, rel), 'utf8');

  /* 1. A second rule for which dimension leads a domain. */
  const stripped = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + ' '.repeat(m.length - p.length));
  for (const method of ['sort', 'reduce']) {
    for (const { at, body } of callbackBodies(stripped, method)) {
      /* More than once, because one `.gap` is a read and two is a comparison. */
      if ((body.match(/\.gap\b/g) || []).length < 2) continue;
      /* And about a Communication domain: src/App.jsx orders all ten
         dimensions by gap for display, twice, and that is not this. */
      const window = stripped.slice(Math.max(0, at - 300), at + body.length + 120);
      if (!NAMES_A_DOMAIN.test(window)) continue;
      fails.push(`${rel}:${lineOf(stripped, at)} compares dimensions inside a Communication`
        + ` domain by their gap, in a .${method}():\n`
        + `        ${body.replace(/\s+/g, ' ').slice(0, 110)}\n`
        + `      That rule lives in ${BUILDER}. A second one is a different piece of advice on\n`
        + '      the overview and on What Comes Next for the same couple, 11% of the time.');
    }
  }

  /* 2. The labels, typed again. Matched against the shared list's own values,
     case-insensitively, because the copy in src/App.jsx was the same three
     labels in sentence case. The first version matched any object keyed by the
     three domain ids, which is also what a colour map looks like. */
  if (rel !== LABELS) {
    for (const d of COMM_DOMAINS) {
      const re = new RegExp(`${d.id}\\s*:\\s*["'\`]${d.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'\`]`, 'i');
      const m = re.exec(stripped);
      if (m) {
        fails.push(`${rel}:${lineOf(stripped, m.index)} types the domain label for "${d.id}" out`
          + ` again: ${m[0]}\n      It is DOMAIN_LABEL in ${LABELS}, which the shared plan uses.`
          + " The copy in src/App.jsx\n      was these three in sentence case against that list's title case.");
        break;
      }
    }
  }
}

/**
 * 3. And the website draws what it built.
 *
 * By the name the call's result is bound to, carried through to both draw
 * sites, because this is the half a structural check usually misses: a file can
 * import the shared builder, call it, and then render its own thing beside it.
 */
{
  const rel = 'src/App.jsx';
  const src = readFileSync(join(ROOT, rel), 'utf8');
  const call = /const (\w+)\s*=\s*commsActionPlan\(/.exec(src);
  if (!call) {
    fails.push(`${rel} does not call commsActionPlan at all. The Communication overview's three`
      + '\n      tiles and each domain page\'s one instruction are that function\'s output.');
  } else {
    const plan = call[1];
    /* The overview's three tiles. Matched with the call, not the bare name:
       `/glancePlan/` would have matched `glancePlanX`. */
    if (!new RegExp(`\\{${plan}\\.map\\(`).test(src)) {
      fails.push(`${rel} binds commsActionPlan's tiles to \`${plan}\` and never maps over them.`
        + '\n      The Communication overview draws three tiles and they are these three.');
    }
    /* The detail page's one instruction, through whatever helper reads the
       plan for a single domain. */
    const finder = new RegExp(`const (\\w+)\\s*=\\s*\\(\\s*\\w+\\s*\\)\\s*=>\\s*${plan}\\.find\\(`).exec(src);
    const readsOne = finder
      ? new RegExp(`${finder[1]}\\(`).test(src.slice(finder.index + finder[0].length))
      : new RegExp(`${plan}\\.find\\(`).test(src.slice(call.index + call[0].length));
    if (!readsOne) {
      fails.push(`${rel} never reads a single domain's tile out of \`${plan}\`.`
        + '\n      Each domain\'s detail page draws one instruction, and its own note says it is'
        + '\n      the same tile the overview shows. It was a second computation of it.');
    }
  }
}

if (fails.length) {
  console.error('[check-one-comms-plan] The Communication action plan is built in more than one place:');
  for (const f of fails) console.error(`  ${f}`);
  console.error('');
  console.error(`One builder: commsActionPlan in ${BUILDER}.`);
  process.exit(1);
}

console.log(`[check-one-comms-plan] ${scanned} files; one builder, and the website draws its`
  + ' tiles on both the overview and the three detail pages.');
