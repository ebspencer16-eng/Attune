/**
 * The admin's add-on list is every add-on an order can carry.
 *
 * ── THE BUG THIS ENCODES ──────────────────────────────────────────────────
 * The Package Mix page's attachment chart listed four add-ons. An order can
 * carry six. Conflict Patterns is a $40 exercise and the Merging Lives
 * Checklist is a resource, and neither appeared anywhere in a chart about
 * which add-ons attach to which package, so two products were invisible in
 * the one view that is about what people buy alongside a package.
 *
 * There were TWO copies of that four-item list in public/admin.html, and the
 * first was dead: its chart had moved and the list stayed, the same way the
 * discount buckets did. Both were missing the same two.
 *
 * api/_lib/order-addons.js has listed all six the whole time. The admin had a
 * hand-typed four beside it, which is this codebase's one failure wearing its
 * plainest hat: a list of a thing, maintained by hand, next to the list.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * One `addons` array in the admin, with one entry per name in ORDER_ADDONS
 * and nothing else. Reading the column key, `addon_<name>`, rather than the
 * label, because the label is Ellie's wording and the column is the fact.
 */
import { readFileSync } from 'node:fs';

const { ORDER_ADDONS } = await import('../api/_lib/order-addons.js');
const src = readFileSync('public/admin.html', 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
const fail = [];

const blocks = [...src.matchAll(/const addons = \[([\s\S]*?)\];/g)];
if (!blocks.length) fail.push('no `const addons = [...]` in public/admin.html; this gate has lost its subject');
if (blocks.length > 1) {
  fail.push(`${blocks.length} copies of the add-on list in public/admin.html. `
    + 'One of them will be the one nobody updates, which is how two of the six went missing.');
}
if (!ORDER_ADDONS || ORDER_ADDONS.length < 5) fail.push(`ORDER_ADDONS lists ${ORDER_ADDONS && ORDER_ADDONS.length}; this gate has lost its subject`);

for (const b of blocks) {
  const named = [...b[1].matchAll(/o\.addon_([a-z]+)/g)].map((m) => m[1]);
  const missing = ORDER_ADDONS.filter((a) => !named.includes(a));
  const extra = named.filter((a) => !ORDER_ADDONS.includes(a));
  if (missing.length) fail.push(`the admin's add-on list has no entry for ${missing.join(', ')}, which an order can carry`);
  if (extra.length) fail.push(`the admin's add-on list names ${extra.join(', ')}, which is not an add-on`);
  if (named.length !== new Set(named).size) fail.push('the admin lists an add-on twice');
}

if (fail.length) {
  console.error('check-admin-addon-list FAILED');
  for (const f of fail) console.error('  - ' + f);
  process.exit(1);
}
console.log(`[check-admin-addon-list] one add-on list in the admin, with all ${ORDER_ADDONS.length} an order can carry and nothing else.`);
