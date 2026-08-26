// Fails the build if a user-data localStorage key is missing from
// USER_LOCALSTORAGE_KEYS in src/App.jsx.
//
// That list is what clearAllUserLocalStorage() walks, and that function runs on
// sign-out and on account switch. A key that drifts out of it survives both, so
// on a shared browser the next person inherits the previous person's data. That
// is how attune_notes, attune_intimacy and attune_checklist were being left
// behind. Anything genuinely not user data goes in EXEMPT below, with a reason.

import { readFileSync } from 'fs';

const src = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

const start = src.indexOf('const USER_LOCALSTORAGE_KEYS');
if (start < 0) {
  console.error('[check-localstorage-keys] USER_LOCALSTORAGE_KEYS not found in src/App.jsx');
  process.exit(1);
}
const end = src.indexOf('];', start);
const registry = new Set([...src.slice(start, end).matchAll(/['"](attune_[a-z0-9_]+)['"]/g)].map(m => m[1]));

// Keys that are not user data. Each needs a reason.
const EXEMPT = {
  attune_dev_intimacy: 'developer toggle, not user data',
};

// Both quote styles: attune_portrait is written with double quotes, and a
// single-quote-only scan would have missed it.
const used = new Set([...src.matchAll(/localStorage\.\w+\(\s*['"](attune_[a-z0-9_]+)['"]/g)].map(m => m[1]));

const missing = [...used].filter(k => !registry.has(k) && !(k in EXEMPT)).sort();

if (missing.length) {
  console.error('[check-localstorage-keys] these keys are read or written but never cleared on sign-out:');
  for (const k of missing) console.error('  ' + k);
  console.error('Add each to USER_LOCALSTORAGE_KEYS in src/App.jsx, or to EXEMPT in this script with a reason.');
  process.exit(1);
}

const stale = [...registry].filter(k => !used.has(k)).sort();
console.log(`[check-localstorage-keys] ${registry.size} keys registered, ${used.size} used, all covered.`);
if (stale.length) console.log('  (registered but not referenced in App.jsx, harmless: ' + stale.join(', ') + ')');
