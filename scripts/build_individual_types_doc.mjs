// Individual type descriptions — the 4 communication types (W/X/Y/Z).
import { INDIVIDUAL_TYPES } from './_type_data.mjs';
import { Paragraph } from 'docx';
import { run, eyebrow, title, h1, h2, body, kv, small, rule, saveDoc, ORANGE, BLUE, INK, MUTED } from './_doc_style.mjs';

const children = [];
children.push(eyebrow('Attune · Reference · Individual Types', ORANGE));
children.push(title('The Four Communication Types'));
children.push(body('Each person lands in one of four types, defined by where they sit on two axes: Engage / Withdraw (how you move toward or away from a hard conversation) and Open / Guarded (how much of your inner world you share). Neither pole is better. The type is a description of how someone is wired, not a verdict.'));
children.push(rule());

for (const code of ['W','X','Y','Z']) {
  const t = INDIVIDUAL_TYPES[code];
  children.push(h1(t.name + '  (' + code + ')', t.color.replace('#','')));
  children.push(kv('Axes', t.axis1 + ' + ' + t.axis2, BLUE));
  children.push(kv('In a line', t.desc, ORANGE));
  children.push(h2('How you are wired'));
  children.push(body(t.wired));
  children.push(h2('What this means in a relationship'));
  children.push(body(t.typeDesc));
  children.push(rule());
}
children.push(small('Types combine into 10 couple pairings. See the Couple Type reference sheet and the Typing Framework.'));

await saveDoc('attune_individual_types', children, { title:'Attune Individual Types' });
