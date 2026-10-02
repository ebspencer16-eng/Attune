#!/usr/bin/env node
/**
 * A value handed to a screen that is not mounted yet is handed over ONCE.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * Ellie: "for some reason on the app when I click download it opens the how to
 * review your results together article."
 *
 * Tapping the workbook sends someone out of the app, and when they come back
 * iOS may have released the Learn tab and rebuilt it. The rebuilt screen read
 * a module-level slot that had been left full:
 *
 *   export function showPost(id) { pendingPost = id; openPostHandle?.(id); }
 *
 * A mounted screen took the value through the handle, and the slot kept a copy.
 * The only thing that emptied it was the mount effect, which had already run.
 * So one tap on a mark in the Notes tab left that article's slug in module
 * memory for the rest of the session, and the next rebuild of the tab opened an
 * article nobody asked for. In the simulator the tab is never released, which is
 * exactly why it happened on her phone and not on mine.
 *
 * ── WHAT IS CHECKED, BY RUNNING IT ────────────────────────────────────────
 * The three properties the pattern needs, executed against the code that ships:
 *
 *   1. A value sent with no screen mounted reaches the next mount, and only
 *      that mount.
 *   2. A value sent to a mounted screen leaves NOTHING behind. This is the bug.
 *   3. A cleanup removes the handle only if it is still its own, so two screens
 *      overlapping during a rebuild do not leave the slot deaf.
 *
 * And then that the Learn tab still uses it, rather than growing its own pair
 * of variables again.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * `lastSection` in components/results.tsx, which is remembered on purpose: it is
 * where the Insights tab reopens, not a one-shot, and emptying it would be a
 * different bug. `pendingMark` in the same file is a one-shot and already reads
 * and clears, through takePendingMark; it is left where it is rather than
 * migrated, because moving working code to make a gate tidier is a change with
 * risk and no benefit.
 */

import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const fails = [];

const SLOT = 'attune-app/src/lib/one-shot.ts';
const USER = 'attune-app/src/app/resources.tsx';

// ── The helper, compiled and run ────────────────────────────────────────────
let oneShot = null;
try {
  const js = transformSync(read(SLOT), { loader: 'ts', format: 'esm' }).code;
  ({ oneShot } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`));
} catch (err) {
  fails.push(`${SLOT} would not compile or evaluate here: ${String(err.message || err).slice(0, 140)}.`
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
}
if (oneShot && typeof oneShot !== 'function') {
  fails.push(`${SLOT} no longer exports oneShot as a function. Refusing to pass: a gate that has`
    + ' lost its subject must never report success.');
  oneShot = null;
}

if (oneShot) {
  // 1. Nothing mounted: the value waits, and is taken by exactly one mount.
  {
    const s = oneShot();
    s.send('article-a');
    if (s.pending() !== 'article-a') {
      fails.push('a value sent while no screen is mounted does not reach the next mount, so a mark'
        + ' tapped in Notes while the Learn tab is gone opens nothing at all.');
    }
    const off = s.register(() => {});
    if (s.pending() !== null) {
      fails.push('registering a mounted screen does not empty the slot, so the value is still there'
        + ' for the mount after this one and an article opens a second time unasked.');
    }
    off();
  }

  // 2. Mounted: the screen takes it and NOTHING is left behind. The bug.
  {
    const s = oneShot();
    const seen = [];
    const off = s.register((v) => seen.push(v));
    s.send('article-b');
    if (seen.length !== 1 || seen[0] !== 'article-b') {
      fails.push('a value sent while a screen is mounted does not reach that screen, so tapping a'
        + ' mark in Notes does nothing when the Learn tab is already behind the tab bar.');
    }
    if (s.pending() !== null) {
      fails.push('a value sent to a MOUNTED screen is also left in the slot. That is the bug Ellie'
        + ' reported: "it opens the how to review your results together article".\n'
        + '      Nothing empties the slot after the mount effect has run, so the next time iOS\n'
        + '      rebuilds the tab it opens whatever was last sent, forever.');
    }
    off();
  }

  // 3. Two screens overlapping during a rebuild.
  {
    const s = oneShot();
    const seen = [];
    const offOld = s.register(() => seen.push('old'));
    const offNew = s.register(() => seen.push('new'));
    offOld();
    s.send('article-c');
    if (seen[seen.length - 1] !== 'new') {
      fails.push("the outgoing screen's cleanup removes the incoming screen's handle, so after one"
        + ' tab rebuild nothing is listening and every later tap falls into the slot instead.\n'
        + '      Guard the cleanup: only clear the handle if it is still the one you installed.');
    }
    offNew();
    s.send('article-d');
    if (s.pending() !== 'article-d') {
      fails.push('with no screen mounted the slot stops accepting values, so a tap that arrives'
        + ' between two mounts is lost.');
    }
  }
}

// ── And the Learn tab uses it ───────────────────────────────────────────────
{
  const src = read(USER);
  const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');

  if (!/from '@\/lib\/one-shot'/.test(code)) {
    fails.push(`${USER} does not import the shared slot, so showPost and showTool are back to`
      + ' their own variables and the three properties above are promised by nobody.');
  }

  /* Each exported setter sends through a slot. Matched with what follows the
     name rather than on the name alone: `showPost` existing proves nothing. */
  for (const fn of ['showPost', 'showTool']) {
    const m = new RegExp(`export function ${fn}\\(\\s*\\w+[^)]*\\)\\s*\\{([\\s\\S]{0,240}?)\\n\\}`)
      .exec(code);
    if (!m) {
      fails.push(`${USER} no longer exports ${fn}, which is how the other tabs reach this one.`
        + ' Refusing to pass: a gate that has lost its subject must never report success.');
      continue;
    }
    if (!/\.send\s*\(/.test(m[1])) {
      fails.push(`${USER}'s ${fn} does not hand its value to a slot's send(). Assigning a module`
        + ' variable and calling a handle is the shape that shipped the bug: the handle takes it'
        + ' and the variable keeps a copy nothing empties.');
    }
    if (/=\s*\w+\s*;/.test(m[1].replace(/\.send\s*\([^)]*\)\s*;?/g, ''))) {
      fails.push(`${USER}'s ${fn} assigns something as well as sending it, which is how a copy gets`
        + ' left behind.');
    }
  }

  /* No module-level slot of its own. Any `let` at column zero holding a string
     or a handle is the pattern coming back by hand. */
  for (const m of code.matchAll(/^let\s+(\w*(?:pending|Pending|Handle|handle)\w*)\b/gm)) {
    fails.push(`${USER}:${code.slice(0, m.index).split('\n').length} declares its own module-level`
      + ` slot \`${m[1]}\`. That is the pattern this gate exists to stop being rewritten; use`
      + ' oneShot() from @/lib/one-shot.');
  }
}

if (fails.length) {
  console.error('\n check-one-shot-slots: a value handed between tabs can be handed over twice.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log('[check-one-shot-slots] the shared slot holds its three properties when run: a value'
  + ' waits for the next mount, a value taken by a mounted screen leaves nothing behind, and an'
  + " outgoing screen's cleanup cannot deafen the incoming one. The Learn tab sends through it.");
