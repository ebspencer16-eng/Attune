// Comms restructure — change review doc.
//
// One doc covering everything that changed when the Communication exercise went
// from 28 questions / closeness to 24 questions / listening. For Ellie + Carolina
// to redline before we rebuild the official workbook + results docs.
//
// Sections:
//   1. Summary of changes
//   2. The new 24-question set (read live from api/_questions.js) with change tags
//   3. Listening — results content (mirrors src/App.jsx as committed)
//   4. Listening — workbook content (DRAFT for review; not yet in code)
//   5. Retired: closeness (what's coming out)
//
// Output: /mnt/user-data/outputs/attune_comms_change_review.docx

import { writeFileSync, mkdirSync } from 'node:fs';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, BorderStyle, WidthType, ShadingType, Footer, PageNumber, AlignmentType,
} from '/home/claude/.npm-global/lib/node_modules/docx/dist/index.mjs';

import { PERSONALITY_QUESTIONS } from '../api/_questions.js';

const OUT = '/mnt/user-data/outputs';
mkdirSync(OUT, { recursive: true });

const ORANGE = 'C8522E', INK = '0E0B07', MUTED = '8C7A68', STONE = 'E8DDD0', BLUE = '1B5FE8', PURPLE = '7C3AED';

const p = (text, o = {}) => new Paragraph({
  children: [new TextRun({ text, size: o.size || 22, bold: o.bold, italics: o.italics, color: o.color || INK })],
  spacing: { after: o.after ?? 80, before: o.before ?? 0 }, indent: o.indent ? { left: o.indent } : undefined,
});
const bullet = (text, o = {}) => new Paragraph({
  bullet: { level: 0 }, spacing: { after: o.after ?? 40 },
  children: [new TextRun({ text, size: 22, color: o.color || INK })],
});
const h1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 260, after: 120 }, children: [new TextRun({ text })] });
const h2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 }, children: [new TextRun({ text })] });
const eyebrow = (text, color = ORANGE) => new Paragraph({ spacing: { before: 140, after: 40 }, children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 16, color, characterSpacing: 30 })] });
const rule = () => new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: STONE } }, spacing: { after: 120 } });
const tag = (text, color) => new TextRun({ text: ` ${text} `, bold: true, size: 15, color: 'FFFFFF', highlight: undefined, shading: { fill: color, type: ShadingType.CLEAR } });

const cell = (runs, o = {}) => new TableCell({
  width: { size: o.width, type: WidthType.DXA },
  shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR } : undefined,
  margins: { top: 80, bottom: 80, left: 120, right: 120 },
  borders: { top: { style: BorderStyle.SINGLE, size: 4, color: STONE }, bottom: { style: BorderStyle.SINGLE, size: 4, color: STONE }, left: { style: BorderStyle.SINGLE, size: 4, color: STONE }, right: { style: BorderStyle.SINGLE, size: 4, color: STONE } },
  children: (Array.isArray(runs) ? runs : [runs]).map(t => t instanceof Paragraph ? t : new Paragraph({ children: [new TextRun({ text: String(t), size: 20 })] })),
});

const footer = () => new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: ['Page ', PageNumber.CURRENT], size: 16, color: MUTED })] })] });
const mkDoc = (children) => new Document({
  styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
  sections: [{ properties: { page: { margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } } }, footers: { default: footer() }, children }],
});

