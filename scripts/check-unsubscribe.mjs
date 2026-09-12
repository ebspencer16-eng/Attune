// Fails the build when a scheduled email to a customer carries no way out.
//
// ── THE PROMISE ────────────────────────────────────────────────────────────
// If a sender picks its recipients by querying the profiles table, the mail
// it sends is lifecycle mail: nobody asked for that particular message on
// that particular day. Every one of those must carry an unsubscribe link.
//
// api/cron-checkin.js and api/cron-survey-nudge.js both did this on a
// schedule, to real customers, with a footer offering a reply address and
// nothing else. Both already honoured profiles.email_opt_in, so the
// preference worked once it was set. What was missing was any way to set it
// from the email that prompted the thought.
//
// ── WHAT THIS DELIBERATELY DOES NOT COVER ──────────────────────────────────
// Transactional mail. api/send-order-email.js replies to a purchase, and
// api/send-feedback.js and the digest crons write to Attune's own inbox.
// Those are out of scope here, not because a link would be wrong (the order
// email carries one) but because the rule that catches the real bug is about
// mail the recipient did not trigger. Widening this to "all mail" would make
// it fire on the digests, and a gate that fires on things that are fine is a
// gate people switch off.
//
// ── WHY IT CHECKS THE ID AND NOT JUST THE LINK ─────────────────────────────
// unsubscribeLink() with nothing passed returns a mailto, silently. That is
// the shape of this codebase's most common bug: a link is present, the build
// is green, and the thing it points at is not the thing anyone meant. So the
// id has to be selected from profiles and it has to reach the template.
//
// The template builders are called through a variable in one file
// (runPass(..., nudgeHtml) binds it to htmlFn), so this resolves one hop of
// that indirection. Two hops would not be caught; nothing in the tree does
// two hops today, and this comment is where to start if one ever does.

