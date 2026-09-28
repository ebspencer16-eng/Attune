#!/usr/bin/env node
/**
 * The Shared Budget and the checklist are one per couple, and both surfaces
 * agree what a field is called.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * Both tools were stored on the editing partner's own profile and nothing
 * anywhere read the other side. /api/tool-data selected and wrote
 * id=eq.<the caller>, and a search across the server, the website and the app
 * found no read of a partner's row. So a couple had one budget each, neither
 * could see the other, and the tool is called Shared Budget and keys both of
 * their incomes by name.
 *
 * Ellie: "Budget and checklist should be mirrored for each partner. One partner
 * checking something off should show on both partners' checklists, same with
 * budget inputs. This structure should persist regardless of where the users are
 * accessing the resources (app or site)."
 *
 * ── WHAT THIS CHECKS ──────────────────────────────────────────────────────
 * One writer. Both surfaces save through /api/tool-data, so neither can write a
 * tool straight onto a profile and quietly go back to one each. The website used
 * to, which is what made this possible.
 *
 * One vocabulary. The presence marker is keyed by a field id, and the two
 * surfaces build those ids independently. If one says `income:Ellie Bowman` and
 * the other says `income:Ellie`, the marker lands on no box at all and nothing
 * errors: it is the same failure check-budget-names exists for, one layer up.
 *
 * One row. The endpoint has to key by the couple, using the same helper shared
 * notes use, rather than computing a pair order of its own.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the two of them can edit the same figure at the same moment without
 * one overwriting the other. They can, and the last save wins, which is stated
 * in TASKS.md as the decision it is. The marker exists so that is visible rather
 * than surprising, and a field-level merge is a bigger change than the one that
 * was asked for.
 *
 * Not the presence window. Twelve seconds against a six second poll is a
 * judgement about how quickly a marker should appear and clear, not a rule.
 * What is checked is that the server reads a stamp as stale at all, because a
 * marker that never clears is worse than none: a phone going to sleep sends no
 * blur, so nothing reliably says someone has left.
 */

import { readFileSync } from 'node:fs';
import { coupleKeyOf } from '../api/_lib/couple-key.js';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (f) => readFileSync(`${ROOT}${f}`, 'utf8');
const bare = (src) => src.split('\n').filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l)).join('\n');
const fails = [];

const endpoint = bare(read('api/tool-data.js'));
const site = bare(read('src/App.jsx'));
const app = bare(read('attune-app/src/components/budget.tsx'));

/** The key both partners land on, from opposite sides. */
if (coupleKeyOf('b', 'a') !== coupleKeyOf('a', 'b')) {
  fails.push('coupleKeyOf gives a different answer depending on which partner asks,'
    + ' so the two of them write and read different rows and neither sees the other.');
}
if (!/coupleKeyOf\(/.test(endpoint)) {
  fails.push('api/tool-data.js does not use coupleKeyOf, so whatever it keys the'
    + ' shared row by is not what shared notes key by, and the two can disagree.');
}
/**
 * And no second way of building one.
 *
 * Asking only whether coupleKeyOf appears was planted against and passed: there
 * are two call sites, so replacing one with an inline join left the other
 * matching. The inline form is the dangerous one, because it is the sort that
 * makes the key the same from both sides, and `[me, them].join(':')` reads
 * perfectly well while giving the two partners different rows.
 */
for (const m of endpoint.matchAll(/\.join\(\s*['"]:['"]\s*\)/g)) {
  const line = endpoint.slice(0, m.index).split('\n').length;
  fails.push(`api/tool-data.js:${line} joins a pair of ids by hand. Sorting them is`
    + ' what makes both partners compute the same key, and an unsorted join gives'
    + ' them a row each while looking correct. Use coupleKeyOf.');
}
if (!/couple_tools/.test(endpoint)) {
  fails.push('api/tool-data.js never touches couple_tools, so the tools are back to'
    + ' one per person with nothing saying so.');
}

/**
 * One writer.
 *
 * A direct profile write from the website is exactly how this was one each, so
 * it is the thing forbidden rather than the thing described.
 */
for (const col of ['budget_data', 'checklist_data']) {
  const bad = new RegExp(`saveProfileData\\([^)]*${col}`);
  if (bad.test(site)) {
    fails.push(`src/App.jsx writes ${col} straight onto a profile. That is one copy`
      + ' per person: the partner cannot see it and nothing reports a problem. It'
      + ' goes through /api/tool-data, which is the only thing that knows the pair.');
  }
}
if (!/\/api\/tool-data/.test(site)) {
  fails.push('src/App.jsx never calls /api/tool-data, so the website is not saving'
    + ' the shared tools where the app reads them.');
}

/** One vocabulary for the marker, or it lands on nothing. */
const siteField = site.match(/`income:\$\{(\w+)\}`/);
const appField = app.match(/`income:\$\{(\w+)\}`/);
if (!siteField) {
  fails.push('src/App.jsx does not key an income field as `income:${name}`, so its'
    + ' marker cannot match the app\'s.');
}
if (!appField) {
  fails.push('attune-app budget does not key an income field as `income:${name}`, so'
    + ' its marker cannot match the website\'s.');
}
if (siteField && appField) {
  /**
   * Both must interpolate the same thing: the full profile name the budget is
   * already keyed by. The website calls it `name` and the app calls it `who`,
   * and what matters is that each is the name that side writes its figures
   * under, which check-budget-names already proves is the full one.
   */
  if (!/\[you, them\]\.map\(\(who\)/.test(app)) {
    fails.push('the app no longer builds its income rows from [you, them], so the'
      + ' name in its field id may not be the name it keys the figure by.');
  }
  if (!/`income:\$\{name\}`/.test(site) && !/`income:\$\{who\}`/.test(site)) {
    fails.push('the website\'s income field id is built from something other than the'
      + ' name it keys the figure by, so the marker points at a box that does not'
      + ' exist on the other surface.');
  }
}

/** A stamp has to go stale, or a marker never clears. */
if (!/PRESENCE_SECONDS/.test(endpoint)) {
  fails.push('api/tool-data.js has no staleness window on the editing stamps. A'
    + ' phone going to sleep sends no blur, so without one a marker stays on a'
    + ' field for ever and the reader learns to ignore it.');
}
if (!/at\.by === me/.test(endpoint)) {
  fails.push('api/tool-data.js does not exclude the reader from the editing it'
    + ' reports, so someone sees their own marker on the field they are typing in.');
}

/** Both surfaces have to actually ask, or the marker never appears. */
if (!/editing/.test(app) || !/partnerEditing/.test(app)) {
  fails.push('the app never reads who is editing, so the marker Ellie asked for'
    + ' cannot draw.');
}
if (!/partnerEditing/.test(site)) {
  fails.push('the website never reads who is editing, so the marker draws on one'
    + ' surface only and the two do not behave the same.');
}

if (fails.length) {
  console.error('\n check-shared-tools: the couple\'s tools are not shared.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log('[check-shared-tools] one row per couple through one endpoint, both'
  + ' surfaces keying the marker the same way, and an editing stamp that goes stale.');
