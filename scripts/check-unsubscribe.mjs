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
// ── WHY IT RENDERS RATHER THAN READS ───────────────────────────────────────
// This used to trace the id statically: find the function holding the helper
// call, then check every call site passes the id, resolving one hop of
// indirection. It worked until both crons started building their mail through
// an exported map, where the context is spread into the template rather than
// named at the call. The arguments were still there and still correct, and the
// gate reported both as broken.
//
// That is the failure CLAUDE.md names: a gate matching on a literal shape is
// blind to the same thing reached through a registry. The answer here is not a
// cleverer matcher. Every lifecycle email is now built by a named function
// with a sample body, so the gate renders each one and looks for the actual
// link, with the actual id encoded in it. A spread cannot fool that, and
// neither can a rename.

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



// ── 5. Render every lifecycle email and look for the link ──────────────────
// Derived rather than listed: each lifecycle sender has to export a map of
// email builders, and every entry in it has to have a sample to render with.
// A new scheduled email that skips either is a build failure, which is the
// point: the way this bug happens is someone adding a sender and not thinking
// about the footer.
const { CRON_SAMPLES, SAMPLE_USER_ID } = await import(`${ROOT}api/_lib/email-samples.js`);
const { unsubscribeUrl } = await import(`${ROOT}api/_lib/email-footer.js`);
const expected = unsubscribeUrl(SAMPLE_USER_ID);

/** One profile row, shaped the way both crons select them. */
const ROW = { id: SAMPLE_USER_ID, email: 'maya@example.com', name: 'Maya', partner_name: 'Alex' };

let rendered = 0;
for (const f of SENDERS) {
  const mod = await import(`${ROOT}api/${f}`);
  const maps = Object.entries(mod).filter(([k, v]) =>
    k.endsWith('_EMAILS') && v && typeof v === 'object');
  if (typeof mod.EMAIL_CONTEXT !== 'function') {
    problems.push(
      `api/${f} sends on a schedule and exports no EMAIL_CONTEXT, so nothing here can\n`
      + `      turn a profile row into the email it would receive.`);
    continue;
  }
  if (!maps.length) {
    problems.push(
      `api/${f} sends on a schedule and exports no map of email builders, so nothing\n`
      + `      here can render what it sends. Export one, the way cron-checkin.js does.`);
    continue;
  }
  for (const [mapName, map] of maps) {
    for (const [key, build] of Object.entries(map)) {
      if (!CRON_SAMPLES[key]) {
        problems.push(`api/${f}: ${mapName}.${key} has no sample in CRON_SAMPLES, so it cannot be previewed.`);
      }
      // Rendered from the sender's own context builder, not from the sample,
      // so this covers the whole path: a profile row goes in and the link that
      // comes out has to carry that row's id.
      const html = String(build(mod.EMAIL_CONTEXT(ROW, true)).html || '');
      rendered++;
      if (!html.includes(expected)) {
        problems.push(
          `api/${f}: ${mapName}.${key} renders without ${expected}.\n`
          + `      Either the link is missing or the id never reached it, which is the\n`
          + `      same thing to the person reading the email.`);
      }
    }
  }
}

if (problems.length) {
  console.error('[check-unsubscribe] scheduled mail with no way out:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(`[check-unsubscribe] ${SENDERS.length} lifecycle senders, ${rendered} emails rendered; every one carries an unsubscribe link with a real id.`);
