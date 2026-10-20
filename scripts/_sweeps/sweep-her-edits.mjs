#!/usr/bin/env node
/**
 * W79. A third prose list, from what HER edits have in common.
 *
 * The first two lists were my reading of what AI prose sounds like. This one
 * is not: every test below is lifted from a change she actually made, in her
 * fifteen or her seventeen, and the change is named beside it. If a shape is
 * not something she has already rewritten, it is not in here.
 *
 * Method, the same as the second list: import each module and read the
 * finished strings, so a sentence assembled from three template pieces is
 * tested as the reader sees it rather than as it is typed.
 */
import { readdirSync, statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ROOT = new URL('../../', import.meta.url).pathname;

/** Every shape, with the edit of hers it comes from. */
const SHAPES = [
  {
    id: 'label-noun',
    why: 'She rewrote "The watch-out is tone" and "The thing to name:" and "the thing to watch is". Six times across two rounds.',
    re: /\b(the watch[- ]out|the thing to (name|watch|watch for|do|try|remember|know))\b/i,
  },
  {
    id: 'fragment-pair',
    why: 'She rewrote "Low effort, high return." and "low pressure, high information." and "A real tension point." into full sentences, every time.',
    re: /(^|[.!?]\s)(low|high|fast|slow|big|small|quick)\s+\w+,\s*(low|high|fast|slow|big|small|quick)\s+\w+\./i,
  },
  {
    id: 'show-up',
    why: 'She rewrote "how I show up for you" to "how I am with you", and "This is not showing up for you" to "You do not express criticism".',
    re: /\bshow(s|ing)?\s+up\b/i,
  },
  {
    id: 'make-space',
    why: 'She rewrote "Make space for \'here\'s what I felt\'" to "Ask questions and listen for", and "when both of you are holding space".',
    re: /\b(make|making|makes)\s+space\s+for\b|\bhold(s|ing)?\s+space\b/i,
  },
  {
    id: 'framework',
    why: 'She rewrote "Without a framework" twice, once to "Without understanding" and once to "If feelings are not voiced".',
    re: /\b(a|the|no|without a)\s+(framework|lens|container|scaffold)\b/i,
  },
  {
    id: 'meaningful',
    why: 'She rewrote "a meaningful gap" to "a noteworthy gap" three times, and "Bids don\'t need to be meaningful to matter".',
    re: /\bmeaningful\b/i,
  },
  {
    id: 'the-thing-that',
    why: 'She rewrote "it\'s the thing that makes real closeness possible" to "it is what makes real closeness possible".',
    re: /\b(it'?s|it is|that'?s|this is)\s+the\s+thing\s+that\b/i,
  },
  {
    id: 'low-drama',
    why: 'She rewrote "low-drama" to "calm" and to "keeps things calm", twice.',
    re: /\blow[- ]drama\b/i,
  },
  {
    id: 'close-the-loop',
    why: 'She rewrote "closing the loop before the thing is actually through" to "ending a conversation or apologizing before things are fully settled".',
    re: /\bclos(e|ing|es)\s+the\s+loop\b/i,
  },
  {
    id: 'doesnt-need-to-be',
    why: 'She rewrote "Bids don\'t need to be meaningful to matter" to "A bid for connection can be obvious or low-key, but both matter".',
    re: /\b(do|does)(n'?t| not)\s+(need|have)\s+to\s+be\s+\w+\s+to\s+\w+/i,
  },
];

/** Walk api/ for modules that could hold copy. */
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = `${dir}/${name}`;
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith('.js')) out.push(full);
  }
  return out;
}

/** Every string reachable from a value, with the path that reached it. */
function strings(value, path, out, seen = new Set()) {
  if (typeof value === 'string') { out.push([path, value]); return out; }
  if (!value || typeof value !== 'object') return out;
  if (seen.has(value)) return out;
  seen.add(value);
  for (const [k, v] of Object.entries(value)) strings(v, `${path}.${k}`, out, seen);
  return out;
}

const files = walk(`${ROOT}api`);
const hits = [];
let modules = 0;
let sentences = 0;

for (const file of files) {
  let mod;
  try { mod = await import(pathToFileURL(file).href); } catch { continue; }
  modules += 1;
  const rel = file.slice(ROOT.length);
  for (const [name, value] of Object.entries(mod)) {
    if (typeof value === 'function') continue;
    for (const [path, text] of strings(value, name, [])) {
      /* Only things long enough to be prose. A label is not a sentence. */
      if (text.length < 25) continue;
      sentences += 1;
      for (const shape of SHAPES) {
        if (shape.re.test(text)) hits.push({ file: rel, path, text, shape: shape.id });
      }
    }
  }
}

console.log(`modules imported: ${modules}, strings over 25 characters: ${sentences}`);
console.log(`flagged: ${hits.length}\n`);
const byShape = {};
for (const h of hits) (byShape[h.shape] ||= []).push(h);
for (const shape of SHAPES) {
  const list = byShape[shape.id] || [];
  console.log(`\n=== ${shape.id} — ${list.length} ===`);
  console.log(`    ${shape.why}`);
  for (const h of list) {
    console.log(`  ${h.file}  ${h.path}`);
    console.log(`    ${h.text.replace(/\s+/g, ' ').slice(0, 230)}`);
  }
}
