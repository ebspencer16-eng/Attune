/**
 * One way to put the workbook in someone's hands, and it is a PDF.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * Ellie: "I want customers to be able to download the pdf. Remove the word
 * file."
 *
 * There were two download paths on this website and they did different things.
 * The results page had `buildAndDownload`, 115 lines that tried a stored link,
 * then /api/generate-workbook for a .docx, then html2pdf in an iframe, then
 * /api/generate-workbook again, under a button that said "↓ Download (.docx)"
 * and a line reading "Opens in Word, Google Docs, or Pages". The dashboard had
 * `downloadWorkbook`, which asks /api/store-workbook-pdf for the real one.
 *
 * Two renderers of the same thing is the failure this codebase is organised
 * against, and here the two did not even produce the same document.
 *
 * ── WHAT A WORKBOOK IS ────────────────────────────────────────────────────
 * api/_lib/workbook-format.js says: a PDF, built by the Python and Playwright
 * service. A stored link is only handed over if it points at one. That rule is
 * read here rather than restated, which is the whole reason the app was serving
 * a 40 KB .docx: the rule was applied where a link is minted and skipped where
 * a stored one is reused.
 */

import { isWorkbookUrl } from '../api/_lib/workbook-format.js';
import { signedUrlIsLive } from '../api/_lib/workbook-link.js';
import { workbookFileName } from '../api/_lib/workbook-copy.js';

/** The reader's access token, or null. */
async function authToken() {
  try {
    const { supabase: sb, hasSupabase } = await import('./supabase.js');
    if (!hasSupabase()) return null;
    const { data: { session } } = await sb.auth.getSession();
    return session?.access_token || null;
  } catch { return null; }
}

/** Hand the file to the browser, under the name both surfaces agree on. */
export function saveWorkbook(url, you, them) {
  const a = document.createElement('a');
  a.href = url;
  a.download = workbookFileName(you, them);
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

/**
 * What to tell someone when it did not work.
 *
 * ── SAY WHICH FAILURE IT WAS ──────────────────────────────────────────────
 * Ellie: "I went to get the workbook but saw a download failed message.
 * Refreshed and tried again with the same result."
 *
 * "Please try again" is the wrong advice for three of the four things that can
 * go wrong, and trying again is exactly what she did, twice. The workbook is
 * rendered by an external service, so the failures are: the service is not
 * configured, it did not answer, it answered with an error, or the couple has
 * not finished enough to build one. The server distinguishes them in `error`
 * and this used to be thrown away for one sentence.
 *
 * The host is named where the server names it, because she is the one who can
 * check it against the Render dashboard, and no secret is in it.
 */
export function workbookFailure(status, error) {
  const why = String(error || '');
  if (/not configured/i.test(why)) {
    return 'The workbook service is not switched on yet. This is on us, not you.';
  }
  if (/not enough answers/i.test(why)) {
    return 'There is not enough here to build a workbook yet. Finish the exercises and it will be ready.';
  }
  /* A service that is slow and one that is not there are different problems
     and only one of them is worth waiting for. Ellie: "Doesn't seem like it's
     timing out after 60secs because that message shows immediately after
     clicking workbook." */
  if (/could not be reached/i.test(why)) {
    return `${why}. Nothing is listening at that address, so this is a setting rather than a wait.`;
  }
  if (/did not answer within/i.test(why)) {
    return `${why}. It is running but slow, so trying again in a minute may work.`;
  }
  if (status >= 500 || status === 0) {
    return 'The workbook service did not answer. Give it a minute and try again.';
  }
  return 'Workbook download failed. Please try again.';
}

/**
 * A link to this couple's workbook, built if there is not one already.
 *
 * @param {object}  opts
 * @param {string?} opts.storedUrl  a link this device already has, if any
 * @param {boolean} opts.storedIsCurrent  whether it was made from this content version
 * @param {object?} opts.body      what to send the builder; the dashboard sends
 *                                 the live session, the results page sends the
 *                                 payload it has already assembled
 * @param {function?} opts.onBuilding  called once, only if a build is actually
 *                                 needed. A caller cannot know that in advance
 *                                 without asking the stored-link question
 *                                 itself, which is the question this function
 *                                 exists to own. Without it both callers
 *                                 announced "building your workbook" and then
 *                                 handed over a file that already existed.
 * @returns {Promise<{url: string, fresh: boolean} | {error: string}>}
 */
export async function getWorkbookUrl({ storedUrl = null, storedIsCurrent = true, body = {}, onBuilding = null } = {}) {
  /* A stored link is only worth using if it points at a workbook, has not
     expired, and was made from the content this build renders. Anything else
     falls through to a build, which is the honest answer and now works. */
  if (storedUrl && storedIsCurrent && isWorkbookUrl(storedUrl) && signedUrlIsLive(storedUrl)) {
    try {
      const head = await fetch(storedUrl, { method: 'HEAD' });
      if (head.ok) return { url: storedUrl, fresh: false };
    } catch { /* gone from storage; build a new one */ }
  }

  try { onBuilding?.(); } catch { /* a caller's toast is not worth failing over */ }

  const token = await authToken();
  let resp;
  try {
    resp = await fetch('/api/store-workbook-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body || {}),
    });
  } catch (e) {
    console.warn('[Attune] workbook request failed:', e);
    return { error: workbookFailure(0, '') };
  }
  const data = await resp.json().catch(() => null);
  if (!resp.ok || !data?.url) {
    console.warn('[Attune] workbook download failed:', resp.status, data);
    return { error: workbookFailure(resp.status, data?.error) };
  }
  return { url: data.url, fresh: true };
}
