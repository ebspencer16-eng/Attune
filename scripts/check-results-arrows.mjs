#!/usr/bin/env node
/**
 * Every results page draws the floating arrows, and only one thing draws them.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * Ellie asked for the arrows: "all results pages on the site should have a grey
 * arrow that's visible in the bottom right no matter where you are on the page,
 * so the nav is very clear. Remove the labeled buttons in the bottom corners."
 *
 * They shipped, and then: "Not seeing these on cover pages, overview pages, or
 * any detailed pages." She was right about twelve of the eighteen. Every page
 * opted out of the shared pair with a `noPrevNext` prop and four of them then
 * drew their own copy lower down, so the pair existed, the code looked
 * deliberate everywhere, and most pages had nothing.
 *
 * Measured from outside before it was believed: on the live site `couple-type`
 * and `reflection-ratings` had two chevrons at the bottom of the viewport and
 * `comm-cover` and `comm-overview` had none.
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────
 * One renderer, inside Layout, unconditional. The arrows are fixed to the
 * viewport, so where they sit in the markup decides nothing and there is no
 * reason a page should have an opinion about them. A page that wants to differ
 * is the shape this whole codebase keeps paying for: one rule in several places
 * with nothing checking that they agree.
 *
 * ── WHY NOT COUNT THEM IN A BROWSER ───────────────────────────────────────
 * check-render already drives all 29 sections and would be the stronger test.
 * It lives in the smoke, which takes minutes and runs rarely, and this
 * regression is a prop someone adds back in one line. This is the fast half and
 * says so; it does not claim to prove the arrows are visible, only that one
 * thing draws them for everyone.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether they are on top. They sit above a 60pt footer strip the results view
 * pins to the bottom, and nothing here measures that; it is in the `bottom`
 * value with the measurement written beside it.
 */

import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = 'src/App.jsx';
const src = readFileSync(`${ROOT}${SRC}`, 'utf8');
const fails = [];

/** Lines that render it, with the line number. */
const renders = src.split('\n')
  .map((l, i) => ({ line: i + 1, text: l }))
  .filter(({ text }) => /<PrevNext\b/.test(text));

