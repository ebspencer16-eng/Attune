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
import { join } from 'path';

const SANDBOX = '/mnt/user-data/outputs';

export function docOut(filename) {
  const root = new URL('../../', import.meta.url).pathname;
  const dir = process.env.ATTUNE_DOC_OUT
    || (existsSync(SANDBOX) ? SANDBOX : join(root, '.doc-out'));
  mkdirSync(dir, { recursive: true });
  return filename ? join(dir, filename) : dir;
}
