#!/usr/bin/env node
/**
 * The word of the day looks the same on the card as it does on the page.
 *
 * ── WHAT HAPPENED ─────────────────────────────────────────────────────────
 * Ellie asked for the word to open as a storycard: "I want it to be the bg of
 * the notes page with the word card centered, with the attune link at the
 * bottom like the insight of the day storycard uses."
 *
 * I built one from that description instead of from the thing it describes,
 * and she sent back three faults in one line: "Bg is missing the gradient,
 * word and definition card doesn't look like it does on the notes page, and
 * I'm not seeing the link at the bottom."
 *
 * All three were the same mistake. The Notes entry is two cards, an entry over
 * a usage note that tucks under it, and I drew one centred box. The Notes
 * ground is two corner washes over white, and a card's `ground` is a
 * three-stop linear gradient, so I gave it one flat colour three times. And
 * every card in that file draws its text through `t()`, which returns white
 * because every other card is dark, so on a near-white ground the wordmark and
 * the address at the foot were white on white.
 *
 * ── WHAT IS CHECKED ───────────────────────────────────────────────────────
 * 1. One entry, drawn by one component, on both surfaces. Neither the Notes
 *    tab nor the card builds a dictionary entry of its own.
 * 2. The card asks for the Notes page's wash, and the renderer draws the real
 *    PageWash rather than approximating it.
 * 3. The foot is legible: a card whose ground is light says so, and the
 *    wordmark and the address take ink instead of white.
 * 4. The entry brings its own colours, because a component that inherited the
 *    card's would be invisible on the card and wrong on the page.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the result is beautiful, which is Ellie's call and is why this
 * round happened at all. What it holds is that there is ONE of it, which is
 * the part a gate can hold and the part that was broken.
 *
 * Not the other eight card tones. They are dark on purpose and `t()` is right
 * for them; this is about the one card that is not.
 */

import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;

/* Comments quote the bug at length, including the shapes being forbidden. */
const strip = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:])\/\/[^\n]*/g, (m, pre) => pre + m.slice(pre.length).replace(/[^\n]/g, ' '));

const read = (f) => readFileSync(`${ROOT}${f}`, 'utf8');
const code = (f) => strip(read(f));

const ENTRY = 'attune-app/src/components/word-entry.tsx';
const CARDS = 'attune-app/src/components/highlight-cards.tsx';
const NOTES = 'attune-app/src/app/notes.tsx';

const fails = [];
const notes = [];

