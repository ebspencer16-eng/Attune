// Fails the build when a tool's content or copy is written out in a surface.
//
// ── WHY ────────────────────────────────────────────────────────────────────
// The Starting Out checklist was 211 lines inside src/App.jsx: six areas,
// thirty-seven items, every description. So it could only ever exist on the
// website, and when Ellie asked for the tools in the app the first question
// was where the words were going to come from.
//
// They come from api/_checklist.js now, and both surfaces read them: the
// website imports the module, the app receives it on /api/tool-data. This
// stops the obvious next step, which is one item being edited in one place.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
//   1. The content lives in api/ and nowhere else.
//   2. The website imports it rather than declaring it.
//   3. The endpoint sends it, so the app has something to draw.
//   4. No item's text or area label appears verbatim in either surface.
//
// Rule 4 is the one that matters. Progress is stored as `${area.id}__${text}`,
// so an item's words are its identity: a copy edit in a surface would not just
// drift, it would silently un-tick that item for everyone who had done it.

import { readFileSync } from 'fs';
import { CHECKLIST_AREAS, CHECKLIST_COPY } from '../api/_checklist.js';

const ROOT = new URL('..', import.meta.url).pathname;
const problems = [];

if (CHECKLIST_AREAS.length < 4) {
  console.error('[check-tool-content] fewer than four checklist areas; refusing to pass.');
  process.exit(1);
}

const site = readFileSync(ROOT + 'src/App.jsx', 'utf8');
const app = readFileSync(ROOT + 'attune-app/src/components/checklist.tsx', 'utf8');
const endpoint = readFileSync(ROOT + 'api/tool-data.js', 'utf8');

// 1 + 2. Declared once, in api/, and imported by the website.
if (/const CHECKLIST_AREAS\s*=/.test(site)) {
  problems.push('src/App.jsx declares CHECKLIST_AREAS again instead of importing it.');
}
if (!/from ['"]\.\.\/api\/_checklist\.js['"]/.test(site)) {
  problems.push('src/App.jsx does not import the checklist content.');
}

// 3. The endpoint has to send both, or the app has nothing to draw.
/**
 * On the response, not merely imported.
 *
 * This tested /CHECKLIST_AREAS/ against the whole file, which the import line
 * satisfies on its own. Removing the send left the import behind and the check
 * passed: a gate answering a question nobody asked.
 */
if (!/areas:[^\n]*CHECKLIST_AREAS/.test(endpoint)) {
  problems.push('api/tool-data.js does not put the checklist areas on the response.');
}
if (!/copy:[^\n]*CHECKLIST_COPY/.test(endpoint)) {
  problems.push('api/tool-data.js does not put the checklist copy on the response.');
}

// 4. Nobody writes an item out.
const sentences = [
  ...CHECKLIST_AREAS.map((a) => a.label),
  ...CHECKLIST_AREAS.flatMap((a) => a.items.map((i) => i.text)),
  ...Object.values(CHECKLIST_COPY),
].filter((t) => typeof t === 'string' && t.length > 12);

/**
 * Comments stripped before the search.
 *
 * The first run flagged `{/* Starting Out Checklist *\/}`, a marker naming the
 * block below it. A gate that fires on a comment about the thing teaches
 * people to ignore it, which costs more than the drift it was watching for.
 */
const stripComments = (t) => t
  .replace(/\{\s*\/\*[^]*?\*\/\s*\}/g, ' ')
  .replace(/\/\*[^]*?\*\//g, ' ')
  .replace(/^\s*\/\/[^\n]*/gm, ' ');

for (const [name, raw] of [['src/App.jsx', site], ['attune-app/src/components/checklist.tsx', app]]) {
  const text = stripComments(raw);
  for (const s of sentences) {
    if (!text.includes(s)) continue;
    problems.push(
      `${name} writes a checklist string out instead of reading it:\n`
      + `      "${s.slice(0, 70)}"`);
  }
}

if (problems.length) {
  console.error('[check-tool-content] the checklist has more than one copy:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('An item\'s text is its identity: progress is keyed by it, so editing');
  console.error('the words in a surface un-ticks that item for everyone who did it.');
  process.exit(1);
}

const items = CHECKLIST_AREAS.reduce((n, a) => n + a.items.length, 0);
console.log(
  `[check-tool-content] ${CHECKLIST_AREAS.length} areas, ${items} items and `
  + `${Object.keys(CHECKLIST_COPY).length} lines of copy; one source, both surfaces read it.`);