// ─── change tags per question id ────────────────────────────────────────────
const CHANGE = {
  lv1: 'CARRIED OVER', lv2: 'CARRIED OVER', lv5: 'CARRIED OVER',
  en4: 'CARRIED OVER', en6: 'NEW',
  ex6: 'NEW', ex7: 'NEW', ex8: 'MOVED FROM APPRECIATION', ex9: 'NEW', ex10: 'NEW',
  bd1: 'CARRIED OVER', bd3: 'CARRIED OVER', bd4: 'CARRIED OVER',
  nd5: 'TEXT UPDATED', nd1: 'CARRIED OVER',
  st1: 'TEXT UPDATED', cf1: 'CARRIED OVER', cf6: 'NEW', cf2: 'CARRIED OVER',
  ls1: 'NEW DIMENSION',
  rp3: 'CARRIED OVER', rp2: 'CARRIED OVER', rp6: 'NEW', fb5: 'CARRIED OVER',
};
const TAGCOLOR = { 'NEW': BLUE, 'NEW DIMENSION': PURPLE, 'MOVED FROM APPRECIATION': ORANGE, 'TEXT UPDATED': MUTED, 'CARRIED OVER': 'A8A29E' };
const CHAPTERS = [
  { title: "Chapter 1 — How You're Wired", ids: ['lv1','lv2','ex6','en4','ex7'] },
  { title: 'Chapter 2 — How You Connect', ids: ['lv5','bd1','bd3','bd4','nd5','nd1'] },
  { title: 'Chapter 3 — When Things Get Hard', ids: ['st1','cf1','cf6','cf2','ls1'] },
  { title: 'Chapter 4 — Making Things Right', ids: ['rp3','rp2','rp6','fb5'] },
  { title: 'Chapter 5 — Everyday Life Together', ids: ['en6','ex8','ex9','ex10'] },
];
const DIM_LABEL = { love: 'Love', expression: 'Expression', energy: 'Energy', bids: 'Bids', needs: 'Needs', stress: 'Stress', conflict: 'Conflict', listening: 'Listening', repair: 'Repair', feedback: 'Feedback' };
const byId = Object.fromEntries(PERSONALITY_QUESTIONS.map(q => [q.id, q]));

// ─── listening RESULTS content (mirrors src/App.jsx as committed) ────────────
// A = the partner leaning more Reflective; B = the partner leaning more Responsive.
const LISTEN_RESULTS_BLURBS = {
  '1_1': `You both listen by going quiet and staying with it. Neither of you rushes to respond. That makes you calm to talk to. The risk: silence can read as absence. A small signal, a nod, a short "I'm with you," tells the other you're still there.`,
  '1_2': `A listens quietly and stays with it; B leans the same way, a little more active. Close match. Just check that neither of you reads the other's quiet as checking out. A word now and then confirms you're tracking.`,
  '1_3': `A listens by sitting with it; B shifts between quiet and active. The shift: B can name when they're just receiving versus ready to engage, so A isn't guessing which one is happening.`,
  '1_4': `A takes things in quietly; B responds, asks, reflects back. A real difference in how you each show you're listening. B's questions are care, not pressure. A's quiet is attention, not distance.`,
  '1_5': `A listens in silence and stays there; B listens by engaging and drawing it out. A wide gap, and an easy one to misread. B's questions aren't interruption. A's quiet isn't disinterest. Name what each of you is doing so neither has to assume.`,
  '2_2': `You both lean toward quiet listening. Low pressure, easy to talk near. The gap: when one of you wants a response and not just presence, neither offers it by instinct. Ask directly when you want to be answered, not only heard.`,
  '2_3': `A leans toward quiet listening; B moves between modes. Small gap. B can match A's pace when something is tender, and step in with questions when A wants to be drawn out.`,
  '2_4': `A listens more quietly; B engages more actively. When B reflects back or asks, that's how they show care. When A stays quiet, that's how they stay present. Say which one you need in the moment.`,
  '2_5': `A tends to receive quietly; B engages hard, asks, fills the space. The shift: B can leave room before jumping in, and A can offer a word so B knows the silence is full, not empty.`,
  '3_3': `You both adjust how you listen depending on the day. That's adaptive. Watch for: in a hard moment, you each default to a mode the other didn't expect. When it matters, say what you need, presence or engagement.`,
  '3_4': `B leans more toward active listening than A. Small but real. B can carry the engagement. A can ask a question sometimes, even a small one, so the drawing-out runs both directions.`,
  '3_5': `A is flexible; B listens by engaging, reflecting, asking. B's questions are how they connect, not a demand for more than you have. A can meet it with a short answer rather than retreating into quiet.`,
  '4_4': `You both listen by engaging, asking, reflecting back. Conversations move. Watch for: two people responding at once crowds out the actual listening. Let one person finish and sit with it before the other steps in.`,
  '4_5': `Both of you listen actively, B more so. You draw each other out, which keeps you current. When one of you wants to be heard and not questioned, say so. Active listening tips into problem-solving when the other just wanted presence.`,
  '5_5': `You both listen by engaging fully, asking, responding. Nothing sits unaddressed for long. The watch-out: sometimes a person needs silence and room, not questions. Build a way to say "I just want you to listen for a minute" without it landing as criticism.`,
};
const GAPLABEL = { '1_1':'Both strongly A','1_2':'A strong / B lean A','1_3':'A strong / B middle','1_4':'A strong / B lean B','1_5':'A strong / B strong (widest gap)','2_2':'Both lean A','2_3':'A lean A / B middle','2_4':'A lean A / B lean B','2_5':'A lean A / B strong','3_3':'Both middle','3_4':'A middle / B lean B','3_5':'A middle / B strong','4_4':'Both lean B','4_5':'B lean / B strong','5_5':'Both strongly B' };
const LISTEN_ACTION = {
  title: "Match presence to what's needed",
  thisWeek: "This week, when one of you brings something up, ask first: 'do you want me to just listen, or do you want me to weigh in?' Then do that one thing.",
};
const LISTEN_PROMPT = "When you bring something to me, do you want me to listen, or do you want me to respond and ask questions?";