if (!renders.length) {
  console.error(`[check-results-arrows] nothing in ${SRC} renders <PrevNext />.`
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

/** The Layout component, by brace depth from its arrow. */
const layout = (() => {
  const m = /const Layout = \(\{[^}]*\}\) => \(/.exec(src);
  if (!m) return null;
  let depth = 0;
  for (let i = m.index + m[0].length - 1; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === '(') depth += 1;
    else if (ch === ')') {
      depth -= 1;
      if (depth === 0) return { from: m.index, to: i };
    }
  }
  return null;
})();

if (!layout) {
  console.error(`[check-results-arrows] the Layout component is not where this expects it in ${SRC}.`
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

/*
 * Layout's own signature, because that is where this comes back first.
 *
 * Planting an unused `noPrevNext` parameter passed every other rule here: the
 * render was still unconditional, so every page still had its arrows and
 * nothing was broken yet. It is the first half of the regression though, and
 * the second half is one line away. A parameter nothing passes is either about
 * to be wired up or is dead; neither is worth leaving in the signature.
 */
const params = /const Layout = \(\{([^}]*)\}\)/.exec(src)[1]
  .split(',').map((x) => x.trim().split(/[=:]/)[0].trim()).filter(Boolean);
const EXPECTED = ['children', 'accent'];
if (params.join() !== EXPECTED.join()) {
  fails.push(`Layout takes (${params.join(', ')}). It takes ${EXPECTED.join(' and ')}:\n`
    + '      anything else is a page telling it what to leave out, and what got left out was\n'
    + '      the arrows on twelve pages.');
}

const lineOf = (at) => src.slice(0, at).split('\n').length;
const layoutLines = [lineOf(layout.from), lineOf(layout.to)];

// ── One renderer, and it is Layout's ────────────────────────────────────────
for (const r of renders) {
  const inside = r.line >= layoutLines[0] && r.line <= layoutLines[1];
  if (!inside) {
    fails.push(`${SRC}:${r.line} renders the arrows outside Layout:\n`
      + `      ${r.text.trim()}\n`
      + '      A page with its own pair is a page that can lose them on its own. Layout draws\n'
      + '      them for everyone; delete this one.');
  }
}
if (renders.length > 1) {
  fails.push(`the arrows are rendered in ${renders.length} places (lines `
    + `${renders.map((r) => r.line).join(', ')}). There is one pair and it belongs to Layout.`);
}

// ── Unconditionally ─────────────────────────────────────────────────────────
/*
 * A guard is how this comes back without anything being deleted: `{!x &&
 * <PrevNext />}` leaves every string and every identifier exactly where it was,
 * and a check that asks whether the arrows APPEAR still passes. CLAUDE.md has
 * five recurrences of that shape. So the render has to be the whole line.
 */
for (const r of renders) {
  if (r.text.trim() !== '<PrevNext />') {
    fails.push(`${SRC}:${r.line} draws the arrows conditionally:\n`
      + `      ${r.text.trim()}\n`
      + '      Twelve of the eighteen pages used to opt out and that is what she reported.\n'
      + '      Either every page has them or the rule is something else.');
  }
}

// ── And no caller may opt out ───────────────────────────────────────────────
/*
 * Matched on the whole opening tag rather than on the word, because the point
 * is not the name `noPrevNext`: it is any prop at all that a page uses to turn
 * the arrows off. `hideNav`, `bare`, `noArrows` would all be this bug with a
 * different spelling.
 */
const ALLOWED = new Set(['accent', 'children', 'key']);
for (const m of src.matchAll(/<Layout\b([^>]*)>/g)) {
  /* Values first, or the identifiers inside them read as props: the couple
     type page passes `accent={coupleType?.color || "..."}` and the first
     version of this reported `color`. Strings and braced expressions out,
     then what is left is the prop names. */
  const bare = m[1].replace(/=\{(?:[^{}]|\{[^{}]*\})*\}/g, '=X').replace(/="[^"]*"/g, '=X');
  const props = [...bare.matchAll(/(?:^|\s)([A-Za-z_$][\w$]*)/g)].map((p) => p[1]);
  const extra = props.filter((p) => !ALLOWED.has(p));
  if (extra.length) {
    fails.push(`${SRC}:${lineOf(m.index)} passes Layout ${extra.map((e) => `\`${e}\``).join(', ')}:\n`
      + `      ${m[0].trim().slice(0, 110)}\n`
      + '      Layout takes an accent and its children. A page that can tell it what to leave\n'
      + '      out is a page that can leave the arrows out, which is the bug she reported.\n'
      + '      If this prop is something else, add it to ALLOWED here and say what it is for.');
  }
}

// ── Fixed to the viewport, which is what "no matter where you are" means ────
const arrowStyle = /const arrowStyle = \(side\) => \(\{([\s\S]*?)\}\);/.exec(src);
if (!arrowStyle) {
  console.error(`[check-results-arrows] arrowStyle is not where this expects it in ${SRC}.`
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}
if (!/position:\s*["']fixed["']/.test(arrowStyle[1])) {
  fails.push('the arrows are not fixed to the viewport. Ellie: "visible in the bottom right no'
    + ' matter where you are on the page". Anything else scrolls away, which is what the\n'
    + '      labelled buttons at the foot of the content did.');
}

if (fails.length) {
  console.error('\n check-results-arrows: the results nav is not the same on every page.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

const layouts = [...src.matchAll(/<Layout\b/g)].length;
console.log(`[check-results-arrows] ${layouts} results pages, one pair of arrows, drawn by Layout`
  + ' for all of them and fixed to the viewport.');
