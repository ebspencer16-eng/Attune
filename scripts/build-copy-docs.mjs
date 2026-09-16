#!/usr/bin/env node
/**
 * Writes the product's prose into TASKS.md, generated from what it sends.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Ellie: "Please make this the practice from now on so that I can review all
 * prose in the tasks document."
 *
 * She has been bitten twice by the other way of doing this. /email-preview
 * held six hand-written mock-ups while nineteen real emails went out, and the
 * copy-review document listed ten action items the product never rendered. A
 * document that describes the product instead of reading it becomes a second
 * draft of it, and the half that ships is the half nobody reviews.
 *
 * So every block here is built by running or reading the source the product
 * itself uses, and check-copy-docs.mjs regenerates them on every build and
 * fails if TASKS.md has drifted.
 *
 * ── METHOD, WHICH IS THE PART TO ARGUE WITH ───────────────────────────────
 * The home cards are read out of the add({...}) calls in the priority engine
 * rather than produced by running it, because running it means inventing the
 * twenty-six states that reach each card, and a state I invent wrong hides a
 * card rather than showing a wrong one. Template holes are filled with sample
 * names. Everything else is imported and rendered.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const DOC = `${ROOT}TASKS.md`;

const YOU = 'Ellie';
const THEM = 'Preston';

const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim();

/** Fill a template literal's holes with the sample names. */
const fill = (s) => String(s ?? '')
  .replace(/\$\{them\}/g, THEM)
  .replace(/\$\{you\}/g, YOU)
  .replace(/\$\{label\}/g, 'Communication')
  // The one line that asks for a possessive. Rendering it as an ellipsis made
  // the table say "finishes … final exercise", which reads as a missing word
  // rather than as a pronoun that depends on the reader's partner.
  .replace(/\$\{pronounForm\([^)]*\)\}/g, 'his')
  .replace(/\$\{[^}]+\}/g, '…')
  .replace(/\{U\}/g, YOU)
  .replace(/\{P\}/g, THEM);

