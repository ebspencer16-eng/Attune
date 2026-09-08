// Fails the build when the app's provider list and the server's disagree, or
// when either surface offers Google without Apple.
//
// Two rules, both of which have a real cost when broken.
//
// The first is the usual one on this project: the app cannot import from
// api/_lib, so its list is written out by hand. That is a second copy of a
// rule, which is how every serious bug here has started. The app's copy is
// allowed to exist because the sign-in screen must not depend on a network
// call to know what buttons to draw; this gate is the price of that.
//
// The second is App Store Review Guideline 4.8: Sign in with Apple has to be
// offered wherever a third-party login is. A build that ships Google alone is
// rejected, and nothing else in the repo would catch it.

import { readFileSync } from 'fs';
import { OAUTH_PROVIDER_IDS } from '../api/_lib/auth-providers.js';

const problems = [];

const appAuth = readFileSync(new URL('../attune-app/src/api/auth.ts', import.meta.url), 'utf8');
const listed = appAuth.match(/export const OAUTH_PROVIDERS = \[([\s\S]*?)\] as const;/);
if (!listed) {
  problems.push('attune-app/src/api/auth.ts no longer exports an OAUTH_PROVIDERS array.');
} else {
  const appIds = [...listed[1].matchAll(/id:\s*'([a-z]+)'/g)].map((m) => m[1]);
  if (appIds.join(',') !== OAUTH_PROVIDER_IDS.join(',')) {
    problems.push(
      `the app offers [${appIds.join(', ')}] and the server offers ` +
      `[${OAUTH_PROVIDER_IDS.join(', ')}]. They must match, in the same order.`);
  }
}

if (!OAUTH_PROVIDER_IDS.includes('apple') && OAUTH_PROVIDER_IDS.includes('google')) {
  problems.push('Google is offered without Apple. Guideline 4.8 rejects that build.');
}

// The website draws its row from the shared list rather than its own array.
const web = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
if (!/OAUTH_PROVIDERS\.map/.test(web)) {
  problems.push('src/App.jsx no longer maps OAUTH_PROVIDERS; it is restating the list.');
}
for (const id of OAUTH_PROVIDER_IDS) {
  if (!new RegExp(`signInWithOAuth[\\s\\S]{0,400}provider`).test(web)) {
    problems.push('src/App.jsx does not call signInWithOAuth.');
    break;
  }
}

if (problems.length) {
  console.error('[check-oauth-providers] provider lists disagree:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(`[check-oauth-providers] ${OAUTH_PROVIDER_IDS.join(' and ')} offered on both surfaces.`);
