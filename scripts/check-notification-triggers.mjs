#!/usr/bin/env node
/**
 * The generated alert-trigger map has to match the code it came from.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * api/_lib/notification-triggers.js is the written record of which alert kinds
 * anything raises. It exists because five of the six were unreachable for
 * months and nothing said so. If a caller is added or removed and the record
 * is not regenerated, the record goes on describing the old world and the gap
 * becomes invisible again.
 *
 * Same shape as check-email-triggers.mjs, check-flags.mjs and
 * check-pkg-rules.mjs: a generated file, and a check that regenerating it
 * changes nothing.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether a kind SHOULD have a caller. Two have none, both on purpose and both
 * for the same reason: the home screen already raises a card for an unread
 * post and a card for results that are ready, and an alert saying the same
 * thing would put one prompt on that screen twice. Those are product
 * decisions, written up in TASKS.md, not rules for a gate.
 *
 * Nor does it check that an alert reaches anyone. check-notification-reach.mjs
 * does that, from the other end.
 */

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;
const FILE = `${ROOT}api/_lib/notification-triggers.js`;

const fresh = execFileSync('node', [`${ROOT}scripts/build-notification-triggers.mjs`, '--print'], { encoding: 'utf8' });
const onDisk = readFileSync(FILE, 'utf8');

if (fresh !== onDisk) {
  console.error('[check-notification-triggers] api/_lib/notification-triggers.js is out of date.');
  console.error('A caller was added or removed and the record was not regenerated.');
  console.error('Run: node scripts/build-notification-triggers.mjs');
  const a = onDisk.split('\n');
  const b = fresh.split('\n');
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      console.error(`\n  line ${i + 1}`);
      console.error(`    on disk:    ${a[i] ?? '(nothing)'}`);
      console.error(`    generated:  ${b[i] ?? '(nothing)'}`);
      break;
    }
  }
  process.exit(1);
}

const { NOTIFICATION_TRIGGERS, RAISED_KINDS, UNRAISED_KINDS } = await import(FILE);
const n = Object.values(NOTIFICATION_TRIGGERS).reduce((a, v) => a + v.length, 0);
console.log(
  `[check-notification-triggers] the record is current: ${RAISED_KINDS.length} of `
  + `${Object.keys(NOTIFICATION_TRIGGERS).length} kinds raised from ${n} places`
  + (UNRAISED_KINDS.length ? `, none for ${UNRAISED_KINDS.join(', ')}.` : '.'));
