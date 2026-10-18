#!/usr/bin/env node
/**
 * Nothing personal reaches a log.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Published, in the retention table on /legal:
 *
 *   "Technical logs used for debugging and security monitoring. Automatically
 *    purged after 90 days. Logs contain IP addresses, timestamps, and request
 *    metadata but do not contain assessment response content."
 *
 * ── WHAT A SWEEP FOUND ────────────────────────────────────────────────────
 * No assessment content anywhere, so the promise as written was kept. The
 * softer version was not: five console lines printed a customer's email
 * address, and two printed an email subject, two of which carry the
 * customer's first name ("Set up your Attune account, Dana"). None of it was
 * needed to debug a failed send, and all of it was being kept for ninety days
 * in a place nobody thinks about.
 *
 * ── WHAT THIS CHECKS ──────────────────────────────────────────────────────
 * Every console line under api/, by what it would PRINT rather than by the
 * words in its message. A literal string is not a finding; an interpolated
 * or passed value named like an address, a name, an answer column or a
 * credential is, unless it goes through api/_lib/log-redact.js.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * An error object. `e?.message` can carry anything a library chose to put in
 * it, and a check that forbade logging errors would be traded for silence on
 * every failure. The provider's error BODY is covered, because that is ours
 * to shape: providerError() takes the name and the message and leaves the
 * echo of what we sent.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

const ANSWERS = /\b(ex1_answers|ex2_answers|ex3_answers|intimacy_data|conflict_data|answers|responses)\b/;
const IDENTITY = /\b(email|buyerEmail|partnerEmail|toEmail|recipientEmail|buyerName|partner_name|pronouns|subject)\b/;
const SECRET = /\b(accessToken|serviceKey|apikey|apiKey|password|signature|CRON_SECRET|ADMIN_SECRET|token)\b/;
const REDACTED = /\b(redactEmail|redactEmails|providerError)\s*\(/;

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (!/node_modules/.test(name)) walk(p); continue; }
    if (/\.(js|mjs)$/.test(name)) files.push(p);
  }
}(join(ROOT, 'api')));

const fails = [];
let lines = 0;

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const rel = file.slice(ROOT.length);
  const text = src.split('\n');
  text.forEach((line, i) => {
    const m = line.match(/console\.(log|warn|error|info)\s*\(([\s\S]*)$/);
    if (!m) return;
    /**
     * To the closing parenthesis, by counting brackets. Matching to a line
     * that ENDS in `);` misses every one of these that sits inside a catch on
     * one line, and then swallows the next six lines of unrelated code: the
     * first version of this reported a log line as printing answers that it
     * does not mention.
     */
    let call = m[2];
    let depth = 1 + (call.match(/\(/g) || []).length - (call.match(/\)/g) || []).length;
    let j = i;
    while (depth > 0 && j + 1 < text.length && j - i < 8) {
      j += 1;
      call += '\n' + text[j];
      depth += (text[j].match(/\(/g) || []).length - (text[j].match(/\)/g) || []).length;
    }

    lines += 1;
    /* What is printed, not what is said: string literals are the message. */
    const printed = [
      ...[...call.matchAll(/\$\{([^}]*)\}/g)].map((x) => x[1]),
      ...call.replace(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g, ' ').split(','),
    ].join(' ');
    const safe = printed.replace(/\b(redactEmail|redactEmails|providerError)\s*\([^)]*\)/g, ' ');
    const where = `${rel}:${i + 1}  ${line.trim().slice(0, 96)}`;
    if (ANSWERS.test(safe)) fails.push(`${where}\n      prints an answer set. This is the published promise, word for word.`);
    else if (SECRET.test(safe)) fails.push(`${where}\n      prints a credential.`);
    else if (IDENTITY.test(safe) && !REDACTED.test(call)) {
      fails.push(`${where}\n      prints something that identifies a person. api/_lib/log-redact.js has`
        + '\n      redactEmail, redactEmails and providerError; a log needs the domain and the fault.');
    }
  });
}

if (lines < 50) {
  console.error(`[check-log-privacy] only ${lines} console lines found under api/. Refusing to pass.`);
  process.exit(1);
}

if (fails.length) {
  console.error('[check-log-privacy] a log line carries something personal:');
  for (const f of fails) console.error(`  ✗ ${f}`);
  process.exit(1);
}

console.log(`[check-log-privacy] ${lines} console lines under api/, across ${files.length} files;`
  + ' none prints an answer, a credential, or anything that identifies a person.');
