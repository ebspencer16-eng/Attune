/**
 * Every option's position on an admin slider is a fraction, not a raw score.
 *
 * ── THE BUG THIS ENCODES ──────────────────────────────────────────────────
 * Ellie: "I don't think the all questions section is correct, I don't think
 * everyone said often for everything."
 *
 * She was right, and it was not the data. The All questions rows draw a mean
 * dot at `Math.max(2, Math.min(98, val * 100))` per cent, so `val` has to be
 * where the answer sits between the two poles, 0 to 1. The conflict fields
 * were sending the option's own value instead: 0 to 4 for the self
 * assessment and 0 to 3 for each of the four horsemen. Everything above 1
 * clamped to 98, so the dot pinned itself to the right-hand end of all five
 * rows, and the right-hand end of a horseman row says "Often".
 *
 * Nothing errored and nothing looked broken. A dot at the far right is a
 * perfectly ordinary dot, which is why this reads as a finding about couples
 * rather than a bug: it told Ellie something alarming about her customers in
 * the confident voice of a chart.
 *
 * Five fields of thirty-nine. The other thirty-four were already fractions,
 * which is exactly why it survived: the mechanism visibly worked everywhere
 * else.
 *
 * ── WHY check-position-units DID NOT CATCH IT ─────────────────────────────
 * That gate is the same rule on the app: a Marker that wanted a fraction and
 * was handed a percentage, so every placement dot rendered at up to 10000%.
 * It is scoped to the app's style props and could never see the admin's
 * payload. One rule, two surfaces, a gate on one of them, which this file
 * already names as how a gate holds half a promise.
 *
 * ── HOW IT IS CHECKED ─────────────────────────────────────────────────────
 * The real catalogue, through the real builder, and every numeric `val` on
 * every option. Reading the source would mean knowing which expressions
 * produce a fraction, and the whole bug was that one of them did not.
 */
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';

const TMP = 'api/_tmp-slider-positions-check.js';
writeFileSync(TMP, readFileSync('api/admin-explore.js', 'utf8') + '\nexport { buildCatalog };\n');
let fields;
try {
  const mod = await import(new URL('file://' + process.cwd() + '/' + TMP).href);
  fields = mod.buildCatalog({});
} finally { unlinkSync(TMP); }

const fail = [];
let checked = 0, withVal = 0;
for (const f of fields) {
  const vals = (f.options || []).filter((o) => typeof o.val === 'number');
  if (!vals.length) continue;
  withVal++;
  for (const o of vals) {
    checked++;
    if (o.val < 0 || o.val > 1) {
      fail.push(`${f.key} option ${JSON.stringify(o.label ?? o.v)} has val ${o.val}; a position is a fraction of the way `
        + `between the poles, so anything outside 0 to 1 clamps to one end and reads as every answer landing there`);
    }
  }
  /* A slider whose options all sit on one spot cannot show a distribution,
     which is the same failure wearing the opposite hat. */
  if (vals.length > 1 && new Set(vals.map((o) => o.val)).size === 1) {
    fail.push(`${f.key} gives all ${vals.length} of its options the same position, so every answer draws in the same place`);
  }
}

/* The count is printed and asserted, because a builder that stopped putting
   `val` on anything would otherwise pass this in perfect silence. */
if (withVal < 20) fail.push(`only ${withVal} fields carry a numeric val; this gate has lost its subject`);
if (!fields || fields.length < 100) fail.push(`the catalogue built ${fields && fields.length} fields; this gate has lost its subject`);

if (fail.length) {
  console.error('check-slider-positions FAILED');
  for (const f of fail) console.error('  - ' + f);
  process.exit(1);
}
console.log(`[check-slider-positions] ${checked} option positions across ${withVal} sliders, every one a fraction between 0 and 1, `
  + `and no slider stacks all its options on one spot.`);
