// Couple type reference sheet — all 10 pairings.
import { NEW_COUPLE_TYPES } from './_type_data.mjs';
import { Paragraph } from 'docx';
import { run, eyebrow, title, h1, h2, body, kv, small, bullet, rule, saveDoc, ORANGE, BLUE, PURPLE, GREEN, INK, MUTED } from './_doc_style.mjs';

// {U}/{P} and role tokens are placeholders filled with partner names at render.
const clean = (s) => String(s||'')
  .replace(/\{U\}/g,'Partner A').replace(/\{P\}/g,'Partner B')
  .replace(/\{EXP\}/g,'the engager').replace(/\{GRD\}/g,'the guarded partner')
  .replace(/\{RCH\}/g,'the reacher').replace(/\{WDR\}/g,'the withdrawer')
  .replace(/\{[A-Za-z]+\}/g,'one partner');

const children = [];
children.push(eyebrow('Attune · Reference · Couple Types', ORANGE));
children.push(title('The 10 Couple Types'));
children.push(body('Two individual types combine into one of 10 couple dynamics (4 same-type, 6 cross-type). Each is a dynamic, not a diagnosis. The names describe the pattern the two of you fall into, and the gap between you is the thing worth understanding, not the position. Placeholders (Partner A / Partner B, role names) are filled with real names in the live experience.'));
children.push(rule());

for (const t of NEW_COUPLE_TYPES) {
  children.push(h1(t.name + '  (' + t.id + ')', (t.color||'#1B5FE8').replace('#','')));
  children.push(kv('Pairing', t.typeA + ' + ' + t.typeB, BLUE));
  children.push(body(clean(t.tagline), { italics:true, color: MUTED }));
  children.push(body(clean(t.description)));
  if (t.nuance) { children.push(h2('The nuance')); children.push(body(clean(t.nuance))); }
  if (t.strengths?.length) { children.push(h2('Strengths')); t.strengths.forEach(s=>children.push(bullet(clean(s)))); }
  if (t.stickingPoints?.length) { children.push(h2('Sticking points')); t.stickingPoints.forEach(s=>children.push(bullet(clean(s)))); }
  if (t.patterns?.length) { children.push(h2('Patterns you may notice')); t.patterns.forEach(s=>children.push(bullet(clean(s)))); }
  if (t.tips?.length) {
    children.push(h2('Practices'));
    t.tips.forEach(tip=>{
      children.push(new Paragraph({ spacing:{before:80,after:30}, children:[ run(clean(tip.title),{bold:true,size:19,color:INK}) ]}));
      if (tip.body) children.push(body(clean(tip.body), { after:40 }));
      if (tip.phraseTry) children.push(new Paragraph({ spacing:{after:80}, indent:{left:200}, children:[ run('Try: ',{bold:true,size:17,color:GREEN}), run('“'+clean(tip.phraseTry)+'”',{size:17,italics:true,color:'2A2622'}) ]}));
    });
  }
  if (t.famousDuos?.length) {
    children.push(h2('In culture'));
    t.famousDuos.forEach(d=>children.push(bullet(d.names + (d.show?' ('+d.show+')':'') + (d.note?' — '+clean(d.note):''))));
  }
  children.push(rule());
}
await saveDoc('attune_couple_types_reference', children, { title:'Attune Couple Types' });
