/**
 * Who is allowed to make this server send an email.
 *
 * ── WHY IT IS A FILE AND NOT A FEW LINES IN A HANDLER ─────────────────────
 * It was a few lines in a handler, twice, and the two did not agree. Both
 * api/send-email.js and api/send-order-email.js have to answer "is this caller
 * one of ours", because both take a recipient from the request body and send
 * branded mail from our own domain to it. send-email was tightened after the
 * hole was found in it. send-order-email kept the version that hole was found
 * in, and was still open months later:
 *
 *   if (origin && !origin.includes('attune-relationships.com') && ...)
 *
 * Two things wrong with that, and both were fixed in the other copy and not
 * this one. A request with no Origin header skipped the guard entirely, which
 * is every request that is not a browser, so curl could make us send anybody a
 * branded order confirmation with any name, any total and any order number on
 * it. And `includes` on the whole origin string matches a host that merely
 * ends with ours, of the shape `our-domain.example.evil`, because that string
 * does contain ours. `includes('vercel.app')` trusted every Vercel deployment
 * in existence.
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────
 * A browser request has to come from an origin whose HOSTNAME is one of ours.
 * A request with no Origin has to carry the internal secret, compared without
 * leaking its length through timing. If the secret is unset we refuse rather
 * than falling back to open, because the failure mode of the other choice is
 * an open relay that looks like it is working.
 *
 * Origin is sent by browsers on every POST, same-origin included, so requiring
 * it costs a real caller nothing.
 */

import { SITE_URL } from './site.js';

/**
 * Our own hostname, apex form, from the one place the site's address lives.
 * Written out by hand in the copy this replaced, which is how a rule about
 * which domain is ours ends up with two answers.
 */
const APEX = new URL(SITE_URL).hostname.replace(/^www\./, '');

/** Is this origin one of ours? Compared by hostname, never by substring. */
export function originAllowed(origin) {
  try {
    const host = new URL(origin).hostname;
    return host === APEX
        || host.endsWith(`.${APEX}`)
        || host === 'localhost' || host === '127.0.0.1'
        // Preview deployments only, not any *.vercel.app someone can create.
        || /^attune[a-z0-9-]*\.vercel\.app$/.test(host);
  } catch { return false; }
}

/** Constant-time string compare, so a secret does not leak by how long a
 *  comparison takes. */
export function timingSafeCompare(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * The guard itself.
 *
 * @returns {Response|null} a 403 to return, or null to carry on. Returning the
 * refusal rather than throwing keeps the call site one line and keeps the
 * decision here, where the reasons are written down.
 */
export function guardMailOrigin(req) {
  const forbidden = new Response('Forbidden', { status: 403 });
  const origin = req.headers.get('origin') || '';

  if (origin) return originAllowed(origin) ? null : forbidden;

  const internalSecret = process.env.INTERNAL_API_SECRET || '';
  const presented = req.headers.get('x-attune-internal') || '';
  const ok = internalSecret && presented
    && presented.length === internalSecret.length
    && timingSafeCompare(presented, internalSecret);
  return ok ? null : forbidden;
}
