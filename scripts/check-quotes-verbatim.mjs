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
/**
 * Quotations from books, which no check can open.
 *
 * Ellie: "I would rather quote from books than sites anyways." She is right
 * that they are the better source, and they are the ones this file is blind to,
 * so they are counted and named in the summary rather than skipped silently. A
 * run that verified six of twenty must not read like a run that verified
 * twenty; that is the whole lesson of the docs check that reported eighteen
 * failures until nobody read it.
 *
 * check-insight-provenance is what makes them checkable by a person: a book
 * quotation has to carry an edition and a page number, so opening it at the
 * right place takes a minute.
 */
const inBooks = [];
let verified = 0;
let volumesChecked = 0;

/**
 * A book quotation, checked against Google's scan of that exact volume.
 *
 * This is the same request I make by hand when adding one: the phrase in quotes,
 * and then look for the cited volume among the results. Google searching its own
 * scan is as close to opening the book as anything automated gets.
 *
 * Without a key the public quota is exhausted within a few calls, so a missing
 * key is reported as unchecked rather than failing: a machine with no credential
 * is not evidence about a quotation, the same rule this file already applies to
 * a page it cannot reach.
 */
const BOOKS_KEY = process.env.GOOGLE_BOOKS_KEY || '';

async function inVolume(phrase, title, surname) {
  const url = 'https://www.googleapis.com/books/v1/volumes?'
    + new URLSearchParams({ q: `"${phrase}"`, key: BOOKS_KEY, country: 'US' });
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) return { reached: false, why: `Google answered ${res.status}` };
  const body = await res.json();
  const items = body.items || [];
  /**
   * Matched on the work and the author, not on one volume id.
   *
   * Pinning to the id recorded when the quotation was added looked tighter and
   * was wrong: Google surfaces different editions of the same book between
   * calls, so two quotations that verified when they were added failed the next
   * day against editions of the very book they cite. The id is kept in the entry
   * as a pointer for a person, and the claim being checked is the one that
   * matters: these words are in this book by this author.
   */
  const want = norm(title);
  const hit = items.some((it) => {
    const v = it.volumeInfo || {};
    const t = norm(v.title || '');
    const sameWork = t === want || t.startsWith(want) || want.startsWith(t);
    const authors = (v.authors || []).join(' ').toLowerCase();
    return sameWork && surname.some((n) => authors.includes(n));
  });
  return { reached: true, hit, count: items.length, titles: items.slice(0, 3).map((it) => it.volumeInfo?.title) };
}

/** Titles vary by subtitle and punctuation between editions; names do not. */
const norm = (t) => String(t).toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

for (const q of quotes) {
  if (!String(q.url || '').trim()) {
    const where = `${q.id}: ${q.author}, ${q.work} (${q.edition})`;
    if (!BOOKS_KEY) { inBooks.push(`${where} [no GOOGLE_BOOKS_KEY set]`); continue; }
    /* The stored body has no display quotation marks on it yet; the outer pair is
       added on the way out, the same as for a page. */
    const want = flatten(q.body).replace(/^'|'$/g, '').trim();
    let out;
    try {
      /* Surnames rather than the whole byline: "John Gottman and others" is
         how a four-author book is cited to a reader and is not what Google
         returns. */
      const surnames = String(q.author).replace(/ and others$/, '')
        .split(/,| and /).map((n) => n.trim().split(/\s+/).pop().toLowerCase())
        .filter((n) => n.length > 2);
      out = await inVolume(want, q.work, surnames);
    } catch (err) {
      inBooks.push(`${where} [${String(err.message || err).slice(0, 60)}]`);
      continue;
    }
    if (!out.reached) { inBooks.push(`${where} [${out.why}]`); continue; }
    volumesChecked += 1;
    if (!out.hit) {
      wrong.push(
        `${q.id} is not in the book it cites.\n`
        + `      shown as : ${want.slice(0, 150)}\n`
        + `      cited to : ${q.author}, ${q.work} (${q.edition})\n`
        + `      volume   : ${q.volumeId}\n`
        + (out.count
          ? `      Google finds it in ${out.count} volume(s), none of them that book:`
            + ` ${(out.titles || []).filter(Boolean).join('; ')}`
          : '      Google finds that sentence in no book at all.'),
      );
    }
    continue;
  }
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

const onPages = quotes.filter((q) => String(q.url || '').trim()).length;
const parts = [`${verified} of ${onPages} quotations with a url found verbatim on the page they cite`];
if (volumesChecked) parts.push(`${volumesChecked} found in the Google Books scan of the volume they cite`);
if (unreachable.length) {
  parts.push(unreachable.length === 1
    ? '1 could not be reached, so it was not checked'
    : `${unreachable.length} could not be reached, so they were not checked`);
}
if (inBooks.length) {
  parts.push(inBooks.length === 1
    ? '1 book quotation could not be checked'
    : `${inBooks.length} book quotations could not be checked`);
}
console.log(`[check-quotes-verbatim] ${parts.join('; ')}.`);
for (const u of unreachable) console.log(`  unchecked  ${u}`);
for (const b of inBooks) console.log(`  unchecked  ${b}`);