// ─── listening WORKBOOK content — DRAFT (not yet in code) ────────────────────
const LISTEN_WB = {
  meta: { label: 'How You Listen', left: 'Reflective', right: 'Responsive' },
  measures: "How each partner shows they're listening when the other brings something up. One end receives quietly and sits with it. The other engages actively, reflecting back, asking, responding. Both are real listening. They land differently.",
  closeText: "{U} and {P} listen in compatible ways. When you bring something to each other, the response tends to match what the speaker wanted, so neither has to translate being heard.",
  gapText: "One of you listens by going quiet and staying with it. The other listens by responding, asking, reflecting back. The quiet listener can read questions as pressure. The active listener can read silence as distance. Neither is failing to listen. You're showing it in different languages.",
  prompts: [
    "When you bring something to each other, do you want to be heard, or do you want a response?",
    "Has either of you ever read the other's quiet as not caring, or the other's questions as pushing?",
    "In a hard moment, which do you need first: room to be heard, or active engagement?",
    "How can each of you signal which kind of listening you need in the moment?",
  ],
  thisWeek: "This week, before responding when your partner brings something up, ask once: 'do you want me to just listen, or do you want me to weigh in?' Then do that.",
  gapBlurbs: {
    aligned: "You listen in similar ways. When one of you brings something up, the attention the other offers tends to match what the speaker wanted.",
    some_gap: "You listen a little differently. One of you leans toward quiet receiving, the other toward active response. Small mismatches in what being heard looks like can add up.",
    notable_gap: "You listen in notably different ways. One receives in silence; the other engages, asks, reflects back. Name which one you need in a given moment, so quiet doesn't read as distance and questions don't read as pressure.",
  },
  axis: "Engage/Withdraw axis. Responsive (B) sits at the engage end, Reflective (A) at the withdraw end. Weight 0.05 (same slot closeness held).",
  whenShowsUp: {
    WW: "Both of you listen by engaging, asking, responding. Conversations move fast. Build in a beat where one of you just receives before the other jumps in, so the listening doesn't get crowded out by the responding.",
    XX: "Both of you respond and stay in it, but you process before you say much back. Say the small acknowledgment out loud, an 'I hear you,' so the other knows they've landed while you're still thinking.",
    YY: "Both of you take things in quietly before you respond. That's deep listening, but in a hard moment two quiet listeners can each wait for the other to engage. Agree on who reflects back first.",
    ZZ: "Both of you listen by going quiet and sitting with it. Real attention, easy to miss. Build a small signal, a word or a touch, so the other knows the silence is full, not empty.",
    WX: "[W partner name] responds quickly and out loud, while [X partner name] takes it in before answering. [W partner name] can leave a beat after [X partner name] speaks. [X partner name] can offer a quick 'still with you' so the quiet doesn't read as distance.",
    WY: "[W partner name] listens by engaging and asking, while [Y partner name] needs to receive quietly first. [W partner name] can hold the questions a moment. [Y partner name] can name 'I'm taking this in' so the quiet isn't mistaken for pulling away.",
    WZ: "[W partner name] responds and asks; [Z partner name] receives quietly and says little back. [W partner name] can read the quiet as attention, not absence. [Z partner name] can offer one small signal so [W partner name] knows it landed.",
    XY: "[X partner name] responds once they've processed; [Y partner name] takes it in and surfaces it later. Both of you listen deeply, neither shows it in the moment. Say the small acknowledgment out loud so each of you knows the other is there.",
    XZ: "Both of you receive quietly and respond sparingly. Genuine attention, low signal. Build a habit of one verbal acknowledgment when the other brings something, so being heard is visible.",
    YZ: "Both of you go quiet to listen, and both surface things slowly. In a hard moment, decide who reflects back first so a real exchange doesn't stall in two kinds of silence.",
  },
};

