// Runs every document generator and fails if any of them errors.
//
// This exists because build_new_copy_review.mjs threw on every run for days
// after the same-type profile page was deleted: it extracted SAME_TYPE_PROFILE
// from App.jsx and that data went with the page. Nothing caught it, because
// generators are not imported by the app and so never touched by a build.
//
// They read live from src/App.jsx, api/_questions.js, api/_workbook-content.js
// and api/_type-engine.js, so deleting a component or renaming a dimension can
// break one without touching a line of it. That is precisely the class of
// breakage this catches.
//
// Output goes to a temp directory, so a run leaves nothing behind. Generators
// that hardcode /mnt/user-data/outputs will still write there; that is fine.
//
//   node scripts/check-doc-generators.mjs

import { readdirSync, mkdtempSync, rmSync } from 'fs';
import { execFileSync } from 'child_process';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const out = mkdtempSync(join(tmpdir(), 'attune-docs-'));

// Generators that need arguments, a network call, or a browser are listed here
// with a reason. Everything else must run clean with no arguments.
const SKIP = {
  // (none today: add entries as `'name.mjs': 'reason'`)
};

const files = readdirSync(scriptsDir)
  .filter(f => /^build_.*\.(mjs|py)$/.test(f))
  .sort();

let failed = 0, skipped = 0;
for (const f of files) {
  if (SKIP[f]) { skipped++; console.log(`  SKIP  ${f}  (${SKIP[f]})`); continue; }
  const cmd = f.endsWith('.py') ? 'python3' : 'node';
  try {
    execFileSync(cmd, [join(scriptsDir, f)], {
      stdio: 'pipe',
      timeout: 120000,
      env: { ...process.env, ATTUNE_DOC_OUT: out },
    });
    console.log(`  ok    ${f}`);
  } catch (e) {
    failed++;
    const msg = (e.stderr?.toString() || e.stdout?.toString() || e.message || '')
      .split('\n').filter(Boolean).slice(-3).join(' | ');
    console.error(`  FAIL  ${f}`);
    console.error(`        ${msg.slice(0, 220)}`);
  }
}

rmSync(out, { recursive: true, force: true });

if (failed) {
  console.error(`\n[check-doc-generators] ${failed} of ${files.length} generators failed.`);
  console.error('A generator usually breaks because it reads something from the app that was renamed or deleted.');
  process.exit(1);
}
console.log(`\n[check-doc-generators] ${files.length - skipped} generators ran clean.`);
