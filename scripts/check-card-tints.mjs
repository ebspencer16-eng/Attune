#!/usr/bin/env node
/**
 * The website's In Practice cards are set in the app's own colours.
 *
 * ── THE ASK ───────────────────────────────────────────────────────────────
 * Ellie: "I want the site's in practice to look exactly like the app's. That
 * means the same visuals, coloring, etc. (for example the app uses different
 * font colors and has more text indicating whether something's been read)."
 *
 * ── WHY THE COLOURS CANNOT SIMPLY BE SHARED ───────────────────────────────
 * They are in attune-theme.ts, and the website cannot import a .ts out of
 * attune-app. vite runs a .ts through esbuild, esbuild reads the nearest
 * tsconfig, and attune-app's extends expo/tsconfig.base, which the website's
 * own `npm ci` does not install. That import broke the Vercel deploy for two
 * commits and the only symptom was that Ellie's fixes were not on the site. It
 * is also why insight-fit.js is .js.
 *
 * So the shelf tints moved to attune-app/src/lib/card-tints.js, which both
 * surfaces import, and the three flat colours the card is set in are hex in
 * src/App.jsx because there is nowhere both can read them from.
 *
 * Four values that agree today and nothing watching them is the shape of every
 * serious bug in this codebase, and a colour is the kind that agrees for months
 * and then does not. This is the gate that case asks for.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 *   1. The shared tint list is SectionColor's four, in the order the app's
 *      shelves use: communication, expectations, reflection, intimacy.
 *   2. The website's three card colours are the app's TILE_GREY, mutedInk and
 *      orange. TILE_GREY moved out of resources.tsx into lib/shared-inks.js,
 *      which the website imports directly, so the two cannot differ any more.
 *      It is still read here rather than imported: this gate is about where
 *      the value comes from, and importing it would make the comparison a
 *      function equalling itself.
 *   3. Both surfaces reach their ground through cardGround, so the shared
 *      module is the one that ships rather than one that merely exists. A
 *      helper imported and never called is a constant that happens to be
 *      declared.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the card looks right, which is hers. And the rest of the palette:
 * this is scoped to the In Practice card, so nobody reads it as "the two
 * surfaces share a palette" and either widens it or quietly loosens it.
 */

import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const THEME = 'attune-app/src/constants/attune-theme.ts';
const LIB = 'attune-app/src/lib/card-tints.js';
const APP = 'attune-app/src/app/resources.tsx';
const WEB = 'src/App.jsx';

const theme = readFileSync(ROOT + THEME, 'utf8');
const app = readFileSync(ROOT + APP, 'utf8');
/* TILE_GREY lives here now, and the website imports it rather than keeping a
   second hex. See the note on PAIRS below. */
const INKS = 'attune-app/src/lib/shared-inks.js';
const inks = readFileSync(ROOT + INKS, 'utf8');
const web = readFileSync(ROOT + WEB, 'utf8');
const fails = [];

/** A named hex out of a source file, or a refusal to pass. */
function hex(src, where, name, re) {
  const m = re.exec(src);
  if (!m) {
    console.error(`[check-card-tints] could not read ${name} out of ${where}.`
      + ' Refusing to pass: a gate that has lost its subject must never report success.');
    process.exit(1);
  }
  return m[1].toUpperCase();
}

/* 1. The shared list against the theme it came from. */
const { CARD_TINTS } = await import(`${ROOT}${LIB}`);
const ORDER = ['communication', 'expectations', 'reflection', 'intimacy'];
const section = Object.fromEntries(ORDER.map((k) => [
  k, hex(theme, THEME, `SectionColor.${k}`, new RegExp(`${k}:\\s*'(#[0-9A-Fa-f]{6})'`)),
]));

if (!Array.isArray(CARD_TINTS) || CARD_TINTS.length !== ORDER.length) {
  console.error(`[check-card-tints] ${LIB} does not export four tints. Refusing to pass.`);
  process.exit(1);
}
ORDER.forEach((k, i) => {
  const got = String(CARD_TINTS[i]).toUpperCase();
  if (got !== section[k]) {
    fails.push(`the shared tint ${i + 1} is ${got} and SectionColor.${k} is ${section[k]}.`
      + `\n      ${LIB} is what both surfaces ground a card in, so a shelf would be`
      + '\n      one colour in the app and another on the website.');
  }
});

/* 2. The website's three flat colours against the app's. */
const PAIRS = [
  ['mutedInk', /mutedInk:\s*'(#[0-9A-Fa-f]{6})'/, theme, THEME,
    /const MUTED_INK = "(#[0-9A-Fa-f]{6})"/, 'the meta line under a card title'],
  ['orange', /orange:\s*'(#[0-9A-Fa-f]{6})'/, theme, THEME,
    /const ACCENT = "(#[0-9A-Fa-f]{6})"/, 'the accent the read time is set in'],
];
for (const [name, appRe, appSrc, appWhere, webRe, what] of PAIRS) {
  const theirs = hex(appSrc, appWhere, name, appRe);
  const ours = hex(web, WEB, `the website's copy of ${name}`, webRe);
  if (theirs !== ours) {
    fails.push(`${what}: the app uses ${theirs} and the website uses ${ours}.`);
  }
}