// ════════════════════════════════════════════════════════════════════
const c = [];
c.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'ATTUNE · COMMUNICATION EXERCISE · CHANGE REVIEW', bold: true, size: 18, color: ORANGE, characterSpacing: 40 })] }));
c.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: 'What Changed — For Review' })] }));
c.push(p('Everything that changed when the Communication exercise moved from 28 questions to 24, and from the closeness dimension to listening. Questions are read live from the code. Results content mirrors what is now live. Workbook content for listening is a draft, not yet in the code. Once this is approved, the official workbook and results docs get rebuilt from it.', { italics: true, color: MUTED, after: 160 }));

// 1. SUMMARY
c.push(h1('1. Summary of changes'));
c.push(bullet('Question count: 28 down to 24. Still 10 dimensions.'));
c.push(bullet('Closeness and Independence is retired as a dimension. Its shared-vs-independent idea now lives as one Energy question (social calendars).'));
c.push(bullet('Listening is the one new dimension. Poles: Reflective (sit with it) and Responsive (respond, ask, reflect back). Neither is framed as better.'));
c.push(bullet('Appreciation is folded into Expression. It is about how you voice feelings, so it sits with the other expression questions.'));
c.push(bullet('One Expression question (feel most understood) is stored with its poles ordered so it scores consistently with the other expression items. Display order can flip back in one line if you prefer the document order.'));
c.push(bullet('Question counts per dimension are now uneven: expression 5; love, bids, conflict, repair 3; energy, needs 2; stress, feedback, listening 1. Averaging keeps the type math sound. Single-question dimensions can be expanded later if wanted.'));

// 2. NEW QUESTION SET
c.push(h1('2. The new question set (24)'));
c.push(p('Read live from the exercise. Tag shows what changed. A is the left pole, B the right.', { italics: true, color: MUTED, after: 120 }));
CHAPTERS.forEach(ch => {
  c.push(h2(ch.title));
  ch.ids.forEach(id => {
    const q = byId[id]; if (!q) return;
    const t = CHANGE[id] || '';
    c.push(new Paragraph({ spacing: { before: 100, after: 30 }, children: [
      new TextRun({ text: `${DIM_LABEL[q.dimension]}  `, bold: true, size: 19, color: ORANGE }),
      ...(t ? [tag(t, TAGCOLOR[t] || MUTED)] : []),
    ] }));
    c.push(p(q.text, { bold: true, after: 30 }));
    c.push(p(`A.  ${q.a}`, { after: 20, indent: 240 }));
    c.push(p(`B.  ${q.b}`, { after: 40, indent: 240 }));
  });
});

