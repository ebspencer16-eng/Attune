#!/usr/bin/env node
/**
 * The workbook image contains everything the workbook service reads.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * Ellie, over several weeks: "The workbook service did not answer, give it a
 * minute and try again", "the workbooks aren't loading", "got the same 'service
 * not responding' message". The PDF workbook has never once been built.
 *
 * The service was healthy the whole time. It answered in milliseconds, and it
 * answered with a crash:
 *
 *   FileNotFoundError: '/app/scripts/workbook_prose.json'
 *
 * That file is generated, committed, and was never copied into the image.
 * Three more were missing behind it, each hidden by the one in front:
 * scripts/_lib/doc-out.mjs, api/_workbook-prose.js and api/_type-engine.js.
 * Four of the seven files the service needs were not in the container.
 *
 * ── WHY NOTHING CAUGHT IT ─────────────────────────────────────────────────
 * Every other check runs against this repository, where all seven files exist.
 * The Dockerfile is a second, hand-written list of which of them matter, kept
 * somewhere no program reads, and nothing compared the two. That is the failure
 * CLAUDE.md is organised against, wearing a Dockerfile.
 *
 * It also failed in the most expensive possible way: from outside, a container
 * that crashes on startup and one that is misconfigured look identical, so the
 * search went to the env vars and the URL and the timeout, three times.
 *
 * ── HOW IT IS CHECKED ─────────────────────────────────────────────────────
 * The import graph is RESOLVED from the entry points the Dockerfile names,
 * following relative imports the way Node does, and every file reached has to
 * be copied. Derived, not listed: a list here would go stale the first time
 * someone added an import, and go stale silently, which is the bug itself.
 *
 * The Python's data file is handled separately because Python's `open()` is not
 * an import: the path is read out of build_workbook.py.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * npm packages. The Dockerfile installs those with npm and a missing one is a
 * loud failure at install time, not a silent one at run time.
 *
 * Whether the service works. That needs the container; this only says it has
 * the files it will reach for.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, extname } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const DOCKERFILE = join(ROOT, 'Dockerfile.workbook');

if (!existsSync(DOCKERFILE)) {
  console.error('[check-workbook-image] Dockerfile.workbook is gone. Refusing to pass: a gate'
    + ' that has lost its subject must never report success.');
  process.exit(1);
}

const docker = readFileSync(DOCKERFILE, 'utf8');

/** What the image copies in, as repo-relative paths. */
const copied = new Set(
  [...docker.matchAll(/^COPY\s+(\S+)\s+(\S+)/gm)].map((m) => m[1]),
);
if (!copied.size) {
  console.error('[check-workbook-image] Dockerfile.workbook copies nothing. Refusing to pass.');
  process.exit(1);
}

/** The entry points: whatever the image copies that is a script it runs. */
const ENTRIES = ['scripts/service.mjs', 'scripts/render_workbook.mjs', 'api/_workbook-content.js']
  .filter((p) => existsSync(join(ROOT, p)));
if (ENTRIES.length < 3) {
  console.error('[check-workbook-image] the service\'s entry points are not where this expects'
    + ' them. Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

const fails = [];
const needed = new Set();

/** Follow relative imports the way Node resolves them. */
function walk(abs) {
  const rel = relative(ROOT, abs);
  if (needed.has(rel)) return;
  if (!existsSync(abs)) {
    fails.push(`${rel} is imported by the workbook service and does not exist in the repo.`);
    return;
  }
  needed.add(rel);
  const src = readFileSync(abs, 'utf8');
  for (const m of src.matchAll(/(?:from|import)\s+['"](\.[^'"]+)['"]/g)) {
    let p = resolve(dirname(abs), m[1]);
    if (!extname(p)) p += '.js';
    walk(p);
  }
}
for (const e of ENTRIES) walk(join(ROOT, e));

/**
 * The Python's data file, read out of the script rather than assumed.
 *
 * `open()` is not an import, so the graph above cannot see it, and it is the
 * one that actually crashed. Matched on the filename the script joins to its
 * own directory.
 */
{
  const py = join(ROOT, 'scripts/build_workbook.py');
  if (!existsSync(py)) {
    fails.push('scripts/build_workbook.py is gone, and the image still runs it.');
  } else {
    const src = readFileSync(py, 'utf8');
    /* The filename on a `join(...)` whose arguments mention __file__. Matching
       `dirname\([^)]*\)` first does not work: the inner `abspath(__file__)`
       closes the character class early, so the real line never matched and this
       gate reported its own subject missing. */
    const data = [...src.matchAll(/join\([^\n;]*__file__[^\n;]*?['"]([^'"]+)['"]\s*\)/g)]
      .map((m) => m[1]);
    if (!data.length) {
      fails.push('scripts/build_workbook.py no longer reads a file beside itself, which is how'
        + ' workbook_prose.json reaches it. Refusing to pass: a gate that has lost its subject'
        + ' must never report success.');
    }
    for (const name of data) {
      const rel = `scripts/${name}`;
      needed.add(rel);
      if (!existsSync(join(ROOT, rel))) {
        fails.push(`scripts/build_workbook.py opens ${name} beside itself and the repo has no`
          + ` ${rel}. It is generated by scripts/build-workbook-prose.mjs.`);
      }
    }
  }
  needed.add('scripts/build_workbook.py');
}

for (const rel of [...needed].sort()) {
  if (copied.has(rel)) continue;
  fails.push(`${rel} is reached by the workbook service and Dockerfile.workbook does not copy`
    + ' it.\n      The container starts, the request arrives, and it crashes on the first line'
    + ' that\n      needs it, which from outside is indistinguishable from the service being'
    + ' down.');
}

/* And nothing is copied that the service does not reach: a stale COPY is a file
   that looks required and is not, which is how the list drifted in the first
   place. Reported rather than failed, because an unused file costs nothing. */
const extra = [...copied].filter((p) => !needed.has(p));

if (fails.length) {
  console.error('\n check-workbook-image: the image is missing something the service reads.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  console.error('  Add a COPY line to Dockerfile.workbook, then redeploy the Render service.\n');
  process.exit(1);
}

console.log(`[check-workbook-image] ${needed.size} files the workbook service reaches, every one`
  + ` copied into the image${extra.length ? `; ${extra.length} copied and unused: ${extra.join(', ')}` : ''}.`);
