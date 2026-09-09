// Fails the build when results copy exists that the app cannot reach.
//
// api/_content is the versioned copy library for results. Every export in it
// is prose a couple reads. If the only thing that consumes one is src/App.jsx,
// then that copy lives inside the website bundle and the app has nothing to
// show where the website shows words.
//
// That is how the app ended up with three gaps at once: DIM_ACTION_ITEMS and
// DOMAIN_ALIGNED, which build the Communication action plan, and
// REFLECTION_ACTION_TITLES, which titles the Reflection one. All three were
// read only by the website. The pages existed on both; on the app they were
// empty and nothing said so.
//
// Reachable means: something under api/ that is not the copy library itself
// reads it. That is the boundary the app can cross.

import { readFileSync, readdirSync } from 'fs';

const contentDir = new URL('../api/_content/', import.meta.url);
const apiDir = new URL('../api/', import.meta.url);

// Every export the copy library publishes.
const exported = new Set();
for (const file of readdirSync(contentDir).filter((f) => /^v\d+\.js$/.test(f))) {
  const text = readFileSync(new URL(file, contentDir), 'utf8');
  for (const m of text.matchAll(/^export const ([A-Z][A-Z_0-9]*)/gm)) exported.add(m[1]);
}

// Everything under api/ that could serve it, excluding the library itself.
let served = '';
function collect(dir, prefix = '') {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name === '_content') continue;
      collect(new URL(`${entry.name}/`, dir), `${prefix}${entry.name}/`);
      continue;
    }
    if (entry.name.endsWith('.js')) served += readFileSync(new URL(entry.name, dir), 'utf8');
  }
}
collect(apiDir);

const unreachable = [...exported].filter((name) => !new RegExp(`\\b${name}\\b`).test(served));

if (unreachable.length) {
  console.error('[check-prose-reach] results copy the app cannot reach:');
  for (const name of unreachable) console.error(`  ${name}`);
  console.error('');
  console.error('Something under api/ has to read it, or the website shows words');
  console.error('where the app shows nothing. Move whatever builds from it out of');
  console.error('src/App.jsx, the way dimension-copy.js and comms-plan.js were.');
  process.exit(1);
}

console.log(`[check-prose-reach] all ${exported.size} results copy sources are reachable by the app.`);
