#!/usr/bin/env node
/**
 * The expectations table's three rows share one set of columns.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * Ellie: "Emotional labor, names in rows don't look centered with Expects and
 * Experienced column titles."
 *
 * On every category, not only that one. An expectations conversation page is
 * three stacked CSS grids that all declare the same `gridTemplateColumns`: the
 * names, the Expects / Experienced headers under them, and a row per question.
 * The names grid carried a rem of horizontal padding and the others carried
 * none, so the same `1.6fr 1fr 1fr 1fr 1fr` resolved against two different
 * widths: 92.5 point columns in one and 98.2 in the others, thirty-two points
 * of difference, which is exactly the padding.
 *
 * Fractions do not care what they are a fraction of, so nothing looked wrong in
 * the code. On screen each name drifted further left than the one before it,
 * which is why the first read as centred and the second read as broken.
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────
 * Any grid that lays out these columns has no horizontal padding of its own.
 * Padding belongs on the cells, where it changes what a cell looks like and not
 * what a fraction of the row is worth.
 *
 * ── WHY SOURCE AND NOT A BROWSER ──────────────────────────────────────────
 * The fix was found by measuring a rendered page, and the measurement is in the
 * commit. The rule it produced is about one declaration, so a browser is a
 * slower way to ask the same question; this runs in a millisecond and says
 * exactly what to change. check-render already drives all six of these pages
 * for anything that throws.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the columns are the right widths, or whether the names are the right
 * words. It covers the one thing that made three grids stop agreeing.
 */

import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = 'src/App.jsx';
const src = readFileSync(`${ROOT}${SRC}`, 'utf8');
const fails = [];

/** The template every one of these grids is declared with. */
const TEMPLATE = 'gridTemplateColumns: gridCols';

const uses = [...src.matchAll(new RegExp(TEMPLATE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))];
if (uses.length < 3) {
  console.error(`[check-expectations-columns] found ${uses.length} grids using \`${TEMPLATE}\` in`
    + ` ${SRC}; there were three when this was written, one per row of the table.`
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

for (const m of uses) {
  /* The style object this template sits in. Bounded by the braces of that
     object rather than by a line count, so a reformat does not move the subject
     out of view. */
  const open = src.lastIndexOf('{', m.index);
  let depth = 0;
  let close = -1;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') { depth -= 1; if (depth === 0) { close = i; break; } }
  }
  const style = src.slice(open, close + 1);
  const line = src.slice(0, m.index).split('\n').length;

  /**
   * Horizontal padding, in any of the forms it is written here. A shorthand
   * with two or more values sets left and right; `paddingLeft` and
   * `paddingRight` say so outright. `paddingTop` alone is fine and is what the
   * names row needs.
   */
  const shorthand = /padding:\s*"([^"]+)"/.exec(style);
  const horizontal = shorthand
    ? shorthand[1].trim().split(/\s+/).length > 1 && !/^0( |$)/.test(shorthand[1].trim().split(/\s+/)[1])
    : false;
  const named = /paddingLeft|paddingRight|paddingHorizontal/.test(style);

  if (horizontal || named) {
    fails.push(`${SRC}:${line} lays out the expectations columns and takes horizontal padding`
      + ` of its own:\n      ${(shorthand ? shorthand[0] : 'paddingLeft/Right')}\n`
      + '      The three grids share one template and resolve it against their own widths, so a\n'
      + '      padding here makes this row\'s columns narrower than the rows above and below it\n'
      + '      and the names stop sitting over the columns they name. Put the padding on the\n'
      + '      cells, or use paddingTop, which does not change a column\'s width.');
  }
}

if (fails.length) {
  console.error('\n check-expectations-columns: the table\'s rows do not share their columns.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log(`[check-expectations-columns] ${uses.length} grids lay out the expectations table and`
  + ' none takes horizontal padding, so the names sit over the columns they name.');
