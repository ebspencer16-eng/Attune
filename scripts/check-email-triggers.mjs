#!/usr/bin/env node
/**
 * The generated trigger map has to match the code it was generated from.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * api/_lib/email-triggers.js is what /email-preview reads to say how many
 * places send each email. If someone adds a send, or removes one, and the file
 * is not regenerated, the preview goes on describing the old world. Same shape
 * as check-flags.mjs and check-pkg-rules.mjs: a generated file, and a check
 * that regenerating changes nothing.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether an email should have a trigger. Five do not, and that is a decision
 * for Ellie, written up in TASKS.md rather than enforced here. This only says
 * the record is current.
 */

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;
const FILE = `${ROOT}api/_lib/email-triggers.js`;

const fresh = execFileSync('node', [`${ROOT}scripts/build-email-triggers.mjs`, '--print'], { encoding: 'utf8' });
const onDisk = readFileSync(FILE, 'utf8');

if (fresh !== onDisk) {
  console.error('[check-email-triggers] api/_lib/email-triggers.js is out of date.');
  console.error('A send was added or removed and the record was not regenerated.');
  console.error('Run: node scripts/build-email-triggers.mjs');
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

const { EMAIL_TRIGGERS } = await import(`${FILE}`);
const n = Object.values(EMAIL_TRIGGERS).reduce((a, v) => a + v.length, 0);
console.log(`[check-email-triggers] the record is current: ${Object.keys(EMAIL_TRIGGERS).length} email types, ${n} places that send one.`);
