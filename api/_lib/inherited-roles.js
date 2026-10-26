/**
 * What people expect, against what they grew up with.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Ellie: "I want to find a way to visualize the difference between experienced
 * and expected... I want to highlight both of these. What was shared v not
 * shared that you now expect to be different, and I do want to infer who you
 * identify with based on gender, this is entirely for backend data viewing and
 * we can undo it later if it doesn't make sense."
 *
 * Two readings of the same pair of answers, because they answer different
 * questions and one of them needs an inference the other does not.
 *
 * ── THE SHAPE READING, WHICH NEEDS NO INFERENCE ───────────────────────────
 * The two answers sit on different axes. What you experienced is which of YOUR
 * OWN two childhood adults did a thing. What you expect is whether YOU or YOUR
 * PARTNER will. "Mum did it" cannot become "me" without deciding who somebody
 * identifies with.
 *
 * What compares cleanly is the shape of the arrangement, which both answers
 * carry: shared between two people, done by one, or nobody. So the first
 * reading is whether that shape changed, and it is true of every person who
 * answered both halves regardless of what anybody's pronouns are.
 *
 * ── THE GENDERED READING, WHICH SHE ASKED FOR BY NAME ─────────────────────
 * Nothing in Attune asks anybody their gender. `profiles.pronouns` is what is
 * collected, and the admin's one conversion table turns she/her into Woman.
 * This reads the same way and says so: a role is gendered by its NAME, which
 * is a guess about the person who held it, not a fact about them. Mom is
 * almost always a woman. "Guardian" is nobody in particular, and is counted as
 * unknown rather than assigned.
 *
 * Every unknown is counted and returned. A chart that silently drops the
 * people it cannot place reports a total that is not the total, and the
 * question here is specifically about who does what, where the people hardest
 * to classify are the ones most worth not losing.
 *
 * It is reversible by deleting this file and its two callers. Nothing is
 * stored, nothing a customer sees changes, and no gender is written anywhere:
 * the inference happens at read time, in the admin, for a count.
 */
import { CHILDHOOD_ROLES, canonicalGuardian } from '../_questions.js';

/**
 * The gender a role name implies, or null where it implies none.
 *
 * Deliberately not exhaustive. "Guardian", "Foster parent" and "Older sibling"
 * are left null because the word carries no gender and assigning one would be
 * inventing data rather than reading it.
 */
const ROLE_GENDER = {
  Mom: 'woman', Stepmom: 'woman', Grandma: 'woman', Aunt: 'woman',
  Dad: 'man', Stepdad: 'man', Grandpa: 'man', Uncle: 'man',
  Guardian: null, 'Foster parent': null, 'Older sibling': null,
};

/* Every role has an entry, so a role added to the question set shows up here
   as a missing key rather than as a quiet null. */
for (const role of CHILDHOOD_ROLES) {
  if (!(role in ROLE_GENDER)) {
    throw new Error(`ROLE_GENDER has no entry for "${role}". Add it, with null if the word carries no gender.`);
  }
}

/** she/her → woman. The same reading the admin's own value table uses. */
export function genderFromPronouns(pronouns) {
  const p = String(pronouns || '').trim().toLowerCase();
  if (p === 'she/her') return 'woman';
  if (p === 'he/him') return 'man';
  /* they/them and anything else: a real answer, and not one of the two this
     comparison can use. Counted as unknown, never guessed. */
  return null;
}

/** shared, one person, nobody, or unknown. */
export function expectedShape(value, selfName, partnerName) {
  if (value == null || value === '') return null;
  if (value === 'Both of us' || value === 'Balanced') return 'shared';
  if (value === "Doesn't apply to us" || value === "Doesn't apply") return 'nobody';
  if (value === 'Primarily mine' || (selfName && value === selfName)) return 'one';
  if (value === "Primarily my partner's" || (partnerName && value === partnerName)) return 'one';
  return null;
}

/** The same three, read off a childhood slot. */
export function experiencedShape(slot) {
  if (slot == null || slot === '') return null;
  if (slot === 'both') return 'shared';
  if (slot === 'na' || slot === 'no') return 'nobody';
  if (slot === 'a' || slot === 'b' || slot === 'yes') return 'one';
  /* 'sometimes' on the one-adult path is neither shared nor absent, and
     calling it either would be putting a thumb on the scale. */
  return null;
}

/** Which of the two people the expectation names: 'self', 'partner' or null. */
export function expectedWho(value, selfName, partnerName) {
  if (value == null || value === '') return null;
  if (value === 'Primarily mine' || (selfName && value === selfName)) return 'self';
  if (value === "Primarily my partner's" || (partnerName && value === partnerName)) return 'partner';
  return null;
}

/**
 * One person's answers, read both ways.
 *
 * @param answers   their ex2_answers
 * @param profile   { name, partner_name, pronouns }
 * @param items     [{ key, slotKey }] the responsibility keys to read
 * @param adults    their childhood adults, from guardiansOf
 */
export function readInheritance(answers, profile, items, adults) {
  const selfName = (profile?.name || '').trim();
  const partnerName = (profile?.partner_name || '').trim();
  const mine = genderFromPronouns(profile?.pronouns);

  const shape = { same: 0, sharedToOne: 0, oneToShared: 0, other: 0, unknown: 0 };
  const gendered = { keepsSameGenderRole: 0, handsOffSameGenderRole: 0, takesOnOtherGenderRole: 0, handsOffOtherGenderRole: 0, unknown: 0 };

  for (const { key } of items) {
    const exp = answers?.responsibilities?.[key];
    const slot = answers?.childhood?.[key];

    const a = experiencedShape(slot), b = expectedShape(exp, selfName, partnerName);
    if (a == null || b == null) shape.unknown++;
    else if (a === b) shape.same++;
    else if (a === 'shared' && b === 'one') shape.sharedToOne++;
    else if (a === 'one' && b === 'shared') shape.oneToShared++;
    else shape.other++;

    /* The gendered half only has something to say when ONE adult did it, that
       adult's role implies a gender, the person's pronouns imply one, and the
       expectation names a person rather than "both" or "neither". Every other
       case is unknown, and there are a lot of them on purpose. */
    const who = expectedWho(exp, selfName, partnerName);
    const role = (slot === 'a' || slot === 'yes') ? adults?.a : slot === 'b' ? adults?.b : null;
    const roleGender = role ? ROLE_GENDER[canonicalGuardian(role)] ?? null : null;
    if (!who || !roleGender || !mine) { gendered.unknown++; continue; }
    const sameGender = roleGender === mine;
    if (sameGender && who === 'self') gendered.keepsSameGenderRole++;
    else if (sameGender && who === 'partner') gendered.handsOffSameGenderRole++;
    else if (!sameGender && who === 'self') gendered.takesOnOtherGenderRole++;
    else gendered.handsOffOtherGenderRole++;
  }
  return { shape, gendered };
}
