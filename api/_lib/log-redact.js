/**
 * What a log line may say about a person.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * The published retention policy says system logs hold "IP addresses,
 * timestamps, and request metadata" and no assessment content. That promise
 * holds, and a sweep of every console line under api/ found the softer
 * version of the problem: five of them printed an address, and two printed an
 * email subject that carries the customer's first name ("Set up your Attune
 * account, Dana").
 *
 * Nothing here is assessment content, and none of it was ever needed to debug
 * a delivery failure. What is needed is which email, and which domain refused
 * it, both of which this gives.
 *
 * Logs are kept for ninety days. A name in one is a name we are holding for
 * ninety days in a place nobody is thinking about.
 */

/**
 * An address as its domain, never its local part.
 *
 * `dana@gmail.com` becomes `***@gmail.com`: enough to see that a whole domain
 * is bouncing, which is the failure worth reading a log for, and not enough
 * to say who.
 */
export function redactEmail(address) {
  const s = String(address ?? '').trim();
  if (!s) return '(none)';
  const at = s.lastIndexOf('@');
  if (at < 1) return '(malformed)';
  return `***${s.slice(at)}`;
}

/** A list of addresses, each redacted. */
export function redactEmails(list) {
  return (Array.isArray(list) ? list : [list]).map(redactEmail).join(', ');
}

/**
 * What a provider said went wrong, without echoing back what we sent it.
 *
 * Resend's error body repeats the recipient. The name of the error and its
 * message are what identify the fault.
 */
export function providerError(data) {
  if (!data || typeof data !== 'object') return String(data ?? '').slice(0, 120);
  const name = data.name || data.error || data.type || '';
  const message = data.message || data.detail || '';
  const out = [name, message].filter(Boolean).join(': ');
  return out ? out.slice(0, 200) : 'no detail given';
}
