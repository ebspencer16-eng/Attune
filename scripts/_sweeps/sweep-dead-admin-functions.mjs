/**
 * Every function in the admin, against everything that could call it.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * The Fulfilment page was deleted in 92b3e2fb and five functions stayed:
 * renderFulfillmentTable writing to a tbody that is not in the markup,
 * markStatus called only from inside that table, getFulfillmentStats,
 * updateDashboardFulfillmentKPIs writing to three ids that do not exist, and
 * two CSV exports that carry a name and an address. They looked like features
 * for months, and one of them was the reason I told Ellie the admin needed
 * her customers' email addresses.
 *
 * A definition without a call is not a feature, and it reads like one.
 *
 * ── HOW A CALL IS COUNTED ─────────────────────────────────────────────────
 * Anywhere the name appears that is not its own definition: a call, an
 * `onclick="x()"` in the markup, a reference passed as a value. That is
 * deliberately generous, because the interesting answer is zero and a
 * generous counter makes a zero mean something.
 *
 * ── WHAT IT CANNOT SEE ────────────────────────────────────────────────────
 * A function reached only through a name built at run time,
 * `window['render' + tab]()`. None exist here today; if one appears, this
 * sweep will call it dead and the fix is to say so rather than to delete it.
 *
 * And `$`, which it will always report and which is always wrong: `\b` has no
 * boundary beside a dollar sign, so the counter sees one occurrence of a
 * helper used three hundred times. Left reported rather than special-cased,
 * because a sweep with an exemption list is a sweep whose next real finding
 * hides in the list. One known false positive, written down here.
 */
import { readFileSync } from 'node:fs';

const FILE = process.argv[2] || 'public/admin.html';
const src = readFileSync(FILE, 'utf8');
/* Comments blanked: a name in a note explaining why something was removed is
   not a caller, and this file is full of those notes on purpose. */
const code = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/\S/g, ' '))
                .replace(/(^|[^:])\/\/[^\n]*/g, (m) => m.replace(/\S/g, ' '))
                .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/\S/g, ' '));

const defs = new Map();
for (const re of [/^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm,
                  /^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>)/gm]) {
  for (const m of code.matchAll(re)) if (!defs.has(m[1])) defs.set(m[1], code.slice(0, m.index).split('\n').length);
}

const dead = [];
for (const [name, line] of defs) {
  const uses = [...code.matchAll(new RegExp('\\b' + name.replace(/\$/g, '\\$') + '\\b', 'g'))].length;
  if (uses <= 1) dead.push({ name, line });
}

console.log(`[sweep-dead-admin-functions] ${FILE}`);
console.log(`  ${defs.size} functions defined; ${dead.length} with no reference anywhere but their own definition.`);
for (const d of dead.sort((a, b) => a.line - b.line)) console.log(`    line ${String(d.line).padStart(5)}  ${d.name}`);
