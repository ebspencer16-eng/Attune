#!/usr/bin/env node
/**
 * Reads the twelve In Practice articles off the website and writes their
 * bodies down in the shape the app's reader already draws.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Ellie: "I want all of these to open in app if the user is in the app."
 * Posts published to the `posts` table already do. The twelve pieces that
 * actually exist are static pages under public/practice/, so tapping one
 * handed the reader to the system browser, which is the one place in the app
 * where reading something Attune wrote means leaving Attune.
 *
 * ── WHY IT IS GENERATED, NOT TYPED ────────────────────────────────────────
 * Ellie writes every word a customer reads, and she wrote those words once, in
 * the page. Retyping them into a module is a second copy of the copy, and this
 * repo's whole history is one rule maintained by hand in two places drifting
 * apart. So the page stays the source and this is derived from it, the same
 * arrangement api/_lib/email-triggers.js has.
 * check-in-practice-bodies.mjs regenerates and fails the build on a diff.
 *
 * ── METHOD, WHICH IS THE PART TO ARGUE WITH ───────────────────────────────
 * The markup is regular across all twelve: a `div.article-body` holding
 * `h2`, `p`, `blockquote.article-quote`, `ul`, and `div.callout` (a label and
 * a paragraph), with `div.article-divider` between sections. Those map onto
 * the reader's block types one for one. The standfirst, `p.article-intro`,
 * becomes the post's subtitle rather than a block, because that is what it is.
 *
 * Two things in the page are deliberately not carried over:
 *
 *   - The CTA. It sells, and the app does not sell. See
 *     check-app-does-not-sell.mjs.
 *   - The nav, breadcrumb and footer, which are the website's furniture.
 *
 * The research citations ARE carried over. They are the claim's evidence, and
 * an article that cites its sources on one surface and not the other is two
 * different articles.
 *
 * If a page grows an element this does not know, it is dropped silently, which
 * is the one real risk here. check-in-practice-bodies.mjs counts the words in
 * the page against the words in the blocks and fails when they diverge, so a
 * dropped section is loud rather than invisible.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { IN_PRACTICE } from '../api/_in-practice.js';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, 'api/_in-practice-bodies.js');

/** Text as a reader sees it: tags gone, entities resolved, spaces collapsed. */
function plain(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&rsquo;|&#8217;/g, '’')
    .replace(/&lsquo;|&#8216;/g, '‘')
    .replace(/&ldquo;|&#8220;/g, '“')
    .replace(/&rdquo;|&#8221;/g, '”')
    .replace(/&mdash;|&#8212;/g, '—')
    .replace(/&ndash;|&#8211;/g, '–')
    .replace(/&hellip;/g, '…')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
}

/**
 * The inner HTML of the div opening at `open`, by counting divs.
 *
 * A regex cannot do this: every article nests section divs inside the body,
 * and the first `</div>` closes the wrong one.
 */
function divInner(html, open) {
  const start = html.indexOf('>', open) + 1;
  let depth = 1;
  const tag = /<(\/?)div\b/gi;
  tag.lastIndex = start;
  let m;
  while ((m = tag.exec(html))) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return { inner: html.slice(start, m.index), end: tag.lastIndex };
  }
  throw new Error('unbalanced div');
}

/** The content of the first `tag` opening at or after `from`. */
function closeOf(html, tag, from) {
  const close = html.toLowerCase().indexOf(`</${tag}`, from);
  if (close < 0) throw new Error(`unclosed <${tag}>`);
  return close;
}

/** One article's blocks, in the order the page prints them. */
function blocksFor(slug, html) {
  const bodyAt = html.indexOf('<div class="article-body"');
  if (bodyAt < 0) throw new Error(`${slug}: no article-body`);
  const { inner } = divInner(html, bodyAt);

  const blocks = [];
  const push = (type, text, extra) => {
    const t = plain(text);
    if (t) blocks.push({ id: `${slug}-${blocks.length + 1}`, type, text: t, ...extra });
  };

  const tok = /<(h2|h3|p|ul|ol|blockquote|div)\b([^>]*)>/gi;
  let m;
  while ((m = tok.exec(inner))) {
    const tag = m[1].toLowerCase();
    const attrs = m[2] || '';
    const open = m.index;
    const after = tok.lastIndex;

    if (tag === 'div') {
      // A callout is a label and a paragraph in a tile.
      if (/class="[^"]*callout[^"]*"/.test(attrs)) {
        const { inner: box, end } = divInner(inner, open);
        const label = /class="callout-label"[^>]*>([\s\S]*?)<\/p>/i.exec(box);
        const rest = box.replace(/<p class="callout-label"[\s\S]*?<\/p>/i, '');
        push('prompt', rest, label ? { label: plain(label[1]) } : undefined);
        tok.lastIndex = end;
        continue;
      }
      // A numbered step: its number, its title and its body. Walked as plain
      // paragraphs the number is dropped, and a list of five steps that has
      // lost its numbering is a different instruction.
      if (/class="step"/.test(attrs)) {
        const { inner: box, end } = divInner(inner, open);
        const num = /class="step-num"[^>]*>([\s\S]*?)<\/div>/i.exec(box);
        const title = /class="step-title"[^>]*>([\s\S]*?)<\/p>/i.exec(box);
        const rest = box
          .replace(/<div class="step-num"[\s\S]*?<\/div>/i, '')
          .replace(/<p class="step-title"[\s\S]*?<\/p>/i, '');
        const label = [num ? `${plain(num[1])}.` : '', title ? plain(title[1]) : ''].join(' ').trim();
        push('prompt', rest, label ? { label } : undefined);
        tok.lastIndex = end;
        continue;
      }
      // Every other div is a section wrapper or the hairline between
      // sections, and its children are picked up by the walk itself.
      continue;
    }

    if (tag === 'ul' || tag === 'ol') {
      const close = closeOf(inner, tag, after);
      const items = [...inner.slice(after, close).matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
        .map((li) => plain(li[1]))
        .filter(Boolean);
      if (items.length) blocks.push({ id: `${slug}-${blocks.length + 1}`, type: 'list', text: items.join('\n') });
      tok.lastIndex = close;
      continue;
    }

    const close = closeOf(inner, tag, after);
    const text = inner.slice(after, close);
    if (tag === 'h2' || tag === 'h3') push('heading', text);
    else if (tag === 'blockquote') push('quote', text);
    else push('paragraph', text);
    tok.lastIndex = close;
  }

  // ── RESEARCH CONTEXT ──────────────────────────────────────────────────────
  // Five of the twelve carry one. It sits after the body and before the CTA,
  // as a claim and the work it comes from.
  const research = html.indexOf('<!-- RESEARCH CITATION -->');
  // Bounded by the CTA's class, not its comment: four of the twelve pages
  // carry no `<!-- CTA -->` marker, and an unbounded slice ran to the end of
  // the file and pulled two footer divs in as research.
  const cta = html.indexOf('class="article-cta"');
  if (research > 0 && (cta < 0 || research < cta)) {
    const seg = html.slice(research, cta > 0 ? cta : undefined);
    const label = /text-transform:uppercase[^>]*>([^<]+)<\/p>/i.exec(seg);
    blocks.push({ id: `${slug}-${blocks.length + 1}`, type: 'heading', text: plain(label ? label[1] : 'Research context') });
    for (const item of seg.matchAll(/<div style="border-left[\s\S]*?<\/div>/gi)) {
      const ps = [...item[0].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((p) => plain(p[1]));
      if (!ps.length) continue;
      const source = ps.slice(1).find((p) => /\(\d{4}\)/.test(p));
      blocks.push({
        id: `${slug}-${blocks.length + 1}`,
        type: 'prompt',
        text: ps[0],
        ...(source ? { source } : {}),
      });
    }
  }

  const intro = /<p class="article-intro"[^>]*>([\s\S]*?)<\/p>/i.exec(html);
  const title = /<h1 class="article-title"[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  return {
    // The page's own h1, with its line break and its emphasis flattened. The
    // index has a title too and they are not always the same string; the
    // reader prints the index's, and this is kept so the gate can see the two.
    pageTitle: title ? plain(title[1]).replace(/\n/g, ' ') : '',
    intro: intro ? plain(intro[1]) : '',
    blocks,
  };
}

const bodies = {};
for (const a of IN_PRACTICE) {
  const html = readFileSync(join(ROOT, 'public', `${a.path}.html`), 'utf8');
  bodies[a.slug] = blocksFor(a.slug, html);
}

const out = `/**
 * GENERATED FILE. Do not edit.
 *
 * The bodies of the website's In Practice articles, so the app can draw them
 * rather than handing the reader to the browser. Written by
 * scripts/build-in-practice-bodies.mjs from public/practice/*.html, which is
 * where the copy lives and is the only place it should be edited.
 *
 * Run: node scripts/build-in-practice-bodies.mjs
 */

export const IN_PRACTICE_BODIES = ${JSON.stringify(bodies, null, 2)};
`;

if (process.argv.includes('--print')) process.stdout.write(out);
else {
  writeFileSync(OUT, out);
  const n = Object.values(bodies).reduce((a, b) => a + b.blocks.length, 0);
  console.log(`[build-in-practice-bodies] ${Object.keys(bodies).length} articles, ${n} blocks -> api/_in-practice-bodies.js`);
}