import { readFileSync, readdirSync } from 'fs';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (f) => readFileSync(`${ROOT}${f}`, 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** The helpers that produce the link. Derived, so a rename cannot blind this. */
const HELPERS = [...read('api/_lib/email-footer.js').matchAll(/export function (\w+)/g)]
  .map((m) => m[1]);
if (!HELPERS.length) {
  console.error('[check-unsubscribe] api/_lib/email-footer.js exports nothing. Refusing to pass.');
  process.exit(1);
}

/** Lifecycle senders: they choose who to mail by reading profiles. */
const SENDERS = readdirSync(`${ROOT}api`)
  .filter((f) => f.endsWith('.js'))
  .filter((f) => {
    const s = strip(read(`api/${f}`));
    const sends = /resend\.com/.test(s);
    const picksFromProfiles = /rest\/v1\/profiles\?select=[^`'"]*\bemail\b/.test(s);
    return sends && picksFromProfiles;
  });

if (!SENDERS.length) {
  console.error('[check-unsubscribe] found no sender that picks recipients from profiles.');
  console.error('  Two existed when this was written. Either the query shape changed or');
  console.error('  the detection did; this gate is blind until that is resolved.');
  process.exit(1);
}

const problems = [];

for (const f of SENDERS) {
  const src = strip(read(`api/${f}`));
  const where = `api/${f}`;

  // 1. The link is reachable at all.
  const usesHelper = HELPERS.filter((h) => new RegExp(`\\b${h}\\s*\\(`).test(src));
  const literal = /\/api\/unsubscribe/.test(src);
  if (!usesHelper.length && !literal) {
    problems.push(`${where} mails customers on a schedule with no unsubscribe link.`);
    continue;
  }

  // 2. There is an id to encode.
  const selects = [...src.matchAll(/rest\/v1\/profiles\?select=([a-z_,]+)/g)].map((m) => m[1].split(','));
  if (selects.length && !selects.every((cols) => cols.includes('id'))) {
    problems.push(`${where} selects from profiles without id, so the link cannot identify anyone.`);
  }

  // 3. Nothing calls the helper empty. That returns a mailto and says nothing.
  for (const h of usesHelper) {
    if (new RegExp(`\\b${h}\\s*\\(\\s*\\)`).test(src)) {
      problems.push(`${where} calls ${h}() with no id. That silently degrades to a mailto.`);
    }
  }

  // 4. The id reaches the template. Find the function whose body holds the
  //    helper call, then check every call of that function supplies the id.
  for (const h of usesHelper) {
    const argName = (src.match(new RegExp(`\\b${h}\\s*\\(\\s*([A-Za-z_$][\\w$]*)`)) || [])[1];
    if (!argName) continue;

    for (const m of src.matchAll(/function\s+(\w+)\s*\(([^)]*)\)\s*\{/g)) {
      const [, name, params] = m;
      const bodyAt = src.indexOf('{', m.index + m[0].length - 1);
      const body = src.slice(m.index, matchingClose(src, bodyAt));
      if (!new RegExp(`\\b${h}\\s*\\(`).test(body)) continue;

      const destructured = params.trim().startsWith('{');
      const names = aliasesOf(src, name);
      for (const callee of names) {
        for (const call of callSites(src, callee, m.index)) {
          const ok = destructured
            ? new RegExp(`\\b${argName}\\s*:`).test(call) || new RegExp(`\\b${argName}\\b\\s*[,}]`).test(call)
            : call.split(',').length >= params.split(',').length;
          if (!ok) {
            problems.push(
              `${where}: ${callee}(...) does not pass ${argName}, so ${h}() gets undefined\n`
              + `      and the email goes out with a mailto where the link should be.`);
          }
        }
      }
    }
  }
}

/**
 * Index just past the delimiter closing the one at `open`, for whichever pair
 * that character opens. It counted only braces once, and was handed a paren by
 * one caller: every call site's arguments then ran to the end of the file and
 * every arity test passed on unmodified code.
 */
function matchingClose(s, open) {
  const PAIRS = { '(': ')', '[': ']', '{': '}' };
  const o = s[open];
  const c = PAIRS[o];
  if (!c) return s.length;
  let d = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === o) d++;
    else if (s[i] === c && --d === 0) return i + 1;
  }
  return s.length;
}

/** The name itself, plus one hop: a parameter it is passed to as a bare value. */
function aliasesOf(src, name) {
  const out = new Set([name]);
  for (const m of src.matchAll(new RegExp(`(\\w+)\\s*\\(([^()]*\\b${name}\\b[^()]*)\\)`, 'g'))) {
    const [, callee, args] = m;
    if (callee === name) continue;
    const idx = splitArgs(args).findIndex((a) => a.trim() === name);
    if (idx < 0) continue;
    const decl = src.match(new RegExp(`function\\s+${callee}\\s*\\(([^)]*)\\)`));
    if (decl) {
      const p = splitArgs(decl[1])[idx];
      if (p) out.add(p.trim());
    }
  }
  return [...out];
}

/** Argument text of each call to `callee`, skipping the declaration at `declAt`. */
function callSites(src, callee, declAt) {
  const out = [];
  for (const m of src.matchAll(new RegExp(`\\b${callee}\\s*\\(`, 'g'))) {
    if (m.index === declAt || src.slice(Math.max(0, m.index - 10), m.index).includes('function ')) continue;
    const open = m.index + m[0].length - 1;
    out.push(src.slice(open + 1, matchingClose(src, open) - 1));
  }
  return out;
}

function splitArgs(s) {
  const out = [];
  let d = 0, cur = '';
  for (const c of s) {
    if ('([{'.includes(c)) d++;
    if (')]}'.includes(c)) d--;
    if (c === ',' && d === 0) { out.push(cur); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

if (problems.length) {
  console.error('[check-unsubscribe] scheduled mail with no way out:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(`[check-unsubscribe] ${SENDERS.length} lifecycle senders; every one carries an unsubscribe link with a real id.`);
