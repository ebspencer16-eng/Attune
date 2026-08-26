// Fails the build if customer-facing copy contains a template token that
// nothing resolves at render time.
//
// This exists because the WX guarded-partner tip shipped "{something}" in a
// phrase-to-try, so a customer read "I think I'm bothered by {something}". It
// survived a token scan that only matched uppercase tokens like {EXP}. Any
// casing counts now, and the allowlist is explicit rather than a pattern.

import { NEW_COUPLE_TYPES } from './_type_data.mjs';
import { DIM_CONTENT, GAP_BLURBS, WHEN_THIS_SHOWS_UP } from '../api/_workbook-content.js';
import { PERSONALITY_QUESTIONS, PARTNER_VIEW_TEXT, LIFE_QUESTIONS, RESPONSIBILITY_CATEGORIES } from '../api/_questions.js';
import { INTIMACY_QUESTIONS } from '../api/_intimacy-questions.js';
import { INTIMACY_RESULTS_PROSE } from '../api/_intimacy-results-prose.js';

// Tokens the render layer substitutes. Anything else in braces is a leak.
// Names: {U}/{P} and the couple-type role names, each with pronoun forms.
const ROLES = ['U', 'P', 'EXP', 'GRD', 'RCH', 'WDR'];
const FORMS = ['', '_sub', '_obj', '_pos', '_isC'];
const ALLOWED = new Set([
  ...ROLES.flatMap(r => FORMS.map(f => r + f)),
  'userName', 'partnerName',
  // Substituted where it is rendered: the intimacy one-partner-skipped lead
  // does osk.lead.replace(/\{SKIPPER\}/g, skipper) in src/App.jsx.
  'SKIPPER',
]);

const hits = [];
function walk(value, path) {
  if (typeof value === 'string') {
    for (const m of value.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g)) {
      if (!ALLOWED.has(m[1])) hits.push({ path, token: m[1], sample: value.slice(0, 90) });
    }
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => walk(v, `${path}[${i}]`));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`);
  }
}

walk(NEW_COUPLE_TYPES, 'coupleTypes');
walk(DIM_CONTENT, 'DIM_CONTENT');
walk(GAP_BLURBS, 'GAP_BLURBS');
walk(WHEN_THIS_SHOWS_UP, 'WHEN_THIS_SHOWS_UP');
walk(PERSONALITY_QUESTIONS, 'PERSONALITY_QUESTIONS');
walk(PARTNER_VIEW_TEXT, 'PARTNER_VIEW_TEXT');
walk(LIFE_QUESTIONS, 'LIFE_QUESTIONS');
walk(RESPONSIBILITY_CATEGORIES, 'RESPONSIBILITY_CATEGORIES');
walk(INTIMACY_QUESTIONS, 'INTIMACY_QUESTIONS');
walk(INTIMACY_RESULTS_PROSE, 'INTIMACY_RESULTS_PROSE');

if (hits.length) {
  console.error('[check-copy-tokens] unresolved template tokens in customer copy:');
  for (const h of hits) console.error(`  ${h.path}  {${h.token}}  ::  ${h.sample}`);
  console.error('Either resolve the token at render, or add it to ALLOWED in this script.');
  process.exit(1);
}
console.log(`[check-copy-tokens] no unresolved tokens. ${ALLOWED.size} tokens allowed.`);
