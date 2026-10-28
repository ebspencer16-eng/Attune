/**
 * The admin's add-on list is every add-on an order can carry, in Ellie's
 * order, and there is exactly one of it.
 *
 * ── THE BUG THIS ENCODES, AND THE SECOND ONE ──────────────────────────────
 * First: the Package Mix attachment chart listed four add-ons where an order
 * can carry six. Conflict Patterns is a $40 exercise and the Merging Lives
 * Checklist is a resource, and neither appeared in the one view about what
 * people buy alongside a package.
 *
 * Then, worse: this gate passed while she was looking at the wrong chart.
 * There were two renderers pointed at the same canvas, one reading the cube
 * and one reading the global orders, and whichever ran last won. The gate
 * matched `const addons = [` and found exactly one, because the other was
 * spelled `const ADD=[`. So the list it was holding to the registry was the
 * list nobody drew, and a reorder and a recolour she approved never reached
 * her screen. She caught it: "I know I approved this, but I was wrong."
 *
 * ── WHAT IT CHECKS NOW ────────────────────────────────────────────────────
 * Every list in public/admin.html that names add-ons, whatever it is called,
 * found by the NAMES in it rather than by the name of the variable. Exactly
 * one, carrying all six, in ADDON_DISPLAY_ORDER. Matching on a variable name
 * is what let the second copy through; matching on content cannot be dodged
 * by renaming.
 */
import { readFileSync } from 'node:fs';

const { ORDER_ADDONS, ADDON_DISPLAY_ORDER } = await import('../api/_lib/order-addons.js');
const src = readFileSync('public/admin.html', 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
const fail = [];

if (!ORDER_ADDONS || ORDER_ADDONS.length < 5) fail.push(`ORDER_ADDONS lists ${ORDER_ADDONS && ORDER_ADDONS.length}; this gate has lost its subject`);

/**
 * Any array literal that names at least three add-ons.
 *
 * Three rather than all six on purpose: a copy that has gone stale is exactly
 * the one missing some, and a gate that only recognises a complete list
 * cannot see an incomplete one. The scan is over array literals so a
 * sentence mentioning two add-ons is not mistaken for a list of them.
 */
const hits = [];
for (const a of ORDER_ADDONS) {
  for (const m of src.matchAll(new RegExp(`['"\`]${a}['"\`]|addon_${a}\\b`, 'g'))) {
    hits.push({ at: m.index, name: a });
  }
}
hits.sort((x, y) => x.at - y.at);

/**
 * A list is a RUN of add-on names close together, not an array literal.
 *
 * The first version matched `[...]` and was defeated by the shape it was
 * written for: the live list is an array OF arrays, so a lazy bracket match
 * caught the first inner one and reported three add-ons missing from a list
 * that has all six. Clustering by distance has no opinion about brackets,
 * variable names or quoting, which is the point: the copy that drifts is the
 * one that looks different.
 */
const GAP = 400;
const clusters = [];
for (const h of hits) {
  const last = clusters[clusters.length - 1];
  if (last && h.at - last.end <= GAP) { last.end = h.at; last.names.add(h.name); }
  else clusters.push({ start: h.at, end: h.at, names: new Set([h.name]) });
}
/**
 * And a cluster is only a LIST if it carries the labels too.
 *
 * These six words are everywhere in this file: `sec: 'reflection'`,
 * `addonWorkbook: o.addon_workbook`, a view called intimacy. Clustering alone
 * reported three lists, two of which were an exercise table and an order
 * shaper. What a DISPLAY list has that those do not is the capitalised label
 * beside the key, quoted exactly: 'Reflection', not 'Relationship
 * Reflection'.
 */
const labelled = (text, name) => new RegExp(`['"\`]${name[0].toUpperCase()}${name.slice(1)}['"\`]`).test(text);
const kept = clusters
  .filter((c) => c.names.size >= 3)
  .filter((c) => [...c.names].filter((n) => labelled(src.slice(c.start - 40, c.end + 60), n)).length >= 3)
  .map((c) => ({
    text: src.slice(c.start, c.end + 40),
    named: [...c.names],
    at: src.slice(0, c.start).split('\n').length,
  }));

if (!kept.length) {
  fail.push('no add-on list in public/admin.html; this gate has lost its subject');
}
if (kept.length > 1) {
  fail.push(`${kept.length} add-on lists in public/admin.html, at lines ${kept.map((k) => k.at).join(', ')}. `
    + 'One of them will be the one nobody updates, and if two renderers share a canvas it is the one she is looking at.');
}

for (const l of kept) {
  /* ── TWO LISTS SIDE BY SIDE ARE ONE CLUSTER ───────────────────────────
     A plant that copied the list and renamed it passed, because the copy sat
     within the clustering distance of the original and the two merged. A
     name that appears as a key twice is two lists however they are spelled
     and wherever they sit, which is the thing being guarded against. */
  for (const a of ORDER_ADDONS) {
    const n = (l.text.match(new RegExp(`['"\`]${a}['"\`]`, 'g')) || []).length;
    if (n > 1) fail.push(`"${a}" is listed ${n} times. That is two add-on lists, and one of them is the one nobody updates.`);
  }
  const missing = ORDER_ADDONS.filter((a) => !l.named.includes(a));
  if (missing.length) fail.push(`the add-on list has no entry for ${missing.join(', ')}, which an order can carry`);
  /* The order she reads them in, read off the list rather than assumed. */
  const order = [];
  for (const m of l.text.matchAll(/['"`]([a-z]+)['"`]|addon_([a-z]+)\b/g)) {
    const name = m[1] || m[2];
    if (ORDER_ADDONS.includes(name) && !order.includes(name)) order.push(name);
  }
  if (order.join(',') !== ADDON_DISPLAY_ORDER.join(',')) {
    fail.push(`the add-on list reads ${order.join(', ')}; ADDON_DISPLAY_ORDER is ${ADDON_DISPLAY_ORDER.join(', ')}`);
  }
}

if (fail.length) {
  console.error('check-admin-addon-list FAILED');
  for (const f of fail) console.error('  - ' + f);
  process.exit(1);
}
console.log(`[check-admin-addon-list] one add-on list in the admin, all ${ORDER_ADDONS.length} an order can carry, in the order Ellie reads them.`);
