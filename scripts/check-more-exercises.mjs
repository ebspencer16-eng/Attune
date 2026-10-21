#!/usr/bin/env node
/**
 * The section offering the exercises a couple does not own is one section.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Ellie: "Let's call the section 'More Attune Exercises' and just do the
 * greyed out thing with the lock icon over it if users haven't purchased.
 * That's what we do for the resources on learn too, right?"
 *
 * And, earlier, where it goes: "additional exercise add-on section exists on
 * insights page below exercise status table and below insights menu (the two
 * stages of that page)."
 *
 * So there are four things to hold, and they are four because each of them has
 * already gone wrong somewhere in this repo:
 *
 *   1. One name. The heading lives in api/_exercises.js. The website imports
 *      it. The app cannot import from api/ and carries the string, which is
 *      compared here BY VALUE against the home. A section with two names is a
 *      bug this codebase has shipped twice.
 *
 *   2. One rule about what is in it. Neither surface may name an exercise:
 *      both read ownership, which api/_exercises.js and /api/home work out
 *      from the same registry. A hand-typed list beside a derived one is
 *      always the shorter list.
 *
 *   3. Both stages, on both surfaces. The section was website-only for a
 *      round, and before that it was under the results menu only, so the
 *      couple most likely to want another exercise never saw it.
 *
 *   4. The treatment she asked for is DRAWN. A dim and a lock, not a constant
 *      declared and never passed. "A constant that exists is not a thing that
 *      is drawn."
 *
 * ── AND LEARN, WHICH NOW MATCHES ──────────────────────────────────────────
 * Ellie asked for the lock here because "that's what we do for the resources
 * on learn". It was not: an unowned tool there was dimmed to half with a muted
 * icon and no lock. Told that, she said "yes add the lock", so both tabs draw
 * the same thing and this holds both halves: the same dimming, and a lock on
 * each.
 *
 * Two surfaces drawing one treatment is the thing this file exists to stop
 * drifting, and the reason to gate it is that they agree today.
 */

import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (p) => readFileSync(`${ROOT}${p}`, 'utf8');
/** Prose beside code is not code. A gate that reads a comment punishes a file
    for saying what went wrong. */
const code = (s) => s.replace(/\/\*[^]*?\*\//g, ' ').replace(/^\s*\/\/[^\n]*/gm, ' ');

const fails = [];

// ── 1. ONE NAME ─────────────────────────────────────────────────────────────
const registry = read('api/_exercises.js');
const home = /export const MORE_EXERCISES_LABEL = '([^']+)'/.exec(registry)?.[1] || null;
if (!home) {
  // A gate that has lost its subject must never report success.
  console.error('[check-more-exercises] MORE_EXERCISES_LABEL is not in api/_exercises.js.');
  console.error('That constant is the section\'s one name. Without it there is nothing to compare.');
  process.exit(1);
}

const site = read('src/App.jsx');
const siteCode = code(site);
if (!/import \{[^}]*\bMORE_EXERCISES_LABEL\b[^}]*\} from "\.\.\/api\/_exercises\.js"/.test(siteCode)) {
  fails.push('src/App.jsx does not import MORE_EXERCISES_LABEL from api/_exercises.js.');
}
if (!siteCode.includes('{MORE_EXERCISES_LABEL}')) {
  fails.push('src/App.jsx never renders MORE_EXERCISES_LABEL. An imported name nothing draws is not a heading.');
}
if (siteCode.includes(`>${home}`) || siteCode.includes(`"${home}"`) || siteCode.includes(`'${home}'`)) {
  fails.push(`src/App.jsx writes "${home}" out as a literal. It has a home; read it.`);
}

const appTile = read('attune-app/src/components/more-exercises.tsx');
const appTileCode = code(appTile);
const appLabel = /export const MORE_EXERCISES_LABEL = '([^']+)'/.exec(appTileCode)?.[1] || null;
if (appLabel === null) {
  fails.push('attune-app/src/components/more-exercises.tsx declares no MORE_EXERCISES_LABEL.');
} else if (appLabel !== home) {
  fails.push(`The section has two names: api/_exercises.js says "${home}", the app says "${appLabel}".`);
}
if (!/\{MORE_EXERCISES_LABEL\}/.test(appTileCode)) {
  fails.push('The app declares MORE_EXERCISES_LABEL and does not draw it.');
}

