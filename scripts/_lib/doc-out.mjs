/**
 * Where the generated review documents go.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * Nineteen of the twenty-seven generators wrote to a hardcoded
 * /mnt/user-data/outputs, which is a sandbox path that does not exist on a
 * developer's machine. So `npm run check:docs` reported "18 of 27 generators
 * failed" permanently, on every run, for reasons that had nothing to do with
 * the generators.
 *
 * That is worse than a check that does not exist. A tool that always reports
 * eighteen failures is a tool nobody reads, and a real break hides inside the
 * noise. It is how the copy-review document came to be showing ten action
 * items the product has never rendered without anyone noticing.
 *
 * This is the same fix the render smoke test needed: resolve from the
 * environment rather than assuming one machine.
 *
 * ── ORDER ─────────────────────────────────────────────────────────────────
 * 1. ATTUNE_DOC_OUT, so CI or a sandbox can point anywhere.
 * 2. /mnt/user-data/outputs when it actually exists, so nothing changes for
 *    whoever was relying on it.
 * 3. <repo>/.doc-out, created on demand and gitignored.
 */

import { existsSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const SANDBOX = '/mnt/user-data/outputs';

/**
 * ── 4. SOMEWHERE WRITABLE, IF NONE OF THOSE ARE ───────────────────────────
 * Ellie's Render log:
 *
 *   Error: EACCES: permission denied, mkdir '/app/.doc-out'
 *
 * The workbook container runs as `pwuser` and /app belongs to root, so the
 * repo-relative fallback is not writable there. The real fix is in
 * render_workbook.mjs, which should never have reached this code in service
 * mode at all, and that is fixed. This is the second line: a helper that
 * decides where to put a file should not be able to kill the process that
 * called it, least of all after that process has already done its work.
 */
export function docOut(filename) {
  const root = new URL('../../', import.meta.url).pathname;
  const dir = process.env.ATTUNE_DOC_OUT
    || (existsSync(SANDBOX) ? SANDBOX : join(root, '.doc-out'));
  try {
    mkdirSync(dir, { recursive: true });
    return filename ? join(dir, filename) : dir;
  } catch {
    const fallback = join(tmpdir(), 'attune-doc-out');
    mkdirSync(fallback, { recursive: true });
    return filename ? join(fallback, filename) : fallback;
  }
}
