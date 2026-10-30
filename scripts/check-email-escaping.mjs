#!/usr/bin/env node
/**
 * check-email-escaping: nothing a person typed reaches an email as markup.
 *
 * The check-in and survey-nudge emails put names straight into HTML. The
 * check-in names the PARTNER, typed by the partner, so one person could put a
 * link in an email we send the other from our own domain (A202, from the sweep
 * of typed values in emails). The endpoint emails were already safe, because
 * /api/send-email escapes the body before any builder sees it.
 *
 * Behavioural: every email in the catalogue is rendered from its own sample
 * with every typed field replaced by markup, and the HTML must not carry that
 * markup raw. For the endpoint's emails the endpoint's own sanitizeBody is
 * applied first, exactly as the handler does, so the gate holds each email to
 * the path it is actually sent through.
 *
 * Typed fields: any string in a sample that is not a URL, an address, an id,
 * an order number or a type. Those are either validated elsewhere or not a
 * person's words. Planted: the escape removed from the nudge's name, from the
 * check-in's partner name, and from the deletion email's name. All fail it.
 */
import { EMAIL_CATALOGUE } from '../api/_lib/email-catalogue.js';
import { sanitizeBody } from '../api/send-email.js';

const MARK = '<i>planted</i>';
const NOT_TYPED = /url|href|email|userid|ordernum|type|pkgkey|code/i;
const fails = [];
let emails = 0, fields = 0;
for (const [key, entry] of Object.entries(EMAIL_CATALOGUE)) {
  if (!entry.sample) continue;
  const typed = Object.keys(entry.sample).filter((k) => typeof entry.sample[k] === 'string' && !NOT_TYPED.test(k));
  if (!typed.length) continue;
  emails++; fields += typed.length;
  let input = { ...entry.sample };
  for (const k of typed) input[k] = MARK + entry.sample[k];
  if (entry.from === 'api/send-email.js') input = sanitizeBody(input);
  let out;
  try { out = await entry.build(input); } catch (e) { fails.push(`${key}: did not render with markup in its fields (${e.message})`); continue; }
  const html = String(out?.html ?? out ?? '');
  if (!html) { fails.push(`${key}: rendered no HTML; the gate has lost its subject`); continue; }
  if (html.includes(MARK)) {
    const at = html.indexOf(MARK);
    fails.push(`${key} (${entry.from}) puts a typed field into its HTML unescaped: …${html.slice(Math.max(0, at - 50), at + 20).replace(/\s+/g, ' ')}…`);
  }
}
if (emails < 10) fails.push(`Only ${emails} emails carried a typed field. The catalogue has more; the gate has lost its subject.`);
if (fails.length) {
  console.error('[check-email-escaping] ' + fails.length + ' problem(s):');
  for (const x of fails) console.error('  ' + x);
  process.exit(1);
}
console.log(`[check-email-escaping] ${emails} emails rendered with markup in ${fields} typed fields, each through the path it is sent by; none carries it raw.`);
