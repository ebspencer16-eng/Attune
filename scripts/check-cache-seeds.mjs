#!/usr/bin/env node
/**
 * A screen that keeps an answer on the phone keeps all of it.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * Ellie: "when I swiped up on learn, the article list took a few seconds to
 * load, long enough that I thought it was empty and I swiped out."
 *
 * /api/posts answers with two things, `posts` and `categories`. The Learn tab
 * seeded `posts` from the cache and left `categories` at `[]`. The list under
 * the peek is drawn by mapping over the shelves, so with no shelves it drew
 * nothing: the filter pills, then an empty space, until a cold serverless
 * function answered. Every byte it needed was already on the phone.
 *
 * CLAUDE.md records the same shape on the Insights tab, where a cached payload
 * was read and then covered by a spinner: keeping a payload and drawing it are
 * two different things. This is half a payload kept, which is worse, because
 * the screen looks answered.
 *
 * ── WHAT IS CHECKED ───────────────────────────────────────────────────────
 * For every screen that calls `recall(<key>)`: every field it takes out of
 * that endpoint's answer when the request lands has to be seeded from
 * `recall` as well.
 *
 * The loader's assignments are the list of fields that matter, because a field
 * nothing assigns is a field nothing draws. So the rule reads itself off the
 * code rather than being a list somebody maintains:
 *
 *   setPosts(p.data.posts)          ->  `posts` must be recalled
 *   setCategories(p.data.categories) ->  `categories` must be recalled
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the cached value is any good, or fresh. payload-cache.ts owns that
 * and says in writing that a week is the limit.
 *
 * Nothing about /api/notes or the tags. Those are deliberately not cached, at
 * Ellie's ask, because the journal sits behind the phone's passcode and a copy
 * beside the app is a copy behind nothing. A screen that does not call
 * `recall` at all is not this gate's business.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const strip = (s) => s.replace(/\/\*[^]*?\*\//g, ' ').replace(/^\s*\/\/[^\n]*/gm, ' ');

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.tsx?$/.test(name)) files.push(full);
  }
})(join(ROOT, 'attune-app/src'));

/** Which endpoint each cache key answers for, from the client. */
const client = strip(readFileSync(join(ROOT, 'attune-app/src/api/client.ts'), 'utf8'));

/**
 * ── THE HARNESS WAS WRONG FIRST ──────────────────────────────────────────
 * The first version collected every `setX(v.data.field)` in a file and held
 * it against every key the file recalled. attune-app/src/app/notes.tsx
 * recalls one field of `home` and loads most of its screen from /api/notes,
 * which is deliberately not cached, so it reported twelve findings and all
 * twelve were the matcher putting one endpoint's fields against another
 * endpoint's cache.
 *
 * An assignment belongs to the request whose answer it reads. So the fetch
 * function is the thing to key on, and which cache key each one feeds is
 * readable in api/client.ts.
 */
const CACHED_FETCHERS = new Map();
for (const m of client.matchAll(/export function (fetch[A-Za-z]+)\s*\([^)]*\)\s*\{\s*return remembering\(\s*['"`]([a-z]+)['"`]/g)) {
  CACHED_FETCHERS.set(m[1], m[2]);
}
if (CACHED_FETCHERS.size < 3) {
  console.error(`[check-cache-seeds] matched ${CACHED_FETCHERS.size} cached fetchers in api/client.ts;`
    + ' there were four when this was written. Refusing to pass: a gate that has lost its'
    + ' subject must never report success.');
  process.exit(1);
}

const fails = [];
let screens = 0;
let seeded = 0;

for (const f of files) {
  const rel = f.replace(ROOT, '');
  const code = strip(readFileSync(f, 'utf8'));
  if (!/\brecall\s*[<(]/.test(code)) continue;

  for (const [fetcher, key] of CACHED_FETCHERS) {
    /* Does this screen both call that fetcher and recall its key? If it does
       not recall, it has chosen to wait for the request, which is a decision
       this gate has no opinion about. */
    if (!new RegExp(`\\b${fetcher}\\s*\\(`).test(code)) continue;
    const recalls = [...code.matchAll(new RegExp(`recall(?:<[^>]*>)?\\(\\s*['"\`]${key}['"\`]\\s*\\)([^;\\n]*)`, 'g'))];
    if (!recalls.length) continue;
    screens += 1;

    /* What it reads back out of the cache: `?.posts`, or the whole payload
       when it is used bare, which covers everything by definition. */
    const recalled = new Set();
    let wholePayload = false;
    for (const r of recalls) {
      const field = /^\s*\?\.\s*([A-Za-z_$][\w$]*)/.exec(r[1] || '');
      if (field) { recalled.add(field[1]); continue; }
      /* ── A PRESENCE TEST IS NOT A PAYLOAD READ ────────────────────────
         `!recall('posts')` asks whether anything was kept, to decide whether
         to show a spinner. It reads no field. The first version counted it as
         "uses the whole payload" and exempted the screen, which made the gate
         vacuous on the one file it was written for: resources.tsx has exactly
         that line, so every field in it was excused and the run reported
         "all 0 fields" with a cheerful exit 0. */
      if (code[r.index - 1] === '!') continue;
      wholePayload = true;
    }
    if (wholePayload) continue;

    /* What it assigns out of THAT fetcher's answer, within its own callback.
       The callback's parameter name is whatever the screen called it. */
    const assigned = new Set();
    for (const call of code.matchAll(new RegExp(`\\b${fetcher}\\s*\\([^)]*\\)\\s*\\.then\\(\\s*\\(?\\s*([A-Za-z_$][\\w$]*)`, 'g'))) {
      const v = call[1];
      /* To the end of the callback, bounded so a later unrelated setter in the
         same file is not swept in. The loaders here are a handful of lines. */
      const body = code.slice(call.index, call.index + 700);
      for (const a of body.matchAll(new RegExp(`set[A-Z][\\w$]*\\(\\s*${v}\\.data\\.([A-Za-z_$][\\w$]*)`, 'g'))) {
        assigned.add(a[1]);
      }
    }
    if (!assigned.size) continue;

    for (const field of assigned) {
      if (recalled.has(field)) { seeded += 1; continue; }
      fails.push(`${rel} takes \`${field}\` out of ${fetcher}'s answer and never seeds it from`
        + ` the kept copy of '${key}'. The screen draws with that field empty until the request`
        + ' lands, which on a cold function is several seconds of a page that looks finished'
        + ' and is not.');
    }
  }
}

if (!screens) {
  console.error('[check-cache-seeds] no screen both calls a cached fetcher and recalls its key.'
    + ' Either the cache is gone or this scan has stopped reaching the app. Refusing to pass.');
  process.exit(1);
}

if (fails.length) {
  console.error('[check-cache-seeds] a screen keeps half of an answer:\n');
  for (const f of fails) console.error('  ' + f);
  console.error('');
  console.error('Seed it the same way the other fields are seeded:');
  console.error("  useState(() => recall<{ x?: T }>('<key>')?.x || <empty>)");
  process.exit(1);
}

console.log(`[check-cache-seeds] ${CACHED_FETCHERS.size} cached endpoints, ${screens} screens recall one,`
  + ` and all ${seeded} fields they read out of a live answer are seeded from the kept copy.`);
