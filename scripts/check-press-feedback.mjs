#!/usr/bin/env node
/**
 * Pressing something looks like pressing something.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * Ellie: "nothing happened the first few times I clicked the personalized
 * workbook button, then I saw the same 'service did not answer' error... add on
 * the site and the web some sense of a button push, whether that's a click, a
 * grey-out, a 'push down' visual effect, or something to signal to the user
 * that the button was tapped."
 *
 * React Native's `Pressable` has no default pressed appearance, unlike
 * `TouchableOpacity`. Of the ninety-odd in this app, exactly one reacted to
 * being pressed. So every tap looked the same as a tap that did nothing, and
 * the workbook takes several seconds to build, which means the only reasonable
 * reading of pressing it was that it had not registered. She pressed it again,
 * which is what anyone would do.
 *
 * ── WHAT IS CHECKED ───────────────────────────────────────────────────────
 * 1. No file in the app imports `Pressable` from 'react-native'. It comes from
 *    @/components/pressable, which layers the pressed state on and composes
 *    with whatever style the caller already passes.
 * 2. That component still actually changes something when pressed, so the
 *    import being right is not the whole of the claim.
 * 3. The website carries its `:active` rule, in the SPA shell and on every
 *    static page, because the same complaint covered both.
 *
 * ── AND A CONTROL THAT IS NOT ONE ─────────────────────────────────────────
 * Four Pressables in this app exist to SWALLOW a tap: the card inside a modal,
 * which stops a touch on it reaching the ground behind and closing the sheet.
 * They have an empty onPress and are not controls.
 *
 * Giving every Pressable a pressed state dimmed and sank all four. Touch the
 * journal sheet, the mark sheet, a note card or the section dropdown anywhere at
 * all and the whole card reacts as though it were a button. A fix for one
 * complaint making a different thing worse, and found by sweeping for
 * accessibility labels rather than by looking for it.
 *
 * `noPressFeedback` is for exactly this and it is named rather than silent, so
 * an exception is a decision somebody wrote down. A swallower has to carry it.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether a slow action also shows progress. That is a different promise and
 * the tools already keep it: `busyTool` dims the tile and spins. This is about
 * the instant between the finger landing and anything happening at all.
 *
 * TouchableOpacity, which has its own feedback and is not used here.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const fails = [];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(name)) out.push(p);
  }
  return out;
}

// ── 1. The app imports the one that gives feedback ──────────────────────────
const WRAPPER = 'attune-app/src/components/pressable.tsx';
const appFiles = walk(join(ROOT, 'attune-app/src'));
let users = 0;

for (const file of appFiles) {
  const rel = file.slice(ROOT.length);
  if (rel === WRAPPER) continue;
  const src = readFileSync(file, 'utf8');
  if (!/<Pressable[\s/>]/.test(src)) continue;
  users += 1;

  const fromRN = /import \{[^}]*\bPressable\b[^}]*\} from 'react-native'/.test(src);
  if (fromRN) {
    fails.push(`${rel} imports Pressable from 'react-native', which has no pressed appearance.\n`
      + "      Import it from '@/components/pressable' instead: that one dims and sinks, and\n"
      + '      composes with any style the caller already passes.');
  } else if (!/from '@\/components\/pressable'/.test(src)) {
    fails.push(`${rel} draws a <Pressable> and imports it from neither 'react-native' nor`
      + " '@/components/pressable'. Refusing to guess where it comes from.");
  }
}

if (!users) {
  fails.push('no file in the app draws a <Pressable>. Refusing to pass: a gate that has lost its'
    + ' subject must never report success.');
}

// ── 1b. A tap swallower does not act like a button ──────────────────────────
{
  let swallowers = 0;
  for (const file of appFiles) {
    const rel = file.slice(ROOT.length);
    if (rel === WRAPPER) continue;
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/onPress=\{\(\)\s*=>\s*\{\s*\}\}/g)) {
      swallowers += 1;
      /* The rest of the opening tag it sits in. Matched to the next `>` at
         brace depth zero, because every prop here is a braced expression. */
      let depth = 0;
      let end = m.index;
      for (let i = m.index; i < src.length; i += 1) {
        if (src[i] === '{') depth += 1;
        else if (src[i] === '}') depth -= 1;
        else if (src[i] === '>' && depth === 0) { end = i; break; }
      }
      const tag = src.slice(m.index, end);
      if (!/\bnoPressFeedback\b/.test(tag)) {
        const line = src.slice(0, m.index).split('\n').length;
        fails.push(`${rel}:${line} is a Pressable with an empty onPress, which is how a modal card`
          + ' swallows the tap that would close it.\n'
          + '      It is not a control, and without `noPressFeedback` the whole card dims and'
          + ' sinks\n      when a finger lands anywhere on it.');
      }
    }
  }
  if (!swallowers) {
    console.log('[check-press-feedback] note: no tap swallowers found, so that half checked'
      + ' nothing. If the modals changed shape, this rule needs re-aiming.');
  }
}

// ── 2. The wrapper still does something ─────────────────────────────────────
{
  const src = readFileSync(join(ROOT, WRAPPER), 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
  if (!/state\.pressed/.test(code)) {
    fails.push(`${WRAPPER} no longer reads \`pressed\`, so every control in the app imports a`
      + ' wrapper that does nothing. Refusing to pass: a gate whose subject has been hollowed'
      + ' out must never report success.');
  }
  if (!/opacity|transform|backgroundColor/.test(code)) {
    fails.push(`${WRAPPER} changes no visible property when pressed.`);
  }
}

// ── 3. The website says so too ──────────────────────────────────────────────
{
  const shell = readFileSync(join(ROOT, 'index.html'), 'utf8');
  /**
   * An `:active` rule that changes something.
   *
   * Asking only whether the selector appears is not enough: the file carries it
   * twice, once as the effect and once inside the reduced-motion block that
   * turns the effect off. A plant that broke the first left the second behind
   * and the gate passed, which is the bug it is meant to catch wearing the
   * gate's own clothes.
   */
  const effective = [...shell.matchAll(/button:not\(:disabled\):active[^{]*\{([^}]*)\}/g)]
    .some((m) => /transform\s*:\s*scale|filter\s*:|opacity\s*:/.test(m[1])
      && !/transform\s*:\s*none/.test(m[1]));
  if (!effective) {
    fails.push('index.html has no `:active` rule that changes anything, so the dashboard, the'
      + ' results and every exercise give no sign that a click landed.\n'
      + '      The reduced-motion block turns the effect off and does not count as having one.');
  }

  const htmls = (function list(dir, out = []) {
    for (const name of readdirSync(dir)) {
      if (name.startsWith('.')) continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) list(p, out);
      else if (name.endsWith('.html')) out.push(p);
    }
    return out;
  })(join(ROOT, 'public'));

  const missing = htmls.filter((f) => !readFileSync(f, 'utf8').includes('attune:press-feedback'));
  if (missing.length) {
    fails.push(`${missing.length} static page(s) carry no pressed state, starting with`
      + ` ${missing[0].slice(ROOT.length)}.\n`
      + '      The complaint covered the whole site, and checkout is a static page.');
  }
}

if (fails.length) {
  console.error('\n check-press-feedback: pressing something looks like nothing happening.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log(`[check-press-feedback] ${users} app files draw a Pressable and every one of them`
  + ' imports the wrapper that shows a press; the website carries the rule in its shell and on'
  + ' every static page.');
