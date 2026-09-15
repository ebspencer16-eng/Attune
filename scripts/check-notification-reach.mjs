#!/usr/bin/env node
/**
 * An alert has to reach somebody.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Every alert kind the server can build lands on a screen in this app, and
 * tapping it goes somewhere the app has. Three things have to hold for that,
 * and each of them has been false at some point:
 *
 *   1. The copy exists and is complete: a title, a line, a destination.
 *   2. That destination resolves to a tab this app has. api/_lib/next-action.js
 *      decides it; the tabs are read out of the home screen's own route list.
 *      A kind that resolves to `external` opens the browser, which is the
 *      handoff this app was rebuilt to stop doing.
 *   3. Something serves them and something draws them. /api/home carries
 *      `alerts`, the home screen renders them, and tapping marks one read.
 *      For most of this product's life the table, the endpoint and the two
 *      client functions all existed and no screen called any of them.
 *
 * ── HOW IT CHECKS, WHICH IS THE PART THAT MATTERS ─────────────────────────
 * The first two run the real functions over the real kinds rather than
 * matching on names, so a kind renamed or a route retired fails here rather
 * than at a customer. The third is a source check, because a React Native
 * screen cannot be run from a build step, and it is written to survive the
 * obvious refactors: the payload field is found through the response object
 * whether it is named or spread, and the screen counts as drawing alerts if it
 * reads them off the response by any of the three ways this codebase writes
 * that.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether a kind is ever raised. api/_lib/notification-triggers.js records
 * that, and check-notification-triggers.mjs keeps the record current. A kind
 * with no caller is a product decision; a kind that cannot be read is a bug.
 */

import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');

const { notificationFor } = await import(`${ROOT}api/_lib/notifications.js`);
const { appTargetFor } = await import(`${ROOT}api/_lib/next-action.js`);

const fail = (msg) => { console.error(`[check-notification-reach] ${msg}`); process.exitCode = 1; };

// Every kind with copy, read from the switch rather than listed here.
const kinds = [...read('api/_lib/notifications.js').matchAll(/case\s+'([a-z0-9_]+)':/g)].map((m) => m[1]);
if (kinds.length < 2) fail('found no alert kinds in api/_lib/notifications.js');

// The tabs this app has, from the home screen's own list.
const home = read('attune-app/src/app/index.tsx');
const routeList = /APP_ROUTES\s*=\s*new Set\(\[([^\]]*)\]\)/.exec(home);
if (!routeList) fail('could not find APP_ROUTES in the home screen');
const routes = new Set([...(routeList?.[1] || '').matchAll(/'([^']+)'/g)].map((m) => m[1]));

for (const kind of kinds) {
  const alert = notificationFor(kind, { partnerName: 'Sam', postTitle: 'A post', dimensionLabel: 'Conflict' });
  if (!alert) { fail(`${kind}: notificationFor returned nothing`); continue; }
  if (!alert.title?.trim()) fail(`${kind}: no title`);
  if (!alert.body?.trim()) fail(`${kind}: no body`);
  if (!alert.deepLink) { fail(`${kind}: no destination`); continue; }

  const target = appTargetFor(alert.deepLink);
  if (target?.external) {
    fail(`${kind}: ${alert.deepLink} opens the website (${target.external}). An alert has to land in the app.`);
  } else if (!target?.route) {
    fail(`${kind}: ${alert.deepLink} resolves to no app destination at all`);
  } else if (!routes.has(target.route)) {
    fail(`${kind}: ${alert.deepLink} routes to ${target.route}, which is not a tab this app has`);
  }
}

// ── The two ends of the wire ───────────────────────────────────────────────
// Served. The field has to be inside the object /api/home answers with, not
// merely mentioned in the file, so a leftover variable does not read as a
// payload.
const homeApi = read('api/home.js');
// The success payload, which is the one `return json({` in that file carrying
// ok: true. Picking the first would find the 405, whose body is two fields.
/** Code, with the comments taken out. A word in a comment is not a field. */
const codeOnly = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l)).join('\n');

const payloads = [...homeApi.matchAll(/return json\(\{/g)]
  .map((m) => codeOnly(homeApi.slice(m.index, homeApi.indexOf('\n    });', m.index))))
  .filter((b) => /ok:\s*true/.test(b));
if (!payloads.length) fail('could not find the success payload in api/home.js');
// Named or spread; not "mentioned somewhere in the file". An earlier version
// of this line also passed on any spread at all, which made it blind: deleting
// the field entirely still matched, because the payload spreads something else.
if (!payloads.some((b) => /(^|[\s,{]|\.\.\.)alerts\s*[,:}]/.test(b))) {
  fail('/api/home does not return alerts. Nothing can draw what is not sent.');
}

// Drawn. Read off the response by any of the ways this codebase writes it.
const readsAlerts = /data[?.]*\.alerts|\balerts\s*=\s*\(?\s*data|\{[^}]*\balerts\b[^}]*\}\s*=\s*\(?\s*data/.test(home);
if (!readsAlerts) {
  fail('the home screen never reads alerts off the response. This is the bug the whole file is about.');
}
// The list itself is mapped, not merely some list within four hundred
// characters of the word. That looser version passed with the render replaced
// by an empty array, because another .map( sat nearby.
if (!/\balerts\s*\)?\s*\.\s*map\(|for\s*\([^)]*\bof\s+alerts\s*\)/.test(home)) {
  fail('the home screen reads alerts and never renders them.');
}
// Commented-out code is not code. The first version of this matched the
// comment that a plant made out of the call it was looking for.
const live = codeOnly(home);
if (!/markNotificationRead\s*\(/.test(live)) {
  fail('nothing marks an alert read, so every alert stays unread forever.');
}

if (!process.exitCode) {
  console.log(`[check-notification-reach] ${kinds.length} alert kinds, all with copy, all landing on a tab this app has, served and drawn.`);
}
