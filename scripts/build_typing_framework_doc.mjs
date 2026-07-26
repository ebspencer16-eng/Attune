// Couple Typing Framework — the methodology behind the types.
import { INDIVIDUAL_TYPES, NEW_COUPLE_TYPES } from './_type_data.mjs';
import { DIM_META, DIM_AXIS, DIMS } from '../api/_workbook-content.js';
import { Paragraph } from 'docx';
import { run, eyebrow, title, h1, h2, body, kv, small, bullet, rule, pairTable, saveDoc, ORANGE, BLUE, INK, MUTED } from './_doc_style.mjs';

// Weights (single source of truth: computeIndividualType comment in App.jsx)
const EW_WEIGHTS = [['Conflict Style','.45'],['Communication Under Stress','.25'],['How You Repair','.15'],['Energy & Recharge','.10'],['How You Listen','.05']];
const OG_WEIGHTS = [['Emotional Expression','.40'],['Giving & Receiving Feedback','.25'],['How You Ask for Needs','.20'],['Bids for Connection','.10'],['How Love Lands','.05']];

const children = [];
children.push(eyebrow('Attune · Reference · Typing Framework', ORANGE));
children.push(title('The Couple Typing Framework'));
children.push(body('How Attune turns the Communication exercise into a type. Two axes, four individual types, ten couple dynamics. This is the methodology, kept in one place so the model stays legible.'));
children.push(rule());

children.push(h1('Two axes'));
children.push(body('Every communication dimension loads onto one of two axes. Each partner gets a score from 1 to 5 on each axis, and the axis score decides which side of the type they land on.'));
children.push(h2('Engage / Withdraw', BLUE));
children.push(body('How you move when a conversation gets hard. Engagers move toward it; withdrawers need space first. Neither is avoidance, and neither is better.'));
children.push(pairTable([['Dimension','Weight'], ...EW_WEIGHTS], 60));
children.push(small('Some dimensions are oriented by spectrum (stress, energy, listening) so that a high reading always points the same way on the axis.'));
children.push(h2('Open / Guarded', BLUE));
children.push(body('How much of your inner world you share, and how directly. Open partners externalize; guarded partners process privately and share selectively.'));
children.push(pairTable([['Dimension','Weight'], ...OG_WEIGHTS], 60));
children.push(rule());

children.push(h1('The 3.0 boundary'));
children.push(body('The midpoint is 3.0. The boundary is intentionally asymmetric: engage and open are inclusive of 3.0, withdraw and guarded are exclusive. A score right at the middle reads as engage / open. This is a methodology choice, not an accident, and it keeps the assignment deterministic.'));
children.push(rule());

children.push(h1('Four individual types'));
children.push(body('The two axes combine into four types. W = engage + open. X = engage + guarded. Y = withdraw + open. Z = withdraw + guarded.'));
for (const code of ['W','X','Y','Z']) {
  const t = INDIVIDUAL_TYPES[code];
  children.push(kv(t.name + ' (' + code + ')', t.axis1 + ' + ' + t.axis2 + ' — ' + t.desc, t.color.replace('#','')));
}
children.push(rule());

children.push(h1('Ten couple dynamics'));
children.push(body('Two individual types pair into one of ten couple dynamics: four same-type and six cross-type. Order does not matter (W+X is the same dynamic as X+W).'));
NEW_COUPLE_TYPES.forEach(t => children.push(kv(t.id + ' · ' + t.name, String(t.tagline).replace(/\{U\}/g,'Partner A').replace(/\{P\}/g,'Partner B'), BLUE)));
children.push(rule());
children.push(small('Dimension labels and axis assignments are read live from api/_workbook-content.js (DIM_META, DIM_AXIS). Type prose from App.jsx (INDIVIDUAL_TYPES, NEW_COUPLE_TYPES).'));

await saveDoc('attune_typing_framework', children, { title:'Attune Typing Framework' });
