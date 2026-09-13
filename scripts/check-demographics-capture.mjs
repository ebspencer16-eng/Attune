// Fails the build when a signup path collects fewer demographics than another.
//
// ── WHAT HAPPENED ──────────────────────────────────────────────────────────
// api/create-profile.js has accepted ageRange, relationshipStatus,
// relationshipLength, children and signupSource since it was written. The
// website's signup sends all five. The app's profile setup sent none, because
// the questions were typed into src/App.jsx and nowhere else.
//
// Ellie's direction is that a customer buys on the website and then uses only
// the app: "Ideally, a user purchases online then downloads the app and only
// uses the app from that point." Every one of those people answers none of
// these, and the admin's Demographics page is built on exactly these columns.
// The page does not break. It quietly describes a shrinking fraction of who
// actually signed up.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// 1. ABOUT_YOU in api/_lib/profile-setup-copy.js names a field for every
//    demographic column api/create-profile.js writes, gender excepted.
// 2. Both signup surfaces read that list rather than carrying their own.
//
// ── GENDER ─────────────────────────────────────────────────────────────────
// Not asked anywhere, on purpose. api/admin-explore.js and the admin's own
// loader derive it from the pronouns someone chose, and the tile says so.
// Adding it to ABOUT_YOU would mean asking a question we already answer.

import { readFileSync } from 'fs';

import { ABOUT_YOU } from '../api/_lib/profile-setup-copy.js';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (f) => readFileSync(`${ROOT}${f}`, 'utf8');

const problems = [];

// ── 1. Every column the endpoint writes is a question somewhere ───────────
const endpoint = read('api/create-profile.js');
const WRITES = [...endpoint.matchAll(/^\s{4}(\w+):\s*typeof body\.(\w+) ===/gm)]
  .map((m) => ({ column: m[1], field: m[2] }));

if (WRITES.length < 5) {
  console.error(`[check-demographics-capture] only found ${WRITES.length} written fields in`);
  console.error('  api/create-profile.js; the shape it is read from has changed. Refusing to pass.');
  process.exit(1);
}

const DEMOGRAPHIC = new Set([
  'age_range', 'relationship_status', 'relationship_length', 'children', 'signup_source',
]);
const asked = new Set(ABOUT_YOU.fields.map((f) => f.key));

for (const { column, field } of WRITES) {
  if (!DEMOGRAPHIC.has(column)) continue;
  if (asked.has(field)) continue;
  problems.push(
    `api/create-profile.js writes profiles.${column} from body.${field}, and nothing asks for it.\n`
    + '      A column the admin charts and no signup path fills is a chart that\n'
    + '      describes nobody. Add it to ABOUT_YOU, or stop writing it.');
}
for (const key of asked) {
  if (WRITES.some((w) => w.field === key)) continue;
  problems.push(
    `ABOUT_YOU asks for ${key} and api/create-profile.js does not write it anywhere.\n`
    + '      The answer is collected and dropped.');
}

// ── 2. Both surfaces read the list ────────────────────────────────────────
const SURFACES = [
  ['src/App.jsx', /ABOUT_YOU/],
  ['attune-app/src/components/profile-setup.tsx', /about\.fields\.map/],
];
for (const [file, pattern] of SURFACES) {
  if (pattern.test(read(file))) continue;
  problems.push(
    `${file} does not render the shared question list.\n`
    + '      It either asks nothing, or asks from a copy of its own, and the two\n'
    + '      signup paths stop collecting the same things.');
}

// The app gets them over the wire, so the endpoint has to send them.
if (!/aboutYou:\s*ABOUT_YOU/.test(endpoint)) {
  problems.push(
    'GET /api/create-profile does not send aboutYou, so the app has no questions\n'
    + '      to render and profile setup silently collects names only.');
}

if (problems.length) {
  console.error('[check-demographics-capture] a signup path collects less than another:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(
  `[check-demographics-capture] ${ABOUT_YOU.fields.length} questions, asked by both signup paths, `
  + 'every demographic column filled by one of them.');
