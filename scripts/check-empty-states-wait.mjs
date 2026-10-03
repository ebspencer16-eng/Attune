#!/usr/bin/env node
/**
 * The Learn tab does not say In Practice is empty before In Practice answers.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * Ellie: "In practice on my phone just said 'nothing published yet' then I
 * refreshed again and it showed me the peek."
 *
 * The tab draws as soon as /api/home lands, which is deliberate and was asked
 * for: everything else on it is a section and should not hold the screen. The
 * posts are their own request and were still in flight at that moment, so the
 * shelf rendered an empty list and said there was nothing published.
 *
 * Three states, two modelled: not asked yet, asked and failed, asked and empty.
 * An empty list that has not answered is not an empty shelf, which is the same
 * sentence as "a rejected query is not an empty table" one layer up.
 *
 * ── WHY THIS IS NARROW, ON PURPOSE ────────────────────────────────────────
 * I wrote the general version first: every "Nothing ..." sentence in the app
 * behind a guard. It reported four findings and all four were wrong. It matched
 * where strings are DECLARED rather than where they are drawn, and once that
 * was fixed it flagged the Notes peeks, which are safe because that screen does
 * not render at all until the response carrying those lists has landed. The
 * guard it wanted was already there, one scope out, where the check could not
 * see it.
 *
 * CLAUDE.md: a gate that matches too much is not the safe direction, because it
 * gets loosened until it matches nothing. So this holds the one screen where
 * the rule was actually broken, and says plainly that it is the only one.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Every other empty state in the app. They are safe today for a reason a check
 * cannot see: the screen does not draw until the request carrying that list has
 * answered. If one of those lists ever moves to a request of its own, this will
 * not notice, and the sentence to remember is the one at the top.
 */

import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const FILE = 'attune-app/src/app/resources.tsx';
/**
 * Comments out before anything is located.
 *
 * The first version found "Nothing published yet" inside the comment that
 * explains why this screen has failure handling, forty lines above the render,
 * and reported it as unguarded. A gate that reads its own explanation as the
 * code is the mistake one layer in from the one it is about.
 *
 * Positions are kept honest by replacing each comment with spaces rather than
 * removing it, so a reported line number still points at the real line.
 */
const raw = readFileSync(`${ROOT}${FILE}`, 'utf8');
const src = raw
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + ' '.repeat(m.length - p.length));
const fails = [];

/* The sentence, and the flag that has to stand in front of it. */
const SENTENCE = 'Nothing published yet';
const FLAG = 'postsAnswered';

const at = src.indexOf(SENTENCE);
if (at === -1) {
  console.error(`[check-empty-states-wait] ${FILE} no longer says "${SENTENCE}". If the empty`
    + ' state was reworded, re-aim this; if it was removed, say why here. Refusing to pass: a'
    + ' gate that has lost its subject must never report success.');
  process.exit(1);
}

/**
 * The JSX expressions it is drawn inside, outermost first.
 *
 * Walked out rather than stopping at the first `{`: the sentence sits in a
 * ternary on `postsFailed`, which is inside the ternary on `postsAnswered`, and
 * looking only at the innermost expression reported the guard missing while it
 * was one level out. The same shape as the gate that could not see the screen's
 * own loading return.
 */
const enclosing = [];
{
  let from = at;
  for (let level = 0; level < 4; level += 1) {
    let depth = 0;
    let start = -1;
    for (let i = from - 1; i >= 0 && i > at - 8000; i -= 1) {
      if (src[i] === '}') depth += 1;
      else if (src[i] === '{') {
        if (depth === 0) { start = i; break; }
        depth -= 1;
      }
    }
    if (start === -1) break;
    enclosing.push(src.slice(start, at));
    from = start;
  }
}
const block = enclosing.join('\n');

if (!new RegExp(`\\b${FLAG}\\b`).test(block)) {
  const line = src.slice(0, at).split('\n').length;
  fails.push(`${FILE}:${line} says the shelf is empty with no \`${FLAG}\` in front of it.\n`
    + '      The tab draws when /api/home lands and the posts are a separate request, so this\n'
    + '      sentence is read while In Practice is still in flight. That is what Ellie saw.');
}

/**
 * And the flag means what it says: set when the posts request answers, in that
 * handler, both ways. Matched inside the handler rather than anywhere in the
 * file, because a flag set at the top of the screen is the bug with the fix's
 * name on it.
 */
const handler = /fetchPosts\(\)\.then\(\([^)]*\)\s*=>\s*\{([\s\S]*?)\n\s*\}\),/.exec(src);
if (!handler) {
  console.error(`[check-empty-states-wait] ${FILE} no longer fetches posts in a .then. Refusing`
    + ' to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}
if (!new RegExp(`set${FLAG[0].toUpperCase()}${FLAG.slice(1)}\\(true\\)`).test(handler[1])) {
  fails.push(`${FILE}'s posts handler never sets ${FLAG}, so the shelf waits forever and draws`
    + ' nothing at all, which is the same bug wearing the fix.');
}

/* And nothing else sets it, which is how a flag stops meaning anything. */
const sets = [...src.matchAll(new RegExp(`set${FLAG[0].toUpperCase()}${FLAG.slice(1)}\\(`, 'g'))];
if (sets.length !== 1) {
  fails.push(`${FLAG} is set in ${sets.length} places. One: the moment In Practice answers.`);
}

if (fails.length) {
  console.error('\n check-empty-states-wait: the Learn tab says a shelf is empty before it knows.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log('[check-empty-states-wait] the Learn tab waits for In Practice to answer before it'
  + ' says the shelf is empty, and the flag is set in exactly one place: when it answers.');
