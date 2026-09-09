// Fails the build when the testimonials on /reviews and /faq stop agreeing.
//
// ── WHY A GATE AND NOT ONE SOURCE ──────────────────────────────────────────
// public/reviews.html and public/faq.html carry the same four testimonials,
// copy-pasted. The right fix by this codebase's own rule is to derive one from
// the other: CLAUDE.md says to ask whether a second copy can read the first,
// and to add a gate only when it genuinely cannot.
//
// It cannot, cheaply. These are static files served straight off the CDN with
// no templating. Sharing them needs a generator in the build, the way
// build-pkg-rules.mjs writes public/_pkg-rules.js. That is buildable, and it
// is deliberately not built: the content changes about once a year, and a
// generator is a permanent piece of machinery bought to solve a problem that
// happens rarely.
//
// So this is the cheaper half of the rule. It does not stop the duplication.
// It stops the duplication going unnoticed, which is the part that actually
// hurt.
//
// If these testimonials start changing often, promote this to a generator and
// delete this file. That is the upgrade path, and it is the reason this
// comment names the alternative rather than just asserting the choice.
//
// ── WHAT ACTUALLY WENT WRONG ───────────────────────────────────────────────
// All four had drifted. Three had grown a spaced en dash where reviews.html
// had a comma, and two had lost or gained a word:
//
//   reviews.html  "Simple, clean, and genuinely useful."
//   faq.html      "Simple, clean, and useful."
//
// Nobody edited both. Nobody could see both at once. Each page read fine on
// its own, which is exactly the failure shape this project keeps hitting.
//
// ── WHAT IS COMPARED ───────────────────────────────────────────────────────
// Every review-text, review-name, review-detail and review-pkg field, in
// document order. Not the markup around them: faq.html nests the name and
// detail on one line where reviews.html puts them on three, and that is
// layout, not content. Only the words have to agree.

import { readFileSync } from 'fs';

const ROOT = new URL('../', import.meta.url);

/** The two pages, and where each one's block starts. */
const PAGES = [
  { file: 'public/reviews.html', marker: '<!-- REVIEWS GRID -->' },
  { file: 'public/faq.html', marker: '<!-- Reviews grid -->' },
];

/** The fields that carry words a customer reads. */
const FIELDS = /class="review-(text|name|detail|pkg)"[^>]*>([\s\S]*?)<\//g;

function fields({ file, marker }) {
  const text = readFileSync(new URL(file, ROOT), 'utf8');
  const start = text.indexOf(marker);
  if (start === -1) {
    return { error: `${file} no longer contains ${marker}. If the block moved, update this gate.` };
  }
  const out = [];
  for (const m of text.slice(start).matchAll(FIELDS)) {
    out.push({
      kind: m[1],
      value: m[2].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
    });
  }
  return { out };
}

const [a, b] = PAGES.map(fields);
const problems = [];

for (const e of [a.error, b.error]) if (e) problems.push(e);

if (!problems.length) {
  if (!a.out.length) problems.push(`${PAGES[0].file} has no review fields; the gate would pass on nothing.`);
  if (a.out.length !== b.out.length) {
    problems.push(
      `${PAGES[0].file} has ${a.out.length} review fields, ${PAGES[1].file} has ${b.out.length}. `
      + 'A testimonial was added or removed on one page only.');
  } else {
    a.out.forEach((x, i) => {
      const y = b.out[i];
      if (x.kind !== y.kind || x.value !== y.value) {
        problems.push(
          `review field ${i + 1} (${x.kind}) differs:\n`
          + `    ${PAGES[0].file}: ${x.value}\n`
          + `    ${PAGES[1].file}: ${y.value}`);
      }
    });
  }
}

if (problems.length) {
  console.error('[check-testimonials] the two testimonial blocks disagree:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('These are the same four testimonials on two pages. They are copy-pasted');
  console.error('on purpose, and this gate is the price of that. Edit both, or promote');
  console.error('them to a generator and delete this file.');
  process.exit(1);
}

console.log(`[check-testimonials] ${a.out.length} review fields, identical on both pages.`);
