// Fails the build when an em dash appears in a sentence a customer reads.
//
// ── THE RULE THIS ENCODES ──────────────────────────────────────────────────
// From CLAUDE.md, on editorial voice: "No em dashes." It applies to anything a
// customer reads, and to nothing else.
//
// A dash is the punctuation you reach for when you have not decided what the
// relationship between two clauses is. The house style is to decide: a period
// if they are two thoughts, a comma if one modifies the other, parentheses if
// it is genuinely an aside.
//
// ── WHAT IS DELIBERATELY EXEMPT, AND WHY ───────────────────────────────────
// 1. <title> separators. A title is a breadcrumb, not a sentence, and the dash
//    there is a delimiter between name and site. These now use a middle dot,
//    but the exemption stands: the rule is about prose, and a title is not
//    prose. Do not widen this gate to cover them.
//
// 2. Citation lines. "Gottman, J.M. — The Seven Principles (1999)" is
//    bibliographic convention. Replacing that dash with a comma makes the
//    citation read as part of the author list. There are ten of these, all in
//    public/practice/, all inside an italic <p> under a research claim.
//
// 3. Comments, in every syntax this repo uses: <!-- -->, //, /* */ and JSX's
//    {/* */}. No customer reads them.
//
// 4. An em dash standing alone as a value: {val || "—"}, <td>—</td>, n=—. That
//    is the typographic convention for "no data", not punctuation inside a
//    sentence. It is how the results tables show an unanswered question.
//
// 5. console.log / warn / error. Developer output.
//
// 6. Internal tooling: the admin dashboard, the print and QR renderers, the
//    portal. The voice rule says "anything a customer reads", and these are
//    the pages no customer reaches.
//
// ── WHAT THIS DOES NOT COVER ───────────────────────────────────────────────
// The spaced en dash, " – ", which is doing the em dash's job in 65 places
// across the customer-facing pages. That is the same offence wearing a
// narrower glyph, and it is not gated here because fixing it is a copy
// decision that has not been made yet: some of those are prose and some are
// label separators ("Partner 1 – first name", "Digital PDF – $19") where a
// dash is legitimate. When that decision is made, extend EM below to include
// the en dash rather than writing a second gate for it.

import { readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;

/** The glyph. Only the em dash, for now. See the note above. */
const EM = /—/;

/** Pages no customer reaches. */
const INTERNAL = new Set([
  'public/admin.html',
  'public/workbook-render.html',
  'public/qr-cards-print.html',
  'public/qr-card-v2.html',
  'public/portal.html',
]);

/** Where customer-facing copy lives. */
const ROOTS = ['public', 'src', 'api'];
const EXTS = ['.html', '.js', '.jsx'];
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'assets']);

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (EXTS.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}

/**
 * Remove everything exempt, keeping line numbers intact so a report points at
 * the right line. Block comments are blanked rather than deleted for the same
 * reason.
 */
function strip(text) {
  const blank = (m) => m.replace(/[^\n]/g, ' ');
  return text
    .replace(/<!--[\s\S]*?-->/g, blank)      // HTML comments
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, blank) // JSX comments
    .replace(/\/\*[\s\S]*?\*\//g, blank)     // JS block comments
    .replace(/<title>[^<]*<\/title>/g, blank);
}

/** Is this dash a lone "no value" marker rather than punctuation? */
function isPlaceholder(line) {
  const bare = line
    .replace(/(["'`>=])\s*—\s*(["'`<,)])/g, '$1$2') // "—", <td>—</td>, n=—
    .replace(/\[\s*"—"\s*,\s*"—"\s*\]/g, '');       // ends: ["—","—"]
  return !EM.test(bare);
}

/**
 * Is this a citation? Bibliographic lines are italic, muted, and sit directly
 * under a research claim. Matching on the shape rather than a file list means
 * a new article is covered without editing this gate.
 */
function isCitation(line) {
  return /font-style:\s*italic/.test(line)
    && /—/.test(line)
    && /\(\d{4}\)/.test(line);
}

const problems = [];
let scanned = 0;

for (const root of ROOTS) {
  for (const abs of walk(join(ROOT, root))) {
    const rel = relative(ROOT, abs);
    if (INTERNAL.has(rel)) continue;
    const text = readFileSync(abs, 'utf8');
    if (!EM.test(text)) continue;
    scanned++;
    strip(text).split('\n').forEach((line, i) => {
      if (!EM.test(line)) return;
      if (/^\s*(\/\/|\*)/.test(line)) return;                 // line comments
      const code = line.replace(/\/\/.*$/, '');               // trailing comment
      if (!EM.test(code)) return;
      if (/console\.(log|warn|error|info)/.test(code)) return;
      if (isCitation(code)) return;
      if (isPlaceholder(code)) return;
      problems.push(`${rel}:${i + 1}  ${code.trim().slice(0, 120)}`);
    });
  }
}

if (problems.length) {
  console.error('[check-em-dashes] em dashes in copy a customer reads:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('CLAUDE.md, editorial voice: no em dashes. Use a period if they are');
  console.error('two thoughts, a comma if one modifies the other, parentheses if it is');
  console.error('genuinely an aside. Titles, citations, comments and the "no value"');
  console.error('dash are exempt; see the header of this file before widening it.');
  process.exit(1);
}

console.log(`[check-em-dashes] ${scanned} files contain an em dash, none of them in prose.`);
