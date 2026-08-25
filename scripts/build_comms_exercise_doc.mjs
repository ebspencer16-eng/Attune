// Communication (Exercise 01) reference doc — every question, grouped by dimension.
import { PERSONALITY_QUESTIONS, PARTNER_VIEW_TEXT } from '../api/_questions.js';
import { DIM_META, DIM_AXIS, DIMS } from '../api/_workbook-content.js';
import { Paragraph } from 'docx';
import { run, eyebrow, title, h1, body, small, kv, rule, saveDoc, ORANGE, BLUE, PURPLE, INK, MUTED } from './_doc_style.mjs';

const AXIS_NAME = { EW: 'Engage / Withdraw', OG: 'Open / Guarded' };
const qLine = (t) => new Paragraph({ spacing:{before:130,after:40}, children:[ run(t,{size:20,bold:true,color:INK}) ]});
const optLine = (letter,t) => new Paragraph({ spacing:{after:40}, indent:{left:240}, children:[
  run(letter+'  ',{size:18,bold:true,color:BLUE}), run(t,{size:18,color:'2A2622'}) ]});

const children = [];
children.push(eyebrow('Attune · Exercise 01 · Communication', ORANGE));
children.push(title('The Communication Exercise'));
children.push(body((PERSONALITY_QUESTIONS.length * 2) + ' forced-choice questions, in two parts. Part 1 asks ' + PERSONALITY_QUESTIONS.length + ' questions about you. Part 2 asks the same ' + PERSONALITY_QUESTIONS.length + ' about your partner. Each maps to one of 10 communication dimensions, which roll up into two axes: Engage / Withdraw and Open / Guarded. There is no right answer. Each option describes a real, workable way of relating. The point is where each partner sits, and where the two of you differ.'));
children.push(small('Format: pick A or B. Partners answer independently, then see their answers side by side once both finish.'));
children.push(small('Both versions of each question are shown together below. The Part 2 wording is marked "About your partner".'));
children.push(rule());

for (const dim of DIMS) {
  const meta = DIM_META[dim]; if (!meta) continue;
  const qs = PERSONALITY_QUESTIONS.filter(q => q.dimension === dim);
  if (!qs.length) continue;
  const ax = DIM_AXIS[dim];
  children.push(h1(meta.label));
  children.push(kv('Axis', ax ? AXIS_NAME[ax.axis] : 'Not assigned', BLUE));
  children.push(kv('Poles', meta.left + '  <->  ' + meta.right, ORANGE));
  qs.forEach(q => {
    children.push(qLine(q.text));
    children.push(optLine('A', q.a));
    children.push(optLine('B', q.b));
    const pv = PARTNER_VIEW_TEXT[q.id];
    if (!pv) return;
    children.push(new Paragraph({ spacing:{before:110,after:20}, indent:{left:240}, children:[ run('About your partner', {size:16,italics:true,bold:true,color:PURPLE}) ] }));
    children.push(new Paragraph({ spacing:{after:40}, indent:{left:240}, children:[ run(pv.text,{size:20,bold:true,color:INK}) ]}));
    children.push(optLine('A', pv.a));
    children.push(optLine('B', pv.b));
  });
}
children.push(rule());
children.push(small('Total questions: ' + (PERSONALITY_QUESTIONS.length * 2) + ' (' + PERSONALITY_QUESTIONS.length + ' about yourself, then the same ' + PERSONALITY_QUESTIONS.length + ' about your partner). Dimensions: ' + DIMS.length + '.'));

await saveDoc('attune_comms_exercise', children, { title:'Attune Communication Exercise' });
