#!/usr/bin/env node
/**
 * The two surfaces size a storycard from the same numbers.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Every font size, weight, tracking, line height and face on a highlight
 * storycard comes from CARD_TYPE in api/_lib/storycard-style.js. The app's own
 * type scale, which is right for the rest of the app, does not reach these
 * cards, and neither surface writes a size of its own.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * Ellie, three times over three months. The last: "Highlights storycards on
 * app still don't match the ones on the website. Please match fonts, sizes,
 * formatting, colors, etc."
 *
 * She was right every time, and the reason was never a wrong value. The
 * website styled each card inline and the app had a six-token scale, so:
 *
 *   the couple's names   30pt in the app      41.6px on the website
 *   body copy            weight 400, DMSans   weight 300, DM Sans Light
 *   the eyebrow          10pt, tracked 1.6    8.8px, tracked 0.32em
 *   card padding         24                   40
 *
 * Nothing was wrong in either file. There were two of them, which is the
 * failure this whole codebase is organised against, and it took three reports
 * to see it because each report was answered by adjusting one value.
 *
 * ── HOW FAR THE SHARING GOES TODAY ────────────────────────────────────────
 * The app draws every card from the scale. On the website, the opener does;
 * the other eight cards still carry their values inline, and those values are
 * exactly what the scale was transcribed from, which is why the two match now.
 * Until they are converted too, an edit to one of those eight would move the
 * website and not the app, so this checks that every role in the scale is
 * still present in the website's storycards as the value it was taken from.
 * That is weaker than sharing and it is honest about being a transcript.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Layout: what sits above what, and the gaps between. Those are structure, and
 * api/_lib/section-blocks.js with check-section-blocks.mjs is where structure
 * is checked.
 *
 * Colours that carry meaning rather than hierarchy, like a call-out's green
 * and orange or a ring's colour. Those are already shared as CALLOUT_TONES and
 * RING_COLORS in the same module.
 */

import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (f) => readFileSync(`${ROOT}${f}`, 'utf8');
const style = await import(`${ROOT}api/_lib/storycard-style.js`);
const problems = [];

// ── 1. The scale exists, and reaches the app ─────────────────────────────────
const roles = Object.keys(style.CARD_TYPE || {});
if (roles.length < 10) {
  problems.push(`CARD_TYPE has ${roles.length} roles; there were 16 when this was written.`);
}
for (const [role, spec] of Object.entries(style.CARD_TYPE || {})) {
  if (!spec.family) problems.push(`CARD_TYPE.${role} names no font family, so the two surfaces can pick different faces.`);
  if (spec.alpha == null) problems.push(`CARD_TYPE.${role} names no alpha, so each surface writes its own rgba.`);
  if (!spec.weight) problems.push(`CARD_TYPE.${role} names no weight.`);
}
if (!style.STORYCARD_STYLE?.type) {
  problems.push('STORYCARD_STYLE does not carry `type`, so the app never receives the scale.');
}

// ── 2. Both surfaces agree, role by role ─────────────────────────────────────
// The same role at the same card width has to come out the same size, the same
// weight and the same face. This runs both functions rather than reading them.
for (const role of roles) {
  const css = style.cardTypeCss(role);
  const nat = style.cardTypeNative(role, style.CARD_REF_WIDTH);
  // cqw, not vw: a card sizes its text against itself, so the same card reads
  // the same on a laptop, on a phone and in the downloaded image. Ellie's call.
  const cssPx = /clamp\(([\d.]+)rem,\s*([\d.]+)cqw,\s*([\d.]+)rem\)/.exec(css.fontSize);
  const want = cssPx
    ? Math.min(Math.max(Number(cssPx[1]) * 16, (Number(cssPx[2]) / 100) * style.CARD_REF_WIDTH), Number(cssPx[3]) * 16)
    : Number(/([\d.]+)rem/.exec(css.fontSize)?.[1]) * 16;
  if (Math.abs(want - nat.fontSize) > 0.15) {
    problems.push(`${role}: the website renders ${want}px at a ${style.CARD_REF_WIDTH} card and the app renders ${nat.fontSize}.`);
  }
  if (String(css.fontWeight) !== String(nat.fontWeight)) {
    problems.push(`${role}: weight ${css.fontWeight} on the website, ${nat.fontWeight} in the app.`);
  }
  const cssDisplay = /Playfair/.test(css.fontFamily);
  const natDisplay = /Playfair/.test(nat.fontFamily);
  if (cssDisplay !== natDisplay) {
    problems.push(`${role}: ${cssDisplay ? 'display' : 'body'} face on the website, ${natDisplay ? 'display' : 'body'} in the app.`);
  }
  if (css.color !== nat.color.replace('#FFFFFF', 'white')) {
    problems.push(`${role}: ${css.color} on the website, ${nat.color} in the app.`);
  }
}

