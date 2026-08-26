// Couple Typing Framework — the methodology behind the types.
import { INDIVIDUAL_TYPES, NEW_COUPLE_TYPES } from './_type_data.mjs';
import { DIM_META, DIM_AXIS, DIMS } from '../api/_workbook-content.js';
import { AXIS_CONFIG, PARTNER_VIEW_BLEND } from '../api/_type-engine.js';
import { PERSONALITY_QUESTIONS } from '../api/_questions.js';
import { Paragraph } from 'docx';
import { run, eyebrow, title, h1, h2, body, kv, small, bullet, rule, pairTable, saveDoc, ORANGE, BLUE, INK, MUTED } from './_doc_style.mjs';

// Weights are read from AXIS_CONFIG (api/_type-engine.js), the scorer's own
// source of truth, so this table can never drift from the live formula.
const weightsFor = (axis) => Object.entries(AXIS_CONFIG)
  .filter(([, c]) => c.axis === axis)
  .sort((a, b) => b[1].weight - a[1].weight)
  .map(([dim, c]) => [DIM_META[dim]?.label || dim, c.weight.toFixed(2).replace(/^0/, '')]);
const invertedFor = (axis) => Object.entries(AXIS_CONFIG)
  .filter(([, c]) => c.axis === axis && c.invert)
  .map(([dim]) => (DIM_META[dim]?.label || dim).toLowerCase());
const EW_WEIGHTS = weightsFor('withdraw');
const OG_WEIGHTS = weightsFor('open');

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
children.push(small('Some dimensions are oriented by spectrum (' + invertedFor('withdraw').join(', ') + ') so that a high reading always points the same way on the axis.'));
children.push(h2('Open / Guarded', BLUE));
children.push(body('How much of your inner world you share, and how directly. Open partners externalize; guarded partners process privately and share selectively.'));
children.push(pairTable([['Dimension','Weight'], ...OG_WEIGHTS], 60));
children.push(small('Oriented by spectrum on this axis: ' + invertedFor('open').join(', ') + '.'));
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

children.push(h1('Partner-view questions'));
children.push(body('The exercise runs in two parts. Part 1 asks ' + PERSONALITY_QUESTIONS.length + ' questions about you. Part 2 asks the same ' + PERSONALITY_QUESTIONS.length + ' about your partner. Every dimension therefore carries an outside read, so the type reflects how a person comes across, not only how they see themselves.'));
children.push(body('The blend is per dimension. Where a partner-view question exists, that dimension becomes a weighted mix of the self-rating and the partner\'s read. If a partner skipped a partner-view question, that dimension falls back to the self-rating alone. No neutral filler is added.'));
// Blend weights read from PARTNER_VIEW_BLEND. Dimensions not listed there fall
// back to an even split, which the table states rather than hides.
const fmt = (n) => n.toFixed(2).replace(/^0/, '');
const BLEND_ROWS = DIMS.map(d => {
  const b = PARTNER_VIEW_BLEND[d];
  const label = DIM_META[d]?.label || d;
  return b
    ? [label, fmt(b.self) + ' / ' + fmt(b.partner)]
    : [label, '.50 / .50  (default)'];
});
children.push(pairTable([['Dimension','Blend (self / partner)'], ...BLEND_ROWS], 60));
children.push(small('The split follows visibility: whether a partner can see both ends of a dimension equally. Where one end is defined by being hard to detect (a subtle bid, an indirect ask, assumed reassurance, inward energy), the outside read is biased toward what reached them, so the dimension leads with self-report. Expression and feedback are a deliberate exception: how a person comes across is the more useful signal here, even where it is the weaker measurement of the person.'));
children.push(body('Type and placement use the blend. The dimension bars and the gap feedback stay self-reported. Only the individual type and the Couple Map reflect the partner-view blend.'));
children.push(rule());

children.push(h1('Near the line'));
children.push(body('A score within 0.6 of a boundary reads as a lean, not a fixed position. The categorical type still holds. The person is simply more flexible on that axis than a score near the extreme.'));
children.push(body('When one partner sits within 0.6 of a line, their results frame that orientation as a lean. When both partners sit within 0.6 of the same line, the results add that who plays which role may shift depending on the situation.'));
children.push(rule());
children.push(small('Dimension labels and axis assignments are read live from api/_workbook-content.js (DIM_META, DIM_AXIS). Type prose from App.jsx (INDIVIDUAL_TYPES, NEW_COUPLE_TYPES).'));

await saveDoc('attune_typing_framework', children, { title:'Attune Typing Framework' });