// ── 1. The home screen's tile ──────────────────────────────────────────────
function homeBlock() {
  const src = readFileSync(`${ROOT}api/_lib/next-action.js`, 'utf8');
  const rows = [];
  for (const m of src.matchAll(/add\(\{([\s\S]*?)\}\);/g)) {
    const body = m[1];
    /**
     * Every string a field can produce.
     *
     * A field is read from its name to the start of the next one, and every
     * quoted string in between is a wording the card can show: a condition
     * carries two, and the greyed-out version of a card is copy too. Reading
     * only the first version, or only same-line conditions, left four cards in
     * this table with an empty line under them.
     */
    const FIELDS = ['id', 'kind', 'priority', 'title', 'body', 'cta', 'action', 'disabled', 'deepLink'];
    const strings = (field) => {
      const from = body.search(new RegExp(`(^|\\s)${field}:`));
      if (from < 0) return [];
      const rest = body.slice(from + field.length + 1);
      const ends = FIELDS.filter((f) => f !== field)
        .map((f) => rest.search(new RegExp(`(^|\\s)${f}:`)))
        .filter((i) => i > 0);
      const chunk = rest.slice(0, ends.length ? Math.min(...ends) : undefined);
      return [...chunk.matchAll(/(`[^`]*`|'[^']*'|"[^"]*")/g)].map((m) => fill(m[1].slice(1, -1)));
    };

    const titles = strings('title');
    const bodies = strings('body');
    const ctas = strings('cta');
    if (!titles.length) continue;
    for (let i = 0; i < titles.length; i += 1) {
      rows.push(`| ${esc(titles[i])} | ${esc(bodies[i] ?? bodies[0])} | ${esc(ctas[i] ?? ctas[0])} |`);
    }
  }

  /**
   * The per-resource lines, which are a lookup rather than a string in a card:
   * Ellie writes one tool at a time, and anything she has not written keeps the
   * generic line. Without this they would be invisible in a list of copy.
   */
  const lookup = (name) => Object.fromEntries(
    [...src.matchAll(new RegExp(`const ${name} = \\{([\\s\\S]*?)\\};`, 'g'))]
      .flatMap((m) => [...m[1].matchAll(/(\w+):\s*'([^']*)'/g)])
      .map((m) => [m[1], m[2]]),
  );
  const titles = lookup('RESOURCE_TITLE');
  const blurbLines = lookup('RESOURCE_BLURB');
  const blurbs = [...new Set([...Object.keys(titles), ...Object.keys(blurbLines)])]
    .map((key) => `| ${esc(titles[key] || 'Start a new exercise')} | ${esc(blurbLines[key] || 'You have purchased exercises that you have not completed')} | Start |`);

  // The third row, which has two states of its own.
  const pickUp = readFileSync(`${ROOT}api/_lib/pick-up.js`, 'utf8');
  const labels = [...pickUp.matchAll(/label:\s*'([^']*)'/g)].map((m) => m[1]);

  return [
    'Every line the home tile can show. The first table is the priority engine:',
    'a card is one row, and a card whose wording changes with the situation has',
    'one row per wording. Sample names are Ellie and Preston.',
    '',
    '| Bold line | Line under it | Button |',
    '|--|--|--|',
    ...rows,
    ...blurbs,
    '',
    'The third row of the tile, which is either something of yours to return to',
    'or something new to read:',
    '',
    '| Bold line | Line under it |',
    '|--|--|',
    `| ${esc(labels[0] || 'Pick up where you left off')} | one line of what you marked, cut at the margin |`,
    `| ${esc(labels[1] || 'Explore something new')} | the newest In Practice piece, by name |`,
  ].join('\n');
}

// ── 2. The deletion emails ─────────────────────────────────────────────────
async function deletionBlock() {
  const m = await import(`${ROOT}api/_lib/deletion-emails.js`);
  const text = (html) => String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

  const a = m.deletionConfirmationEmail({ name: YOU, researchKept: true });
  const b = m.partnerDeletedEmail({ toName: YOU, theirName: THEM, userId: 'sample' });
  return [
    'Both emails, rendered with sample names and stripped of their markup. The',
    'footer each one carries is the shared one and is not repeated here.',
    '',
    '| Sent to | Subject | What it says |',
    '|--|--|--|',
    `| The person who deleted | ${esc(a.subject)} | ${esc(text(a.html))} |`,
    `| Their partner | ${esc(b.subject)} | ${esc(text(b.html))} |`,
  ].join('\n');
}

// ── 3. The workbook ────────────────────────────────────────────────────────
async function workbookBlock() {
  const m = await import(`${ROOT}api/_workbook-prose.js`);
  const dims = Object.entries(m.DIM_CONTENT);
  const dimRows = dims.map(([key, c]) => `| ${key} | ${esc(fill(c.measures))} | ${esc(fill(c.closeText))} | ${esc(fill(c.farText))} |`);

  const momentRows = [];
  for (const set of ['MOMENTS_SHARED_W', 'MOMENTS_SHARED_X', 'MOMENTS_SHARED_Y', 'MOMENTS_SHARED_Z']) {
    for (const [situation, c] of Object.entries(m[set] || {})) {
      momentRows.push(`| ${set.replace('MOMENTS_SHARED_', '')} | ${situation} | ${esc(fill(c.moment))} | ${esc(fill(c.happening))} | ${esc(fill(c.tryThis))} |`);
    }
  }

  return [
    `The workbook's dimension pages, ${dims.length} of them, and the moment cards`,
    'for couples of the same type. Sample names are Ellie and Preston; the real',
    'document uses yours.',
    '',
    '| Dimension | What it measures | When you are close | When you are far apart |',
    '|--|--|--|--|',
    ...dimRows,
    '',
    `The same-type moment cards, ${momentRows.length} of them:`,
    '',
    '| Type | Situation | The moment | What is happening | Try this |',
    '|--|--|--|--|--|',
    ...momentRows,
  ].join('\n');
}

// ── Write them in ──────────────────────────────────────────────────────────
const BLOCKS = {
  home: homeBlock(),
  'deletion-emails': await deletionBlock(),
  workbook: await workbookBlock(),
};

let doc = readFileSync(DOC, 'utf8');
const missing = [];
for (const [name, content] of Object.entries(BLOCKS)) {
  const start = `<!-- copy:${name}: generated by scripts/build-copy-docs.mjs -->`;
  const end = `<!-- end copy:${name} -->`;
  const from = doc.indexOf(start);
  const to = doc.indexOf(end);
  if (from < 0 || to < 0) { missing.push(`${start}\n${end}`); continue; }
  doc = doc.slice(0, from) + `${start}\n\n${content}\n\n${end}` + doc.slice(to + end.length);
}
if (missing.length) {
  console.error('[build-copy-docs] TASKS.md has no block for:');
  for (const m of missing) console.error(`  ${m.split('\n')[0]}`);
  process.exit(1);
}

if (process.argv.includes('--print')) {
  process.stdout.write(Object.entries(BLOCKS).map(([k, v]) => `## ${k}\n${v}`).join('\n\n'));
} else {
  writeFileSync(DOC, doc);
  console.log(`[build-copy-docs] ${Object.keys(BLOCKS).length} prose blocks written into TASKS.md.`);
}
