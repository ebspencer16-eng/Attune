/**
 * What each Expectations category page opens with.
 *
 * ── WHY THIS LEFT src/App.jsx ─────────────────────────────────────────────
 * These six paragraphs were inline in the website's results component, so the
 * app's category pages had no framing at all: they opened straight into a list
 * of rows. Ellie asked for the app to mirror the website even where that means
 * adding prose it is missing, and this is that prose.
 *
 * Keyed by the responsibility category id, plus `life` for the bigger
 * questions, which is how FIXED_CATS is keyed on the website.
 */

export const CATEGORY_INTRO = {
      household: "Day-to-day domestic expectations are easy to assume rather than discuss. Getting explicit about them removes a major source of slow-build resentment.",
      financial: "Beneath money disagreements is usually a difference in values, not just numbers. The question worth asking: what do you each want money to make possible?",
      career: "How you think about work, ambition, and sacrifice for each other's careers will evolve. These conversations lay groundwork before the hard moments arrive.",
      emotional: "The invisible work of a relationship, tracking, anticipating, initiating, is the category most couples never name. Naming it changes how it lands.",
      extended_family: "Extended family expectations surface fast, around holidays, visits, and boundaries. You each carry a template from how your own family did it. Naming those templates now saves a lot of friction later.",
      life: "These are the bigger-picture expectations: children, family, where you live, and how you want your life to feel. Getting aligned on these now is one of the most valuable things a couple can do.",
    };

/** The paragraph for a category, or nothing when it has none. */
export function introFor(categoryId) {
  return CATEGORY_INTRO[categoryId] || null;
}
