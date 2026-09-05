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

import { readFileSync, readdirSync } from 'fs';

const dir = new URL('../api/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.js'));

const problems = [];

for (const file of files) {
  const text = readFileSync(new URL(file, dir), 'utf8');
  // Only the lookups that feed an auth decision matter, and those all read the
  // header off the request.
  const lower = text.includes("headers.get('authorization')");
  const upper = text.includes("headers.get('Authorization')");
  if (lower && !upper) problems.push(file);
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

const checked = files.filter((f) => readFileSync(new URL(f, dir), 'utf8').includes("headers.get('authorization')")).length;
console.log(`[check-auth-headers] ${checked} endpoints read the Authorization header, all case-insensitively.`);
