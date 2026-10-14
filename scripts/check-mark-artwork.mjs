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
 * 3. Every inline mark anywhere, and every generated PNG, draws the left
 *    bubble's heart the way the favicon does. That was out of scope and said
 *    so here, on the grounds that this gate was about the one surface Ellie
 *    reported. She has since reported the wider thing: "Please make all
 *    lockups the same mark, with the heart in the left bubble white not
 *    ghost." So the scope is hers rather than quietly widened.
 *
 *    64 copies across 33 files drew that heart at 93 per cent white, and the
 *    app's own attune-mark.png was a different drawing altogether: generated
 *    by nothing, dated September, a cream heart on a pale square. Four screens
 *    asked for it.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the whole of each inline mark matches. They legitimately differ: the
 * gradient id has to be unique per document, and the width and height are the
 * lockup's business. What is held is the heart Ellie named.
 *
 * Not the right bubble's fill, which is white on cream and is the thing the
 * dark variant deliberately changes. Two of the three generated variants
 * differ from the base on purpose and at her request, and a gate insisting on
 * one file would undo that.
 */

import { createHash } from 'node:crypto';
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

// ── 3. One left heart, everywhere ───────────────────────────────────────────
{
  /**
   * Ellie: "Please make all lockups the same mark, with the heart in the left
   * bubble white not ghost."
   *
   * The heart is one path drawn twice: white inside the left bubble, gradient
   * inside the right. So the thing to look for is that path with a white fill,
   * and what must not be beside it is an opacity. A cut-out, a tint or a 93
   * per cent white are each a different left heart, and the mark then reads as
   * a different logo on every ground it sits on.
   */
  const art = read(ART);
  const heartPath = [...art.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1])
    .find((d) => /C27\.5 5 24 8\.5 22 11 Z$/.test(d.trim()));
  if (!heartPath) {
    fails.push(`${ART} no longer carries the heart path this check is about. Refusing to pass:`
      + ' a gate that has lost its subject must never report success.');
  } else {
    /* The favicon itself first: it is the source every other copy comes from. */
    const faviconHeart = new RegExp(`d="${heartPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*`, 'g');
    for (const m of art.matchAll(faviconHeart)) {
      if (/fill="white"/.test(m[0]) && /opacity=/.test(m[0])) {
        fails.push(`${ART} draws the left heart with an opacity (${m[0].match(/opacity="[^"]*"/)[0]}).`
          + ' Ellie asked for white, not ghost, and this file is where every other copy comes from.');
      }
    }

    /* And every copy of it that is typed into a page. */
    const ghosted = [];
    let scanned = 0;
    const walkAll = (dir) => {
      for (const name of readdirSync(dir)) {
        if (name.startsWith('.') || name === 'node_modules' || name === 'dist') continue;
        const full = join(dir, name);
        if (statSync(full).isDirectory()) { walkAll(full); continue; }
        if (!/\.(html|jsx?|tsx?|svg)$/.test(name)) continue;
        const rel = full.slice(ROOT.length);
        const src = readFileSync(full, 'utf8');
        if (!src.includes(heartPath)) continue;
        scanned += 1;
        const esc = heartPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        /**
         * The path written out, AND the path reached through a constant.
         *
         * src/attune-mark.jsx holds it in `const HEART = '...'` and draws
         * `<path d={HEART} ... />`, so a scan for the literal found the file,
         * found the declaration, and never looked at either of the two places
         * the heart is actually drawn. A plant that ghosted the component's
         * heart walked straight through. That is this codebase's oldest
         * lesson, pointed at a gate written ten minutes earlier: when a
         * scanner looks for a string, ask what the indirection for it is.
         */
        const aliases = [...src.matchAll(
          new RegExp(`(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*['"\`]${esc}['"\`]`, 'g'),
        )].map((m) => m[1]);

        const tails = [
          ...[...src.matchAll(new RegExp(`${esc}"[^>/]*`, 'g'))].map((m) => m[0]),
          ...aliases.flatMap((name) => [...src.matchAll(
            new RegExp(`d=\\{\\s*${name}\\s*\\}[^>/]*`, 'g'),
          )].map((m) => m[0])),
        ];

        for (const tail of tails) {
          if (!/fill="white"/.test(tail) && !/fill=\{?["']?white/.test(tail)) continue;   // the gradient heart
          const op = tail.match(/opacity=["{]?["']?([\d.]+)/);
          if (op && Number(op[1]) < 1) ghosted.push(`${rel} (opacity ${op[1]})`);
          if (/mask=/.test(tail)) ghosted.push(`${rel} (masked out)`);
        }
      }
    };
    for (const dir of ['public', 'src', 'scripts']) walkAll(join(ROOT, dir));

    if (scanned < 30) {
      fails.push(`Found the mark in only ${scanned} files and there were 35 when this was written.`
        + ' If marks were removed, lower this figure in the same commit; otherwise the walk has'
        + ' lost its subject.');
    }
    if (ghosted.length) {
      fails.push(`${ghosted.length} lockup${ghosted.length === 1 ? ' draws' : 's draw'} the left heart as a`
        + ` ghost rather than white:\n      ${[...new Set(ghosted)].slice(0, 8).join('\n      ')}`
        + (ghosted.length > 8 ? `\n      ...and ${ghosted.length - 8} more` : ''));
    }
  }

  /**
   * The app's lockups are PNGs, so the check there is that they were built
   * from this artwork rather than exported by hand.
   *
   * By hash, not by modification time. The first version compared mtimes and
   * that is not a fact git keeps: a clone stamps every file with the checkout
   * time, so the comparison passed on this machine and would have been a coin
   * toss on Vercel. build-mark-variants.mjs writes the hash of the SVG it
   * read beside the files it produced.
   */
  const stamp = 'attune-app/assets/images/.mark-source';
  for (const png of ['attune-mark', 'attune-mark@2x', 'attune-mark@3x',
    'attune-mark-light', 'attune-mark-dark', 'attune-mark-dark-plain']) {
    try { statSync(`${ROOT}attune-app/assets/images/${png}.png`); }
    catch { fails.push(`attune-app/assets/images/${png}.png is missing, and screens ask for it.`); }
  }
  const want = createHash('sha256').update(read(ART)).digest('hex');
  let got = null;
  try { got = read(stamp).trim().split(/\s+/)[0]; } catch { /* never built */ }
  if (!got) {
    fails.push(`${stamp} is missing, so nothing records which artwork the app's lockups were`
      + ' built from. Run `node scripts/build-mark-variants.mjs`.');
  } else if (got !== want) {
    fails.push(`The app's lockups were built from a different ${ART} (${got.slice(0, 12)} against`
      + ` ${want.slice(0, 12)}), so the app is drawing a mark from before the artwork changed.`
      + ' Run `node scripts/build-mark-variants.mjs`.');
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
