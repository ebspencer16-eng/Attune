/**
 * Transforms the workbook payload shape produced by buildWorkbookPayload()
 * in src/App.jsx into the COUPLE shape expected by scripts/build_workbook.py
 * (the Python PDF builder).
 *
 * Used by /api/store-workbook-pdf to prepare the JSON sent to the external
 * Python workbook service. See scripts/SERVICE_INTEGRATION.md for the full
 * end-to-end picture.
 *
 * NOTE: getDomainRows() below is a near-duplicate of the same-named function
 * inside api/generate-workbook.js. Long-term, we should extract it (and
 * computeAlignmentPct) into api/_workbook-content.js so the docx and PDF
 * paths share one source of truth. For now, this duplication is intentional
 * and isolated — touching generate-workbook.js would risk breaking the live
 * docx flow that customers depend on today.
 */

import { EXP_DOMAINS, alignmentText } from './_workbook-content.js';

const DIMS = ['energy','expression','needs','bids','conflict','repair','closeness','love','stress','feedback'];

// Build per-domain rows of {label, userValue, partnerValue} from the
// payload's responsibilities + lifeQuestions blocks.
function getDomainRows(domainKey, responsibilities, lifeQuestions, u, p) {
  const r = responsibilities || {};
  const l = lifeQuestions || {};
  const ru = r.user || {}, rp = r.partner || {};
  const lu = l.user || {}, lp = l.partner || {};

  const respRow = (label, cat, idx) => ({
    label,
    userValue: ru[cat]?.[idx]?.value || '',
    partnerValue: rp[cat]?.[idx]?.value || '',
  });
  const lqRow = (label, lqId) => ({
    label,
    userValue: lu[lqId] || '',
    partnerValue: lp[lqId] || '',
  });

  switch (domainKey) {
    case 'household':
      return [
        respRow('Cooking weeknights',           'household', 0),
        respRow('Grocery & meal planning',      'household', 1),
        respRow('Day-to-day tidying',           'household', 2),
        respRow('Home repairs & maintenance',   'household', 3),
        respRow('Family calendar',              'household', 4),
        respRow('Hosting & holidays',           'household', 5),
        respRow('Vacation planning',            'household', 6),
      ];
    case 'emotional':
      return [
        respRow('Mental load',               'emotional', 0),
        respRow('Tracking how everyone is',  'emotional', 1),
      ];
    case 'extended_family':
      // Payload order (RESPONSIBILITY_CATEGORIES): Visits_U(0), Gift_U(1), Visits_P(2), Gift_P(3)
      // Display order: visits then gifts, alternating sides.
      return [
        respRow(`Visits with ${u}'s family`,  'extended_family', 0),
        respRow(`Visits with ${p}'s family`,  'extended_family', 2),
        respRow(`Gifting for ${u}'s family`,  'extended_family', 1),
        respRow(`Gifting for ${p}'s family`,  'extended_family', 3),
      ];
    case 'money':
      return [
        respRow('Day-to-day finances',           'financial', 0),
        respRow('Long-term financial decisions', 'financial', 1),
        respRow('Whose career is prioritized',   'career',    1),
        lqRow  ('How we hold money',             'lq_finances'),
        lqRow  ('Saving v spending',             'lq_money_lean'),
        lqRow  ('Risk tolerance',                'lq_money_risk'),
      ];
    case 'life':
      return [
        lqRow('Children',                       'lq_children'),
        lqRow('When family & partner conflict', 'lq_family_conf'),
        lqRow('Where we live',                  'lq_location'),
        lqRow('Social life',                    'lq_social'),
        lqRow('Daily rhythm',                   'lq_routine'),
        lqRow('Faith & spirituality',           'lq_faith'),
        lqRow('Core values & beliefs',          'lq_values'),
      ];
    default:
      return [];
  }
}

// Match logic mirrors api/generate-workbook.js computeAlignmentPct.
function computeAlignmentPct(rows) {
  if (!rows || rows.length === 0) return 0;
  const matches = rows.filter(r => r.userValue === r.partnerValue).length;
  return Math.round((matches / rows.length) * 100);
}

/**
 * payloadToCouple(payload) -> COUPLE
 *
 * Input: the payload produced by buildWorkbookPayload() in src/App.jsx.
 *   {
 *     userName, partnerName,
 *     scores: { <dim>: number },
 *     partnerScores: { <dim>: number },
 *     coupleType: { id, name, tagline, description, color, ... } | null,
 *     phraseThatLands: string | null,
 *     responsibilities: { user: {...}, partner: {...} },
 *     lifeQuestions:    { user: {...}, partner: {...}, meta: {...} },
 *     expGaps: [...],   // legacy, ignored here
 *     orderId?: string,
 *   }
 *
 * Output: the COUPLE dict the Python builder expects on stdin.
 *   See scripts/build_workbook.py around line 553 for the canonical
 *   shape; SERVICE_INTEGRATION.md has a JSON-shaped reference.
 */
export function payloadToCouple(payload) {
  const u = (payload?.userName || 'Partner A').trim() || 'Partner A';
  const p = (payload?.partnerName || 'Partner B').trim() || 'Partner B';
  const ct = payload?.coupleType || null;
  const phrase = payload?.phraseThatLands || (ct?.tips?.[0]?.phraseTry || '');

  // Scores: zip into [u, p] pairs per dim. Default to 3 (neutral) for
  // any dim missing from either side; mirrors what generate-workbook does.
  const scores = {};
  DIMS.forEach(d => {
    const a = Number(payload?.scores?.[d]);
    const b = Number(payload?.partnerScores?.[d]);
    scores[d] = [Number.isFinite(a) ? a : 3, Number.isFinite(b) ? b : 3];
  });

  // Per-domain alignment percentages and detail rows.
  const expectations = {};
  const expectations_detail = {};
  const uKey = u.toLowerCase();
  const pKey = p.toLowerCase();

  EXP_DOMAINS.forEach(domain => {
    const rows = getDomainRows(domain.key, payload?.responsibilities, payload?.lifeQuestions, u, p);
    expectations[domain.key] = computeAlignmentPct(rows);
    expectations_detail[domain.key] = {
      [uKey]: rows.map(r => [r.label, r.userValue]),
      [pKey]: rows.map(r => [r.label, r.partnerValue]),
    };
  });

  // Couple type fields. Most map directly; phrase_that_lands gets
  // promoted onto the couple_type object since the Python builder
  // reads it from there.
  const couple_type = ct ? {
    id: ct.id || '',
    name: ct.name || 'Your couple type',
    subtitle: ct.subtitle || '',
    tagline: ct.tagline || '',
    description: ct.description || '',
    phrase_that_lands: phrase || '',
  } : {
    id: '', name: 'Your couple type',
    subtitle: '', tagline: '', description: '', phrase_that_lands: '',
  };

  // Build the COUPLE-shaped object. Field order isn't significant,
  // but we mirror the Python sample for grep-ability.
  return {
    u, p,
    together: '',           // not surfaced in the workbook today; reserved
    couple_type,
    edition_internal: '',   // internal versioning; reserved
    date: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    scores,
    expectations,
    expectations_detail,
  };
}

// Re-export alignmentText so the same-named helper in shared content
// stays visible to anything that imports this module.
export { alignmentText };
