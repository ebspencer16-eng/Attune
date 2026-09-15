#!/usr/bin/env node
/**
 * Nobody outside can make this product send mail.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Two endpoints take a recipient out of the request body and send branded mail
 * from our own domain to it: api/send-email.js and api/send-order-email.js.
 * Either one, left open, is a machine for sending convincing fake receipts and
 * password-shaped messages under the Attune name, and the cost lands on the
 * sending domain's reputation as well as on whoever receives them.
 *
 * So both have to refuse: a request with no Origin and no internal secret, and
 * a request whose Origin merely contains our domain rather than being it.
 * api/send-order-email.js failed both of those in production until this gate
 * was written. curl with no headers reached its body parser and answered 200.
 *
 * ── HOW IT CHECKS, WHICH IS THE PART THAT MATTERS ─────────────────────────
 * It runs the handlers. A gate that matched on the guard's source would pass
 * the moment someone moved the guard below the send, which is the shape that
 * has gone wrong here before: check-open-writes was blind for exactly that
 * reason until the write could actually happen.
 *
 * So fetch is stubbed and counted, and the credentials are present. A refusal
 * has to be a 403 AND have sent nothing. An allowed caller has to get past the
 * guard, which is what proves the refusals are the guard doing its job rather
 * than the handler being broken for everyone.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The rest of each handler: which template, which fields, whether the links
 * point at us. check-email-links.mjs covers the URLs. This is only about who
 * is allowed to ask.
 */

process.env.RESEND_API_KEY ||= 'test-key';
process.env.FROM_EMAIL ||= 'hello@attune-relationships.com';
process.env.INTERNAL_API_SECRET = 'internal-secret-for-the-test';

const ROOT = new URL('..', import.meta.url).pathname;
const SECRET = process.env.INTERNAL_API_SECRET;

// Both the real origin and the lookalike are derived from the one place the
// site's address is written down. check-site-origin.mjs fails a build that
// types either of them out, and it is right to: the fallback that disagreed
// with itself for months existed in five files exactly like this one.
const { SITE_URL } = await import(`${ROOT}api/_lib/site.js`);
const APEX = new URL(SITE_URL).hostname.replace(/^www\./, '');

let sent = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).includes('resend.com')) { sent++; return new Response('{"id":"stub"}', { status: 200 }); }
  return realFetch(url, init);
};

const handlers = {
  'api/send-email.js': {
    body: { type: 'partner_invite', toEmail: 'someone@example.com', name: 'Sam', inviteUrl: 'https://www.attune-relationships.com/app' },
  },
  'api/send-order-email.js': {
    body: {
      pkgKey: 'core', pkgName: 'Core', buyerName: 'Sam', buyerEmail: 'someone@example.com',
      orderNum: 'A-1', total: 149, lineItems: [{ name: 'Core', price: 149 }],
    },
  },
};

/** Every way of asking, and whether it may be answered. */
const cases = [
  { label: 'no Origin, no secret', headers: {}, allowed: false },
  { label: 'a hostile lookalike origin', headers: { origin: `https://${APEX}.evil.com` }, allowed: false },
  { label: 'someone else\'s Vercel preview', headers: { origin: 'https://evil.vercel.app' }, allowed: false },
  { label: 'our domain as a path, not a host', headers: { origin: `https://evil.com/${APEX}` }, allowed: false },
  { label: 'the real site', headers: { origin: SITE_URL }, allowed: true },
  { label: 'our own server with the secret', headers: { 'x-attune-internal': SECRET }, allowed: true },
];

let failed = 0;
const fail = (msg) => { console.error(`  FAIL  ${msg}`); failed++; };

for (const [file, { body }] of Object.entries(handlers)) {
  const { default: handler } = await import(`${ROOT}${file}`);
  for (const c of cases) {
    sent = 0;
    const req = new Request(SITE_URL + file.replace('api', '/api').replace('.js', ''), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...c.headers },
      body: JSON.stringify(body),
    });
    let status;
    try { status = (await handler(req)).status; }
    catch (e) { fail(`${file}: ${c.label} threw ${e?.message}`); continue; }

    if (c.allowed) {
      if (status === 403) fail(`${file}: ${c.label} was refused. The guard is refusing its own callers.`);
    } else {
      if (status !== 403) fail(`${file}: ${c.label} answered ${status}, not 403.`);
      if (sent) fail(`${file}: ${c.label} was refused and still sent ${sent} email(s). The guard is below the send.`);
    }
  }
}

if (failed) {
  console.error(`[check-mail-origin] ${failed} way(s) in.`);
  process.exit(1);
}
console.log(`[check-mail-origin] ${Object.keys(handlers).length} mail endpoints, ${cases.length} ways of asking each: the four outside ones refused before anything was sent.`);
