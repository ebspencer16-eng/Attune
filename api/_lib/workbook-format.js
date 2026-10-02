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

/**
 * True for a signed link that actually points at a workbook.
 *
 * ── WHY THE RULE NEEDED A SECOND FORM ─────────────────────────────────────
 * Ellie, again, after the first fix: the app opened
 * `Attune_Workbook_..._and_Preston.docx`, 40 KB, in the in-app browser.
 *
 * `isWorkbookFile` was being applied to one of the two ways a link reaches a
 * reader. api/tool-data.js mints a fresh link, which obeys it, and then falls
 * back to the URL stored on the order row when minting returns null:
 *
 *   url: fresh || (signedUrlIsLive(row?.workbook_url) ? row.workbook_url : null)
 *
 * Minting returns null for exactly the couples whose folder holds no PDF, which
 * is every couple today. So the branch that enforces the format and the branch
 * that bypasses it were the same expression, and the bypass was the one that
 * ran. The gate passed because it tested the minting function.
 *
 * That is the shape CLAUDE.md names twice over: a rule kept in one place and
 * skipped in the one beside it, and a gate aimed at the half that was already
 * correct.
 *
 * The object's path is in the URL, before the query, so the same question can
 * be asked of a link. Anything unparseable is not a workbook, which fails
 * toward "we are still building it" rather than toward the wrong document.
 */
export function isWorkbookUrl(url) {
  if (typeof url !== 'string' || !url) return false;
  const path = url.split('?')[0].split('#')[0];
  return isWorkbookFile(decodeURIComponent(path));
}
