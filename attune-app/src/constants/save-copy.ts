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
 * An Expo project cannot import from api/, so the app needs a copy. It needs
 * ONE copy, and this is it. check-journal-copy holds it against
 * JOURNAL_COPY.saveFailed.
 *
 * Ellie writes this sentence. Changing it means changing it in
 * api/_lib/journal-copy.js, and the build fails until this agrees.
 */
export const SAVE_FAILED = 'That did not save. Try again in a moment.';
