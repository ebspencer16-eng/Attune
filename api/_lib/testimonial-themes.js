/**
 * What a written survey answer is ABOUT, for choosing which words to show whom.
 *
 * ── WHY IT IS AUTOMATIC ───────────────────────────────────────────────────
 * Ellie, of the box on the Testimonials page: "What is the 'add a theme' thing
 * on testimonials. If it's for me to go in and postcode manually, remove this
 * and do it automatically with as many tags as are appropriate."
 *
 * It was for exactly that. A hundred and twenty answers, each needing somebody
 * to read it and type a word, and the admin's own charts then reported on
 * however far that got: the Feedback page said "10 of 40 read and given a
 * theme", which is a measure of how much reading had been done rather than of
 * what people said. Nothing was ever going to finish that job.
 *
 * ── WHY THESE CATEGORIES AND NOT THE OTHER FRAME ──────────────────────────
 * The reflection and conflict frames are about what happened to a couple.
 * This one is about WHO a sentence would speak to, because that is what the
 * tab is for: "Maybe build me a tab with recommended content by category (ie.
 * couple in distress, help with extended family, etc.)". So the categories
 * are audiences and subjects a reader might be looking for words about, and
 * a quote can sit in several at once.
 *
 * ── THE SAME SHALLOW MATCHING, AND THE SAME HONESTY ───────────────────────
 * Word stems, whole words, no language understanding. An answer that matches
 * nothing is counted as unmatched rather than filed under a nearest guess: a
 * tab of recommended content is only useful if what is in it belongs there.
 *
 * Ellie writes every word a customer reads, and nothing here is customer
 * facing: these are labels on a shelf in the admin.
 */

export const TESTIMONIAL_THEMES = [
  { id: 'distress', label: 'A couple in distress',
    terms: ['struggl', 'crisis', 'rough', 'hard', 'brink', 'breaking', 'broke', 'divorce', 'separat', 'resent', 'lonely', 'alone', 'disconnect', 'drift', 'stuck', 'hopeless', 'desperate', 'last chance', 'therapy', 'counsel'] },
  { id: 'extended_family', label: 'Extended family and in-laws',
    terms: ['in law', 'inlaw', 'mother in', 'father in', 'parents', 'mum', 'mom', 'dad', 'family', 'sibling', 'brother', 'sister', 'holiday', 'christmas', 'thanksgiving', 'visit'] },
  { id: 'money', label: 'Money and work',
    terms: ['money', 'financ', 'budget', 'debt', 'bill', 'save', 'saving', 'spend', 'afford', 'job', 'work', 'career', 'income'] },
  { id: 'conflict', label: 'How they argue',
    terms: ['argu', 'fight', 'fought', 'conflict', 'disagree', 'shout', 'yell', 'tension', 'blow up', 'snap', 'defensive', 'stonewall', 'silent'] },
  { id: 'communication', label: 'Talking and being heard',
    terms: ['talk', 'conversation', 'listen', 'heard', 'said', 'say', 'honest', 'open up', 'opened', 'express', 'words', 'communicat'] },
  { id: 'intimacy', label: 'Physical intimacy',
    terms: ['intimacy', 'intimate', 'sex', 'physical', 'touch', 'affection', 'desire', 'libido', 'attract'] },
  { id: 'expectations', label: 'Expectations and who does what',
    terms: ['expect', 'assume', 'assumption', 'chore', 'housework', 'division', 'who does', 'fair', 'load', 'responsib', 'split'] },
  { id: 'kids', label: 'Children and parenting',
    terms: ['kid', 'child', 'baby', 'pregnan', 'parent', 'son', 'daughter', 'toddler', 'school'] },
  { id: 'new_couple', label: 'Newly engaged or married',
    terms: ['engaged', 'engagement', 'wedding', 'newly', 'married last', 'fiance', 'fiancee', 'planning', 'before we marry', 'premarital'] },
  { id: 'long_together', label: 'Together a long time',
    terms: ['years', 'decade', 'anniversar', 'long time', 'since we', 'twenty', 'thirty', 'empty nest', 'retire'] },
  { id: 'closer', label: 'Felt closer afterwards',
    terms: ['closer', 'connect', 'connection', 'understood', 'understand', 'seen', 'validat', 'relief', 'reliev', 'better', 'helped', 'hopeful', 'optimis', 'grateful'] },
  { id: 'surprise', label: 'Something surprised them',
    terms: ['surpris', 'did not know', 'didnt know', 'never realised', 'never realized', 'eye open', 'shock', 'unexpected', 'had no idea'] },
];

/* Every theme is usable, and no two share an id. A theme with no terms would
   sit empty for ever and read as a subject nobody writes about. */
{
  const seen = new Set();
  for (const t of TESTIMONIAL_THEMES) {
    if (seen.has(t.id)) throw new Error(`TESTIMONIAL_THEMES has two themes called "${t.id}".`);
    seen.add(t.id);
    if (!t.label) throw new Error(`TESTIMONIAL_THEMES.${t.id} has no label.`);
    if (!t.terms || !t.terms.length) throw new Error(`TESTIMONIAL_THEMES.${t.id} has no terms, so it can never be assigned.`);
  }
}
