#!/usr/bin/env node
/**
 * The website and the app reach the same Notes.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Ellie: "Ensure that site mirrors app notes functionality."
 *
 * /api/notes is one endpoint with an action, and both surfaces are clients of
 * it. So "mirrors" has a precise meaning that can be checked: every action the
 * endpoint takes is reachable from both, or it is listed here as deliberately
 * one-sided with a reason.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * Three of them were not. deleteTag, restoreTag and purgeTag had been in the
 * app's client for months and were never added to the website's, so a tag
 * archived on a phone showed up on the laptop with no way to restore it and no
 * way to finish deleting it. Nothing failed. The endpoint answered, the app
 * worked, and the website simply never asked.
 *
 * The journal was the same shape one level up: written on a phone, and on the
 * website it was drawn as a results mark under a heading that was the raw ISO
 * date of the day it was written.
 *
 * ── HOW IT IS CHECKED ─────────────────────────────────────────────────────
 * The list of actions is DERIVED from api/notes.js, never typed here. That is
 * the whole point: a list typed here would go stale the first time an action
 * was added, and go stale silently, which is the failure this file exists to
 * catch one level down.
 *
 * Both the GET actions, which arrive in the query string, and the POST ones,
 * which arrive in the body, are read. Then each client's source is scanned for
 * the ways it could send one.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Not whether the two look the same. They should not: one is a phone and one
 * is a browser, and Ellie has designed them separately on purpose.
 *
 * Not whether a surface DRAWS what it fetches. That is the other direction,
 * and check-unshown-answers.mjs and check-mark-reach.mjs are about it.
 *
 * Not /api/posts, /api/home or /api/results. Those have their own reach
 * checks, and widening this one to "the app and the site agree about
 * everything" would make it a gate that matches too much, which either gets
 * loosened until it matches nothing or manufactures its own evidence.
 */

import { readFileSync } from 'node:fs';
import { JOURNAL_ANCHOR } from '../api/_lib/tags.js';

const ROOT = new URL('..', import.meta.url).pathname;
const ENDPOINT = `${ROOT}api/notes.js`;
const CLIENTS = [
  ['the website', `${ROOT}src/notes-web.jsx`],
  ['the app', `${ROOT}attune-app/src/api/client.ts`],
];

const fails = [];
const endpoint = readFileSync(ENDPOINT, 'utf8');

/**
 * What the endpoint takes.
 *
 * `action === 'x'` covers every branch in the file, in both quote styles. A
 * GET action arrives through the query string and a POST one through the body,
 * and the handler compares both against the same variable, so one scan finds
 * both kinds.
 */
