#!/usr/bin/env node
/**
 * A quotation says what the page it cites says.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * Ellie: "I would rather just use direct quotes from these publications, can
 * you organize those and cite them accurately?"
 *
 * Six were organised. Two of the six were not quotations. The product showed
 *
 *     "Contempt is the single greatest predictor of divorce."
 *     Dr. Ellie Wilde, The Gottman Institute
 *
 * and that sentence is nowhere on the cited page, which says "Contempt is the
 * worst of the four horsemen. It is the number one predictor of divorce, but it
 * can be defeated." The other was stitched together out of a heading and a
 * summary. Both were fair readings of the article and neither was a sentence
 * anyone wrote.
 *
 * check-insight-provenance already insists a quotation carries an author, a
 * publication and a url, and says in its own header that it cannot check the
 * wording: "Nothing here can open a book. What it can do is insist there is a
 * url, so the wording can be checked by a person." Nobody was going to be that
 * person. Two of six is not a rate anyone would accept on a claim about what a
 * named researcher said.
 *
 * So this opens the url.
 *
 * ── HOW IT DECIDES ────────────────────────────────────────────────────────
 * Fetches each cited page, strips the markup, and requires the quotation to
 * appear in what is left. Quote characters are flattened on both sides: a
 * sentence that already contains a quoted phrase has to have those marks
 * changed when it is nested inside quotation marks of its own, and that is
 * typesetting rather than misquotation. Nothing else is normalised. Whitespace
 * is collapsed because markup puts line breaks inside sentences.
 *
 * ── BROKEN IS NOT THE SAME AS UNAVAILABLE ─────────────────────────────────
 * This is the only check here that needs the internet, and a build machine with
 * no route out is not evidence of anything. A page that cannot be reached is
 * reported and does not fail the run; a page that is reached and does not carry
 * its quotation does. The two are counted separately in the summary line so a
 * run that verified nothing cannot read like a run that verified everything.
 *
 * That distinction is the whole lesson of check:docs, which reported "18 of 27
 * generators failed" on every run for so long that nobody read it, and a real
 * break hid inside the noise.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the author is the right one. The byline is on the page and this does
 * not read it, because publishers rename and re-attribute: the four horsemen
 * article is bylined Dr. Ellie Wilde today and its author archive is still
 * ellie-lisitsa. Checking that would fail on the publisher's editing rather
 * than on ours.
 *
 * Whether the quotation is a fair use of the source, or whether quoting it is
 * the right call at all. Those are Ellie's, and INSIGHTS-REVIEW.md is where she
 * makes them.
 *
 * Our own sentences. They are not quotations and carry no name, which is what
 * check-insight-provenance is for.
 */

import { INSIGHTS } from '../api/_insights.js';

const quotes = INSIGHTS.filter((i) => i.kind === 'quote');

if (!quotes.length) {
  console.error('[check-quotes-verbatim] api/_insights.js holds no quotations at all.'
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

/** Every kind of quote mark is the same mark, and runs of space are one space. */
const flatten = (t) => t
  .replace(/[‘’‚‛′`´']/g, "'")
  .replace(/[“”„‟″"]/g, "'")
  .replace(/\s+/g, ' ')
  .trim();

const textOf = (html) => flatten(
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#8217;|&rsquo;|&#8216;|&lsquo;|&apos;|&#39;/g, "'")
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;|&quot;/g, '"')
    .replace(/&#8212;|&mdash;/g, '—')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&'),
);

const wrong = [];
const unreachable = [];
let verified = 0;

for (const q of quotes) {
  let html;
  try {
    const res = await fetch(q.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; attune-quote-check)' },
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) { unreachable.push(`${q.id}: ${res.status} from ${q.url}`); continue; }
    html = await res.text();
  } catch (err) {
    unreachable.push(`${q.id}: ${String(err.message || err).slice(0, 80)} (${q.url})`);
    continue;
  }

  const page = textOf(html);
  /* The stored body arrives already wrapped in quotation marks for display, so
     the outer pair comes off before looking for it on the page. */
  const want = flatten(q.body).replace(/^'|'$/g, '').trim();

  if (page.includes(want)) { verified += 1; continue; }

  /* Where it stops matching, so the report says what to fix rather than that
     something is wrong. */
  const words = want.split(' ');
  let longest = '';
  for (let n = 4; n <= words.length; n += 1) {
    const head = words.slice(0, n).join(' ');
    if (!page.includes(head)) break;
    longest = head;
  }
  const at = longest ? page.indexOf(longest) : -1;
  wrong.push(
    `${q.id} is not on the page it cites.\n`
    + `      shown as : ${want.slice(0, 150)}\n`
    + `      cited to : ${q.author}, ${q.work}\n`
    + `      ${q.url}\n`
    + (at === -1
      ? '      Not one phrase of it appears on that page.'
      : `      Matches up to: ${longest.slice(-90)}\n`
        + `      The page then reads: ${page.slice(at + longest.length, at + longest.length + 110)}`),
  );
}

if (wrong.length) {
  console.error('\n check-quotes-verbatim: a name is under words that person did not write.\n');
  for (const w of wrong) console.error(`  ✗ ${w}\n`);
  console.error('  Use the page\'s own sentence, or drop the entry. A paraphrase inside'
    + ' quotation\n  marks under a named author is a claim about what that person said.\n');
  process.exit(1);
}

const parts = [`${verified} of ${quotes.length} quotations found verbatim on the page they cite`];
if (unreachable.length) parts.push(`${unreachable.length} could not be reached, so they were not checked`);
console.log(`[check-quotes-verbatim] ${parts.join('; ')}.`);
for (const u of unreachable) console.log(`  unchecked  ${u}`);
