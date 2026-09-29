/**
 * What a workbook is, as a file.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * Ellie, having tried to open her workbook: "I tried to access the workbook on
 * the site and it said builder is not responding, then I tried on the app
 * simulator and it still downloaded the docx version."
 *
 * The app has no .docx path. It opens whatever file is stored for the couple,
 * and what was stored was a .docx, because that is what the old builder wrote
 * and no PDF has ever been built. `freshWorkbookUrl` listed the couple's folder,
 * took the newest file and signed it, without ever asking what kind of file it
 * was. One column, `orders.workbook_url`, two builders writing different
 * documents into it, and nothing recording which.
 *
 * The same fact was also typed into `workbookFileName`, which ended every name
 * in `.docx` whatever the bytes were, so a PDF would have downloaded under a
 * Word extension.
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────
 * There is one workbook and it is a PDF: the full-bleed cover, the dot grid,
 * the editorial layout, built by the Python and Playwright service. Ellie: "We
 * only need the downloadable PDF, right?" Right.
 *
 * So the format is stated once, here, and the builder, the file name and the
 * link that is handed to a reader all read it. A file in the couple's folder
 * that is not this format is not their workbook, and serving it is worse than
 * serving nothing: a missing workbook is visibly missing, and the wrong one
 * looks finished. That is the same reason the app refuses to draw a substitute
 * when a build fails.
 *
 * ── WHAT THIS IS NOT ──────────────────────────────────────────────────────
 * Not a migration. The .docx files already in Storage stay where they are; they
 * simply stop being offered. Deleting them is a separate decision and it is
 * Ellie's, in TASKS.md, and it is not safe to take until a PDF exists to
 * replace them.
 */

/** The extension, without the dot. */
export const WORKBOOK_EXT = 'pdf';

/** What the service returns and what Storage is told it is holding. */
export const WORKBOOK_MIME = 'application/pdf';

/** True for a stored object that is actually a workbook. */
export function isWorkbookFile(name) {
  return typeof name === 'string' && name.toLowerCase().endsWith(`.${WORKBOOK_EXT}`);
}
