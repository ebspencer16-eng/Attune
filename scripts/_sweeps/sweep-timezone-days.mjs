/* Sweep: every place a timestamp is turned into a DAY.
   A stored timestamp is UTC. `new Date(ts).getDate()` reads it in the server's
   local zone, which on Vercel is UTC and on a phone is not, so the same row can
   be "today" on one surface and "yesterday" on the other. Anything that gates a
   nudge, a streak, a rotation or a greeting on a day boundary is exposed. */
import { readdirSync, readFileSync, statSync } from 'node:fs';

const files = [];
function walk(d) {
  for (const e of readdirSync(d)) {
    const p = `${d}/${e}`;
    if (e === 'node_modules' || e.startsWith('.')) continue;
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|jsx?|mjs)$/.test(p)) files.push(p);
  }
}
['api', 'attune-app/src', 'src'].forEach(walk);

/* The local-zone readers. getTime/getTimezoneOffset are zone-safe and absent
   on purpose; toISOString is UTC and therefore consistent everywhere. */
const LOCAL = /\.(getDate|getDay|getMonth|getFullYear|getHours|toDateString|toLocaleDateString|toLocaleString|toLocaleTimeString)\(/;

const hits = [];
let dayComparisons = 0;

for (const f of files) {
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((raw, i) => {
    const line = raw.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
    if (!LOCAL.test(line)) return;
    dayComparisons++;
    // The subject is a day read off a value that came from storage, not off
    // `new Date()` with no argument, which is "now" and has no stored zone.
    const fromStored = /new Date\(\s*[A-Za-z_$][\w.$[\]'"]*\s*\)/.test(line)
      || /\b(created_at|updated_at|_at|At|date|Date|timestamp|ts)\b\s*\)/.test(line);
    if (fromStored) hits.push([f, i + 1, line.trim().slice(0, 100)]);
  });
}

console.log(`local-zone date reads across all three surfaces: ${dayComparisons}`);
console.log(hits.length ? `\nOF THOSE, READING A STORED VALUE (${hits.length}):` : '\nnothing reads a stored timestamp in local time.');
for (const [f, l, t] of hits) console.log(`  ${f}:${l}\n      ${t}`);
