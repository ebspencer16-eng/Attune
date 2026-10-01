#!/usr/bin/env node
/**
 * The env inventory is the code's own list, and /api/admin-env never leaks one.
 *
 * ── TWO PROMISES, AND THEY ARE DIFFERENT ──────────────────────────────────
 * One: api/_lib/env-inventory.js says what the code reads. Checked by
 * regenerating and comparing, which no partial edit can fool.
 *
 * Two: the endpoint that reports on them reports whether a value exists and
 * never any part of the value. That is the promise worth a gate of its own,
 * because it is the one whose failure is a leaked credential rather than a
 * stale list, and because the obvious "helpful" additions to such an endpoint,
 * a length, a first four characters, a fingerprint, are all leaks.
 *
 * ── THE SECOND IS CHECKED BY RUNNING IT TWICE ─────────────────────────────
 * Not by reading it for suspicious words, and not by searching the response for
 * a planted secret either: see the note above the runs for why that was not
 * enough. The handler is executed twice with entirely different values under
 * every name, and its two answers must be identical.
 */

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = `${ROOT}api/_lib/env-inventory.js`;

const before = (() => { try { return readFileSync(OUT, 'utf8'); } catch { return null; } })();
if (before === null) {
  console.error('[check-env-inventory] api/_lib/env-inventory.js is missing. Run'
    + ' `node scripts/build-env-inventory.mjs`.');
  process.exit(1);
}

execFileSync(process.execPath, [`${ROOT}scripts/build-env-inventory.mjs`], { stdio: 'pipe' });
const after = readFileSync(OUT, 'utf8');
if (before !== after) {
  console.error('[check-env-inventory] api/_lib/env-inventory.js was out of date with the'
    + ' code that reads these variables, and has been regenerated. Commit it.');
  process.exit(1);
}

// ── The endpoint, run twice, with different values ─────────────────────────
/**
 * ── WHY TWO RUNS AND NOT A SEARCH FOR THE SECRET ──────────────────────────
 * The first version planted a distinctive value and searched the response for
 * it. It caught a value returned whole and missed every other shape: a twelve
 * character prefix, the value reversed, and it would equally have missed a
 * length, a hash or a checksum. Each of those is still the credential, or
 * enough of it.
 *
 * Searching for an output cannot enumerate the functions someone might apply to
 * a secret. So the property is the other way round: this endpoint's answer must
 * not DEPEND on the values at all. Run it twice with completely different
 * values under every name, and the two responses have to be byte for byte the
 * same. Anything derived from a value, in any shape, makes them differ.
 */
const { ENV_VARS } = await import(`${OUT}?t=${Date.now()}`);
if (!ENV_VARS.length) {
  console.error('[check-env-inventory] the inventory is empty. Refusing to pass: a gate that'
    + ' has lost its subject must never report success.');
  process.exit(1);
}

const ALL_NAMES = [...new Set(ENV_VARS.flatMap((v) => [v.name, ...(v.alsoAccepts || [])]))];
const saved = new Map(ALL_NAMES.map((n) => [n, process.env[n]]));
const restore = () => {
  for (const [n, v] of saved) {
    if (v === undefined) delete process.env[n]; else process.env[n] = v;
  }
};

const mod = await import(`${ROOT}api/admin-env.js?t=${Date.now()}`);

/** One authorised call, with `set` holding the names to give a value to. */
async function callWith(valueFor, set) {
  for (const n of ALL_NAMES) {
    if (set.has(n)) process.env[n] = valueFor(n); else delete process.env[n];
  }
  const secret = valueFor('ADMIN_SECRET');
  process.env.ADMIN_SECRET = secret;
  const res = await mod.default(new Request('https://example.test/api/admin-env', {
    headers: { authorization: `Bearer ${secret}` },
  }));
  return { status: res.status, body: await res.text() };
}

const fails = [];
const everything = new Set(ALL_NAMES);

