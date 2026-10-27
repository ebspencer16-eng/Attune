/**
 * Every catch around a database or network read, and what it leaves behind.
 *
 * ── THE SHAPE ─────────────────────────────────────────────────────────────
 * `api/cron-survey-nudge.js` answers 503 with "could not read who to leave
 * alone, so nothing was sent" when one read fails, and ten lines later had
 * `catch {}` with `users = []` after it, so the same kind of failure became
 * "nobody is due": nothing sent, ok: true, nobody any the wiser. Worse than a
 * silent failure elsewhere, because a nudge is time-windowed, so a missed run
 * is not retried, it is skipped for those people for ever.
 *
 * `check-admin-read-errors` holds the admin to three acceptable endings. This
 * asks the same question of everything else.
 *
 * ── WHAT COUNTS, AND WHY THE NUMBER IS SMALL ──────────────────────────────
 * A catch round `JSON.parse` or `localStorage` is a different question and
 * there are over a hundred of those. The signal is a catch whose try contains
 * a database read or a fetch, and whose body neither rethrows, nor answers an
 * error, nor records the failure. Those three endings are all acceptable and
 * the third is the best of them.
 *
 * ── WHAT IT CANNOT SEE ────────────────────────────────────────────────────
 * supabase-js RETURNS its error rather than throwing, so a read whose failure
 * is simply never tested has no catch at all and is invisible here. That is a
 * real and separate hole, and `check-admin-read-errors` is the thing that
 * looks for it in the admin. Said rather than implied.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const files = [];
const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) {
  if (e.isDirectory()) walk(join(d, e.name)); else if (e.name.endsWith('.js')) files.push(join(d, e.name)); } };
walk('api');

const READ = /\.from\(|rest\/v1\/|await fetch\(|\.select\(/;
/* A catch that does something about it: re-throws, answers, or records. */
const HANDLED = /throw|return|res\.|console\.(error|warn)|report|couldNotRead|push\(|\.set\(|status\s*=/;

let total = 0, silent = 0;
const findings = [];
for (const file of files) {
  if (/admin-/.test(file)) continue;            // check-admin-read-errors owns these
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/catch\s*(?:\(([^)]*)\))?\s*\{([\s\S]{0,300}?)\n\s*\}/g)) {
    const body = m[2];
    /* The try this catch belongs to: the 900 characters before it is a window,
       and a window is a guess, so anything it gets wrong is a false positive
       to be checked rather than a finding to be believed. */
    const before = src.slice(Math.max(0, m.index - 900), m.index);
    if (!READ.test(before)) continue;
    total++;
    if (HANDLED.test(body)) continue;
    silent++;
    findings.push({ file, line: src.slice(0, m.index).split('\n').length, body: body.trim().replace(/\s+/g, ' ').slice(0, 60) });
  }
}

console.log('[sweep-silent-read-failures]');
console.log(`  ${total} catch blocks sit round a read across ${files.length} files under api/, outside the admin.`);
console.log(`  ${silent} do nothing about it.`);
for (const f of findings) console.log(`    ${f.file}:${f.line}  catch { ${f.body} }`);
