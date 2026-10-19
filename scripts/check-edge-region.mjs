#!/usr/bin/env node
/**
 * Every endpoint that reads the database runs in the database's region.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Ellie: "Keep trying to speed things up."
 *
 * These endpoints run on Vercel's edge, which puts them near whoever is
 * asking. Every answer they give comes from one Supabase project in one
 * region, so a request landing in San Francisco spent two crossings of the
 * country on a lookup by id. Pinning them next to the database took that
 * lookup from 200-600ms to 98ms, measured through the Server-Timing header
 * either side of the change.
 *
 * ── WHY A GATE ────────────────────────────────────────────────────────────
 * Vercel reads `export const config` by parsing the file, so the region has to
 * be a literal in each endpoint. It cannot be imported. That makes it a value
 * written out in fifty-two places, which is the shape of every serious bug in
 * this codebase, so this holds all fifty-two to the one constant that means
 * it.
 *
 * It also catches the quieter failure: a new endpoint, or an existing one that
 * loses its region in a refactor. One endpoint in the wrong place is a screen
 * that is slower than the others for no visible reason, which is not something
 * anybody would think to look for.
 *
 * ── IT COVERS EVERYTHING NOW, AND DID NOT AT FIRST ────────────────────────
 * It started scoped to the endpoints the app calls, because those are what
 * Ellie was waiting on and a gate that demands a change nobody has made yet is
 * a gate that gets switched off. It counted the others in its summary so the
 * number stayed visible rather than being forgotten, which is the only reason
 * the rest got done: the sentence said thirty-four every time anybody ran it.
 *
 * They are all pinned, so the rule is now simply: any edge endpoint that
 * talks to the database runs beside it.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { DB_REGION } from '../api/_lib/db-region.js';

const ROOT = new URL('..', import.meta.url).pathname;

/**
 * What the app asks for, from the app's own client rather than a list here.
 *
 * A hand-kept list beside a real one is always the shorter list. This reads
 * the paths out of attune-app/src/api/client.ts, so an endpoint the app starts
 * calling is covered the day it starts calling it.
 */
const client = readFileSync(`${ROOT}attune-app/src/api/client.ts`, 'utf8');
const called = [...new Set(
  [...client.matchAll(/['"`]\/api\/([a-z0-9-]+)/g)].map((m) => m[1]),
)].sort();

const fails = [];
if (called.length < 5) {
  console.error(`[check-edge-region] found ${called.length} endpoints in the app's client,`
    + ' which cannot be right. Refusing to pass: a gate that has lost its subject must'
    + ' never report success.');
  process.exit(1);
}

/**
 * And every other edge endpoint that reads the database.
 *
 * The app's list is read from the app; this is the rest of api/, found by
 * asking which files run on the edge and name SUPABASE_URL. Both sets get the
 * same rule, and they are counted separately only so the summary can say which
 * is which.
 */
const others = readdirSync(`${ROOT}api`)
  .filter((f) => f.endsWith('.js') && !f.startsWith('_'))
  .map((f) => f.replace(/\.js$/, ''))
  .filter((n) => !called.includes(n))
  .filter((n) => {
    const src = readFileSync(`${ROOT}api/${n}.js`, 'utf8');
    return /runtime:\s*'edge'/.test(src) && /SUPABASE_URL/.test(src);
  });

const pinned = [];
const missing = [];
for (const name of [...called, ...others]) {
  let src;
  try { src = readFileSync(`${ROOT}api/${name}.js`, 'utf8'); }
  catch { continue; } // not an endpoint file: a route handled elsewhere
  const cfg = /export const config = \{([^}]*)\}/.exec(src);
  if (!cfg) {
    fails.push(`api/${name}.js has no runtime config at all, so it is a Node function`
      + ' answering in whatever region Vercel picks.');
    continue;
  }
  if (!/runtime:\s*'edge'/.test(cfg[1])) continue; // nodejs functions are a different question
  const region = /regions:\s*\[\s*'([^']+)'/.exec(cfg[1]);
  if (!region) { missing.push(name); continue; }
  if (region[1] !== DB_REGION) {
    fails.push(`api/${name}.js runs in ${region[1]} and the database is in ${DB_REGION}.`
      + ' Every read it does crosses the distance between them.');
    continue;
  }
  pinned.push(name);
}

if (missing.length) {
  fails.push(`${missing.length} endpoint(s) run wherever the request lands`
    + ` rather than beside the database: ${missing.join(', ')}.\n`
    + `      Add regions: ['${DB_REGION}'] to the config export. See api/_lib/db-region.js`
    + ' for why, and for the measurement.');
}

if (fails.length) {
  console.error('\n check-edge-region: an endpoint is not next to the database.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

const fromApp = pinned.filter((n) => called.includes(n)).length;
console.log(`[check-edge-region] ${pinned.length} edge endpoints read the database and all of`
  + ` them run in ${DB_REGION}, which is where it is. ${fromApp} are the ones the app calls,`
  + " read from the app's own client rather than a list kept here; the rest are the website,"
  + ' the admin and the crons.');