// ── 2. ONE RULE ABOUT WHAT IS IN IT ─────────────────────────────────────────
// The four indirect forms this file's own CLAUDE.md asks for: an exercise
// named outright, in quotes, as a key, or via a list typed on the spot.
const KEYS = [...registry.matchAll(/\bkey: '([a-z0-9]+)'/g)].map((m) => m[1]);
if (KEYS.length < 5) {
  console.error(`[check-more-exercises] read only ${KEYS.length} exercise keys out of the registry; expected five or more.`);
  process.exit(1);
}
const named = (text, where) => {
  for (const k of KEYS) {
    if (new RegExp(`['"\`]${k}['"\`]`).test(text)) {
      fails.push(`${where} names the exercise "${k}". Which exercises are additional is ownership, not a list.`);
    }
  }
};
named(appTileCode, 'attune-app/src/components/more-exercises.tsx');
if (!/exercises\.filter\(\(e\) => !e\.owned\)/.test(appTileCode)) {
  fails.push('The app tile does not filter on !e.owned. That field is the server\'s answer and the only rule here.');
}

const additional = siteCode.slice(siteCode.indexOf('export function AdditionalExercises'));
const body = additional.slice(0, additional.indexOf('\nexport function ', 1));
named(body, 'AdditionalExercises in src/App.jsx');
if (!/\bunownedExercises\(/.test(body)) {
  fails.push('AdditionalExercises does not call unownedExercises. Deriving the list is the whole point of it.');
}

// ── 3. BOTH STAGES, ON BOTH SURFACES ────────────────────────────────────────
const siteUses = (siteCode.match(/<AdditionalExercises\b/g) || []).length;
if (siteUses < 2) {
  fails.push(`src/App.jsx renders AdditionalExercises ${siteUses} time(s). Ellie asked for both stages of the Insights page.`);
}
const insights = code(read('attune-app/src/app/insights.tsx'));
const appUses = (insights.match(/<MoreExercises\b/g) || []).length;
if (appUses < 2) {
  fails.push(`attune-app/src/app/insights.tsx renders MoreExercises ${appUses} time(s). Both stages, same as the website.`);
}
// Under the status table on one stage, under the menu on the other.
if (!/<StatusTable[^]*?<MoreExercises/.test(insights)) {
  fails.push('MoreExercises does not follow the status table on the app\'s first stage.');
}
if (!/menuFooter=\{<MoreExercises/.test(insights)) {
  fails.push('The app\'s results stage does not hand MoreExercises to the menu as its footer.');
}
const menu = code(read('attune-app/src/components/results-menu.tsx'));
if (!/\{big \? footer : null\}/.test(menu)) {
  fails.push('ResultsMenu does not draw its footer on the landing page.');
}

// ── 4. DIMMED, AND LOCKED ───────────────────────────────────────────────────
// The number is typed here, as the promise rather than as either file's
// current state, so moving it has to be done in three places and is therefore
// a decision. It is the same half Learn dims an unowned tool to.
const DIM = '0.5';
const learn = code(read('attune-app/src/app/resources.tsx'));
if (!new RegExp(`owned \\? 1 : ${DIM}`).test(learn)) {
  fails.push(`Learn no longer dims an unowned tile to ${DIM}. These two are meant to read alike; pick one number.`);
}
/* The lock, drawn rather than declared, on Learn too. Ellie: "yes add the
   lock." A name in a ternary is the only way this file draws one. */
if (!/name=\{\(owned \? \(ICON\[item\.key\][^)]*\) : 'lock'\) as never\}/.test(learn)) {
  fails.push("Learn's unowned tile draws no lock. She asked for the same treatment on both tabs.");
}
if (!new RegExp(`const DIMMED = ${DIM};`).test(appTileCode)) {
  fails.push(`The app's More Attune Exercises tile does not dim to ${DIM}.`);
}
if (!/opacity: DIMMED/.test(appTileCode)) {
  fails.push('The app declares DIMMED and never applies it.');
}
if (!new RegExp(`opacity: ${DIM},`).test(body)) {
  fails.push(`The website's tile does not dim to ${DIM}.`);
}
// The lock, drawn rather than declared.
if (!/name=\{'lock' as never\}/.test(appTileCode)) {
  fails.push('The app\'s tile draws no lock.');
}
if (!/<rect[^>]*\/>\s*<path[^>]*\/>/.test(body) || !/strokeLinecap/.test(body)) {
  fails.push('The website\'s tile draws no lock: the shackle and the body are two elements and both have to be there.');
}

if (fails.length) {
  console.error('[check-more-exercises] the two surfaces disagree about More Attune Exercises:');
  for (const f of fails) console.error(`  ${f}`);
  process.exit(1);
}

console.log(`[check-more-exercises] "${home}" on both surfaces, both stages, derived from`
  + ` ${KEYS.length} registered exercises, dimmed to ${DIM} with a lock, and Learn's unowned`
  + ' tiles draw the same dim and the same lock.');