/**
 * ── TILE_GREY IS NO LONGER TWO HEXES ──────────────────────────────────────
 * It was `const TILE_GREY = '#EFECE7'` in resources.tsx and the same hex in
 * src/App.jsx, and this gate compared the two. They agreed, which is why
 * nobody had looked: a sweep of every constant declared on more than one
 * surface is what turned it up.
 *
 * It lives in attune-app/src/lib/shared-inks.js now and both surfaces import
 * it, so there is no second value to compare. What is worth checking instead
 * is that neither has quietly gone back to its own: a comparison of two hexes
 * is satisfied the moment somebody adds a third.
 */
{
  if (!/export const TILE_GREY = '#[0-9A-Fa-f]{6}'/.test(inks)) {
    fails.push(`${INKS} no longer declares TILE_GREY, which is the featured tile's ground`
      + ' on both surfaces.');
  }
  for (const [where, src] of [[APP, app], [WEB, web]]) {
    const declaresOwn = new RegExp(`const TILE_GREY\\s*=\\s*["']#`).test(src);
    const imports = /TILE_GREY[^;]*from ["'][^"']*shared-inks(\.js)?["']/.test(src)
      || /from ["'][^"']*shared-inks(\.js)?["'][^;]*TILE_GREY/.test(src);
    if (declaresOwn) {
      fails.push(`${where} declares its own TILE_GREY again. It is in ${INKS}, which both`
        + ' surfaces import; a second hex here is one colour becoming two.');
    } else if (!imports) {
      fails.push(`${where} neither imports TILE_GREY from ${INKS} nor declares one, so the`
        + ' featured tile is grounded in something this gate cannot see.');
    }
  }
}

/* 3. And both of them actually draw through the shared helper. */
for (const [where, src] of [[APP, app], [WEB, web]]) {
  if (!/from ["'][^"']*card-tints(\.js)?["']/.test(src)) {
    fails.push(`${where} does not import the shared tint module.`);
  } else if (!/cardGround\(/.test(src)) {
    fails.push(`${where} imports cardGround and never calls it.`
      + '\n      A helper imported and not called is a constant that happens to be declared;'
      + '\n      the card is grounded in something else and nothing here can see what.');
  }
}

/**
 * ── AND THE ALIGNMENT RAMP, WHICH HAD THREE COPIES ────────────────────────
 * Green when two people are close, amber in the middle, orange when they are
 * far apart. There was a function for it in the app's results.tsx whose own
 * comment read "the same three the expectations categories use on their own
 * bars, so a percentage means the same thing wherever it appears" — and
 * fourteen hundred lines below it, in the same file, the ramp written out again
 * as an inline ternary. A third copy drew the website's intimacy bars.
 *
 * All three agreed, which is the state every colour here has been in just
 * before it stopped. It is attune-app/src/lib/aligned-tone.js now, plain
 * JavaScript so the website can read it, and both surfaces call it.
 *
 * NOT statColor in api/_lib/storycard-style.js, which steps green, blue, orange
 * at 70 and 50 for a large figure on a storycard. Different palette, different
 * surface, and its own note says why. Named here so nobody merges the two.
 */
{
  const TONE = 'attune-app/src/lib/aligned-tone.js';
  const tone = await import(`${ROOT}${TONE}`);
  if (!tone.ALIGNED_TONE_STOPS || tone.ALIGNED_TONE_STOPS.length !== 2) {
    console.error(`[check-card-tints] ${TONE} no longer describes two stops. Refusing to pass.`);
    process.exit(1);
  }
  const stops = tone.ALIGNED_TONE_STOPS;
  /* Run it, either side of each stop. */
  for (const s of stops) {
    if (tone.alignedTone(s.from) !== s.color) {
      fails.push(`the ramp returns ${tone.alignedTone(s.from)} at ${s.from} and the stop says ${s.color}.`);
    }
    if (tone.alignedTone(s.from - 1) === s.color) {
      fails.push(`the ramp returns ${s.color} just below ${s.from}, so that stop does nothing.`);
    }
  }
  /* And nobody writes it out again: ALL THREE of the ramp's colours on one
     line beside a numeric comparison.
     Two was the first version and it matched `shiftColor`, which colours how
     much a person's answers CHANGED between takes and runs the other way,
     green at the bottom. It shares two colours with this ramp and is not it. A
     gate that matches too much either gets loosened until it matches nothing or
     manufactures the finding it was looking for, so the test is the whole ramp
     rather than part of its palette. */
  const colours = [...stops.map((s) => s.color), tone.ALIGNED_TONE_LOW];
  for (const [rel, src] of [[APP, app], [WEB, web],
    ['attune-app/src/components/results.tsx', readFileSync(ROOT + 'attune-app/src/components/results.tsx', 'utf8')]]) {
    const clean = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
      .replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + ' '.repeat(m.length - p.length));
    for (const line of clean.split('\n')) {
      const hits = colours.filter((c) => line.toUpperCase().includes(c.toUpperCase())).length;
      if (hits === colours.length && /[<>]=?\s*\d/.test(line)) {
        fails.push(`${rel} writes the alignment ramp out again: ${line.trim().slice(0, 88)}`
          + `\n      alignedTone in ${TONE} is the ramp, and both surfaces import it.`);
        break;
      }
    }
  }
}

if (fails.length) {
  console.error('[check-card-tints] The In Practice card is two different colours:');
  for (const f of fails) console.error(`  ${f}`);
  console.error('');
  console.error(`The tints are ${LIB}, which both surfaces import.`);
  process.exit(1);
}

console.log(`[check-card-tints] four shelf tints shared and equal to SectionColor's, three card`
  + ' colours equal to the app\'s, both surfaces grounding a card through cardGround, and one'
  + ' alignment ramp after three copies of it.');
