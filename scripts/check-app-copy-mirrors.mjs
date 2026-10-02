#!/usr/bin/env node
/**
 * The app may repeat one of Ellie's sentences, but never unwatched.
 *
 * ── WHY THE APP REPEATS ANY OF THEM ───────────────────────────────────────
 * An Expo project cannot import from api/, so a sentence the server owns and
 * the app needs before a payload arrives has to exist twice. This codebase
 * already accepts that and pays for it with a gate each time: the waiting copy,
 * the Notes tab's labels, the journal's empty states, the annotation palette,
 * the budget arithmetic. Each pair is held by a named check.
 *
 * ── THE HOLE ──────────────────────────────────────────────────────────────
 * check-copy-has-one-home scans api/ and src/App.jsx. It does not scan the app,
 * which is the one surface that CANNOT import the module, which is to say the
 * only place where a second copy is possible in the first place.
 *
 * Found by running its comparison over attune-app/src by hand. Seventeen of
 * Ellie's sentences are repeated there. Sixteen are deliberate mirrors with a
 * gate naming both sides. The seventeenth was:
 *
 *   const ADVICE_KEEP = 'One thing to keep in mind';
 *
 * which is PATTERN_NOTES[key].title, a string api/conflict-results.js already
 * sends in the payload the same screen is reading. The two agreed, which is
 * what made it invisible: a copy edit would have moved the website and left the
 * app saying the old words. That screen reads the payload's title now.
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────
 * A sentence with a home may be repeated in the app only in a file that is a
 * declared mirror, and a declared mirror has to name the gate that holds it.
 * That gate is then VERIFIED here: it has to exist, it has to read that app
 * file, and it has to be one `npm run check` runs.
 *
 * ── WHY NOT "SOME GATE MENTIONS THE CONSTANT" ─────────────────────────────
 * That was the first version and it was unsound in both directions.
 * check-waiting-copy holds all five waiting sentences by VALUE and names none
 * of the app's constants, so four of them read as unwatched. And DASHBOARD
 * passed only because that word appears in an unrelated check, which is
 * evidence by coincidence. A gate whose evidence is a substring match on other
 * gates is guessing.
 *
 * The list below is three files, not three sentences. It is not an excuse
 * field: it cannot be used to silence a sentence, only to say that a whole
 * file's mirroring is somebody's job, and the gate then checks that the
 * somebody exists.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Sentences the app writes that have no home at all. Some are its own, some
 * are copy gaps, and neither is this check's business; CLAUDE.md says to name a
 * gap for Ellie rather than fill it.
 *
 * Near-matches. A sentence that has DRIFTED is not equal to its home and is
 * invisible here, exactly as it is to check-copy-has-one-home. Catching that
 * needs the pairing the rule demands, which is the point.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const fails = [];

/** Shortest sentence worth calling copy. Two words and a space. */
const MIN = 18;

// ── Every sentence that has a home ──────────────────────────────────────────
const modules = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.js$/.test(p)) modules.push(p.replace(ROOT, ''));
  }
})(join(ROOT, 'api'));

/* The naming convention this project already keeps for "a module whose job is
   to hold words". Same test as check-copy-has-one-home, on purpose: two gates
   with two different ideas of what a copy module is would drift. */
const isCopyModule = (p) => /-prose\.js$|-copy\.js$|_content\//.test(p);
const copyModules = modules.filter(isCopyModule);

