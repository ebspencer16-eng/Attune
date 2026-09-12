// Writes the launch flags into public/_flags.js from api/_lib/flags.js.
//
// The static pages cannot import a module, so they read window.ATTUNE_FLAGS.
// That object used to be typed by hand next to three other copies of the same
// three facts. This generates it instead, the way build-pkg-rules.mjs
// generates public/_pkg-rules.js from PKG_CAPS and for the same reason.
//
// Only the object literal is rewritten. The two banners below it are real
// code that belongs on the page, not something to hide inside a generator.
//
// Run automatically before build. The result is committed so the site works
// from a plain checkout, and check-flags.mjs fails the build if it drifts.

import { readFileSync, writeFileSync } from 'fs';
import { ATTUNE_FLAGS } from '../api/_lib/flags.js';

const PATH = new URL('../public/_flags.js', import.meta.url).pathname;
const src = readFileSync(PATH, 'utf8');

const literal = 'window.ATTUNE_FLAGS = {\n'
  + Object.entries(ATTUNE_FLAGS)
      .map(([k, v]) => `  ${k}: ${typeof v === 'string' ? `'${v}'` : v},`)
      .join('\n')
  + '\n};';

const RE = /window\.ATTUNE_FLAGS = \{[\s\S]*?\n\};/;
if (!RE.test(src)) {
  console.error('[build-flags] no window.ATTUNE_FLAGS object found in public/_flags.js.');
  console.error('  Refusing to write: a generator that cannot find its target must not');
  console.error('  report success, and this one would have left the file unchanged.');
  process.exit(1);
}

const out = src.replace(RE, literal);
if (out.length < 1000) {
  console.error('[build-flags] result is implausibly short; refusing to write.');
  process.exit(1);
}
if (out !== src) {
  writeFileSync(PATH, out);
  console.log('[build-flags] public/_flags.js updated from api/_lib/flags.js.');
} else {
  console.log('[build-flags] public/_flags.js already matches api/_lib/flags.js.');
}
