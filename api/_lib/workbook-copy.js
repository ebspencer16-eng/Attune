/**
 * The two things a surface says about the workbook.
 *
 * ── WHY A MODULE FOR TWO LINES ────────────────────────────────────────────
 * Because there are two surfaces now. The workbook is a generated .docx, and
 * the app's Resources tab has to say the same thing about it that the
 * dashboard does: here it is, or it is coming. Both sentences were inline in
 * src/App.jsx, which is how the app would have ended up with its own wording
 * for the same two states.
 *
 * Ellie's words, from the dashboard.
 *
 * ── THE FILE NAME IS NOT COPY ─────────────────────────────────────────────
 * `fileName` is here anyway, because a couple who saved the file from a laptop
 * and again from a phone should not find two differently-named files in the
 * same folder.
 */
export const WORKBOOK_COPY = {
  /** Ready, and the reader can have it. */
  ready: 'Download your workbook',
  /** Owned, generating, not here yet. */
  generating: "Generating now. We'll email you when it's ready.",
};

/** The name the file is saved under, on either surface. */
export function workbookFileName(you, them) {
  const clean = (n) => String(n || '').trim().replace(/[^\w-]+/g, '_') || 'partner';
  return `Attune_Workbook_${clean(you)}_and_${clean(them)}.docx`;
}
