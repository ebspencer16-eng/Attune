// Fails the build when an endpoint reads the Authorization header in only one
// case.
//
// HTTP header names are case-insensitive by specification, and most runtimes
// normalise them on the way in. Not all clients preserve the same case on the
// way out: React Native's fetch sends `Authorization`, and eleven endpoints
// looked only for `authorization`. Every one of them returned "missing auth
// token" to the app while working perfectly from the website, which is the
// worst kind of bug to chase because both sides look correct in isolation.
//
// Two of the fourteen endpoints already checked both. Those two were written
// later, by someone who had presumably hit this.

// ── WHAT THE FIRST VERSION COULD NOT SEE ───────────────────────────────────
// It matched the one string `headers.get('authorization')`, in single quotes,
// in the top level of api/ only. Three endpoints read the header and it had
// nothing to say about any of them, because they read it as a property:
//
//   const authHeader = req.headers.authorization || '';
//
// That turns out to be correct, and the reason matters. Those three declare
// `runtime: 'nodejs'`, where req.headers is Node's own object and every key
// arrives lowercased, so the property is safe by construction. The edge
// endpoints take a Web Request, whose Headers.get is meant to be
// case-insensitive and was not reliably so, which is why the double read
// exists at all.
//
// So the gate passed three files for no reason, and would have gone on passing
// them if one were converted to edge, which is exactly when the property read
// stops being safe.
//
// The rule is now: a file that reads the header either reads both cases, or
// runs on nodejs. Both quote styles, and api/_lib too, where admin-auth.js
// reads the header for every admin endpoint and was never scanned.

import { readFileSync, readdirSync } from 'fs';

const apiDir = new URL('../api/', import.meta.url);

const files = [];
(function walk(dir, prefix = '') {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) { walk(new URL(`${entry.name}/`, dir), `${prefix}${entry.name}/`); continue; }
    if (entry.name.endsWith('.js')) files.push([`${prefix}${entry.name}`, new URL(entry.name, dir)]);
  }
})(apiDir);

const GET_LOWER = /headers\s*\.\s*get\s*\(\s*['"`]authorization['"`]\s*\)/;
const GET_UPPER = /headers\s*\.\s*get\s*\(\s*['"`]Authorization['"`]\s*\)/;
const PROP_LOWER = /headers\s*(?:\?\.)?\s*(?:\.\s*authorization\b|\[\s*['"`]authorization['"`]\s*\])/;
const NODE_RUNTIME = /runtime:\s*['"`]nodejs['"`]/;

const problems = [];

for (const [rel, url] of files) {
  const text = readFileSync(url, 'utf8');
  const getLower = GET_LOWER.test(text);
  const getUpper = GET_UPPER.test(text);
  const propLower = PROP_LOWER.test(text);
  if (!getLower && !propLower) continue;

  // Node lowercases every incoming header name, so a property read is exact.
  if (propLower && !getLower && NODE_RUNTIME.test(text)) continue;

  if (propLower && !NODE_RUNTIME.test(text)) {
    problems.push(`${rel} (reads req.headers.authorization without runtime: 'nodejs')`);
    continue;
  }
  if (getLower && !getUpper) problems.push(rel);
}

if (problems.length) {
  console.error('[check-auth-headers] endpoints that read only one case of the Authorization header:');
  for (const f of problems) console.error(`  api/${f}`);
  console.error('');
  console.error("Read both: req.headers.get('authorization') || req.headers.get('Authorization')");
  console.error('A client that sends the other case gets "missing auth token" while the');
  console.error('website works fine, and nothing in either half looks wrong.');
  process.exit(1);
}

const readers = files.filter(([, url]) => {
  const t = readFileSync(url, 'utf8');
  return GET_LOWER.test(t) || GET_UPPER.test(t) || PROP_LOWER.test(t);
});
const onNode = readers.filter(([, url]) => NODE_RUNTIME.test(readFileSync(url, 'utf8'))).length;
if (!readers.length) {
  console.error('[check-auth-headers] found no endpoint reading the header at all; refusing to pass.');
  process.exit(1);
}
console.log(
  `[check-auth-headers] ${readers.length} files read the Authorization header: `
  + `${readers.length - onNode} read both cases, ${onNode} run on nodejs where the key is lowercased for them.`);
