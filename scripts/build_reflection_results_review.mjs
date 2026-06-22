// Relationship Reflection results review — the reflection questions and the
// results insight blurbs, in the same format as the specific content review.
// Reads live from src/App.jsx (ANNIVERSARY_QUESTIONS + deriveAnniversaryInsights).

import { readFileSync } from 'fs';
import {
  ORANGE, PURPLE, GREEN, BLUE, INK, MUTED, RED,
  bigSection, midSection, smallSection, prose, caption, groupLabel, tag,
  buildCover, renderDoc, evalConst, INDENT_PROSE_UNDER_SMALL, INDENT_SMALL,
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
  ctx = ctx.replace(/^-+\s*|\s*-+$/g, '').replace(/\(.*?\)/g, '').replace(/\s*[\u2014\u2013]\s*/g, ', ').trim();
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

// ── free-response analysis: pull the keyword lists live ──────────────────────
// These lists are what the analysis scans free-text answers for. They are the
// part most worth reviewing: literal, case-insensitive substring matching, so a
// list that is too broad or too narrow changes which prompt a couple sees.
const KW = {};
for (const n of ['homeWords', 'seenWords', 'adventureWords', 'ritualWords', 'financialWords', 'spaceWords', 'presenceWords', 'expressionWords', 'stressWords', 'communicationWords']) {
  try { KW[n] = evalConst(src, n); } catch { KW[n] = []; }
}
const wlist = (...names) => names.map(n => (KW[n] || []).map(w => `“${w}”`).join(', ')).join('  |  ');

// Trigger map, in the order the analysis runs. Each entry: the question(s) it
// reads, how it analyzes them, and what fires the strength vs gap variant.
const TRIGGERS = [
  { topic: 'Overall feel', qs: 'a0 · scale', method: 'Scale gap',
    detail: 'Compares the two overall-feel ratings.',
    fires: [['Gap to explore', 'the ratings differ by 1 step or more'], ['Strength', 'the ratings are within 1 step']] },
  { topic: 'Fun and lightness', qs: 'a_sat_fun · scale', method: 'Scale gap, then average',
    detail: 'Looks at how far apart the fun ratings are, then how high they sit.',
    fires: [['Gap to explore', 'the ratings differ by 2 steps or more'], ['Strength', 'no large gap and the average rating is 3 or higher']] },
  { topic: 'Hard conversations', qs: 'a_sat_comm · scale', method: 'Scale gap',
    detail: 'Compares the two communication ratings.',
    fires: [['Gap to explore', 'the ratings differ by 2 steps or more']] },
  { topic: 'Shared anchors', qs: 'a1 + a2 · free text', method: 'Keyword match across both answers',
    detail: 'Both partners\u2019 proud-moment and challenge answers are joined into one block and scanned.',
    words: ['homeWords'],
    fires: [['Strength', '3 or more of the listed words appear anywhere in the combined text']] },
  { topic: 'Feeling seen', qs: 'a3 · free text', method: 'Keyword match',
    detail: 'Each partner\u2019s gratitude answer is scanned on its own.',
    words: ['seenWords'],
    fires: [['Strength', 'either partner\u2019s answer contains any listed word']] },
  { topic: 'What you want next', qs: 'a4 · free text', method: 'Two keyword sets, one per partner',
    detail: 'Checks whether the partners are reaching for different things.',
    words: ['adventureWords', 'ritualWords'],
    fires: [['Gap to explore', 'one partner matches the adventure words and the other matches the ritual words']] },
  { topic: 'Five-year picture', qs: 'a5 · free text', method: 'Two keyword sets, one per partner',
    detail: 'Checks for a financial-stability theme against a home-and-space theme.',
    words: ['financialWords', 'spaceWords'],
    fires: [['Gap to explore', 'one partner matches the financial words and the other matches the space words']] },
  { topic: 'Growth edges', qs: 'a6 · free text', method: 'Two keyword sets, one per partner',
    detail: 'Checks whether each partner named the thing that would most help the other.',
    words: ['presenceWords', 'expressionWords'],
    fires: [['Strength', 'one partner matches the presence words and the other matches the expression words']] },
  { topic: 'Admiration', qs: 'a8 · pick one', method: 'Exact match',
    detail: 'Compares the single quality each partner picked.',
    fires: [['Strength', 'both answered and picked the same quality'], ['Strength', 'both answered and picked different qualities']] },
  { topic: 'What you\u2019d change', qs: 'a7 · free text', method: 'Keyword match',
    detail: 'Both answers are scanned. The matched variant calls out a pressure pattern; otherwise a general variant is used.',
    words: ['stressWords', 'communicationWords'],
    fires: [['Gap to explore', 'either answer contains a stress or communication word: the broke-down-under-pressure variant'], ['Gap to explore', 'neither does: the general each-named-something variant']] },
  { topic: 'Priorities', qs: 'a_priority · rank', method: 'Rank comparison',
    detail: 'Compares the ranked lists, looking at the top pick and the widest single-item gap.',
    fires: [['Strength', 'both ranked the same item first'], ['Gap to explore', 'the top items differ'], ['Gap to explore', 'any one item differs by 3 or more rank positions']] },
];

// ── cover ───────────────────────────────────────────────────────────────────
const cover = buildCover({
  title: 'Relationship Reflection results',
  subtitle: 'The reflection questions and every results insight, numbered for reference.',
  howToUse: 'Section 1 is the question set. Section 2 explains how each answer is analyzed and what triggers each feedback prompt (the part to review for the free-text keyword lists). Section 3 is the prompts themselves. [Partner A] / [Partner B] and other brackets are placeholders the results fill in live.',
  indexRows: [
    ['1.', 'Reflection questions', `${ANNIVERSARY_QUESTIONS.length} questions, by category`],
    ['2.', 'How answers become feedback', `${TRIGGERS.length} triggers, keyword lists + thresholds`],
    ['3.', 'Results insights', `${insights.length} conditional prompts`],
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

// ── SECTION 2 — how answers become feedback ──────────────────────────────────
const GREY = '6B7280';
const section2 = [
  ...bigSection(2, 'How answers become feedback',
    'What the analysis reads and what triggers each prompt. Free-text answers are scanned for whole words from fixed lists, case-insensitive, anywhere in the text. The match is literal and approximate, not clinical. The lists below are the live ones. Review them for words that are too broad, too narrow, or missing.', BLUE),
  ...TRIGGERS.flatMap((t, i) => {
    const out = [
      midSection(`2.${i + 1}`, t.topic, BLUE, { extras: t.qs }),
      smallSection(`2.${i + 1}.1`, 'How it is analyzed', BLUE, { before: 160, inline: t.method }),
    ];
    if (t.detail) out.push(prose(t.detail, { indent: INDENT_PROSE_UNDER_SMALL }));
    if (t.words) {
      out.push(tag('Words it looks for', GREEN, INDENT_PROSE_UNDER_SMALL));
      if (t.words.length === 1) {
        out.push(prose(wlist(t.words[0]), { indent: INDENT_PROSE_UNDER_SMALL, color: GREY }));
      } else {
        const setNames = { adventureWords: 'Adventure', ritualWords: 'Ritual', financialWords: 'Financial', spaceWords: 'Home and space', presenceWords: 'Presence', expressionWords: 'Expression', stressWords: 'Stress', communicationWords: 'Communication' };
        t.words.forEach(n => {
          out.push(prose(`${setNames[n] || n}: ${wlist(n)}`, { indent: INDENT_PROSE_UNDER_SMALL, color: GREY }));
        });
      }
    }
    out.push(tag('What it triggers', ORANGE, INDENT_PROSE_UNDER_SMALL));
    t.fires.forEach(([variant, cond]) => {
      out.push(prose(`${variant}: ${cond}.`, { indent: INDENT_PROSE_UNDER_SMALL }));
    });
    return out;
  }),
];

// ── SECTION 3 — results insights ─────────────────────────────────────────────
const section3 = [
  ...bigSection(3, 'Results insights',
    'The prompts themselves, in the order the analysis produces them. Each appears only when its trigger (Section 2) fires. Two kinds: a strength when answers align, a gap to explore when they differ. Voice: short declarative, no em dashes, neither partner framed as the one who needs to change.', PURPLE),
  ...insights.flatMap((ins, i) => {
    const isGap = ins.type === 'explore';
    const badge = isGap ? 'GAP TO EXPLORE' : 'STRENGTH';
    const badgeColor = isGap ? RED : GREEN;
    const out = [
      midSection(`3.${i + 1}`, ins.title || '(untitled)', PURPLE, { extras: ins.ctx || undefined }),
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
  children: [...cover, ...section1, ...section2, ...section3],
});
