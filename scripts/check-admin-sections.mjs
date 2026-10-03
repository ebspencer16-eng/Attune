#!/usr/bin/env node
/**
 * The admin's pages are one list, and both surfaces draw it.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Ellie: "Build admin into Carolina's and my apps as a button in settings...
 * Build a home page that has the left nav (in an insights menu style list)."
 *
 * That left nav is seventeen anchors in public/admin.html. The app needs the
 * same seventeen and cannot import from api/, so without this the labels would
 * be typed twice and the shorter list would win, which is the failure this
 * repo opens its own instructions with.
 *
 * api/_lib/admin-sections.js is the list. /api/home sends it to an admin, so
 * the app types none of it, and this holds the website's nav to the same list
 * in both directions: a page in the nav and not in the list, or in the list and
 * not in the nav.
 *
 * ── AND THE KEY IS AN ADDRESS ─────────────────────────────────────────────
 * The key is what `showPage()` takes and what the app opens as `/admin#<key>`.
 * A renamed key is a dead link from the app's menu, which is why the keys are
 * compared rather than only the labels.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether each page works. The outside sweep covers the endpoints; a page that
 * renders badly is not something a list can tell you about.
 *
 * The PIN. It is set on a device, lives in that phone's keychain, and is not in
 * this repo or on any server. There is nothing here to check, which is the
 * point: see the header of attune-app/src/components/admin.tsx for what that
 * lock is and is not.
 */

import { readFileSync } from 'node:fs';

import { ADMIN_SECTIONS } from '../api/_lib/admin-sections.js';

const ROOT = new URL('..', import.meta.url).pathname;
const fails = [];

if (!Array.isArray(ADMIN_SECTIONS) || ADMIN_SECTIONS.length < 5) {
  console.error('[check-admin-sections] api/_lib/admin-sections.js lists almost nothing.'
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

// ── The website's own nav ───────────────────────────────────────────────────
const html = readFileSync(`${ROOT}public/admin.html`, 'utf8');
const navAt = html.indexOf('<nav class="sb-nav">');
const navEnd = html.indexOf('</nav>', navAt);
if (navAt === -1 || navEnd === -1) {
  console.error('[check-admin-sections] public/admin.html has no <nav class="sb-nav">, which is'
    + ' the sidebar this compares against. Refusing to pass: a gate that has lost its subject'
    + ' must never report success.');
  process.exit(1);
}
const nav = html.slice(navAt, navEnd);
const navKeys = [...nav.matchAll(/showPage\('([a-z-]+)'\)/g)].map((m) => m[1]);

const listed = ADMIN_SECTIONS.map((s) => s.key);
const missing = navKeys.filter((k) => !listed.includes(k));
const extra = listed.filter((k) => !navKeys.includes(k));

if (missing.length) {
  fails.push(`public/admin.html's sidebar has ${missing.length} page(s) the list does not:`
    + ` ${missing.join(', ')}.\n`
    + '      The app draws its menu from the list, so these are pages only reachable from a'
    + ' laptop.');
}
if (extra.length) {
  fails.push(`api/_lib/admin-sections.js lists ${extra.length} page(s) the sidebar does not:`
    + ` ${extra.join(', ')}.\n`
    + "      The app's menu would offer a row that opens an address the admin does not answer.");
}

/* Every entry has words on it. A key with no label is a blank row in the menu. */
for (const s of ADMIN_SECTIONS) {
  if (!s.label || !s.label.trim()) {
    fails.push(`the section "${s.key}" has no label, so the app's menu draws an empty row.`);
  }
}

// ── The server sends it, and only to an admin ───────────────────────────────
{
  const home = readFileSync(`${ROOT}api/home.js`, 'utf8');
  if (!/adminSections:\s*isAdminAddress\([^)]*\)\s*\?\s*ADMIN_SECTIONS\s*:\s*null/.test(home)) {
    fails.push('api/home.js does not send ADMIN_SECTIONS to an admin and null to everyone else.\n'
      + '      Matched on the whole conditional rather than the name: sending it to everybody is'
      + '\n      a map of a surface they have no business knowing the shape of.');
  }
}

// ── And the app types none of it ────────────────────────────────────────────
{
  const admin = readFileSync(`${ROOT}attune-app/src/components/admin.tsx`, 'utf8');
  const code = admin.replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n');
  for (const s of ADMIN_SECTIONS) {
    if (code.includes(`'${s.label}'`) || code.includes(`"${s.label}"`)) {
      fails.push(`attune-app/src/components/admin.tsx writes out "${s.label}", which the server`
        + ' sends. One of the two will be edited and the other will not.');
    }
  }
  if (!/sections\.map\(/.test(code)) {
    fails.push("attune-app/src/components/admin.tsx does not draw the sections it is handed."
      + ' Refusing to pass: a gate that has lost its subject must never report success.');
  }
  /* The code never leaves the phone. Checked because it is the one thing here
     that would be a real mistake rather than a drifted label. */
  if (/fetch\([^)]*pin|pin[^\n]{0,40}(body|JSON\.stringify)/i.test(code)) {
    fails.push('attune-app/src/components/admin.tsx looks like it sends the code somewhere. It is'
      + " a lock on a device and belongs in that phone's keychain and nowhere else.");
  }
}

if (fails.length) {
  console.error('\n check-admin-sections: the admin is two different lists of pages.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log(`[check-admin-sections] ${ADMIN_SECTIONS.length} admin pages: the website's sidebar`
  + ' and the list agree, the server sends it only to an admin, and the app writes none of it down.');
