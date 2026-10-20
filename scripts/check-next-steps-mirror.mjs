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
 * And, since B105, the three buckets: that they are the three she named, in
 * her order, that every action item in every group lands in exactly one of
 * them, and that both surfaces draw the buckets rather than the groups.
 *
 * The bucket half is asserted as a COUNT, not as a search for a name. A group
 * that belongs to no bucket does not appear anywhere in the output as an
 * absence: the page simply has fewer rows on it, and the only way to see that
 * is to add the rows up on both sides.
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
import { RESULTS_SECTIONS, RETIRED_SECTIONS } from '../api/_lib/results-sections.js';

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
  /**
   * A RETIRED section id on purpose.
   *
   * api/_lib/intimacy-results.js puts `intimacy-<dimension>` on every row, and
   * those six pages were merged into two at Ellie's ask. The fixture used to
   * say `intimacy-how`, which is a page that exists, so it tested a shape the
   * product does not produce and the broken arrow walked straight past it:
   * "I tried to tap into the physical intimacy discussion we need to have, and
   * it did not bring me to that Page."
   */
  intimacy: { actionPlan: [{ label: 'What it means', prompt: 'Say this', section: 'intimacy-meaning' }] },
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
 * ── AND THE PAGE IT NAMES CAN ACTUALLY BE DRAWN ───────────────────────────
 * Having a section is not the same as having a page. `isResultsSection` says
 * yes to a RETIRED id, deliberately, because a mark written against one of the
 * six old Physical Intimacy pages still has to validate. An arrow pointed at
 * one goes nowhere: no error, no page, nothing happens on the tap.
 *
 * RESULTS_SECTIONS is the list of pages that can be rendered, so that is what
 * a navigation target is held to here.
 */
