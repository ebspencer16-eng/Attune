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
// ── THE SPACED EN DASH, AND THE SEVENTH EXEMPTION ──────────────────────────
// " – " was doing the em dash's job in 58 places. It is the same offence in a
// narrower glyph, so it is caught here rather than in a second gate. But it
// has one honest use the em dash does not:
//
// 7. A label separator: a short name, a dash, and the thing it names.
//
//        Digital PDF – $19
//        Partner 1 – first name
//        Yes – keep it anonymous
//
//    That is formatting, not a sentence, and a dash is the right mark for it.
//    Seventeen of these were left in place deliberately.
//
//    The test below is structural, not a list of blessed strings: at most
//    three words before the dash, at most 24 characters, and no sentence-
//    ending punctuation. A list of approved strings would go stale the first
//    time someone added a price row; this does not.
//
//    Where it is wrong, and knowingly:
//
//    - A label longer than three words is reported. That is the right way to
//      be wrong. At that length the thing is a sentence.
//    - A three-word prose clause is not reported. "We looked closely – at
//      every answer" passes. This is the real hole, and it is accepted rather
//      than papered over, because closing it needs to know a verb from a noun
//      and that is not something a regex can do honestly.
//
//    The em dash has no such exemption and is caught in every position.

import { readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;

/** Both glyphs. The en dash counts only when spaced, because 6-12 is fine. */
const EM = /—| – /;

/**
 * A label separator: a short name, a dash, and the thing it names.
 *
 * Structural rather than a list. The left side has to be short and has to
 * read as a name, not the tail of a sentence. Only the en dash can be one; an
 * em dash between a label and its value is not a convention this site uses.
 */
function isLabelSeparator(text) {
  if (/—/.test(text)) return false;
  // A legend that defines the glyph rather than using it: "– = didn't apply".
  if (/–\s*=/.test(text)) return true;
  const parts = text.split(' – ');
  if (parts.length !== 2) return false;
  const left = parts[0].replace(/^.*[>"'`,[({]\s*/, '').trim();
  if (!left || left.length > 24 || /[.!?;:]$/.test(left)) return false;
  // Words, not characters. "Your answers are saved" is 22 characters and read
  // as a label under a length test alone, which let a real sentence through.
  // A label is a noun phrase: "Digital PDF", "Partner 1", "Yes". Three words
  // is the ceiling.
  const words = left.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/);
  return words.length <= 3;
}

/** Pages no customer reaches. */
const INTERNAL = new Set([
  'public/admin.html',
  'public/workbook-render.html',
  'public/qr-cards-print.html',
  'public/portal.html',
  // A developer preview of the email templates. The real copy lives in
  // api/cron-*.js and is checked there; this page restates it, which is its
  // own problem and not this gate's.
  'public/email-preview.html',
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
    .replace(/<title>[^<]*<\/title>/g, blank)
    // og:title and twitter:title are the same breadcrumb as <title>, and are
    // exempt for the same reason. Their descriptions are prose and are not.
    .replace(/<meta[^>]*(?:og|twitter):title[^>]*>/g, blank);
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
      const bare = code.replace(/<[^>]*>/g, '').trim();
      if (isLabelSeparator(bare)) return;
      problems.push(`${rel}:${i + 1}  ${code.trim().slice(0, 120)}`);
    });
  }
}

if (problems.length) {
  console.error('[check-em-dashes] a dash standing in for punctuation in copy a customer reads:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('CLAUDE.md, editorial voice: no em dashes. Use a period if they are');
  console.error('two thoughts, a comma if one modifies the other, parentheses if it is');
  console.error('genuinely an aside. Titles, citations, comments and the "no value"');
  console.error('dash are exempt; see the header of this file before widening it.');
  process.exit(1);
}

console.log(`[check-em-dashes] ${scanned} files contain a dash; none of them uses one as punctuation in prose.`);
