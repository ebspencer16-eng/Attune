/**
 * Resolving {EXP}/{GRD}/{RCH}/{WDR} in couple-type prose.
 *
 * ── WHY ON THE SERVER ─────────────────────────────────────────────────────
 * Deciding which partner is the expressive one means comparing their two open
 * scores. That is scoring, and the app does not score. The website has its own
 * copy of this in resolveRoleTokens in src/App.jsx, because it types from raw
 * answers client-side for the demo path.
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────
 * A pair of role tokens only resolves when the two partners are actually on
 * opposite sides of that axis. If they are both open, "the expressive one" is
 * not a thing either of them is, and putting a name there would be a claim the
 * scores do not support. In that case the token becomes a generic phrase.
 *
 * ── THE GUARD ─────────────────────────────────────────────────────────────
 * Nothing with braces in it leaves this function. Forwarding strengths and
 * stickingPoints to the app without this put "{EXP} can feel like {EXP_isC}
 * always the one initiating depth" on a results page.
 */

/**
 * Pronoun forms, matching the map in src/App.jsx line 1623.
 *
 * isC is the contraction, not the verb: the prose says "can feel like
 * {EXP_isC} always the one", which has to become "she's always the one". A
 * bare "is" there produces "can feel like is always the one".
 */
const PRONOUNS = {
  'she/her': { sub: 'she', obj: 'her', pos: 'her', ref: 'herself', isC: "she's" },
  'he/him': { sub: 'he', obj: 'him', pos: 'his', ref: 'himself', isC: "he's" },
  'they/them': { sub: 'they', obj: 'them', pos: 'their', ref: 'themselves', isC: "they're" },
};

/**
 * One pronoun form for a person. Exported because src/App.jsx and
 * api/_lib/individual-profile.js both need it, and a second copy of this table
 * is how one surface ends up saying "they names feelings".
 */
export function pronounForm(pronouns, form) {
  const p = String(pronouns || '').toLowerCase();
  const key = PRONOUNS[p] ? p
    : p.includes('she') ? 'she/her'
    : p.includes('he') ? 'he/him'
    : 'they/them';
  return PRONOUNS[key][form] || PRONOUNS[key].sub;
}

const GENERIC = {
  EXP: 'the more expressive partner',
  GRD: 'the more guarded partner',
  RCH: 'the partner who reaches first',
  WDR: 'the partner who needs space first',
};

/**
 * @param {string} text
 * @param {{name, axes, pronouns}} a  the person stored first
 * @param {{name, axes, pronouns}} b
 */
export function resolveRoleTokens(text, a, b) {
  if (!text || typeof text !== 'string') return text;
  let out = text;

  const aOpen = (a?.axes?.open ?? 3) >= 3.0;
  const bOpen = (b?.axes?.open ?? 3) >= 3.0;
  const aEngage = (a?.axes?.withdraw ?? 3) <= 3.0;
  const bEngage = (b?.axes?.withdraw ?? 3) <= 3.0;

  const fill = (A, B, nameA, nameB, pronA, pronB) => {
    out = out.replace(new RegExp(`\\{${A}\\}`, 'g'), nameA)
      .replace(new RegExp(`\\{${B}\\}`, 'g'), nameB);
    for (const f of ['sub', 'obj', 'pos', 'isC']) {
      out = out.replace(new RegExp(`\\{${A}_${f}\\}`, 'g'), pronounForm(pronA, f))
        .replace(new RegExp(`\\{${B}_${f}\\}`, 'g'), pronounForm(pronB, f));
    }
  };

  if (aOpen !== bOpen) {
    fill('EXP', 'GRD',
      aOpen ? a.name : b.name, aOpen ? b.name : a.name,
      aOpen ? a.pronouns : b.pronouns, aOpen ? b.pronouns : a.pronouns);
  }
  if (aEngage !== bEngage) {
    fill('RCH', 'WDR',
      aEngage ? a.name : b.name, aEngage ? b.name : a.name,
      aEngage ? a.pronouns : b.pronouns, aEngage ? b.pronouns : a.pronouns);
  }

  // Whatever is left is a role this couple does not have. Generic phrase for
  // the names, a neutral pronoun for the forms, and then a final sweep so that
  // a token this file has never heard of still cannot reach a reader.
  for (const [tok, phrase] of Object.entries(GENERIC)) {
    out = out.replace(new RegExp(`\\{${tok}\\}`, 'g'), phrase);
    for (const f of ['sub', 'obj', 'pos', 'isC']) {
      out = out.replace(new RegExp(`\\{${tok}_${f}\\}`, 'g'), pronounForm('', f));
    }
  }
  out = swapRolePhrases(out, a, b);

  return out.replace(/\{[A-Za-z0-9_]+\}/g, (m) => (m === '{U}' || m === '{P}' ? m : ''))
    .replace(/\s{2,}/g, ' ').trim();
}

/**
 * ── THE ROLE WRITTEN OUT IN WORDS, SWAPPED FOR THE PERSON ─────────────────
 * Ellie: "Couple type action items should match the site - the app is showing
 * 'Guarded partner:...' but the site says 'Preston'. I want that done
 * throughout, make sure the app matches."
 *
 * Not every piece of role copy uses a token. Some of it names the role in
 * prose, because it was written before the tokens existed: a couple type's tips
 * say "Guarded partner: share the half-formed version". The website has swapped
 * those for the person's name for a long time and the server never did, so the
 * same sentence read as a person on a laptop and as an archetype on a phone.
 *
 * ── THE ARTICLE DECIDES ─────────────────────────────────────────────────
 * An INDEFINITE article means the sentence is about the archetype and not about
 * this couple: "shares more than a truly guarded partner would" has to stay as
 * it is, or it renders "more than a truly Preston would". A definite article or
 * none means this person, and swaps. That rule came from the website, where it
 * was found the hard way, and it moves here with it.
 *
 * Each pair maps two ways of naming one role, because the copy uses both.
 */
const ROLE_PHRASES = [
  ['EXP', ['expressive partner', 'open partner']],
  ['GRD', ['guarded partner', 'reserved partner']],
  ['RCH', ['reaching partner', 'engaging partner']],
  ['WDR', ['withdrawing partner', 'quieter partner']],
];

function swapRolePhrases(text, a, b) {
  if (!text || !a?.name || !b?.name) return text;
  const aOpen = (a?.axes?.open ?? 3) >= 3.0;
  const bOpen = (b?.axes?.open ?? 3) >= 3.0;
  const aEngage = (a?.axes?.withdraw ?? 3) <= 3.0;
  const bEngage = (b?.axes?.withdraw ?? 3) <= 3.0;

  const who = {};
  /* A role nobody holds is a role this couple does not have, and the generic
     phrase is already the right words for it. Only a couple who sit on
     opposite sides of an axis have the two roles to name. */
  if (aOpen !== bOpen) {
    who.EXP = aOpen ? a.name : b.name;
    who.GRD = aOpen ? b.name : a.name;
  }
  if (aEngage !== bEngage) {
    who.RCH = aEngage ? a.name : b.name;
    who.WDR = aEngage ? b.name : a.name;
  }

  let out = text;
  for (const [role, phrases] of ROLE_PHRASES) {
    if (!who[role]) continue;
    for (const phrase of phrases) {
      out = out.replace(
        new RegExp(`\\b(a |an |the )?(?:truly |genuinely |really )?${phrase}\\b`, 'gi'),
        (match, article) => (article && /^(a|an) $/i.test(article) ? match : who[role]),
      );
    }
  }
  return out;
}