// ── 3. The app's card file writes no size of its own ─────────────────────────
// From `function Card(` to the end of the file: the card face, its footer, the
// helpers that draw on it, and the style factory.
//
// The first version scanned the Body switch alone, and a plant that put the
// app's own scale back into the factory a hundred lines below it passed. The
// viewer above `Card` is out of scope on purpose: Close, Full results and Save
// are app furniture around the card, not the card, and the website's
// equivalents are its own too.
const cards = read('attune-app/src/components/highlight-cards.tsx');
const faceAt = cards.indexOf('\nfunction Card(');
if (faceAt < 0) {
  problems.push('cannot find `function Card(` in the app, so this is scanning nothing.');
}
for (const line of cards.slice(Math.max(faceAt, 0)).split('\n')) {
  const size = /fontSize:\s*([\d.]+)/.exec(line);
  if (size && !line.includes('spec.size') && !line.includes('fontSize,')) {
    problems.push(`attune-app/src/components/highlight-cards.tsx sets fontSize ${size[1]}. Every size on a card comes from the shared scale.`);
  }
  const own = /Type\.(hero|title|body|small|eyebrow|cardTitle)/.exec(line);
  if (own) {
    problems.push(`the card file reads Type.${own[1]}, the app's own scale, in: ${line.trim().slice(0, 70)}`);
  }
}

// ── 4. The website's storycards write no type of their own ──────────────────
// Every one of the thirty styles in that region goes through scType now, and
// so does the wordmark and the address on every card. What is left inline is
// layout: margins, animations, widths, and two colours a card computes.
//
// The earlier version of this checked that each role's size still appeared
// somewhere in src/App.jsx, which was right while the scale was a transcript
// and wrong the moment it became the source.
const site = read('src/App.jsx');
const lines = site.split('\n');
const first = lines.findIndex((l) => l.includes('<WrappedCard key={0}'));
const last = lines.findIndex((l, i) => i > first && l.trim() === '];');
if (first < 0 || last < 0) {
  problems.push('cannot find the storycards in src/App.jsx, so nothing here is checking the website.');
}
const region = first >= 0 ? lines.slice(first, last).join('\n') : '';
const TYPE_PROPS = /\b(fontSize|fontWeight|letterSpacing|fontFamily)\s*:/g;
for (const m of region.matchAll(TYPE_PROPS)) {
  const at = region.slice(0, m.index).split('\n').length + first;
  const line = lines[at - 1] || '';
  // Emphasis inside a line that already has a role is not a second type
  // system: the website bolds the couple type's name inside its sentence and
  // the app does the same. A line with no scType on it has no such excuse.
  if (line.includes('scType(') && m[1] === 'fontWeight') continue;
  problems.push(`src/App.jsx:${at} writes ${m[1]} on a storycard: ${line.trim().slice(0, 60)}`);
}
if (region && !/containerType:\s*"inline-size"/.test(site)) {
  problems.push('no card element declares containerType, so cqw in the shared scale has nothing to measure and every size falls back to its minimum.');
}
if (region && !region.includes('scType(')) {
  problems.push('the storycards do not call scType at all, so the scale is not reaching the website.');
}

// ── 5. Every role is used by both surfaces ───────────────────────────────────
// A role only one side draws is a value that can drift without anyone seeing
// it, which is how eyebrowSm came to exist and be rendered by neither.
const appSrc = read('attune-app/src/components/highlight-cards.tsx');
for (const role of roles) {
  const onSite = site.includes(`scType("${role}"`);
  // The app reaches a role either through t() or by naming it on a component
  // that calls t() itself, like <Eyebrow role="eyebrowMd">.
  const inApp = appSrc.includes(`t('${role}'`) || appSrc.includes(`role="${role}"`);
  if (!onSite) problems.push(`role ${role} is in the scale and the website draws nothing with it.`);
  if (!inApp) problems.push(`role ${role} is in the scale and the app draws nothing with it.`);
}

if (problems.length) {
  console.error('[check-storycard-type] the storycards can look like two products again:\n');
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}

console.log(`[check-storycard-type] ${roles.length} roles, identical on both surfaces at a ${style.CARD_REF_WIDTH}px card, and the app writes none of its own.`);