if (copyModules.length < 5) {
  console.error(`[check-app-copy-mirrors] found ${copyModules.length} copy modules.`
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

const home = new Map();
const walkValue = (v, mod) => {
  if (typeof v === 'string') {
    if (v.length >= MIN && /\s/.test(v)) home.set(v, mod);
    return;
  }
  if (Array.isArray(v)) { v.forEach((x) => walkValue(x, mod)); return; }
  if (v && typeof v === 'object') for (const k of Object.keys(v)) walkValue(v[k], mod);
};
for (const m of copyModules) {
  try {
    const mod = await import(`${ROOT}${m}`);
    for (const k of Object.keys(mod)) walkValue(mod[k], m);
  } catch { /* a module that will not evaluate here is not this gate's subject */ }
}
if (home.size < 50) {
  console.error(`[check-app-copy-mirrors] only ${home.size} sentences have a home, which cannot`
    + ' be right. Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

/**
 * The app files whose mirroring is somebody's job, and whose job it is.
 *
 * Each pair is verified below: the gate has to exist, read that file, and run.
 */
const MIRRORS = {
  'attune-app/src/constants/waiting.ts': 'check-waiting-copy.mjs',
  'attune-app/src/app/notes.tsx': 'check-journal-copy.mjs',
  'attune-app/src/components/journal.tsx': 'check-journal-copy.mjs',
};

const runs = readFileSync(join(ROOT, 'package.json'), 'utf8');
for (const [app, gate] of Object.entries(MIRRORS)) {
  let gateSrc;
  try { gateSrc = readFileSync(join(ROOT, 'scripts', gate), 'utf8'); } catch {
    fails.push(`${app} is declared a mirror held by scripts/${gate}, and that file is gone.`);
    continue;
  }
  /* It has to READ the file it is said to hold. A gate named here that does not
     open that file is the declaration being wrong rather than the code. */
  const leaf = app.replace('attune-app/src/', '');
  if (!gateSrc.includes(leaf) && !gateSrc.includes(app)) {
    fails.push(`scripts/${gate} is named as the gate holding ${app} and never reads it.`);
  }
  if (!runs.includes(gate)) {
    fails.push(`scripts/${gate} holds ${app}'s copy and \`npm run check\` does not run it, so it`
      + ' has never failed and never will.');
  }
}

// ── Every app file ──────────────────────────────────────────────────────────
const appFiles = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx?$/.test(p)) appFiles.push(p);
  }
})(join(ROOT, 'attune-app/src'));

let mirrors = 0;
for (const file of appFiles) {
  const rel = file.replace(ROOT, '');
  const raw = readFileSync(file, 'utf8');
  /* Comments stripped, so the long explanations above a mirror do not count as
     one. Line numbers are taken from the RAW source: computing them from the
     stripped copy reported lines that pointed at unrelated code, which cost a
     wrong reading of two findings while this was being written. */
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n');

  for (const [sentence, mod] of home) {
    if (!src.includes(sentence)) continue;
    mirrors += 1;

    const at = raw.indexOf(sentence);
    const line = at === -1 ? 0 : raw.slice(0, at).split('\n').length;

    /**
     * The identifier carrying it: a const, or an object key.
     *
     * Matched on the declaration rather than anywhere the name appears, because
     * the question is which name a gate would have to watch.
     */
    const decl = new RegExp(`(?:const|let)\\s+([A-Za-z_$][\\w$]*)\\s*(?::[^=]+)?=\\s*['"\`]${
      sentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`).exec(src)
      || new RegExp(`([A-Za-z_$][\\w$]*)\\s*:\\s*['"\`]${
        sentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`).exec(src);

    if (!decl) {
      if (MIRRORS[rel]) continue;
      fails.push(`${rel}:${line} writes a sentence that belongs to ${mod}, inline:\n`
        + `      "${sentence.slice(0, 80)}"\n`
        + '      Inline, no gate can name it. Put it in a named constant and hold the two\n'
        + '      together, or read it from the payload if the screen already has one.');
      continue;
    }

    const name = decl[1];
    if (!MIRRORS[rel]) {
      fails.push(`${rel}:${line} repeats a sentence that lives in ${mod}, as \`${name}\`, and that`
        + ' file is not a declared mirror:\n'
        + `      "${sentence.slice(0, 80)}"\n`
        + '      The app cannot import from api/, so a second copy is sometimes the answer and\n'
        + '      sometimes the payload already carries the words. An UNWATCHED second copy is\n'
        + '      never the answer: the two agree today, which is the whole reason nobody will\n'
        + '      notice the day they stop.');
    }
  }
}

if (!mirrors) {
  console.error('[check-app-copy-mirrors] the app repeats no sentence that has a home, which'
    + ' contradicts the mirrors this repo knows it has. Refusing to pass: a gate that has lost'
    + ' its subject must never report success.');
  process.exit(1);
}

if (fails.length) {
  console.error('\n check-app-copy-mirrors: a sentence of hers is repeated in the app with'
    + ' nothing watching it.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log(`[check-app-copy-mirrors] ${mirrors} of Ellie's sentences are repeated in the app`
  + ` out of ${home.size} that have a home, and every one sits in a declared mirror`
  + ` whose gate exists, reads that file, and runs.`);
