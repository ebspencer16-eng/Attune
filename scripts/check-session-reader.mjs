#!/usr/bin/env node
/**
 * One reader for the signed-in person's token, across every static page.
 *
 * ── THE RULE ───────────────────────────────────────────────────────────────
 * A page under public/ that needs the access token loads /_session.js and
 * calls `window.attuneToken()` or `window.attuneHeaders()`. It does not go
 * into localStorage itself.
 *
 * ── WHY ────────────────────────────────────────────────────────────────────
 * supabase-js keeps the session under sb-<project-ref>-auth-token, and reading
 * it means knowing that, knowing the ref is found by prefix rather than
 * hardcoded, and knowing the two shapes the session has had (v2 at the top
 * level, older versions under currentSession). privacy-choices.html got all
 * three right. When /feedback needed the same thing, a second copy would have
 * been the next place to get one of them wrong, and the symptom of getting one
 * wrong is a page quietly showing its signed-out state to somebody who is
 * signed in: no error, no blank screen, just a survey filed against nobody.
 *
 * ── WHAT THIS DELIBERATELY DOES NOT COVER ──────────────────────────────────
 * The React site, which calls sb.auth.getSession() through the client, and the
 * app, which has its own session handling. This is about static pages, which
 * cannot import a module and therefore copy by hand.
 *
 * A page that loads the script and never calls it is also a finding: that is
 * what a half-finished move looks like, and it reads as covered.
 */

import { readdirSync, readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const PUBLIC = `${ROOT}public`;

/** The one file allowed to know the storage key. */
const READER = '_session.js';

const problems = [];

/* public/ is flat for pages, with one subdirectory of In Practice articles.
   Both are read: check-chrome printed "one nav across 12 pages" for months
   because its readdirSync did not recurse and the seventeen pages under
   public/practice/ had never been looked at. */
function files(dir, rel = '') {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const path = `${dir}/${entry.name}`;
    const shown = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...files(path, shown));
    else if (/\.(html|js)$/.test(entry.name)) out.push({ path, shown });
  }
  return out;
}

const all = files(PUBLIC);
let readers = 0;
let loaders = 0;

for (const { path, shown } of all) {
  const raw = readFileSync(path, 'utf8');
  /* Comments blanked before any of this. The reader explains the storage key
     at length and the gate read its own subject's explanation as code: P5
     below passed with the key filter deleted, because the words were still in
     the paragraph above it. check-style-codes had the same bug and the lesson
     is in CLAUDE.md: blank comments before scanning, or the cost of writing
     down what happened is a failing build. */
  const src = raw
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:"'])\/\/[^\n]*/g, '$1 ');
  const opensStorage = /-auth-token/.test(src) || /localStorage\.key\(/.test(src);

  if (shown === READER) {
    readers++;
    if (!opensStorage) {
      problems.push(`${READER} no longer reads the session key at all. Refusing to pass: a gate`
        + ' that has lost its subject must never report success.');
    }
    /* The three pieces of knowledge this file exists to hold, each checked in
       code rather than in the paragraph that describes them. Dropping the key
       filter leaves a reader that returns an access_token out of whatever
       localStorage key happens to come first, which works until something else
       stores one. */
    for (const [needle, why] of [
      ["'sb-'", 'the prefix every Supabase session key starts with'],
      ["'-auth-token'", 'the suffix that tells a session key from the other sb- keys'],
      ['currentSession', 'the older shape, where the session sat under currentSession'],
    ]) {
      if (!src.includes(needle)) {
        problems.push(`${READER} no longer looks for ${needle}, which is ${why}. The point of one`
          + ' reader is that all three live in it.');
      }
    }
    /* The assignment, not the name. A plant that renamed `w.attuneToken` to
       `w.attuneTok` passed, because the function it was assigning from is
       still called attuneToken and the word was therefore still in the file.
       Ask what the code DOES with the name. */
    for (const fn of ['attuneToken', 'attuneHeaders']) {
      if (!new RegExp(`w\\.${fn}\\s*=`).test(src) && !new RegExp(`window\\.${fn}\\s*=`).test(src)) {
        problems.push(`${READER} does not put ${fn} on window, so every page calling it throws or`
          + ' silently reads as signed out.');
      }
    }
    continue;
  }

  if (opensStorage) {
    problems.push(`${shown} reads the Supabase session out of localStorage itself. Load`
      + ' /_session.js and call window.attuneToken() or window.attuneHeaders().');
  }

  /* The other direction: a page that loads the reader and never uses it, or
     uses it without loading it. Both look fine in a diff. */
  const loads = /src=["']\/_session\.js["']/.test(raw);
  /* Or a nav sign-in link, which /_session.js itself turns into the
     signed-in circle (A243). That use is in the script, not the page. */
  const uses = /attuneToken\s*\(|attuneHeaders\s*\(|window\.attuneToken|window\.attuneHeaders/.test(src);
  const navUse = /class=["']nav-signin["']/.test(raw);
  if (loads) loaders++;
  if (loads && !uses && !navUse) {
    problems.push(`${shown} loads /_session.js and never calls it. Either it needs the token or the`
      + ' script tag is left over from a move that did not finish.');
  }
  if (uses && !loads) {
    problems.push(`${shown} calls attuneToken or attuneHeaders without loading /_session.js, so the`
      + ' call is undefined at run time and the page throws where it meant to read a session.');
  }
}

if (readers !== 1) {
  problems.push(`there are ${readers} copies of ${READER} under public/, and the point of the file`
    + ' is that there is one.');
}

if (problems.length) {
  console.error('[check-session-reader] the session token is read in more than one way:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('Reading sb-<ref>-auth-token takes three pieces of knowledge: the prefix, that the');
  console.error('project ref is not fixed, and the two shapes a stored session has had. A second');
  console.error('copy is the next place one of them is wrong, and the symptom is a page showing');
  console.error('its signed-out state to somebody who is signed in.');
  process.exit(1);
}

console.log(`[check-session-reader] ${all.length} files under public/, one reader of the session key`
  + ` (${READER}), and ${loaders} page(s) that load it all call it.`);
