// Relationship Reflection results review — the reflection questions and the
// results insight blurbs, in the same format as the specific content review.
// Reads live from src/App.jsx (ANNIVERSARY_QUESTIONS + deriveAnniversaryInsights).

import { readFileSync } from 'fs';
import {
  ORANGE, PURPLE, GREEN, BLUE, INK, MUTED, RED,
  bigSection, midSection, smallSection, prose, caption, groupLabel, tag,
  buildCover, renderDoc, INDENT_PROSE_UNDER_SMALL,
} from './_review_format.mjs';

const src = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf-8');

// ── extract helpers (string-aware) ──────────────────────────────────────────
function matchBrace(s, open) {
  let depth = 0, inStr = false, ch = '';
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (inStr) { if (c === '\\') { i++; continue; } if (c === ch) inStr = false; continue; }
    if (c === '/' && s[i + 1] === '/') { i = s.indexOf('\n', i); if (i < 0) return -1; continue; }
    if (c === '/' && s[i + 1] === '*') { i = s.indexOf('*/', i + 2) + 1; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = true; ch = c; continue; }
    if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') { depth--; if (depth === 0) return i; }
  }
  return -1;
}
function objLiteral(name) {
  const d = new RegExp('const ' + name + '\\s*=\\s*').exec(src);
  let i = d.index + d[0].length;
  while (src[i] !== '{' && src[i] !== '[') i++;
  return src.slice(i, matchBrace(src, i) + 1);
}
const ANNIVERSARY_QUESTIONS = (new Function('return ' + objLiteral('ANNIVERSARY_QUESTIONS')))();

function readString(s, idx) {
  const q = s[idx]; let out = '';
  for (let i = idx + 1; i < s.length; i++) {
    const c = s[i];
    if (c === '\\') { out += s[i + 1]; i++; continue; }
    if (c === q) return { value: out, end: i };
    out += c;
  }
  return { value: out, end: s.length };
}
function fieldValue(obj, key) {
  const re = new RegExp('(?:^|[,{\\s])' + key + '\\s*:\\s*');
  const m = re.exec(obj);
  if (!m) return null;
  let i = m.index + m[0].length;
  if (!['"', "'", '`'].includes(obj[i])) return null; // non-string value (e.g. coupleType ? ...) → skip
  return readString(obj, i).value;
}
// Render template vars to readable placeholders.
function render(str) {
  if (!str) return str;
  return str.replace(/\$\{([^}]*)\}/g, (_, e) => {
    e = e.trim();
    if (e === 'userName') return '[Partner A]';
    if (e === 'partnerName') return '[Partner B]';
    if (e === 'ctNote') return 'As a [couple type] couple, ';
    if (/Person$/.test(e)) return '[one partner]';
    if (/Label$/.test(e)) return '[rating]';
    if (/\.a8/.test(e)) return '[admired quality]';
    if (/Top$/.test(e)) return '[top priority]';
    if (/\.a7/.test(e)) return '[what they would change]';
    if (/^(myQ|theirQ)$/.test(e)) return '[their answer]';
    if (/\.item/.test(e)) return '[the area]';
    if (/Rank/.test(e)) return '[rank]';
    return '[…]';
  });
}

// ── pull every insights.push({...}) with its nearest comment as context ──────
const fnStart = src.indexOf('function deriveAnniversaryInsights');
const fnEnd = src.indexOf('\n}', src.indexOf('return insights', fnStart));
const fn = src.slice(fnStart, fnEnd);
const insights = [];
let pos = 0;
while (true) {
  const idx = fn.indexOf('insights.push({', pos);
  if (idx < 0) break;
  const braceOpen = fn.indexOf('{', idx + 'insights.push('.length);
  const braceClose = matchBrace(fn, braceOpen);
  const obj = fn.slice(braceOpen, braceClose + 1);
  // nearest preceding comment line
  const before = fn.slice(0, idx);
  const cmts = [...before.matchAll(/\/\/\s*(.+)/g)];
  let ctx = cmts.length ? cmts[cmts.length - 1][1].trim() : '';
  ctx = ctx.replace(/^-+\s*|\s*-+$/g, '').replace(/\(.*?\)/g, '').trim();
  insights.push({
    ctx,
    type: fieldValue(obj, 'type'),
    title: render(fieldValue(obj, 'title')),
    body: render(fieldValue(obj, 'body')),
    priority: render(fieldValue(obj, 'priority')),
    action: render(fieldValue(obj, 'action')),
    note: render(fieldValue(obj, 'coupleTypeNote')),
  });
  pos = braceClose + 1;
}
console.log(`Loaded ${ANNIVERSARY_QUESTIONS.length} questions, ${insights.length} insight blurbs`);

