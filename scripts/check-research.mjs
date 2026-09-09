// Fails the build when the research findings on the website and in the app
// stop saying the same thing.
//
// ── WHY ────────────────────────────────────────────────────────────────────
// The three findings were written for public/purpose.html and live in its
// markup. The app's home screen now shows one a day, served from
// api/_research.js. That is two copies of the same claims and the same
// citations.
//
// Citation drift is worse than most drift. A body that reads slightly
// differently on two surfaces is untidy; a source that reads differently
// attributes a claim to research that did not quite make it. Gottman and
// Silver said one thing, and either both surfaces say what they said or one of
// them is putting words in their mouths.
//
// purpose.html is a static page with no build step, so it cannot import the
// module. This holds the two together instead, the way check-testimonials.mjs
// holds the two testimonial blocks together. If that page ever gains a build
// step, generate it from api/_research.js and delete this file.
//
// ── WHAT IS COMPARED ───────────────────────────────────────────────────────
// Every title, body and source. Not the markup: the page wraps the citation in
// two nested spans and the module is a flat string, and that is layout. Only
// the words have to agree.

import { readFileSync } from 'fs';
import { RESEARCH } from '../api/_research.js';

const page = readFileSync(new URL('../public/purpose.html', import.meta.url), 'utf8');

/** Text as a reader sees it: tags gone, entities resolved, spaces collapsed. */
function plain(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&rsquo;|&#8217;/g, '’')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const pageText = plain(page);
const problems = [];

if (!RESEARCH.length) problems.push('api/_research.js lists no findings.');

for (const f of RESEARCH) {
  for (const [field, value] of [['title', f.title], ['body', f.body], ['source', f.source]]) {
    const wanted = plain(value);
    if (!pageText.includes(wanted)) {
      problems.push(
        `${f.id}.${field} is not on public/purpose.html word for word:\n`
        + `      ${wanted.slice(0, 120)}`);
    }
  }
}

// The other direction: a finding on the page that the module has never heard
// of would be a fourth claim the app can never show, which is the same drift
// facing the other way.
const onPage = [...page.matchAll(/class="research-card[^"]*"[\s\S]{0,900}?<\/div>\s*<\/div>/g)];
if (onPage.length && onPage.length !== RESEARCH.length) {
  problems.push(
    `public/purpose.html renders ${onPage.length} findings, api/_research.js lists ${RESEARCH.length}.`);
}

if (problems.length) {
  console.error('[check-research] the research copy has drifted between the two surfaces:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('These are the same three findings and the same three citations. Edit both,');
  console.error('or give purpose.html a build step and generate it from api/_research.js.');
  process.exit(1);
}

console.log(`[check-research] ${RESEARCH.length} findings, identical on the page and in the module.`);
