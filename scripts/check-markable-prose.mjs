// Fails the build when results prose is rendered as text a reader cannot mark.
//
// ── WHAT THIS IS ABOUT ─────────────────────────────────────────────────────
// Ellie asked for the ability to select a fragment of a sentence in the
// results and highlight, underline, tag, note or share it. The module was
// built and it works. It reached nine paragraphs.
//
// The other thirty-odd body-copy sites were still plain <Text>, so the same
// gesture did nothing on the comms pages, every expectations page, the whole
// of Conflict Patterns, the reflection plan, and What Comes Next. A feature
// that works on a quarter of the pages does not read as scoped. It reads as
// broken, and the reader cannot tell which it is, because nothing on a page
// says whether its words can be marked.
//
// Nothing caused that. It is just what happens when a capability is added
// paragraph by paragraph and no rule says where it has to reach.
//
// ── THE RULE, AND WHY IT DERIVES RATHER THAN RESTATES ──────────────────────
// Type.body is the theme's own name for long-form copy. A site that spreads it
// has already declared itself prose; this gate does not carry a second list of
// which paragraphs count. So:
//
//   A <Text> that spreads Type.body and whose only child is a single
//   expression must be <Prose>.
//
// The "single expression" half is what keeps it honest. Copy typed into the
// component is the app talking about itself, not results content:
//
//   <Text style={{ ...Type.body }}>This section is being built for the app.</Text>
//
// Nobody wants to highlight that, and it has no stable identity to anchor a
// mark to, since it is not in the payload and changes when the component does.
// Literal children are left alone for that reason, not overlooked.
//
// ── OPTING OUT ─────────────────────────────────────────────────────────────
// `not markable: <reason>` on the line above the <Text> exempts it, written
// either as a JSX comment or a line comment. Both forms are accepted because
// most of these sites sit among JSX children, where `//` is not a comment at
// all: it is text, and it renders. The first draft of this gate accepted only
// the line form, which meant the escape hatch it documented could not be used
// anywhere it was needed.
//
// The reason is required, so an exemption is a sentence someone wrote rather
// than a flag someone set.
//
// A whole file opts out with `// not markable, whole file: <reason>` at the
// top. The storycards use it: they are a horizontally swiping deck, and a
// long-press to start a word range fights the pan responder that moves the
// cards. The reason lives in the file rather than in this list so that whoever
// next edits a card reads it there.
//
// ── STYLE ALIASES ──────────────────────────────────────────────────────────
// Matching the literal `...Type.body` inside the tag was not enough. The
// storycards define `const body = { ...Type.body, ... }` once and then write
// `style={[body, ...]}` eleven times, so the literal appeared in the file
// exactly once, on a line with no JSX on it, and eleven prose sites were
// invisible to a gate that reported itself clean.
//
// That is the failure this repo keeps having, in a script written to prevent
// it. So the scan resolves file-local consts whose initialiser spreads
// Type.body, and matches those names too.
//
// ── WHAT THIS DOES NOT COVER ───────────────────────────────────────────────
// Only files that render results sections, listed in FILES. Exercise screens
// are not covered: their text is a question being answered, not a finding to
// sit with, and marking one would anchor to a screen that is not a results
// section.
//
// It also says nothing about whether <Prose> is inside an AnnotationProvider.
// A Prose outside one is a Text by design, so that is a coverage question and
// not a correctness one.

import { readFileSync } from 'fs';

const ROOT = new URL('..', import.meta.url).pathname;

/** The components that draw results sections. */
const FILES = [
  'attune-app/src/components/results.tsx',
  'attune-app/src/components/conflict-results.tsx',
  'attune-app/src/components/highlight-cards.tsx',
];

/**
 * The end of a JSX opening tag: the first `>` that is not inside braces,
 * a string, or an arrow. Returns the index of that `>`.
 */