for (const g of built.groups) {
  for (const i of g.items || []) {
    if (i.section && !RESULTS_SECTIONS.includes(i.section)) {
      fails.push(`"${i.title}" in "${g.label}" opens "${i.section}", which is not a page.\n`
        + `      ${i.section in RETIRED_SECTIONS
          ? `It was retired into "${RETIRED_SECTIONS[i.section]}". Resolve it with currentSection().`
          : 'It is in no nav and nothing renders it.'}\n`
        + '      A tap on that row does nothing at all, which is what Ellie reported.');
    }
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
 * ── THE COMMS ROWS ARE THEIR GLANCE TILES ────────────────────────────────
 * This file briefly held the opposite: she asked for the detail page's name as
 * the title and the website's Try line under it, then, told that the website's
 * Try line comes from the protocols and the protocols appear nowhere else in
 * the app, said "Revert, make the action items for comms match the comms
 * overview page's action items exactly."
 *
 * check-plans-agree holds the content, tile by tile, which is where that
 * comparison belongs because it has the glance plan to compare against. What is
 * held here is the part this file is about: a row still has to draw something
 * under its heading, and still has to know the page it opens.
 */
const comms = built.groups.find((g) => g.id === 'comm');
if (comms) {
  /**
   * ── THE ROW IS THE ADVICE NOW ──────────────────────────────────────────
   * This asked that every Communication row carry something in `say`, because
   * the row was the domain's name and the advice sat under it.
   *
   * Ellie: "Comms action plans in what comes next should list the action items
   * not the category." So the advice IS the row, `say` is empty on purpose,
   * and asserting on `say` would now fail the thing she asked for.
   *
   * What still has to be true is that the row says something. An empty title
   * is the fault this was really protecting against: a heading with nothing
   * under it, which is what the conflict rows once were.
   */
  if (comms.items.some((i) => !String(i.title || '').trim())) {
    fails.push('a Communication row has no words in it. The glance tile\'s advice is the row'
      + ' itself now; a row with an empty title is a row that says nothing.');
  }
  if (comms.items.some((i) => !/^comm-/.test(i.section || ''))) {
    fails.push('a Communication row does not open a communication page.');
  }
}

// ── 4. The three buckets ────────────────────────────────────────────────────
/*
 * Ellie: "I want to take all of the action items we currently list, and present
 * them not grouped by exercise/section but rather by: What to keep in mind
 * (Comms, conflict, rel relf), What to discuss together (expectations,
 * physical intimacy), Phrases to try (Couple type)."
 *
 * Then, of the names themselves: "Change titles and make each split to 2
 * lines: Things to consider, Discussions to have, Phrases to try."
 *
 * Both are kept because the first is the grouping and the second is the
 * wording, and only the wording changed. Her three, in her order, with her
 * line breaks: a tile that wraps where its width runs out breaks
 * "Discussions to have" in the wrong place, so the break is in the string.
 */
const WANTED = [
  { id: 'keep-in-mind', label: 'Things to\nconsider' },
  { id: 'discuss', label: 'Discussions\nto have' },
  { id: 'phrases', label: 'Phrases\nto try' },
];
/* Every one on two lines, which is the half of that instruction a label
   comparison would not notice if the newline were dropped. */
for (const b of built.buckets || []) {
  if ((b.label.match(/\n/g) || []).length !== 1) {
    fails.push(`the "${b.label.replace(/\n/g, ' ')}" bucket is not on two lines.`
      + ' Ellie asked for each name split in two, and where it splits is hers.');
  }
}
const got = (built.buckets || []).map((b) => `${b.id}:${b.label}`);
const want = WANTED.map((b) => `${b.id}:${b.label}`);
if (got.join(' | ') !== want.join(' | ')) {
  fails.push(`the buckets are not the three she asked for, in her order.\n`
    + `      wanted: ${want.join(' | ')}\n`
    + `      got:    ${got.join(' | ') || '(none)'}`);
}

/*
 * ── EVERY ACTION ITEM REACHES A BUCKET ────────────────────────────────────
 * The page draws buckets now, so a group belonging to no bucket is a group
 * nobody sees. Nothing says so: the page renders, the other rows are correct,
 * and the only symptom is that it is shorter than the results it summarises.
 *
 * So this adds up rather than looking for a name. The inputs above produce one
 * row in every group on purpose.
 */
/*
 * ── EXCEPT A ROW THAT IS NOT THIS READER'S ───────────────────────────────
 * Ellie: "only show the phrases to the partner who should be saying them."
 *
 * So one item may legitimately be in no bucket, and exactly one thing makes
 * that legitimate: it is addressed to the other partner. Counted rather than
 * excused, because "some items are allowed to vanish" is how this check would
 * stop meaning anything. Every item still has to be accounted for: drawn, or
 * withheld for that one stated reason.
 */
const inGroups = built.groups.flatMap((g) => g.items || []);
const inBuckets = (built.buckets || []).flatMap((b) => b.items || []);
const bucketed = new Set(inBuckets);
const withheld = inGroups.filter((i) => !bucketed.has(i));
const notMine = withheld.filter((i) => i.forWhom === 'them');
if (withheld.length !== notMine.length) {
  const lost = built.groups.filter((g) => (g.items || []).some((i) => !bucketed.has(i) && i.forWhom !== 'them'));
  fails.push(`${inGroups.length} action items across the groups and ${inBuckets.length} in the`
    + ' buckets, and the difference is not accounted for. An item may only be left out when it\n'
    + '      is addressed to the other partner, which is what forWhom says.'
    + (lost.length ? `\n      Not in any bucket and not the partner's: ${lost.map((g) => g.label).join(', ')}.` : ''));
}

/*
 * ── AND THE SECTIONS HOLD EVERY ROW THE BUCKET CLAIMS ────────────────────
 * The page draws sections now, not the bucket's flat list, so a row in
 * `items` and in no section is a row the reader never sees while the tile
 * above still counts it. That is the same failure one level down.
 */
for (const b of built.buckets || []) {
  const inSections = (b.sections || []).flatMap((sec) => sec.items || []);
  if (!b.sections?.length) {
    fails.push(`the ${String(b.label).replace(/\n/g, ' ')} bucket has rows and no sections, so the page has nothing to draw.`);
  } else if (inSections.length !== (b.items || []).length) {
    fails.push(`the ${String(b.label).replace(/\n/g, ' ')} bucket counts ${(b.items || []).length} rows and its sections hold ${inSections.length}.`);
  }
  for (const sec of b.sections || []) {
    if (!sec.items?.length) fails.push(`an empty section, "${sec.label}", in ${String(b.label).replace(/\n/g, ' ')}: a heading with nothing under it.`);
    if (!sec.label) fails.push(`a section with no eyebrow in ${String(b.label).replace(/\n/g, ' ')}.`);
  }
}

/* And in exactly one. A group named by two buckets double-counts its rows,
   which reads as the product repeating itself rather than as a bug. */
const seen = new Map();
for (const b of built.buckets || []) {
  for (const it of b.items || []) seen.set(it, (seen.get(it) || 0) + 1);
}
const twice = [...seen.entries()].filter(([, n]) => n > 1);
if (twice.length) {
  fails.push(`${twice.length} action item(s) appear in more than one bucket, starting with`
    + ` "${twice[0][0].title}".`);
}

/*
 * ── AND EVERY ROW SAYS SOMETHING ──────────────────────────────────────────
 * A row's words used to be its title, so an empty title was an empty row.
 * Since B114 a phrase to try has no title at all: it is a quotation, and the
 * quote is the whole of it. So the rule is that a row has words, in whichever
 * of the two fields it uses, rather than that it has a title.
 */
for (const b of built.buckets || []) {
  const mute = (b.items || []).filter((i) => !String(i.title || i.quote || '').trim());
  if (mute.length) {
    fails.push(`${mute.length} row(s) in the "${b.label.replace(/\n/g, ' ')}" bucket have no`
      + ' words in either their title or their quote, so they draw as an empty line.');
  }
}

/*
 * ── THE REFLECTION ROW IS THE READER'S OWN ────────────────────────────────
 * Ellie: "My action plan should only have my row from rel relf, not Preston's.
 * And retitle it, say 'when asked to reflect, you said'."
 *
 * This reverses an earlier instruction of hers, "I want them to say 'Ellie
 * wrote: [insert what I wrote]' then 'Preston wrote: [insert what Preston
 * wrote]'", and both are in api/_lib/what-comes-next.js for the reason this
 * file keeps round trips: the pair of rows was right for a page that gathers
 * up what was said and wrong for one that lists what to do.
 *
 * The fixture gives both people a commitment, so a builder that still sends
 * the partner's produces two rows here.
 */
const reflection = built.groups.find((g) => g.id === 'reflection');
if (reflection) {
  if (reflection.items.length !== 1) {
    fails.push(`Relationship Reflection carries ${reflection.items.length} rows and should carry`
      + " one: the reader's own. The partner's commitment is on the Reflection page itself.");
  }
  const row = reflection.items[0];
  if (row && row.title !== 'When asked to reflect, you said') {
    fails.push(`the reflection row is titled "${row.title}". Her words for it are`
      + ' "When asked to reflect, you said".');
  }
  if (row && row.quote !== 'Be kinder') {
    fails.push(`the reflection row quotes ${JSON.stringify(row.quote)}, which is not what the`
      + " reader wrote. It must be the reader's own answer, not the partner's.");
  }
}

/* Every bucket row still carries its page, same as every group row. The arrow
   is the only thing on this page that says where a row came from. */
for (const b of built.buckets || []) {
  const blind = (b.items || []).filter((i) => !i.section);
  if (blind.length) {
    fails.push(`${blind.length} of ${b.items.length} rows in the "${b.label}" bucket carry no`
      + ' section, so they draw no arrow.');
  }
}

/*
 * ── AND THE BUCKET DOES NOT SAY WHERE IT CAME FROM ────────────────────────
 * Ellie: "Do not list (like I did for the list above) which exercises populate
 * each bucket on what comes next." She wrote the mapping out in her own
 * instruction and then said not to print it, which is the kind of thing that
 * gets copied into a label by accident.
 */
const sourceNames = built.groups.map((g) => g.label);
for (const b of built.buckets || []) {
  const named = sourceNames.filter((n) => b.label.includes(n));
  if (named.length) {
    fails.push(`the "${b.label}" bucket names the exercise it comes from (${named.join(', ')}).`);
  }
}

/*
 * ── BOTH SURFACES DRAW THE BUCKETS ────────────────────────────────────────
 * A surface still reading `groups` shows the six sections she asked to be rid
 * of. Matched with the fallback each one legitimately has: a stored row from
 * before the buckets existed carries only groups, so `buckets?.length ? ... :`
 * is the correct shape and `groups` alone is not.
 */
const APP = 'attune-app/src/components/results.tsx';
const app = readFileSync(`${ROOT}${APP}`, 'utf8');
for (const [file, src, re] of [
  [WEB, web, /wcn\.buckets\?\.length \? wcn\.buckets : wcn\.groups/],
  [APP, app, /data\.buckets\?\.length\s*\?\s*data\.buckets/],
]) {
  if (!re.test(src)) {
    fails.push(`${file} does not read the server's buckets with a fallback to groups.`
      + ' What Comes Next is three buckets now; a surface reading groups draws the six'
      + ' sections she asked to be rid of.');
  }
}

if (fails.length) {
  console.error('\n check-next-steps-mirror: What Comes Next is not built the way it should be.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log(`[check-next-steps-mirror] one builder for both surfaces, ${labels.length} groups in`
  + ` the order she asked for, every row carrying the page it opens, and all`
  + ` ${inBuckets.length} of their ${inGroups.length} action items landing in exactly one of her`
  + ` three buckets and ${notMine.length} withheld as the partner's to say, every row of every`
  + ' bucket under an eyebrow, and both surfaces drawing them.');