// ── cover ───────────────────────────────────────────────────────────────────
const cover = buildCover({
  title: 'Relationship Reflection results',
  subtitle: 'The reflection questions and every results insight, numbered for reference.',
  howToUse: 'Section 1 is the question set, grouped by category. Section 2 is the results insights: short conditional blurbs that appear only when a comparison between the two partners triggers them. [Partner A] / [Partner B] and other brackets are placeholders the results fill in live.',
  indexRows: [
    ['1.', 'Reflection questions', `${ANNIVERSARY_QUESTIONS.length} questions, by category`],
    ['2.', 'Results insights', `${insights.length} conditional blurbs`],
  ],
});

// ── SECTION 1 — questions ────────────────────────────────────────────────────
const cats = [];
for (const q of ANNIVERSARY_QUESTIONS) { if (!cats.includes(q.category)) cats.push(q.category); }
const TYPE_NOTE = { scale: 'scale', text: 'free text', pick: 'pick one', rank: 'rank order' };
const section1 = [
  ...bigSection(1, 'Reflection questions',
    'The full question set each partner answers, grouped by category. Scale questions show their rating labels left to right.', ORANGE),
  ...cats.flatMap((cat, ci) => {
    const qs = ANNIVERSARY_QUESTIONS.filter(q => q.category === cat);
    const out = [midSection(`1.${ci + 1}`, cat, ORANGE, { extras: `${qs.length} question${qs.length > 1 ? 's' : ''}` })];
    qs.forEach((q, qi) => {
      out.push(smallSection(`1.${ci + 1}.${qi + 1}`, '', ORANGE, { before: 200, inline: q.text }));
      if (q.type === 'scale' && q.scaleLabels) out.push(prose(q.scaleLabels.map((l, k) => `${k + 1}. ${l}`).join('   ·   '), { indent: INDENT_PROSE_UNDER_SMALL, color: MUTED }));
      else if ((q.type === 'pick' || q.type === 'rank') && q.options) out.push(prose(q.options.join('   ·   '), { indent: INDENT_PROSE_UNDER_SMALL, color: MUTED }));
      else if (q.placeholder) out.push(prose('Example: ' + q.placeholder, { indent: INDENT_PROSE_UNDER_SMALL, italics: true, color: MUTED }));
      out.push(caption(TYPE_NOTE[q.type] || q.type, MUTED, INDENT_PROSE_UNDER_SMALL));
    });
    return out;
  }),
];

// ── SECTION 2 — results insights ─────────────────────────────────────────────
const section2 = [
  ...bigSection(2, 'Results insights',
    'Each blurb appears only when the two partners\u2019 answers trigger it. Two kinds: a strength (when answers align) and a gap to explore (when they differ). Voice: short declarative, no em dashes, neither partner framed as the one who needs to change.', PURPLE),
  ...insights.flatMap((ins, i) => {
    const isGap = ins.type === 'explore';
    const badge = isGap ? 'GAP TO EXPLORE' : 'STRENGTH';
    const badgeColor = isGap ? RED : GREEN;
    const out = [
      midSection(`2.${i + 1}`, ins.title || '(untitled)', PURPLE, { extras: ins.ctx || undefined }),
      tag(badge, badgeColor, 400),
    ];
    if (ins.body) out.push(prose(ins.body, { indent: 400 }));
    if (ins.priority) { out.push(tag('Priority', BLUE, 400)); out.push(prose(ins.priority, { indent: 400 })); }
    if (ins.action) { out.push(tag('Suggested action', ORANGE, 400)); out.push(prose(ins.action, { indent: 400 })); }
    if (ins.note) { out.push(tag('Couple-type note', PURPLE, 400)); out.push(prose(ins.note, { indent: 400, italics: true })); }
    return out;
  }),
];

await renderDoc({
  footerLabel: 'Attune · Relationship Reflection results review',
  outPath: '/mnt/user-data/outputs/attune_reflection_results_review.docx',
  children: [...cover, ...section1, ...section2],
});
