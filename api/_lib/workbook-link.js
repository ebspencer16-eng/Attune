/**
 * A download link for a workbook that has not expired.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * api/store-workbook.js uploads the .docx to Supabase storage and signs a URL
 * for seven days, then writes that URL onto the order row. Every surface has
 * been handing the reader that stored string ever since: /api/tool-data gives
 * it to the app, and the website's download button reads it out of the cached
 * order.
 *
 * Seven days later the signature is stale and the link answers 400. Nothing
 * anywhere notices, because the URL is still a URL. A couple who comes back a
 * fortnight after buying, which is most couples, clicks Download and gets an
 * error page in a new tab.
 *
 * So the link is minted when it is asked for, rather than stored. The file
 * stays where it is; only the signature is new.
 *
 * ── THE PATH ──────────────────────────────────────────────────────────────
 * Objects live at workbooks/<order_num>/<filename>. The filename is not
 * recorded anywhere, so this lists the folder and takes the newest file, which
 * is what api/delete-account.js does when it removes them.
 *
 * ── WHAT IT DOES NOT DO ───────────────────────────────────────────────────
 * It does not generate anything. A couple with no file gets null, and the
 * surface says "generating" or offers the generate path, as it did before.
 */

/** Seconds a minted link is good for. Long enough to click, short enough to be a link and not a copy. */
const TTL = 3600;

/**
 * @returns {Promise<string|null>} a fresh signed URL, or null if there is no
 * file, no credentials, or storage refuses.
 */
export async function freshWorkbookUrl({ supabaseUrl, serviceKey, orderNum }) {
  if (!supabaseUrl || !serviceKey || !orderNum) return null;
  const headers = {
    'Content-Type': 'application/json',
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  };

  try {
    const listRes = await fetch(`${supabaseUrl}/storage/v1/object/list/workbooks`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prefix: `${orderNum}/`,
        limit: 20,
        sortBy: { column: 'created_at', order: 'desc' },
      }),
    });
    if (!listRes.ok) return null;
    const files = await listRes.json().catch(() => []);
    const newest = Array.isArray(files) ? files.find((f) => f?.name) : null;
    if (!newest) return null;

    const signRes = await fetch(
      `${supabaseUrl}/storage/v1/object/sign/workbooks/${encodeURIComponent(orderNum)}/${encodeURIComponent(newest.name)}`,
      { method: 'POST', headers, body: JSON.stringify({ expiresIn: TTL }) },
    );
    if (!signRes.ok) return null;
    const signed = await signRes.json().catch(() => null);
    return signed?.signedURL ? `${supabaseUrl}/storage/v1${signed.signedURL}` : null;
  } catch {
    return null;
  }
}

/**
 * Whether a stored signed URL is still worth handing to someone.
 *
 * The token is a JWT and its exp claim says when the signature dies. This
 * reads it without verifying it: the question is not whether the token is
 * genuine, which storage will decide, but whether it is already spent.
 *
 * Anything unparseable is treated as expired, which fails towards regenerating
 * rather than towards a broken download.
 */
export function signedUrlIsLive(url, nowMs = Date.now()) {
  if (typeof url !== 'string' || !url) return false;
  const token = /[?&]token=([^&]+)/.exec(url)?.[1];
  if (!token) return false;
  const payload = token.split('.')[1];
  if (!payload) return false;
  try {
    const json = typeof atob === 'function'
      ? atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
      : Buffer.from(payload, 'base64').toString('utf8');
    const exp = JSON.parse(json)?.exp;
    return typeof exp === 'number' && exp * 1000 > nowMs;
  } catch {
    return false;
  }
}
