/**
 * Which app screens write something a person typed.
 *
 * ── WHY IT IS ITS OWN MODULE ──────────────────────────────────────────────
 * Two gates ask this question, about two different things: check-save-feedback
 * asks whether a failed write is reported, and check-unmount-flush asks whether
 * the screen writes on the way out as well as on the way forward. The split is
 * by what is checked, which is the split worth having.
 *
 * The list of screens is not. Two copies of that derivation is two lists that
 * drift, and the weaker one wins, because it is the one that still passes. So
 * it lives here and both read it.
 *
 * ── HOW IT IS DERIVED ─────────────────────────────────────────────────────
 * From the client module, by name. A client function called save*, create* or
 * update* that a screen calls is a writer. Reads (fetch*, list*) and receipts
 * (markPostRead, openSharedNote) are not: nobody loses work when a read fails.
 *
 * It was once the literal name `saveExercise`, and then the app grew a
 * checklist, a budget and profile setup, none of which call that.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const APP_ROOT = new URL('../../attune-app/src/', import.meta.url).pathname;
export const REPO_ROOT = new URL('../../', import.meta.url).pathname;

/** Every .tsx under attune-app/src. */
export function appScreens() {
  const files = [];
  (function walk(d) {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.tsx$/.test(p)) files.push(p);
    }
  })(APP_ROOT);
  return files;
}

/**
 * The names of every writing function the client exports.
 *
 * Both `export function` and `export async function`. The pattern once allowed
 * only the first, so the list came back without `saveExercise` — the one the
 * gate existed for — and went green covering five fewer screens than the
 * version it replaced. The caller asserts the name for that reason.
 */
export function clientWriters() {
  const client = readFileSync(join(APP_ROOT, 'api/client.ts'), 'utf8');
  return [...new Set(
    [...client.matchAll(/export (?:async )?function ((?:save|create|update)[A-Z]\w*)\s*\(/g)].map((m) => m[1]),
  )];
}

/**
 * @param {string} gate  the calling gate's name, for the refusal message
 * @returns {{writers: string[], screens: {file: string, rel: string, src: string}[]}}
 */
export function writingScreens(gate) {
  const writers = clientWriters();

  // A gate that has lost its subject must never report success.
  if (!writers.includes('saveExercise')) {
    console.error(`[${gate}] saveExercise is not in the derived writer list; refusing to pass.`);
    console.error(`  found: ${writers.join(', ') || '(none)'}`);
    process.exit(1);
  }
  if (writers.length < 5) {
    console.error(`[${gate}] only found ${writers.length} writers in the client; refusing to pass.`);
    process.exit(1);
  }

  const calls = new RegExp(`\\b(${writers.join('|')})\\s*\\(`);
  const screens = [];
  for (const file of appScreens()) {
    const src = readFileSync(file, 'utf8');
    if (!calls.test(src)) continue;
    // The client module declares them; it does not call them on anyone's behalf.
    if (file.endsWith('client.ts')) continue;
    screens.push({ file, rel: file.replace(REPO_ROOT, ''), src });
  }

  if (!screens.length) {
    console.error(`[${gate}] found no screens that write; refusing to pass.`);
    process.exit(1);
  }
  return { writers, screens };
}
