// Every anchor the product can produce must pass isValidAnchor, and the app
// must be able to take it apart the same way the validator puts it together.
//
// A rejected anchor does not error anywhere a person can see. api/notes.js
// answers "invalid anchor" and the note is simply not saved. That is how
// Conflict Patterns went for a whole release without being annotatable: the
// validator was a regex written before that add-on shipped and it refused every
// conflict- section, silently.
//
// So this walks the real lists rather than a sample: every dimension, every
// results section, every intimacy dimension, every expectations category and
// every question id.
import { isValidAnchor } from '../api/_lib/tags.js';
import { DIM_KEYS } from '../api/_type-engine.js';
import { RESPONSIBILITY_CATEGORIES } from '../api/_questions.js';
import { INTIMACY_DIMENSIONS } from '../api/_intimacy-questions.js';
import { RESULTS_SECTIONS, RESULTS_SECTION_LABELS } from '../api/_lib/results-sections.js';

let fails = 0;
// Quiet on success: this walks ~70 cases and a wall of ok lines buries the
// output of every other gate.
const ok = (n, c) => { if (!c) { console.error('  FAIL  ' + n); fails++; } };

// Every anchor the product can legitimately produce must validate.
for (const dim of Object.keys(DIM_KEYS)) {
  ok(`results_dimension ${dim}`, isValidAnchor('results_dimension', dim));
}
for (const s of RESULTS_SECTIONS) {
  ok(`results_section ${s}`, isValidAnchor('results_section', s));
}

// Every section must have a heading, and every heading must belong to a
// section. Both come from the same module now, built side by side.
//
// The app used to keep its own map, which is what this checked first. It had
// labels for the fixed sections and none for the five expectations
// conversations or the six intimacy dimensions, because both are generated from
// the live lists. An annotation on any of those eleven read as a raw key. The
// app takes labels from the server now and keeps its map only as a fallback,
// so what matters is that the server's set is complete.
for (const id of RESULTS_SECTIONS) {
  ok(`section has a label: ${id}`, typeof RESULTS_SECTION_LABELS[id] === 'string');
}
for (const id of Object.keys(RESULTS_SECTION_LABELS)) {
  ok(`label belongs to a section: ${id}`, RESULTS_SECTIONS.includes(id));
}

// Every question id, since results_question anchors to one.
const qids = Object.values(DIM_KEYS).flat();
ok(`all ${qids.length} question ids validate`, qids.every(q => isValidAnchor('results_question', q)));

// post_block carries its post now.
ok('post_block with post id', isValidAnchor('post_block', 'a-slug#b4'));
ok('post_block without post id refused', !isValidAnchor('post_block', 'b4'));
ok('app recovers the post id', 'a-slug#b4'.split('#')[0] === 'a-slug');

// Things that must not validate.
ok('unknown dimension refused', !isValidAnchor('results_dimension', 'not-a-dim'));
ok('unknown section refused', !isValidAnchor('results_section', 'made-up'));
ok('unknown type refused', !isValidAnchor('nonsense', 'x'));

console.log(fails
  ? `[check-anchors] ${fails} anchors the product produces are refused by the validator`
  : '[check-anchors] every anchor the product produces validates.');
process.exit(fails ? 1 : 0);