// ── 1. One entry, two surfaces ──────────────────────────────────────────────
{
  let entry;
  try { entry = code(ENTRY); }
  catch { fails.push(`${ENTRY} is not in the tree, so the entry has no single home. Refusing to pass: a gate that has lost its subject must never report success.`); entry = ''; }

  if (entry && !/export default function WordEntry\(/.test(entry)) {
    fails.push(`${ENTRY} does not export a WordEntry component.`);
  }

  /**
   * The two cards that make it an entry rather than a heading with a
   * paragraph. Ellie asked for the second one specifically: "Word in use tile
   * should drop down from the word tile." A negative margin is what makes it
   * tuck under, and a check for the label alone would pass on two cards side
   * by side.
   */
  for (const [what, re] of [
    ['the white entry card', /backgroundColor:\s*Palette\.white/],
    ['the usage note under it', /backgroundColor:\s*'#EFEAE3'/],
    ['the overlap that tucks the second under the first', /marginTop:\s*-Spacing\.xl/],
    ['the part of speech', /\{word\.part\}/],
    ['the word', /\{word\.word\}/],
    ['the definition', /\{word\.definition\}/],
  ]) {
    if (entry && !re.test(entry)) {
      fails.push(`${ENTRY} no longer draws ${what}. That is what makes this a dictionary entry rather than a heading with a paragraph, and it is what Ellie said the card was missing.`);
    }
  }

  /* And nobody draws a second one. The tell is the usage note's colour, which
     is specific to this entry and appears nowhere else in the product. */
  for (const f of [CARDS, NOTES]) {
    if (/#EFEAE3/.test(code(f))) {
      fails.push(`${f} draws the usage note's own colour, so there is a second dictionary entry in the tree. One component, rendered twice: that is the whole of this fix.`);
    }
    if (!/WordEntry/.test(code(f))) {
      fails.push(`${f} does not render WordEntry, so one of the two surfaces is drawing something else.`);
    }
  }
  if (!fails.length) notes.push('one entry component, rendered by the Notes tab and by the card');
}

// ── 2. The card asks for the page's own ground ──────────────────────────────
{
  const cards = code(CARDS);

  if (!/wash:\s*'notes'/.test(cards)) {
    fails.push(`${CARDS} does not give the word card \`wash: 'notes'\`, so it falls back to a linear gradient. Ellie: "Bg is missing the gradient." The Notes page is two corner washes over white and no three-stop gradient is it.`);
  }
  if (!/wash === 'notes'[\s\S]{0,200}<PageWash/.test(cards)) {
    fails.push(`${CARDS} does not render PageWash for a card that asks for the wash. Drawing the component is the point: an approximation is a second idea of what the Notes page looks like.`);
  }
  /* With the arguments the Notes tab passes. A PageWash with no tint is the
     orange default and no indigo, which is a different page. */
  if (!/<PageWash[\s\S]{0,160}tint=\{Palette\.orange\}[\s\S]{0,80}second=\{Palette\.indigo\}[\s\S]{0,40}corners/.test(cards)) {
    fails.push(`${CARDS} renders PageWash with different arguments from the Notes tab's. That tab passes the brand orange, the brand indigo and corners; anything else is a different ground.`);
  }
  const notesSrc = code(NOTES);
  const shell = /<TabScreen tint=\{Palette\.orange\} second=\{Palette\.indigo\} corners>/.test(notesSrc);
  if (!shell) {
    fails.push(`${NOTES} no longer wraps itself in that wash, so the card is now matching a page that has moved. Change both or neither.`);
  } else {
    notes.push('the card draws the Notes tab\'s own wash, with its own arguments');
  }
}

// ── 3. The foot is legible on it ────────────────────────────────────────────
{
  const cards = code(CARDS);

  if (!/footTone:\s*'ink'/.test(cards)) {
    fails.push(`${CARDS} does not mark the word card's foot as ink. t() returns white for every role, so on the one light card the wordmark and the address are white on near-white. Ellie: "I'm not seeing the link at the bottom."`);
  }
  /* And the override is actually applied, to both halves of the foot. The
     flag existing is not the thing being drawn. */
  for (const [what, re] of [
    ['the wordmark', /t\('wordmark', w\),\s*ink \?/],
    ['the address', /t\('siteLabel', w\),\s*ink \?/],
  ]) {
    if (!re.test(cards)) {
      fails.push(`${CARDS} declares the ink tone and does not apply it to ${what}. A constant that exists is not a thing that is drawn.`);
    }
  }
  if (!/const ink = /.test(cards)) {
    fails.push(`${CARDS} has no \`ink\` to apply.`);
  }
  if (!fails.length) notes.push('the foot takes ink on the one card with a light ground');
}

// ── 4. The entry carries its own colours ────────────────────────────────────
{
  const entry = code(ENTRY);
  /**
   * Every other card body draws through t(). This one must not: it is the
   * reason the entry is legible on a near-white ground and the reason the
   * same component is legible on the Notes page. If it ever starts taking
   * the card's scale, it goes white and disappears on both.
   */
  if (/\bt\(/.test(entry) || /cardStyles/.test(entry)) {
    fails.push(`${ENTRY} draws through the card's type helper, which returns white for every role. The entry sits on a near-white ground on both surfaces and would vanish.`);
  }
  for (const [what, re] of [
    ['the word in ink', /color:\s*c\.textStrong/],
    ['the definition in grey', /color:\s*c\.textMuted/],
  ]) {
    if (!re.test(entry)) {
      fails.push(`${ENTRY} no longer sets ${what}.`);
    }
  }
  /**
   * And NOTHING in it is white text.
   *
   * The two checks above ask whether ink appears somewhere in the file, and
   * a plant that turned the word itself white walked through: the label two
   * lines down was still ink, so the pattern still matched. Asking whether a
   * colour is present is not asking what is drawn in it.
   *
   * The entry sits on near-white on both surfaces, so white text is wrong
   * everywhere in here, which makes the honest check the absence of it rather
   * than the presence of something else. `Palette.white` as a BACKGROUND is
   * the entry card itself and is fine; as a text colour it is invisible.
   */
  for (const m of entry.matchAll(/color:\s*('#[Ff]{3,8}'|"#[Ff]{3,8}"|'white'|"white"|Palette\.white)/g)) {
    fails.push(`${ENTRY} draws text in ${m[1]}. The entry is on near-white on the Notes page and on the card, so white text is invisible on both. That is the fault Ellie reported at the foot of the card, one layer in.`);
  }
  if (!fails.length) notes.push('the entry brings its own colours, so it is legible on both surfaces');
}

for (const n of notes) console.log(`  ok  ${n}`);
if (fails.length) {
  console.error(`\ncheck-word-card: ${fails.length} problem${fails.length === 1 ? '' : 's'}\n`);
  for (const f of fails) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('\n[check-word-card] one dictionary entry, drawn by one component on the Notes tab and on the card, over the page\'s own wash, with a foot that can be read on it.');