function endOfOpenTag(src, from) {
  let depth = 0;
  let quote = null;
  for (let i = from; i < src.length; i += 1) {
    const ch = src[i];
    if (quote) { if (ch === quote && src[i - 1] !== '\\') quote = null; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') { depth += 1; continue; }
    if (ch === '}') { depth -= 1; continue; }
    if (ch === '>' && depth === 0) {
      if (src[i - 1] === '=') continue;          // an arrow, inside a handler
      return i;
    }
  }
  return -1;
}

/** The `</Text>` that closes the element opened at `openEnd`, nesting aware. */
function closingText(src, openEnd) {
  let depth = 1;
  let i = openEnd;
  while (i < src.length) {
    const open = src.indexOf('<Text', i);
    const close = src.indexOf('</Text>', i);
    if (close === -1) return -1;
    if (open !== -1 && open < close) {
      // A self-closing <Text ... /> opens nothing.
      const e = endOfOpenTag(src, open);
      if (e !== -1 && src[e - 1] === '/') { i = e + 1; continue; }
      depth += 1; i = (e === -1 ? open + 5 : e + 1); continue;
    }
    depth -= 1;
    if (depth === 0) return close;
    i = close + 7;
  }
  return -1;
}

/** Is `inner` exactly one `{...}` expression and nothing else? */
function isLoneExpression(inner) {
  const t = inner.trim();
  if (!t.startsWith('{') || !t.endsWith('}')) return false;
  let depth = 0;
  let quote = null;
  for (let i = 0; i < t.length; i += 1) {
    const ch = t[i];
    if (quote) { if (ch === quote && t[i - 1] !== '\\') quote = null; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      // Closed before the end, so there is more than one thing here.
      if (depth === 0 && i !== t.length - 1) return false;
    }
  }
  return depth === 0;
}

const problems = [];
const skippedFiles = [];
let markable = 0;
let exempt = 0;
let literal = 0;

for (const rel of FILES) {
  const src = readFileSync(new URL(rel, `file://${ROOT}`), 'utf8');
  const lineAt = (i) => src.slice(0, i).split('\n').length;

  markable += (src.match(/<Prose\b/g) || []).length;

  // The reason is a sentence, so it wraps across the comment's lines. Print
  // all of them: half a reason in build output reads as a truncated error.
  const whole = src.match(/^\/\/\s*not markable, whole file:\s*(\S[^]*?)(?=\n\s*\n|\n(?!\s*\/\/))/m);
  if (whole) {
    const reason = whole[1].split('\n').map((l) => l.replace(/^\s*\/\/\s?/, '')).join(' ')
      .replace(/\s+/g, ' ').trim();
    skippedFiles.push(`${rel} — ${reason}`);
    continue;
  }
  if (/^\/\/\s*not markable, whole file\b/m.test(src)) {
    problems.push(`${rel} opts out entirely with no reason given.`);
    continue;
  }

  /**
   * Names that mean Type.body. A style const is how a file stops saying
   * `...Type.body` out loud while still meaning it.
   */
  const aliases = new Set();
  for (const m of src.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*\{\s*\.\.\.Type\.body\b/g)) {
    aliases.add(m[1]);
  }
  const isBodyTag = (tag) => {
    if (/\.\.\.Type\.body\b/.test(tag)) return true;
    for (const a of aliases) {
      // style={alias} or style={[alias, ...]}
      if (new RegExp(`style=\\{\\[?\\s*${a}\\b`).test(tag)) return true;
    }
    return false;
  };

  let at = 0;
  for (;;) {
    const open = src.indexOf('<Text', at);
    if (open === -1) break;
    at = open + 5;
    const openEnd = endOfOpenTag(src, open);
    if (openEnd === -1) continue;
    const tag = src.slice(open, openEnd + 1);
    if (!isBodyTag(tag)) continue;
    if (src[openEnd - 1] === '/') continue;            // self-closing, no children

    const close = closingText(src, openEnd + 1);
    if (close === -1) continue;
    const inner = src.slice(openEnd + 1, close);
    if (!isLoneExpression(inner)) { literal += 1; continue; }

    /**
     * An exemption is the comment directly above, with a reason.
     *
     * Read as a block rather than as one line, because these reasons are
     * sentences and a sentence wraps. Reading only the line above found the
     * last line of every multi-line exemption, which is its terminator, and
     * concluded there was no exemption there.
     */
    const before = src.slice(0, open).split('\n');
    let i = before.length - 2;
    while (i >= 0 && !before[i].trim()) i -= 1;
    let comment = '';
    if (i >= 0) {
      const line = before[i].trim();
      if (/^\/\//.test(line)) {
        comment = line;
      } else if (/\*\/\}?$/.test(line)) {
        // Walk back to the line that opened it.
        let j = i;
        while (j >= 0 && !/\{?\/\*/.test(before[j])) j -= 1;
        if (j >= 0) comment = before.slice(j, i + 1).join(' ').replace(/\s+/g, ' ').trim();
      }
    }
    const m = comment.match(/^(?:\/\/|\{?\/\*)\s*not markable:\s*(\S.*)$/);
    if (m && m[1].replace(/\*\/\}?$/, '').trim()) { exempt += 1; continue; }
    if (/^(?:\/\/|\{?\/\*)\s*not markable\b/.test(comment)) {
      problems.push(`${rel}:${lineAt(open)} is exempted with no reason given.`);
      continue;
    }

    problems.push(
      `${rel}:${lineAt(open)} renders results prose a reader cannot mark:\n`
      + `      ${inner.trim().replace(/\s+/g, ' ').slice(0, 84)}\n`
      + '      Use <Prose> from @/components/annotation-context, or add\n'
      + '      // not markable: <reason>  on the line above.');
    at = close;
  }
}

if (!markable) {
  console.error('[check-markable-prose] found no <Prose> at all; refusing to pass.');
  process.exit(1);
}

if (problems.length) {
  console.error(`[check-markable-prose] ${problems.length} body-copy sites cannot be marked:`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(
  `[check-markable-prose] ${markable} markable prose sites; `
  + `${exempt} exempted with a reason, ${literal} carrying copy typed into the component.`);
for (const f of skippedFiles) console.log(`  opted out: ${f}`);
