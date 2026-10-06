#!/usr/bin/env node
/**
 * What Comes Next is built once, by api/_lib/what-comes-next.js.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * It used to be built twice. The server built it for the app, and the website
 * assembled its own six groups from its own client-side results. Two
 * implementations of one page, and they had drifted in six ways that Ellie
 * found by reading them side by side:
 *
 *   the expectations rows were worded differently;
 *   the group was called Physical Intimacy on one and Physical Intimacy
 *     Expectations on the other;
 *   the conflict list was selected by raw answer value on one and by band on
 *     the other, so the two were different lengths: "I have 4 items in my
 *     conflict action plan on that overview page, but one thing listed in the
 *     what comes next section for conflict";
 *   the whole conflict block sat inside the Physical Intimacy branch on the
 *     website, so owning Conflict and not finishing Intimacy meant no list;
 *   the reflection rows were written two different ways;
 *   and the comms rows were titled with a piece of advice rather than with the
 *     page the advice came from.
 *
 * An earlier version of this file compared the two implementations property by
 * property. That was the right gate for two implementations and the wrong
 * answer to the problem: she then asked for a seventh and an eighth difference
 * to be reconciled, each of which would have meant another comparison here.
 * The website calls the shared function now, and this holds it to that.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * That the website calls whatComesNext and does not rebuild its groups, that
 * the shared function still produces every group, and that every row it emits
 * carries the page it is about, because the arrow on each row is drawn from
 * that and a row without one is a dead end.
 *
 * ── WHAT IT REPLACED ──────────────────────────────────────────────────────
 * check-what-comes-next.mjs, which held the two implementations to the same set
 * of group ids by scanning src/App.jsx for `groups.push({ id: ... })`. With one
 * builder there is nothing for it to compare, and its every assertion is now
 * structurally impossible rather than merely true. Two gates on one promise is
 * the same failure as two copies of a rule: they drift, and the weaker one wins
 * because it is the one that still passes. So it is deleted, not left green.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the website's adapter shapes its inputs correctly. It computes its
 * results in the browser, so the inputs are genuinely its own and there is
 * nothing to compare them against; check-render drives the page and
 * check-section-payloads holds the payload's shape.
 */

import { readFileSync } from 'node:fs';

import { whatComesNext } from '../api/_lib/what-comes-next.js';

const ROOT = new URL('..', import.meta.url).pathname;
const WEB = 'src/App.jsx';
const web = readFileSync(`${ROOT}${WEB}`, 'utf8');
const fails = [];

// ── 1. The website calls it ─────────────────────────────────────────────────
if (!/import \{ whatComesNext \} from "\.\.\/api\/_lib\/what-comes-next\.js"/.test(web)) {
  fails.push(`${WEB} does not import whatComesNext.`);
}
if (!/const wcn = whatComesNext\(\{/.test(web)) {
  fails.push(`${WEB} does not call whatComesNext to build this page.`);
}

/*
 * And does not build its own. `groups.push({ id: "..."` is what the second
 * implementation looked like, every one of its six sections. Matching on the
 * push rather than on a name, because the next copy will not be called
 * `groups`.
 */
const pushes = [...web.matchAll(/groups\.push\(\{\s*id: ["'](\w[\w-]*)["']/g)].map((m) => m[1]);
if (pushes.length) {
  fails.push(`${WEB} assembles What Comes Next groups of its own: ${pushes.join(', ')}.\n`
    + '      One page, one builder. Six differences between two copies of this page is what\n'
    + '      that costs, and every one of them was something Ellie had to find by reading.');
}

// ── 2. The shared function still produces the page ──────────────────────────
const built = whatComesNext({
  coupleTypeId: 'WX',
  commsPlan: {
    tiles: [{ domain: 'hard', label: 'When Things Get Hard', title: 'Advice', body: 'Body', dim: 'cf' }],
    protocols: [{ dim: 'cf', title: 'P', thisWeek: 'Try this' }],
  },
  expectations: { categories: [{ label: 'Household', differences: 2, section: 'exp-convo-0' }] },
  intimacy: { actionPlan: [{ label: 'How it happens', prompt: 'Say this', section: 'intimacy-how' }] },
  reflection: { written: [{ key: 'a6', you: 'Be kinder', them: 'Listen more' }] },
  conflictReady: true,
  conflictAnswers: null,
  names: { you: 'Ellie', them: 'Preston' },
  sides: {
    you: { name: 'Ellie', axes: { open: 4, withdraw: 2 }, pronouns: 'she/her' },
    them: { name: 'Preston', axes: { open: 2, withdraw: 4 }, pronouns: 'he/him' },
  },
});
const labels = built.groups.map((g) => g.label);
if (labels.length < 5) {
  console.error(`[check-next-steps-mirror] the builder produced ${labels.length} groups from a full`
    + ' set of inputs, which cannot be right.'
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

/*
 * ── THE ORDER SHE ASKED FOR ───────────────────────────────────────────────
 * Ellie: "I want rel relf listed above physical intimacy expectations on what
 * comes next pages." Both surfaces render the groups as sent, so the order is
 * the payload's and this is where it is held.
 */
const refl = labels.indexOf('Relationship Reflection');
const intim = labels.indexOf('Physical Intimacy Expectations');
if (refl !== -1 && intim !== -1 && refl > intim) {
  fails.push(`Physical Intimacy Expectations comes before Relationship Reflection: ${labels.join(' then ')}.`);
}

// ── 3. Every row knows its page ─────────────────────────────────────────────
/*
 * Ellie: "No links at the bottom of sections, just arrows in each row that
 * bring you to that results page." The arrow is drawn from `section` on the
 * row, so a row without one is a row with no way out, and the surfaces fall
 * back to the group's own link, which is the thing she asked to remove.
 */
for (const g of built.groups) {
  const blind = g.items.filter((i) => !i.section);
  if (blind.length) {
    fails.push(`${blind.length} of ${g.items.length} rows in "${g.label}" carry no section, so`
      + ' they draw no arrow:\n'
      + `      ${blind.slice(0, 2).map((i) => `"${i.title}"`).join(', ')}`);
  }
}

/*
 * And the conflict rows carry their Try line. Ellie: "I want the full action
 * item with the try section (like the site shows) for the conflict patterns
 * action items on the app what comes next page." The advice body was being sent
 * as `body`, which neither surface draws here, so every conflict row was a
 * heading with nothing under it on a phone.
 */
const conflict = built.groups.find((g) => g.id === 'conflict');
if (conflict && conflict.items.some((i) => i.body && !i.say)) {
  fails.push('a conflict row carries its advice in `body`, which this page does not draw.'
    + ' It belongs in `say`, which is the Try line.');
}

/*
 * The comms rows are titled with the page they came from, not with a piece of
 * advice. Ellie: "Bold title should be the detailed page name, then the content
 * should be the 'try' content that the site shows."
 */
const comms = built.groups.find((g) => g.id === 'comm');
if (comms) {
  const bad = comms.items.filter((i) => !/^(Internal Processing|How You Connect|When Things Get Hard)$/.test(i.title));
  if (bad.length) {
    fails.push(`a Communication row is titled "${bad[0].title}", which is not one of the three`
      + ' detail pages. The title is the page; the advice is the Try line under it.');
  }
  if (comms.items.some((i) => !i.say)) {
    fails.push('a Communication row has no Try line under its page name.');
  }
}

if (fails.length) {
  console.error('\n check-next-steps-mirror: What Comes Next is not built the way it should be.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log(`[check-next-steps-mirror] one builder for both surfaces, ${labels.length} groups in`
  + ' the order she asked for, every row carrying the page it opens.');
