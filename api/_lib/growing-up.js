/**
 * The three derived "growing up" answers the admin can cut by.
 *
 * ── WHY A MODULE ──────────────────────────────────────────────────────────
 * Ellie's slicer taxonomy asks for rows the stored answers do not carry:
 * "Homosexual guardians", "Raised not by parents", and whether somebody
 * "maintained gender roles", expects "new gender roles", or expects to
 * "share responsibility more".
 *
 * Each is an inference over answers that already exist, and each is read by
 * two things: the cube that the admin draws from, and the probe that
 * photographs the admin. A stub that works these out its own way is a claim
 * about the server made without running it, which this repo has been bitten
 * by six times. So the rule is here and both call it.
 *
 * ── WHAT IS INFERRED, AND SAID OUT LOUD ───────────────────────────────────
 * A gender comes from the NAME of a childhood role, through the one map in
 * inherited-roles.js, which already says why that is a guess rather than a
 * fact: Grandma is almost always a woman, "Guardian" is nobody in
 * particular, and a word that carries no gender answers null rather than
 * being assigned one.
 */
import { ROLE_GENDER, readInheritance } from './inherited-roles.js';
import { canonicalGuardian, RESPONSIBILITY_CATEGORIES } from '../_questions.js';

/** The roles that are a parent, for "raised by a parent" versus not. */
const PARENT_ROLES = ['Mom', 'Dad', 'Stepmom', 'Stepdad'];

/** Every responsibility item, which is what the inheritance read walks. */
export function responsibilityItems() {
  return RESPONSIBILITY_CATEGORIES.flatMap((c) => (c.items || []).map((item) => ({ key: c.id + '__' + item, cat: c.id })));
}

/**
 * @param answers    the person's ex2_answers
 * @param profile    their profile row, for name, partner name and pronouns
 * @param guardians  guardiansOf(answers), which the caller already has
 * @returns {{ guardian_same_gender: string|null, guardian_parents: string|null, gen_roles: string|null }}
 */
export function growingUp(answers, profile, guardians) {
  const out = { guardian_same_gender: null, guardian_parents: null, gen_roles: null };

  if (guardians && !guardians.solo && guardians.a && guardians.b) {
    const ga = ROLE_GENDER[canonicalGuardian(guardians.a)] ?? null;
    const gb = ROLE_GENDER[canonicalGuardian(guardians.b)] ?? null;
    out.guardian_same_gender = (ga && gb) ? (ga === gb ? 'Yes' : 'No') : null;
  }

  if (guardians) {
    const named = [guardians.a, guardians.solo ? null : guardians.b].filter(Boolean).map((x) => canonicalGuardian(x));
    if (named.length) {
      out.guardian_parents = named.some((x) => PARENT_ROLES.includes(x)) ? 'Raised by a parent' : 'Raised by someone else';
    }
  }

  /**
   * One word for what they expect against what they saw.
   *
   * The order of the tests is the meaning. Moving work from one person to
   * both is a different change from swapping who does it, and it is the one
   * Ellie named first. Null where nothing classified, because "we could not
   * tell" is not one of the three answers and a bucket that quietly collects
   * the unreadable is how a figure stops meaning anything.
   */
  if (answers && answers.responsibilities) {
    const inh = readInheritance(answers, profile, responsibilityItems(), guardians);
    const g = inh.gendered, sh = inh.shape;
    const classified = g.keepsSameGenderRole + g.handsOffSameGenderRole
      + g.takesOnOtherGenderRole + g.handsOffOtherGenderRole;
    if (sh.oneToShared > sh.sharedToOne && sh.oneToShared > 0) out.gen_roles = 'Expect to share more';
    else if (classified) out.gen_roles = (g.keepsSameGenderRole >= g.takesOnOtherGenderRole)
      ? 'Kept the roles they saw' : 'Swapped the roles they saw';
  }

  return out;
}

/** The three fields, as the cube's catalogue describes them. */
export const GROWING_UP_FIELDS = [
  { key: 'guardian_same_gender', label: 'Two guardians of the same gender', group: 'Growing up', kind: 'cat',
    options: [{ v: 'Yes', label: 'Yes' }, { v: 'No', label: 'No' }], partnerable: true },
  { key: 'guardian_parents', label: 'Raised by a parent', group: 'Growing up', kind: 'cat',
    options: [{ v: 'Raised by a parent', label: 'Raised by a parent' }, { v: 'Raised by someone else', label: 'Raised by someone else' }], partnerable: true },
  { key: 'gen_roles', label: 'What they expect against what they saw', group: 'Growing up', kind: 'cat',
    options: [
      { v: 'Kept the roles they saw', label: 'Kept the roles they saw' },
      { v: 'Swapped the roles they saw', label: 'Swapped the roles they saw' },
      { v: 'Expect to share more', label: 'Expect to share more' },
    ], partnerable: true },
];
