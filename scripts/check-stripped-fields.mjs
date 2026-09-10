// Fails the build when a surface reads a field its endpoint deliberately
// removes from the response.
//
// ── WHAT HAPPENED ──────────────────────────────────────────────────────────
// /api/partner-sync deletes conflict_data before responding, because the raw
// record carries the patterns half that stays private to whoever wrote it. It
// sends conflictCompletedAt and conflictPartnerView in its place.
//
// src/App.jsx read conflict_data off that response anyway, in two separate
// pollers, one of them written specifically to stop a partner's Conflict
// Patterns row reading Pending forever. It read Pending forever. The field it
// tested had been stripped before the response left the server, so the fix was
// written against something that was never going to arrive, and the two fields
// that exist for exactly this were read by nobody.
//
// Ellie found it as "our dashboard says Preston's conflict is pending".
//
// ── THE SHAPE ──────────────────────────────────────────────────────────────
// A privacy rule removes a field. The removal is correct. What gets missed is
// every consumer still asking for it, and those consumers do not fail loudly:
// an absent field is undefined, and undefined reads as "they have not done
// it". The bug is indistinguishable from the truth it is lying about.
//
// ── WHY THIS RESOLVES THE VARIABLE ─────────────────────────────────────────
// The first version of this gate matched the field name anywhere in a surface
// and reported five problems, of which three were not problems: a profile row
// read straight from Supabase legitimately has conflict_data, and clearing the
// local copy from it is the correct thing to do. A gate with a 60% false
// positive rate is a gate that gets an exception list bolted onto it, and then
// the exception list is where the next real bug hides.
//
// So it follows the value instead of the name. Find the fetch of the endpoint,
// take the variable it was assigned to, find the .json() of that, and flag
// reads rooted at THAT variable. Own-profile reads are rooted elsewhere and
// are never considered.
//
// ── WHAT THIS DOES NOT COVER ───────────────────────────────────────────────
// A response passed into another function, or stored in state and read later.
// The chain is followed one hop, from fetch to .json(), which is how all four
// of this codebase's consumers are written. If that changes, this goes quiet
// rather than wrong, so it is not the only thing standing between a stripped
// field and a consumer: the endpoint's own comment says what it sends instead,
// and that is what a reader should be believing.

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;

/** Endpoints are the top level of api/. Underscore files are libraries. */
const endpoints = readdirSync(join(ROOT, 'api'))
  .filter((f) => f.endsWith('.js') && !f.startsWith('_'));

/** route -> { fields stripped, and what the endpoint sends instead } */
const stripping = new Map();
for (const file of endpoints) {
  const src = readFileSync(join(ROOT, 'api', file), 'utf8');
  // Line by line, skipping comments. Reading the whole file at once counted a
  // commented-out `delete` as a live one, which meant the gate went on
  // enforcing a rule the endpoint had stopped keeping. Found by planting
  // exactly that: the summary line still claimed one field was stripped.
  const fields = src.split('\n')
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .flatMap((l) => [...l.matchAll(/delete\s+[\w.]*?\.(\w+);/g)].map((m) => m[1]));
  if (fields.length) {
    stripping.set('/api/' + file.replace(/\.js$/, ''), {
      file: 'api/' + file,
      fields: [...new Set(fields)],
    });
  }
}

const SURFACES = [
  'src/App.jsx',
  'attune-app/src/api/client.ts',
  'attune-app/src/app/index.tsx',
  'attune-app/src/app/insights.tsx',
  'attune-app/src/app/resources.tsx',
];

const problems = [];
let consumers = 0;

for (const file of SURFACES) {
  let src;
  try { src = readFileSync(join(ROOT, file), 'utf8'); } catch { continue; }
  const lines = src.split('\n');

  for (const [route, { file: from, fields }] of stripping) {
    // Every fetch of this route, and the variable holding the response.
    const fetches = [...src.matchAll(
      new RegExp(`(?:const|let)\\s+(\\w+)\\s*=\\s*await\\s+fetch\\(\`?[^)]*${route}\\b`, 'g'))];

    for (const f of fetches) {
      const resVar = f[1];
      // The parse of that response. Nearest one textually after the fetch.
      const after = src.slice(f.index);
      const parsed = after.match(
        new RegExp(`(?:const|let)\\s+(\\w+)\\s*=\\s*await\\s+${resVar}\\.json\\(\\)`));
      if (!parsed) continue;
      const bodyVar = parsed[1];
      consumers += 1;

      // Reads rooted at the parsed body. `json.profile?.conflict_data`, and
      // any depth of property or optional chaining between the two.
      for (const field of fields) {
        const re = new RegExp(`\\b${bodyVar}\\s*[.?]([\\w.?\\[\\]]*\\.)?${field}\\b`);
        lines.forEach((line, i) => {
          if (/^\s*(\/\/|\*)/.test(line)) return;   // a comment naming it is fine
          if (!re.test(line)) return;
          problems.push(
            `${file}:${i + 1} reads ${bodyVar}...${field}, and ${from} deletes\n`
            + `      ${field} before responding to ${route}.\n`
            + `      ${line.trim().slice(0, 92)}`);
        });
      }
    }
  }
}

if (problems.length) {
  console.error('[check-stripped-fields] a surface is reading a field its endpoint removes:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('The field is gone on purpose. Read whatever the endpoint sends in its');
  console.error('place; the endpoint says what that is. An absent field is undefined,');
  console.error('and undefined quietly reads as "they have not done it".');
  process.exit(1);
}

const stripped = [...stripping.values()].reduce((n, s) => n + s.fields.length, 0);
console.log(
  `[check-stripped-fields] ${stripped} field(s) stripped across ${stripping.size} endpoint(s); `
  + `${consumers} consumer(s) traced, none reading a stripped name.`);