const actions = new Set(
  [...endpoint.matchAll(/action\s*===\s*['"]([a-zA-Z]+)['"]/g)].map((m) => m[1]),
);
/* The default when a GET names none. It is an action like any other and it is
   the one every surface starts with, so it belongs in the list. */
if (/url\.searchParams\.get\('action'\)\s*\|\|\s*'list'/.test(endpoint)) actions.add('list');

if (actions.size < 5) {
  console.error('[check-notes-parity] found only ' + actions.size + ' actions in api/notes.js;'
    + ' this gate reads them out of the handler and cannot have lost them legitimately.'
    + ' Refusing to pass.');
  process.exit(1);
}

/**
 * Actions one surface may reach and the other may not, each with the reason.
 *
 * Empty, and it should stay that way. An entry here is a decision that the two
 * surfaces differ, which is exactly what Ellie asked me to stop happening by
 * accident, so it has to be written down rather than merely true.
 */
const EXEMPT = {};

for (const [who, file] of CLIENTS) {
  const src = readFileSync(file, 'utf8');
  /** Both ways a client names an action: in a body, or in a query string. */
  const sent = new Set([
    ...[...src.matchAll(/action:\s*['"]([a-zA-Z]+)['"]/g)].map((m) => m[1]),
    ...[...src.matchAll(/notes\?action=([a-zA-Z]+)/g)].map((m) => m[1]),
  ]);
  for (const a of actions) {
    if (sent.has(a)) continue;
    if (EXEMPT[a]) continue;
    fails.push(`/api/notes takes '${a}' and ${who} never sends it.`
      + ' Either that is a feature one surface has and the other does not, which'
      + ' is the thing this gate exists to surface, or it is deliberate and'
      + ' belongs in EXEMPT with the reason.');
  }
}

/**
 * And the journal specifically, which is a feature rather than an action.
 *
 * It rides on 'create' like any other note, so the action scan above cannot
 * see it: a surface could send every action the endpoint takes and still have
 * no journal in it. Both have to write an entry, and both have to keep entries
 * out of the marks, which is the bug the website actually had.
 */
for (const [who, file] of CLIENTS) {
  const src = readFileSync(file, 'utf8');
  const writes = /anchorType:\s*(JOURNAL_ANCHOR|['"]journal['"])/.test(src);
  const isClient = /client\.ts$/.test(file);
  /* The app's client is a transport: its journal write is made by the screen
     that owns the composer, so that is where to look. */
  const target = isClient ? `${ROOT}attune-app/src/components/journal.tsx` : file;
  const targetSrc = isClient ? readFileSync(target, 'utf8') : src;
  if (!writes && !/anchorType:\s*(JOURNAL_ANCHOR|['"]journal['"])/.test(targetSrc)) {
    fails.push(`${who} has no way to write a journal entry. It is the same`
      + ' endpoint and the same anchor on both surfaces, and an entry written on'
      + ' one that cannot be written on the other is a notebook that depends on'
      + ' which device is to hand.');
  }
}

/**
 * The split, on the surface that draws the list.
 *
 * /api/notes answers with `annotations`: results marks and journal entries in
 * one list. A page that draws that list without splitting it files a diary as
 * a reading history, which is what the website did.
 *
 * Two halves, because checking only the first is blind to the way this comes
 * back. The first is that a filtered list exists at all. The second is that
 * the thing which draws marks reads the filtered list and not the raw one:
 * a surface can keep a perfectly good `isJournalEntry` filter in a variable
 * nothing uses, and every entry is still on the page. Planting exactly that
 * is what showed the first half alone was not enough.
 *
 * Two things about how this is matched, both learned by getting them wrong.
 *
 * The filter has to be the one that KEEPS the marks, not the one that keeps
 * the entries. Both exist on both surfaces and both mention the journal, so a
 * pattern that only asks "is the journal named here" binds to whichever comes
 * first in the file and then checks the wrong list is being drawn.
 *
 * And the name is matched on a word boundary. The first version asked whether
 * the grouping's source contained the string, and the website's grouping ends
 * `return [...map.entries()]`, which contains "entries", which was the name it
 * had bound to. It passed on a plant it should have caught, for a reason that
 * had nothing to do with the journal.
 */
const DRAWERS = [
  {
    who: 'the website',
    file: `${ROOT}src/notes-web.jsx`,
    /** The list the journal has been taken OUT of, not the one it is in. */
    excludes: /!isJournalEntry/,
    /** What the marks grouping must read, and what it must not. */
    groups: /const bySection = useMemo\(\(\) => \{[\s\S]*?\}, \[[^\]]*\]\);/,
    raw: 'annotations',
  },
  {
    who: 'the app',
    file: `${ROOT}attune-app/src/app/notes.tsx`,
    excludes: /!==\s*JOURNAL_ANCHOR/,
    groups: /<Peek[\s\S]*?\/>/,
    raw: 'mineRecent',
  },
];

for (const d of DRAWERS) {
  const src = readFileSync(d.file, 'utf8');
  /* Anchored on the raw list's own name, so it can only bind to a filter of
     that list, and on the negation, so it can only bind to the half that keeps
     the marks. */
  const filtered = new RegExp(
    `const\\s+(\\w+)\\s*=\\s*useMemo\\(\\s*\\(\\)\\s*=>\\s*${d.raw}\\.filter\\([\\s\\S]{0,160}?${d.excludes.source}`,
  );
  const decl = src.match(filtered);
  if (!decl) {
    fails.push(`${d.who} draws the anchored list without taking the journal out`
      + ' of it. Every entry then appears among the results marks, filed under'
      + ` its own date. The anchor is '${JOURNAL_ANCHOR}' and api/_lib/tags.js`
      + ' exports isJournalEntry for exactly this.');
    continue;
  }
  const name = decl[1];
  const drawn = src.match(d.groups);
  if (!drawn) {
    fails.push(`${d.who}: this gate can no longer find the block that draws the`
      + ' marks, so it cannot tell which list that block is reading. A gate that'
      + ' has lost its subject must not report success.');
    continue;
  }
  if (!new RegExp(`\\b${name}\\b`).test(drawn[0])) {
    fails.push(`${d.who} filters the journal out into \`${name}\` and then draws`
      + ` the marks from something else. The filter is real and unused, which`
      + ' looks correct in a diff and puts every diary entry back on the page.');
  }
  if (new RegExp(`\\b${d.raw}\\b`).test(drawn[0])) {
    fails.push(`${d.who} draws the marks straight from \`${d.raw}\`, which still`
      + ' holds the journal entries.');
  }
}

/**
 * The quote on a journal entry, drawn on both surfaces.
 *
 * Ellie: "there should be a button on the insight of the day page that allows
 * users to save this to relationship journal. It should save nicely in a tile
 * with the quote and the user can add commentary about it."
 *
 * The quote is kept in `anchor_context`, the column that already means "the
 * words this was made on", and the reader's commentary is the body. That is
 * two halves of one tile, and a surface that draws only the body shows an
 * entry that is blank, or a paragraph of commentary about something invisible.
 *
 * Checked on the drawers rather than on the writers, because the write is one
 * call in one place and the drawing is what has to agree.
 */
for (const [who, file] of [
  ['the website', `${ROOT}src/notes-web.jsx`],
  ['the app', `${ROOT}attune-app/src/components/journal.tsx`],
]) {
  const src = readFileSync(file, 'utf8');
  if (!/anchor_context/.test(src)) {
    fails.push(`${who} draws a journal entry without its quote. An entry saved`
      + ' from the insight of the day keeps the quote in anchor_context and the'
      + " reader's own words in the body; a surface that draws only the body"
      + ' shows a blank tile, or commentary about nothing.');
  }
}

if (fails.length) {
  console.error('\n check-notes-parity: the two surfaces do not reach the same Notes.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`✓ check-notes-parity: ${actions.size} actions on /api/notes, all reachable from both surfaces; both write a journal entry and both keep entries out of the marks.`);
