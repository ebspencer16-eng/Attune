// Fails the build when a poller writes state whether or not anything changed.
//
// ── WHAT HAPPENED ──────────────────────────────────────────────────────────
// Ellie: "the whole dashboard on the site is glitching and blinking."
//
// The partner poller runs every 15 seconds. Every run it built a session
// object ending in `completedAt: Date.now()` and called savePartnerSession,
// which set the session, rebuilt the account object, and wrote both to
// localStorage. Unconditionally. Nothing had changed on any of those runs; the
// timestamp made every one look like it had.
//
// So the dashboard re-rendered itself every fifteen seconds for as long as it
// was open, for every couple whose partner has answered anything. A second
// poller held `partnerSession` in its dependency array, so the new object
// identity also tore that effect down and fired an extra request on the way
// through.
//
// ── WHY NOTHING CAUGHT IT ──────────────────────────────────────────────────
// check-effect-deps proves no effect depends on state it sets, and that was
// true: the loop ran through a timer, not through a dependency. Demo is silent
// because there is no partner to sync with, so the render probe measured zero
// churn while this was happening to every real couple.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// Two things, on any effect that starts an interval:
//
//   1. No Date.now() lands in a value the poller stores. A timestamp minted on
//      the client at poll time cannot be news, and it makes every comparison
//      downstream say the data is new.
//   2. Its dependency array holds no bare object-valued state. Identity is not
//      change, and a poller that rebuilds its own dependency is a poller that
//      never stops restarting.
//
// It does not check that a write is guarded, because "guarded" has too many
// shapes to recognise. It removes the two things that made an unguarded write
// fire every time.

import { readFileSync } from 'fs';

const ROOT = new URL('..', import.meta.url).pathname;
const raw = readFileSync(ROOT + 'src/App.jsx', 'utf8');

/**
 * Comments out, strings kept as placeholders.
 *
 * The first version scanned the raw file and flagged its own explanatory
 * comment for containing the words Date.now(). A gate that fires on a comment
 * about the bug teaches people to ignore it, which costs more than the bug.
 *
 * Offsets are preserved so reported line numbers still mean something.
 */
function strip(text) {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const two = text.slice(i, i + 2);
    if (two === '//') {
      const end = text.indexOf('\n', i);
      const stop = end === -1 ? text.length : end;
      out += ' '.repeat(stop - i);
      i = stop;
      continue;
    }
    if (two === '/*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end === -1 ? text.length : end + 2;
      out += text.slice(i, stop).replace(/[^\n]/g, ' ');
      i = stop;
      continue;
    }
    const ch = text[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      let j = i + 1;
      while (j < text.length && !(text[j] === ch && text[j - 1] !== '\\')) j += 1;
      out += text.slice(i, j + 1).replace(/[^\n]/g, ' ');
      i = j + 1;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

const src = strip(raw);
const rawLines = raw.split('\n');
const lines = src.split('\n');
const problems = [];

/** State that holds an object, so identity changes without content changing. */
const OBJECT_STATE = new Set();
for (const m of raw.matchAll(/const \[(\w+), set\w+\] = useState\(/g)) {
  // The first 200 characters after the paren, which covers a literal and the
  // head of a lazy initialiser. Matching to the closing paren does not work:
  // `useState(() => { ... JSON.parse(...) ... })` spans lines and contains
  // parens of its own, and a regex that stopped at the first `)` missed every
  // lazy initialiser in the file. partnerSession is one, which is why the
  // dependency rule below caught nothing when it was planted.
  const head = raw.slice(m.index + m[0].length, m.index + m[0].length + 200);
  if (/^\s*(\{|\[)|JSON\.parse|^\s*\(\s*\)\s*=>/.test(head)) OBJECT_STATE.add(m[1]);
}
if (OBJECT_STATE.size < 3) {
  console.error(`[check-poll-writes] only recognised ${OBJECT_STATE.size} object states; refusing to pass.`);
  process.exit(1);
}

/** The character range of the useEffect( ... ) call starting at `from`. */
function callRange(from) {
  const open = src.indexOf('(', from);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '(') depth += 1;
    else if (src[i] === ')') {
      depth -= 1;
      if (!depth) return [open, i];
    }
  }
  return null;
}

const lineAt = (idx) => src.slice(0, idx).split('\n').length;

let effects = 0;
for (const m of src.matchAll(/\buseEffect\s*\(/g)) {
  const range = callRange(m.index);
  if (!range) continue;
  const body = src.slice(range[0], range[1] + 1);
  if (!/setInterval\s*\(/.test(body)) continue;
  effects += 1;
  const at = `src/App.jsx:${lineAt(m.index)}`;

  // 1. A client-minted timestamp inside something that gets stored.
  if (/Date\.now\(\)/.test(body) && /\bset[A-Z]\w*\(|localStorage\.setItem/.test(body)) {
    const off = body.indexOf('Date.now()');
    problems.push(
      `${at} polls and stores a value built with Date.now() (line ${lineAt(range[0] + off)}).\n`
      + '      A timestamp minted at poll time is never equal to the last one, so\n'
      + '      every poll looks like news and re-renders everything downstream.');
  }

  // 2. An object in its own dependency array.
  const deps = body.match(/,\s*\[([^\]]*)\]\s*\)$/);
  if (deps) {
    for (const dep of deps[1].split(',').map((d) => d.trim()).filter(Boolean)) {
      const root = dep.split(/[.?[]/)[0];
      if (!OBJECT_STATE.has(root) || dep !== root) continue;
      problems.push(
        `${at} polls on an interval and holds \`${dep}\` in its dependency array.\n`
        + '      That is an object, so a new identity restarts the effect whether or\n'
        + '      not anything changed. Depend on a field of it instead.');
    }
  }
}

if (!effects) {
  console.error('[check-poll-writes] found no polling effects; refusing to pass.');
  process.exit(1);
}

if (problems.length) {
  console.error('[check-poll-writes] a poller writes on every run:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(`[check-poll-writes] ${effects} polling effects; none mints a timestamp it stores or restarts itself.`);
