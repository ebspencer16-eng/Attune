#!/usr/bin/env node
/**
 * Is the app on her phone the app in this repo?
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * Ellie, on three app fixes: "Not seeing any difference here on my phone. I've
 * cleared the app 4 times." She was right and clearing was never going to help:
 * the last update on the production channel was ten app commits earlier, and I
 * had been reporting those fixes as done on evidence from a simulator.
 *
 * It happened again today in miniature. An update went out, then one more app
 * commit landed two minutes later, and the published bundle was already behind
 * by the time I said it was out.
 *
 * ── WHAT IT DOES ──────────────────────────────────────────────────────────
 * Asks Expo's update server, which is public and needs no login, when the
 * running bundle was published, and counts the commits touching attune-app/src
 * since then. That is the number of fixes that are in this repo and not on a
 * phone.
 *
 *   npm run app:published
 *
 * ── WHAT IT IS NOT ────────────────────────────────────────────────────────
 * Not a gate. It needs the network, and a build that fails because a laptop is
 * offline is the kind of check people learn to ignore. It answers a question,
 * out loud, when somebody asks it.
 *
 * A machine that cannot reach Expo says so, separately from an app that is
 * behind. Those are different answers and only one of them is about the code.
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;

const app = JSON.parse(readFileSync(`${ROOT}attune-app/app.json`, 'utf8'));
const projectId = app?.expo?.extra?.eas?.projectId;
const runtime = app?.expo?.runtimeVersion?.policy ? null : app?.expo?.runtimeVersion;

if (!projectId) {
  console.error('[app-published] attune-app/app.json names no EAS projectId, so there is nothing'
    + ' to ask. Refusing to guess.');
  process.exit(1);
}

const CHANNEL = process.argv[2] || 'production';
const RUNTIME = runtime || '1.0.0';

let manifest = null;
let reachError = null;
try {
  const res = await fetch(`https://u.expo.dev/${projectId}`, {
    headers: {
      'expo-platform': 'ios',
      'expo-runtime-version': RUNTIME,
      'expo-channel-name': CHANNEL,
      'expo-protocol-version': '1',
      accept: 'multipart/mixed',
    },
  });
  if (!res.ok) reachError = `the update server answered ${res.status}`;
  else {
    const body = await res.text();
    const at = /"createdAt"\s*:\s*"([^"]+)"/.exec(body);
    const id = /"id"\s*:\s*"([0-9a-f-]{36})"/.exec(body);
    if (!at) reachError = 'the update server answered with no manifest in it';
    else manifest = { createdAt: at[1], id: id?.[1] || null };
  }
} catch (e) {
  reachError = `could not reach the update server: ${String(e.message || e).slice(0, 80)}`;
}

if (reachError) {
  console.log(`[app-published] ${reachError}.`);
  console.log('  So there is no answer about what is published, which is not the same as the app'
    + ' being\n  behind. Nothing is claimed here about what is on a phone.');
  process.exit(0);
}

const since = execSync(
  `git log --since="${manifest.createdAt}" --format=%h%x09%s -- attune-app/src`,
  { cwd: ROOT, encoding: 'utf8' },
).trim();

const commits = since ? since.split('\n') : [];

console.log(`[app-published] channel ${CHANNEL}, runtime ${RUNTIME}`);
console.log(`  published  ${manifest.createdAt}${manifest.id ? `  (${manifest.id})` : ''}`);

if (!commits.length) {
  console.log('  Nothing has changed under attune-app/src since. The phone is up to date,'
    + ' two launches after it downloads.');
} else {
  console.log(`  ${commits.length} app commit(s) since, which are in this repo and not on a phone:`);
  for (const c of commits) console.log(`    ${c}`);
  console.log('\n  Publish them:  cd attune-app && npm run testflight:update');
  console.log('  Then two launches on the phone: the first downloads, the second runs it.');
}
