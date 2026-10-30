#!/usr/bin/env node
/**
 * check-app-write-results: an app write whose answer nobody reads is a receipt.
 *
 * The app's version of the contact form (A201): a write sent, the answer
 * dropped, and the screen behaving as though it worked. A202 found four:
 *   - deleting a journal entry, and deleting a note from the margin, both
 *     took the row off the screen and never asked whether the server did, so
 *     a failed delete brought it back on the next load with nothing said;
 *   - the daily-push picker showed the new time while the old one went on
 *     arriving;
 *   - turning notifications off recorded "off" whatever the server said, so
 *     they kept coming.
 *
 * The write functions are found, not listed: every export from
 * attune-app/src/api/client.ts whose body sends POST, PATCH, PUT or DELETE.
 * A call to one of them as a bare statement, `void x()`, or `.catch(...)` with
 * no `.then` that reads the answer, fails, unless it is a RECEIPT below: a
 * write where the person is told nothing either way and nothing they see
 * depends on it. Each carries its reason, so adding one is a decision.
 *
 * Planted: the journal delete back to a bare call, the daily-push `.then`
 * back to `.catch`, and turnPushOff back to ignoring its save. All fail it.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const APP = join(ROOT, 'attune-app/src');
const client = readFileSync(join(APP, 'api/client.ts'), 'utf8');

const writes = [];
for (const m of client.matchAll(/export (?:async )?function (\w+)\s*(?:<[^>]*>)?\(/g)) {
  const rest = client.slice(m.index + m[0].length);
  const next = rest.search(/\nexport /);
  const body = rest.slice(0, next < 0 ? 4000 : next);
  if (/method:\s*'(POST|PATCH|PUT|DELETE)'/.test(body)) writes.push(m[1]);
}

/**
 * file:function -> [how many calls, why nobody needs the answer]. Counted,
 * because excusing a function for a whole file let a second, different call
 * of it in the same file through: the plant that put turnPushOff back to
 * ignoring its save passed until this was a number.
 */
const RECEIPTS = {
  'app/index.tsx:markNotificationRead': [1, 'a read receipt; the alert row closes either way and a miss shows it again next load'],
  'app/notes.tsx:openSharedNote': [1, 'a read receipt for a shared note; the badge is adjusted locally and corrected by the next load'],
  'components/post-reader.tsx:markPostRead': [1, 'a read receipt for an article'],
  'components/budget.tsx:markEditing': [2, 'a presence hint for the partner ("editing now"), set on focus and cleared on blur; nothing is saved by it'],
  'hooks/use-screen-time.ts:trackScreenTime': [1, 'analytics timing; never shown to anybody'],
  'api/push.ts:savePushToken': [1, 'only the first-denial report: iOS has already refused notifications, so nothing can arrive whatever the server records'],
};

const files = [];
const walk = (d) => { for (const e of readdirSync(d)) { const p = join(d, e); if (statSync(p).isDirectory()) walk(p); else if (/\.tsx?$/.test(e)) files.push(p); } };
walk(APP);

const fails = [];
const used = new Set();
const seen = {};
let calls = 0;
for (const f of files) {
  if (f.endsWith('api/client.ts')) continue;
  const rel = f.slice(APP.length + 1);
  const src = readFileSync(f, 'utf8');
  for (const name of writes) {
    for (const m of src.matchAll(new RegExp(`(^|[\\n;{}]\\s*|=>\\s*\\{\\s*|\\bif\\s*\\([^)\\n]*\\)\\s*|\\belse\\s+)(await\\s+|void\\s+)?${name}\\(`, 'g'))) {
      // Statement position only, a braced arrow body included. An assignment,
      // a return, or an unbraced arrow (`() => x()`, which returns the call)
      // hands the answer to something that can read it.
      calls++;
      let i = m.index + m[0].length, depth = 1;
      while (i < src.length && depth > 0) { if (src[i] === '(') depth++; else if (src[i] === ')') depth--; i++; }
      const tail = src.slice(i, i + 80);
      // `.then((r) => ...)` or `.then(handler)`: either way something is given
      // the answer. `.then(() => ...)` is given nothing.
      if (/^\s*\.then\(\s*(\(?\s*\w+\s*\)?\s*=>|[A-Za-z_$][\w$]*\s*\))/.test(tail) && !/^\s*\.then\(\s*\(\)/.test(tail)) continue;
      const key = `${rel}:${name}`;
      if (RECEIPTS[key] && (seen[key] = (seen[key] || 0) + 1) <= RECEIPTS[key][0]) { used.add(key); continue; }
      const line = src.slice(0, m.index + m[0].length).split('\n').length;
      fails.push(`attune-app/src/${rel}:${line} calls ${name}() and never reads whether it worked. If the screen changes as though it did, a failure is hidden; if it is a receipt, add it to RECEIPTS with the reason.`);
    }
  }
}
for (const [k, [n]] of Object.entries(RECEIPTS)) if ((seen[k] || 0) < n) fails.push(`RECEIPTS excuses ${n} call(s) for ${k} and finds ${seen[k] || 0}. Lower the count or delete the entry: an excuse nobody rechecks is how a real gap hides.`);
if (writes.length < 15) fails.push(`Found ${writes.length} write functions in client.ts; there are over twenty. The scan has lost its subject.`);

if (fails.length) {
  console.error('[check-app-write-results] ' + fails.length + ' problem(s):');
  for (const x of fails) console.error('  ' + x);
  process.exit(1);
}
console.log(`[check-app-write-results] ${writes.length} write functions, ${calls} calls in statement position: each reads its answer or is one of ${used.size} named receipts.`);
