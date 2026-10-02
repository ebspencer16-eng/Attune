#!/usr/bin/env node
/**
 * The Attune mark is whole, and it is drawn once.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * Ellie, of the Notes loading screen: "Only seeing the left half of the mark."
 *
 * She was describing it exactly. The mark is two speech bubbles, each with a
 * heart, and public/favicon.svg carries all four paths. The website drew it
 * inline twelve times by hand and five of those drew the left bubble and
 * stopped. The viewBox is 103 wide either way, so a half mark fills the same
 * box with nothing in the right of it; at 28 points nobody saw it, and it only
 * gave itself away when that one screen's mark went to 68.
 *
 * ── A NUMBER I GOT WRONG ON THE WAY ───────────────────────────────────────
 * My first count said seven halves, from a grep for the right bubble's path on
 * the same LINE as the opening tag. Several of these SVGs span four lines, so
 * marks that do draw it read as missing. The real count was five, from scanning
 * each <svg> block. CLAUDE.md says to state the method next to the number, and
 * this is why: "7" and "5" look equally like something that was counted.
 *
 * ── WHAT IS CHECKED ───────────────────────────────────────────────────────
 * 1. src/attune-mark.jsx carries the same four path strings as the favicon,
 *    which is the artwork the browser tab shows and the one nobody can edit by
 *    accident.
 * 2. No file under src/ inlines its own 103x76 mark. One drawing, one place.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The app's mark, which is a PNG asset rather than paths, and the PNG the
 * emails use. Those are files; this is about a drawing being retyped.
 *
 * public/*.html, which carry their own marks in static pages that ship without
 * React. Those are worth doing and are a separate job: this one is about the
 * surface Ellie reported, and a gate that quietly widens its subject is how
 * the last one got pointed at the wrong half.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');
const fails = [];

const SOURCE = 'src/attune-mark.jsx';
const ART = 'public/favicon.svg';

// ── 1. The component draws what the favicon draws ───────────────────────────
{
  const art = read(ART);
  const mark = read(SOURCE);

  /* Every `d="..."` in the favicon, which is the artwork of record. */
  const paths = [...art.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]);
  if (paths.length !== 4) {
    fails.push(`${ART} has ${paths.length} paths, not 4. The mark is two bubbles and two`
      + ' hearts. Refusing to pass: a gate that has lost its subject must never report'
      + ' success.');
  }
  for (const d of paths) {
    if (!mark.includes(d)) {
      fails.push(`${SOURCE} does not carry this path from ${ART}:\n      ${d.slice(0, 80)}...\n`
        + '      The component and the favicon are the same mark and have to be the same'
        + ' drawing.');
    }
  }

  /**
   * And it DRAWS all four.
   *
   * The first version of this stopped at the question above, and a plant walked
   * through it: deleting the <path> that draws the right bubble leaves the
   * BUBBLE_R constant declared, so every string was still "carried" and the
   * component rendered a half mark. That is the gate checking that a value
   * exists rather than that it is used, which is the same blindness as a
   * helper that is imported and never called.
   */
  const drawn = [...mark.matchAll(/<path\b[\s\S]{0,200}?d=\{(\w+)\}/g)].map((m) => m[1]);
  for (const [name, times] of [['BUBBLE_L', 1], ['BUBBLE_R', 1], ['HEART', 2]]) {
    const n = drawn.filter((d) => d === name).length;
    if (n !== times) {
      fails.push(`${SOURCE} draws ${name} ${n} time(s) and should draw it ${times}.`
        + ' The mark is two bubbles and two hearts; anything less is the half mark Ellie'
        + ' reported, and declaring the path without drawing it looks identical in the'
        + ' source.');
    }
  }
}

// ── 2. Nobody draws their own ───────────────────────────────────────────────
{
  const files = [];
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      if (name.startsWith('.') || name === 'node_modules') continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(jsx?|tsx?)$/.test(name)) files.push(p);
    }
  })(join(ROOT, 'src'));

  let users = 0;
  for (const file of files) {
    const rel = file.slice(ROOT.length);
    const src = readFileSync(file, 'utf8');
    if (rel !== SOURCE && /<AttuneMark[\s/>]/.test(src)) users += 1;
    if (rel === SOURCE) continue;

    /* An <svg> opened on the mark's own viewBox. Matched on the viewBox rather
       than on a path, because a half mark is exactly the case where the path
       that identifies the mark is the one missing. */
    for (const m of src.matchAll(/<svg[^>]*viewBox="0 0 103 76"/g)) {
      const line = src.slice(0, m.index).split('\n').length;
      fails.push(`${rel}:${line} draws its own copy of the mark. Five of the twelve copies`
        + ' that were here drew the left bubble and stopped, and that is what Ellie saw:'
        + ' "Only seeing the left half of the mark."\n'
        + '      Use <AttuneMark width={n} /> from src/attune-mark.jsx.');
    }
  }

  if (!users) {
    fails.push('nothing under src/ draws <AttuneMark>, so the component is not the mark'
      + ' anybody sees. Refusing to pass: a gate that has lost its subject must never'
      + ' report success.');
  }
}

if (fails.length) {
  console.error('\n check-mark-artwork: the mark is drawn more than once, or drawn short.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log('[check-mark-artwork] one mark: src/attune-mark.jsx carries the favicon\'s four'
  + ' paths and nothing under src/ draws its own.');