let runA; let runB; let partial;
try {
  /* Different characters AND different lengths. The first pair were
     `AAAA-<name>-1111` and `zzzz-<name>-9999`, which are the same length for a
     given name, so an endpoint returning only the LENGTH of each value answered
     identically twice and passed. A leak that is invariant between the two
     probes is a leak this cannot see, so the probes differ in every way a value
     can. */
  runA = await callWith((n) => `AAAA-${n}-1111`, everything);
  runB = await callWith((n) => `zz-${n}-9`, everything);
  /* Half of them, chosen by position so the set is stable between runs. */
  partial = new Set(ALL_NAMES.filter((_, i) => i % 2 === 0));
  partial.add('ADMIN_SECRET');
  runB.partial = await callWith((n) => `AAAA-${n}-1111`, partial);

  /**
   * And it refuses an unauthenticated caller.
   *
   * Every check above calls it WITH a valid admin token, so deleting the guard
   * changes nothing they can see: the plant `if (false && !auth.ok)` passed all
   * of them. The names alone are a map of the infrastructure, and this endpoint
   * is the one place that says which credentials exist.
   */
  for (const n of ALL_NAMES) process.env[n] = `AAAA-${n}-1111`;
  process.env.ADMIN_SECRET = 'AAAA-ADMIN_SECRET-1111';
  const anon = await mod.default(new Request('https://example.test/api/admin-env'));
  const wrongKey = await mod.default(new Request('https://example.test/api/admin-env', {
    headers: { authorization: 'Bearer not-the-admin-secret' },
  }));
  runB.anonStatus = anon.status;
  runB.wrongKeyStatus = wrongKey.status;
} catch (err) {
  restore();
  console.error(`[check-env-inventory] /api/admin-env threw: ${String(err.message || err)}`);
  process.exit(1);
}
restore();

if (runB.anonStatus === 200 || runB.wrongKeyStatus === 200) {
  fails.push(`an unauthenticated request got ${runB.anonStatus} and a wrong token got`
    + ` ${runB.wrongKeyStatus}. This endpoint names every credential the server has and must`
    + ' answer only to an admin.');
}

if (runA.status !== 200 || runB.status !== 200) {
  fails.push(`the handler answered ${runA.status}/${runB.status} to an authorised request, so`
    + ' what this compared is not what it serves. Refusing to pass on a response it could not'
    + ' read.');
} else {
  if (runA.body !== runB.body) {
    /* Where they diverge, so the report says what leaked. */
    let at = 0;
    while (at < runA.body.length && runA.body[at] === runB.body[at]) at += 1;
    fails.push('the response CHANGES when the values change, so something in it is derived'
      + ' from a credential.\n'
      + `      first difference at character ${at}:\n`
      + `      with AAAA values: ${JSON.stringify(runA.body.slice(at - 40, at + 60))}\n`
      + `      with zzzz values: ${JSON.stringify(runB.body.slice(at - 40, at + 60))}\n`
      + '      A prefix, a length, a hash or a checksum is still the credential.');
  }

  let parsed;
  try { parsed = JSON.parse(runA.body); } catch { fails.push('the response is not JSON.'); }
  if (parsed) {
    if (!Array.isArray(parsed.vars) || parsed.vars.length !== ENV_VARS.length) {
      fails.push(`the response lists ${parsed.vars?.length} variables and the inventory has`
        + ` ${ENV_VARS.length}. It is supposed to report on all of them.`);
    }
    if (parsed.vars?.some((v) => v.set !== true)) {
      const bad = parsed.vars.find((v) => v.set !== true);
      fails.push(`every variable was given a value and the endpoint reported ${bad.name} unset.`);
    }
  }

  /* And with half of them unset, it has to say so. `set: true` written as a
     constant passes every check above, because above, everything is set. */
  let half;
  try { half = JSON.parse(runB.partial.body); } catch { fails.push('the partial run is not JSON.'); }
  if (half?.vars) {
    const wrong = half.vars.filter((v) => {
      const names = [v.name, ...(v.alsoAccepts || [])];
      const expected = names.some((n) => partial.has(n));
      return v.set !== expected;
    });
    if (wrong.length) {
      fails.push(`with ${partial.size} of ${ALL_NAMES.length} variables given a value, the`
        + ` endpoint reported ${wrong.length} of them wrongly, starting with ${wrong[0].name}`
        + ` (said ${wrong[0].set}). What it reports is not whether a value exists.`);
    }
    if (half.missingRequired?.length === 0 && half.vars.some((v) => v.required && !v.set)) {
      fails.push('a required variable has no value and missingRequired is empty, so the'
        + ' headline Ellie reads would say everything is fine.');
    }
  }
}

if (fails.length) {
  console.error('\n check-env-inventory:\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log(`[check-env-inventory] ${ENV_VARS.length} variables, list regenerated and identical;`
  + ' /api/admin-env run twice with different values and lengths under every name and answered'
  + ' identically, run with half of them unset and said which, and refused both an'
  + ' unauthenticated caller and a wrong token.');
