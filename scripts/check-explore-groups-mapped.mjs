/**
 * Every group the field catalogue declares is a group the section map knows.
 *
 * ── THE BUG THIS ENCODES ──────────────────────────────────────────────────
 * Ellie: "as read by partner doesn't make sense." It did not, because the
 * label was backwards: that field is this person's read of their PARTNER, not
 * somebody else's read of them. Renaming it, I renamed its group to match.
 *
 * The group string is the KEY into GROUP_MAP in api/_lib/explore-sections.js.
 * So the rename sent all ten of those fields to the fallback, which is
 * Demographic as a detail row, and nothing failed: the Explore picker still
 * listed them, under the wrong heading, in the wrong section, at the wrong
 * tier. The only symptom was a section count moving, 86 to 76 under
 * Communication Styles and 17 to 27 under Demographic, and I only saw it
 * because I had rebuilt the catalogue to check something else.
 *
 * The fallback is right, and it is why this needs a gate rather than a throw:
 * a field in the wrong section still reaches the page, which is better than a
 * field that vanishes. It is exactly that forgivingness that makes the
 * mistake invisible.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * It builds the real catalogue through the real builder and asks the real
 * placer where each field went, rather than reading either file. A gate that
 * compared two lists of strings would pass the day someone changed how
 * placement works.
 */
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';

/* buildCatalog is module-private, and it is the thing under test. The module
   is copied beside itself with one export appended, so relative imports still
   resolve and nothing about the function changes. */
const TMP = 'api/_tmp-explore-groups-check.js';
writeFileSync(TMP, readFileSync('api/admin-explore.js', 'utf8') + '\nexport { buildCatalog };\n');

let fields, placed, GROUP_MAP;
try {
  const mod = await import(new URL('file://' + process.cwd() + '/' + TMP).href);
  const sections = await import('../api/_lib/explore-sections.js');
  GROUP_MAP = sections.GROUP_MAP || null;
  fields = mod.buildCatalog({});
  placed = sections.placeAll(fields);
} finally { unlinkSync(TMP); }

const fail = [];
const list = placed.fields || placed;
if (!Array.isArray(list) || list.length < 100) fail.push(`the catalogue built ${list && list.length} fields; this gate has lost its subject`);

/* ── THE SIGNAL IS `placed.unmapped`, NOT A FLAG ON THE FIELD ─────────────
   The first version asked each field whether `mapped === false`. placeAll
   does not copy that onto the field: it spreads only `section` and `tier` and
   collects the group names in `unmapped`. So the test was comparing undefined
   against false, every plant passed, and the gate reported a clean run about
   a catalogue with ten fields in the wrong section.

   Exactly what this file's own header says about the fallback being
   forgiving, made again one screen later. */
if (!Array.isArray(placed.unmapped)) {
  fail.push('placeAll no longer reports an `unmapped` list, so this gate cannot see its subject');
} else {
  for (const group of placed.unmapped) {
    const keys = list.filter((f) => f.group === group).map((f) => f.key);
    fail.push(`${keys.length} field(s) declare the group ${JSON.stringify(group)}, which GROUP_MAP does not know, `
      + `so they fall into Demographic as detail rows: ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}`);
  }
}

/* And the other direction: a map entry nothing uses is a rename that moved
   the fields and left the old key behind, which is the same mistake caught a
   day later. Reported, because the fallback hides the first direction and a
   stale key is the evidence it happened. */
/* GROUP_MAP was module-private, so this read undefined and the whole branch
   was skipped in silence: the gate's own header calls a silent skip the way a
   sweep becomes evidence for something it never looked at, and then did one.
   It is exported now, and a gate that cannot see it fails rather than passes. */
if (!GROUP_MAP || !Object.keys(GROUP_MAP).length) {
  fail.push('GROUP_MAP is not readable from here, so half of this gate checked nothing');
} else {
  const used = new Set(list.map((f) => f.group));
  const stale = Object.keys(GROUP_MAP).filter((g) => !used.has(g));
  for (const g of stale) fail.push(`GROUP_MAP maps ${JSON.stringify(g)} and no field declares it; a rename left this behind`);
}

/* Each section has to end up with fields, or a band in the picker is empty. */
const bySection = {};
for (const f of list) bySection[f.section] = (bySection[f.section] || 0) + 1;
for (const s of (await import('../api/_lib/explore-sections.js')).EXPLORE_SECTIONS) {
  if (!bySection[s.id]) fail.push(`section ${s.id} has no fields, so its band in the picker draws nothing`);
}

if (fail.length) {
  console.error('check-explore-groups-mapped FAILED');
  for (const f of fail) console.error('  - ' + f);
  process.exit(1);
}
console.log(`[check-explore-groups-mapped] ${list.length} fields across ${Object.keys(bySection).length} sections, `
  + `every group known to GROUP_MAP and every mapped group used: `
  + Object.entries(bySection).map(([k, v]) => `${k} ${v}`).join(', ') + '.');
