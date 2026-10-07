#!/usr/bin/env node
/**
 * White type on a results ground has to be readable.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Ellie: "The content is hard to read against these colors. How can we adjust
 * the bgs to make the content readable?"
 *
 * Every at-a-glance page and every expectations conversation page sets white
 * type on a gradient. Four of the five grounds ended somewhere between 3.0 and
 * 4.5 to 1 against white, and 4.5 is the ratio body text needs. It is not a
 * matter of taste and it is not something to judge by eye on one screen in one
 * room: it is a number, so it is measured.
 *
 * ── WHAT IS CHECKED ───────────────────────────────────────────────────────
 * Every stop of every fixed ground, and every stop of the ground each of the
 * six expectations categories generates.
 *
 * The category half is worth being honest about: those stops are built by
 * groundForCategory, which passes them through readable(), so a category
 * arriving with a pale colour is already handled and planting one here proves
 * nothing. What that half actually checks is that the generator is still the
 * thing generating them. Build a category ground any other way and this is
 * what says so.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Type set at less than full white, of which there is plenty: a caption at 60
 * per cent on a ground that clears 4.6 does not clear it itself. That is a
 * real and separate question, and pretending this covers it would be worse
 * than not checking it at all.
 */

import {
  SECTION_GROUNDS, groundForCategory, contrastOnWhiteText, READABLE,
} from '../api/_lib/section-grounds.js';
import { readFileSync } from 'node:fs';

import { EXPECTATIONS_CATEGORIES } from '../api/_questions.js';

const fails = [];
let stops = 0;

for (const [id, g] of Object.entries(SECTION_GROUNDS)) {
  for (const stop of g.stops) {
    stops += 1;
    const r = contrastOnWhiteText(stop);
    if (r < READABLE) {
      fails.push(`${id}: white type on ${stop} is ${r.toFixed(1)} to 1, and body text needs ${READABLE}`);
    }
  }
}

for (const cat of EXPECTATIONS_CATEGORIES) {
  for (const stop of groundForCategory(cat.color)) {
    stops += 1;
    const r = contrastOnWhiteText(stop);
    if (r < READABLE) {
      fails.push(`${cat.label}'s page: white type on ${stop} is ${r.toFixed(1)} to 1, and body text needs ${READABLE}`);
    }
  }
}

/**
 * ── AND THE APP'S OWN GROUNDS, WHICH THIS NEVER COVERED ───────────────────
 * This measured the results grounds and the category grounds, both of which
 * come from api/. The app paints two more out of its own theme and neither had
 * ever been measured.
 *
 * It mattered immediately. Ellie: "This page is too dark", of sign-in, which
 * painted BlueGround at full strength. The obvious fix was the softening the
 * Learn tab already uses, a fifth of the way to white on both stops, and that
 * takes the foot of the gradient from 4.79 to 1 down to 3.34: the form's own
 * labels stop clearing the ratio body text needs. A page she asked to be
 * lighter would have come back harder to read, and nothing here would have
 * said so.
 *
 * So the app's grounds are measured too, read out of the theme by name rather
 * than retyped.
 *
 * ── ONE DECLARED EXEMPTION ────────────────────────────────────────────────
 * LearnGround's light stop is 3.34 to 1 and stays. Its white type sits at the
 * dark end of the gradient, and the rest of that tab is a white sheet drawn
 * over the ground, so nothing small and white is set on the light stop. Ellie
 * has approved that tab twice. It is named here with the reason rather than
 * quietly skipped, because the next ground that wants an exemption should have
 * to write one.
 */
{
  const theme = readFileSync(new URL('../attune-app/src/constants/attune-theme.ts', import.meta.url), 'utf8');
  const lighten = (hex, t) => {
    const n = parseInt(hex.slice(1), 16);
    const up = (v) => Math.round(v + (255 - v) * t);
    return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255]
      .map((v) => up(v).toString(16).padStart(2, '0')).join('')}`;
  };
  const base = /export const BlueGround = \['(#[0-9A-Fa-f]{6})', '(#[0-9A-Fa-f]{6})'\]/.exec(theme);
  if (!base) {
    console.error('[check-ground-contrast] BlueGround could not be read out of the app theme.'
      + ' Refusing to pass: a gate that has lost its subject must never report success.');
    process.exit(1);
  }
  const named = (name) => {
    /* To `] as const`, not to the first `]`: these arrays contain BlueGround[0]
       and BlueGround[1], so a lazy bracket match stops inside the entry it is
       trying to read and the ground reports as unresolvable. */
    const m = new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\] as const`).exec(theme);
    if (!m) return null;
    /* Top-level commas only. `lighten(BlueGround[0], 0.2)` contains one, so a
       plain split cuts each entry in half and every ground reports as
       unresolvable, which is what the first version did. */
    const parts = [];
    let depth = 0;
    let cur = '';
    for (const ch of m[1]) {
      if (ch === '(' || ch === '[') depth += 1;
      else if (ch === ')' || ch === ']') depth -= 1;
      if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
      cur += ch;
    }
    if (cur.trim()) parts.push(cur);
    return parts.map((part) => {
      const t = part.trim();
      const lit = /^'(#[0-9A-Fa-f]{6})'$/.exec(t);
      if (lit) return lit[1];
      const li = /^lighten\(BlueGround\[(\d)\],\s*([\d.]+)\)$/.exec(t);
      if (li) return lighten(base[Number(li[1]) + 1], Number(li[2]));
      const bg = /^BlueGround\[(\d)\]$/.exec(t);
      if (bg) return base[Number(bg[1]) + 1];
      return null;
    });
  };

  /** Grounds the app paints white type on, and what is exempt on each. */
  const APP_GROUNDS = [
    ['BlueGround', []],
    ['SignInGround', []],
    ['LearnGround', [1]],
  ];
  for (const [name, exempt] of APP_GROUNDS) {
    const g = named(name);
    if (!g || g.some((c) => !c)) {
      fails.push(`the app theme's ${name} could not be resolved to colours, so it was not measured.`
        + '\n      A ground this cannot read is a ground nothing is checking.');
      continue;
    }
    g.forEach((stop, i) => {
      if (exempt.includes(i)) return;
      stops += 1;
      const r = contrastOnWhiteText(stop);
      if (r < READABLE) {
        fails.push(`the app's ${name}: white type on ${stop} is ${r.toFixed(1)} to 1, and body text`
          + ` needs ${READABLE}.`);
      }
    });
  }
}

if (fails.length) {
  console.error('[check-ground-contrast] white type would be hard to read on a ground:');
  for (const f of fails) console.error(`  ${f}`);
  console.error('');
  console.error('readable() in api/_lib/section-grounds.js takes a colour down until it');
  console.error('clears the ratio. Pass the stop through it rather than picking by eye.');
  process.exit(1);
}

console.log(`[check-ground-contrast] ${stops} stops across ${Object.keys(SECTION_GROUNDS).length} results grounds, ${EXPECTATIONS_CATEGORIES.length} categories and the app's own three; white type clears ${READABLE} to 1 on every one.`);
console.log("  one declared exemption: LearnGround's light stop, whose white type sits at the dark end.");