// 3. LISTENING — RESULTS CONTENT
c.push(h1('3. Listening — results content'));
c.push(p('This is live in the results experience now. A = the partner leaning more Reflective, B = more Responsive.', { italics: true, color: MUTED, after: 80 }));
c.push(p(`Dimension label: "${LISTEN_WB.meta.label}"   ·   Poles: ${LISTEN_WB.meta.left} (A) — ${LISTEN_WB.meta.right} (B)`, { after: 120 }));
c.push(eyebrow('Per-gap interpretation (shown on the dimension page, by how far apart you scored)'));
Object.entries(LISTEN_RESULTS_BLURBS).forEach(([k, text]) => {
  c.push(p(GAPLABEL[k] || k, { bold: true, size: 18, color: BLUE, before: 80, after: 20 }));
  c.push(p(text, { after: 40 }));
});
c.push(eyebrow('Action plan (shown when this dimension is a gap)', BLUE));
c.push(p(`Title: ${LISTEN_ACTION.title}`, { bold: true, after: 20 }));
c.push(p(`Try this week: ${LISTEN_ACTION.thisWeek}`, { after: 80 }));
c.push(eyebrow('Conversation prompt', BLUE));
c.push(p(LISTEN_PROMPT, { after: 80 }));
c.push(eyebrow('Style-code axis', BLUE));
c.push(p('The 6-letter style code now reads Listening (Responsive / Reflective) where it used to read Closeness (Close-seeking / Autonomous).', { after: 80 }));

// 4. LISTENING — WORKBOOK CONTENT (DRAFT)
c.push(h1('4. Listening — workbook content (DRAFT)'));
c.push(p('Not in the code yet. This is the draft that will fill the workbook structures closeness used to. Redline freely.', { italics: true, color: MUTED, after: 100 }));
c.push(eyebrow('What it measures'));
c.push(p(LISTEN_WB.measures, { after: 60 }));
c.push(eyebrow('If aligned'));
c.push(p(LISTEN_WB.closeText, { after: 60 }));
c.push(eyebrow('If there is a gap'));
c.push(p(LISTEN_WB.gapText, { after: 60 }));
c.push(eyebrow('Reflection prompts'));
LISTEN_WB.prompts.forEach(pr => c.push(bullet(pr)));
c.push(eyebrow('Try this week'));
c.push(p(LISTEN_WB.thisWeek, { after: 60 }));
c.push(eyebrow('Short gap states (row summaries)'));
c.push(p('Aligned: ' + LISTEN_WB.gapBlurbs.aligned, { after: 30 }));
c.push(p('Some gap: ' + LISTEN_WB.gapBlurbs.some_gap, { after: 30 }));
c.push(p('Notable gap: ' + LISTEN_WB.gapBlurbs.notable_gap, { after: 60 }));
c.push(eyebrow('How this shows up by couple type'));
Object.entries(LISTEN_WB.whenShowsUp).forEach(([type, text]) => {
  c.push(p(type, { bold: true, size: 18, color: ORANGE, before: 60, after: 16 }));
  c.push(p(text, { after: 30 }));
});
c.push(eyebrow('Scoring orientation (for reference, not customer-facing)', MUTED));
c.push(p(LISTEN_WB.axis, { color: MUTED, after: 80 }));

// 5. RETIRED: CLOSENESS
c.push(h1('5. Retired: closeness'));
c.push(p('Coming out of the exercise, results, and workbook. Listed so nothing is missed in the rebuild.', { italics: true, color: MUTED, after: 80 }));
c.push(bullet('Dimension "Closeness & Independence" (poles Autonomous / Close-seeking) and its single question.'));
c.push(bullet('Its results gap blurbs, action plan ("Design your together-apart rhythm"), and conversation prompt.'));
c.push(bullet('Its workbook block (measures, aligned/gap text, prompts, the 10 per-couple-type entries) and its row in the dimension table.'));
c.push(bullet('The shared-vs-independent idea is preserved as the new Energy social-calendar question, so the theme is not lost.'));

writeFileSync(`${OUT}/attune_comms_change_review.docx`, await Packer.toBuffer(mkDoc(c)));
console.log(`Wrote ${OUT}/attune_comms_change_review.docx`);
