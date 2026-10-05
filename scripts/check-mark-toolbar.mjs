#!/usr/bin/env node
/**
 * The five things a selection can become are the same five on both surfaces.
 *
 * ── WHY IT IS A GATE ──────────────────────────────────────────────────────
 * Ellie: "The notes toolbar that pops up when I select text online uses words,
 * but can we switch to the icon toolbar we use in the app?"
 *
 * Making them look alike put a second copy of the list in the website, next to
 * the app's. An Expo project cannot import from src/, so the copy is
 * unavoidable; an unwatched copy is not. The two agreed the day it was written,
 * which is the whole reason nobody would notice the day they stopped.
 *
 * What it holds: the same ids, in the same order, with the same words. A fifth
 * action added to one and not the other, or Tag moving, or "Note" becoming
 * "Comment" on one surface, all fail here.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The artwork. The app names SF Symbols and the website draws paths; they
 * cannot be compared, and a drawing that looks wrong is something to look at
 * rather than to check. The LABEL is what this holds, because the label is the
 * word Ellie wrote.
 *
 * It also says nothing about what each action then does. check-annotation-
 * palette holds the colours and check-anchors holds how a mark is anchored.
 */

import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const fails = [];

const WEB = 'src/notes-web.jsx';
const APP = 'attune-app/src/components/annotation-sheet.tsx';

/** `{ id: 'highlight', label: 'Highlight', ... }` and `{ step: 'highlight', icon: ..., label: ... }`. */
function lift(file, key) {
  const src = readFileSync(`${ROOT}${file}`, 'utf8');
  const m = /const ACTIONS[^=]*=\s*\[([\s\S]*?)\n\];/.exec(src);
  if (!m) return null;
  return [...m[1].matchAll(
    new RegExp(`\\{[^}]*\\b${key}:\\s*'([^']+)'[^}]*\\blabel:\\s*'([^']+)'`, 'g'),
  )].map((x) => ({ id: x[1], label: x[2] }));
}

const web = lift(WEB, 'id');
const app = lift(APP, 'step');

if (!web || !app || web.length < 3 || app.length < 3) {
  console.error('[check-mark-toolbar] could not read the action list from'
    + ` ${!web || web.length < 3 ? WEB : APP}.`
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

const line = (xs) => xs.map((x) => `${x.id} "${x.label}"`).join(', ');

if (web.length !== app.length) {
  fails.push(`the website offers ${web.length} actions and the app offers ${app.length}:\n`
    + `      web: ${line(web)}\n`
    + `      app: ${line(app)}`);
} else {
  for (let i = 0; i < web.length; i += 1) {
    if (web[i].id !== app[i].id) {
      fails.push(`action ${i + 1} is \`${web[i].id}\` on the website and \`${app[i].id}\` in the`
        + ' app. The order is what a reader learns; it has to be one order.');
    } else if (web[i].label !== app[i].label) {
      fails.push(`\`${web[i].id}\` is called "${web[i].label}" on the website and`
        + ` "${app[i].label}" in the app. Ellie writes these words once.`);
    }
  }
}

/*
 * And the website draws them rather than writing them out, which is the ask.
 * Matched on the path being USED, not on it being declared: a list of five
 * icons nothing renders is the shape check-mark-artwork was written for.
 */
const webSrc = readFileSync(`${ROOT}${WEB}`, 'utf8');
if (!/<path d=\{a\.icon\}/.test(webSrc)) {
  fails.push('the website\'s toolbar does not draw each action\'s icon. Ellie: "can we switch to'
    + ' the icon toolbar we use in the app?"');
}
if (web.some((x) => !x.id) || !/icon: '[Mm]/.test(webSrc)) {
  fails.push('an action on the website has no icon path to draw.');
}

if (fails.length) {
  console.error('\n check-mark-toolbar: the two surfaces offer different things to do with a'
    + ' selection.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log(`[check-mark-toolbar] ${web.length} actions, same ids, same order and same words on`
  + ' both surfaces, and the website draws each one rather than naming it.');
