// Communication (Exercise 01) reference doc — every question, grouped by dimension.
import { PERSONALITY_QUESTIONS, PARTNER_VIEW_ITEMS } from '../api/_questions.js';
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
children.push(body((PERSONALITY_QUESTIONS.length + PARTNER_VIEW_ITEMS.length) + ' forced-choice questions. ' + PERSONALITY_QUESTIONS.length + ' are about you and ' + PARTNER_VIEW_ITEMS.length + ' are about how your partner shows up, woven in beside the related question. Each maps to one of 10 communication dimensions, which roll up into two axes: Engage / Withdraw and Open / Guarded. There is no right answer. Each option describes a real, workable way of relating. The point is where each partner sits, and where the two of you differ.'));
children.push(small('Format: pick A or B. Partners answer independently, then see their answers side by side once both finish.'));
children.push(small('Five questions ask about your partner rather than yourself. They are marked "About your partner" and appear beside the related question about you.'));
children.push(rule());

for (const dim of DIMS) {
  const meta = DIM_META[dim]; if (!meta) continue;
  const qs = PERSONALITY_QUESTIONS.filter(q => q.dimension === dim);
  if (!qs.length) continue;
  const ax = DIM_AXIS[dim];
  children.push(h1(meta.label));
  children.push(kv('Axis', ax ? AXIS_NAME[ax.axis] : '—', BLUE));
  children.push(kv('Poles', meta.left + '  <->  ' + meta.right, ORANGE));
  qs.forEach(q => {
    children.push(qLine(q.text));
    children.push(optLine('A', q.a));
    children.push(optLine('B', q.b));
  });
  const pvs = PARTNER_VIEW_ITEMS.filter(pv => pv.dimension === dim);
  pvs.forEach(pv => {
    children.push(new Paragraph({ spacing:{before:150,after:20}, children:[ run('About your partner', {size:16,italics:true,bold:true,color:PURPLE}) ] }));
    children.push(qLine(pv.text));
    children.push(optLine('A', pv.a));
    children.push(optLine('B', pv.b));
  });
}
children.push(rule());
children.push(small('Total questions: ' + (PERSONALITY_QUESTIONS.length + PARTNER_VIEW_ITEMS.length) + ' (' + PERSONALITY_QUESTIONS.length + ' about yourself, ' + PARTNER_VIEW_ITEMS.length + ' about your partner). Dimensions: ' + DIMS.length + '.'));

await saveDoc('attune_comms_exercise', children, { title:'Attune Communication Exercise' });
