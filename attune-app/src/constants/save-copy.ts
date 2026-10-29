/**
 * What the app says when a write does not land.
 *
 * ── WHY IT IS ITS OWN FILE ────────────────────────────────────────────────
 * One sentence, in three screens: the sheet that keeps an insight, the profile
 * editor and profile setup. It was typed into all three.
 *
 * That was invisible until the sentence got a home. The website learned to save
 * an insight to the journal, which meant its four sentences had to move into
 * api/_lib/journal-copy.js so both surfaces read the same words, and
 * check-app-copy-mirrors immediately reported the other two copies: a sentence
 * with a home, written inline, where no gate can name it.
 *
 * It no longer mirrors JOURNAL_COPY.saveFailed. Ellie's copy review gave the
 * journal its own line ("Your insight did not save to your journal..."), which
 * journal.tsx carries and check-journal-copy holds. This one is now the app's
 * generic failure line for the two profile screens, with no server copy to
 * agree with, so no mirror gate names it.
 */
export const SAVE_FAILED = 'That did not save. Try again in a moment.';
