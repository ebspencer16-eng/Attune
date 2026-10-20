/**
 * Which expectations conversations this couple have already had.
 *
 *   GET  /api/convos                       → { ok, convos: { "<key>": "<iso>" } }
 *   POST /api/convos { key, done: true }   → { ok, convos }
 *
 * ── WHY IT EXISTS ─────────────────────────────────────────────────────────
 * Ellie: "I want the check boxes to be functional on the expectations convos
 * to have. I don't want the row to disappear once you check it, but I want the
 * check mark to appear in the box and I want the row to be moved to the bottom
 * (but still above the see how these differ line) and greyed out slightly. The
 * progress/checks should update the what comes next dropdown rows as well."
 *
 * The boxes have been drawn on both surfaces since the page shipped and have
 * never been wired to anything.
 *
 * ── WHY IT IS THE COUPLE'S AND NOT EACH PERSON'S ──────────────────────────
 * A conversation is a thing the two of them do together. If one of them ticks
 * "we have talked about who cooks", it is true for both of them, and a
 * per-person tick would let the same conversation be had and not had at once.
 *
 * So it is a column on `couple_tools`, the row migration 076 created for the
 * budget and the checklist, for the same reason and keyed the same way. The
 * alternative was a third place that knows how to name a couple.
 *
 * ── WHY NOT PART OF /api/tool-data ────────────────────────────────────────
 * That endpoint gates every read on owning the tool being asked for, which is
 * right for the budget and the checklist and wrong here: the conversations are
 * part of the Expectations results, which every couple who finished the
 * exercise has. Folding this in would have meant teaching it about a third
 * thing with no capability, which is how an ownership check quietly becomes
 * optional. It shares the table and the couple key, not the gate.
 *
 * ── UNTIL MIGRATION 088 IS RUN ────────────────────────────────────────────
 * Reading a column that does not exist is a 400 from PostgREST for the whole
 * row, so a GET answers an empty set and a POST says it could not save. The
 * surfaces then draw unticked boxes, which is exactly what they drew before,
 * rather than an error on a results page.
 */

/**
 * ── AND WHERE IT RUNS ─────────────────────────────────────────────────────
 * Pinned next to the database, like every other endpoint here. See
 * api/_lib/db-region.js and check-edge-region.mjs.
 */
export const config = { runtime: 'edge', regions: ['iad1'] };

import { jsonBody, safeError } from './_lib/http.js';
import { userForRequest } from './_lib/verify-token.js';
import { coupleKeyOf } from './_lib/couple-key.js';

const HEADERS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: HEADERS });

/**
 * A conversation key, or null.
 *
 * The shape api/_lib/expectations.js gives a row: a question id, like
 * `household__Cooking meals` or `lq_children`. Checked rather than trusted
 * because it becomes a key in a stored object, and length-capped so a caller
 * cannot grow the row without bound.
 */
function convoKey(value) {
  const key = String(value || '').trim();
  if (!key || key.length > 200) return null;
  return /^[A-Za-z0-9_]+(__.{1,180})?$/.test(key) ? key : null;
}

/** Is this the failure that means the column is not there yet? */
const missingColumn = (text) => /convos_data/.test(String(text || '')) && /column|schema cache|does not exist/i.test(String(text || ''));

export default async function handler(req) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || serviceKey;
  if (!supabaseUrl || !serviceKey) return json({ ok: false, error: 'not configured' }, 500);

  /**
   * ── THE TOKEN, NOT THE REQUEST ──────────────────────────────────────────
   * This read `userForRequest(req)`, and that function takes
   * `{ token, supabaseUrl, anonKey }`. A Request has none of those keys, so
   * `token` was undefined on every call and the endpoint answered 401 to
   * everybody, signed in or not, from the day it shipped. The boxes on both
   * surfaces drew, took the tap, and reverted a moment later.
   *
   * Nothing could see it. The 401 is also the right answer to a request with
   * no token, so the endpoint looked correct from outside, and the surfaces
   * put the tick back because that is what they do when a save is refused.
   *
   * CLAUDE.md already says this about `resultsGate` being handed the whole
   * capabilities object rather than its `caps` half: the object with the
   * right name is not always the object with the right keys. Same mistake,
   * nine lines into a new endpoint. check-auth-shape.mjs now fails the build
   * on a caller that hands this function anything but those three keys.
   */
  const auth = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  const me = token ? await userForRequest({ token, supabaseUrl, anonKey }) : null;
  if (!me?.id) return json({ ok: false, error: 'unauthorized' }, 401);

  const svc = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const rest = (path, init) => fetch(`${supabaseUrl}/rest/v1/${path}`, init);

  try {
    const pr = await rest(`profiles?id=eq.${encodeURIComponent(me.id)}&select=partner_profile_id`, { headers: svc });
    if (!pr.ok) return json({ ok: false, error: 'could not read your account' }, 503);
    const profile = (await pr.json().catch(() => []))?.[0] || null;
    /* No partner means no couple, and these conversations only exist for a
       couple. An empty set rather than an error: the page is still drawable. */
    if (!profile?.partner_profile_id) return json({ ok: true, convos: {} });
    const coupleKey = coupleKeyOf(me.id, profile.partner_profile_id);

    const readRow = async () => {
      const r = await rest(`couple_tools?couple_key=eq.${encodeURIComponent(coupleKey)}&select=convos_data`, { headers: svc });
      if (!r.ok) return { error: await r.text().catch(() => `${r.status}`) };
      const row = (await r.json().catch(() => []))?.[0] || null;
      return { convos: (row && row.convos_data) || {} };
    };

    if (req.method === 'GET') {
      const got = await readRow();
      if (got.error) {
        /* Behind schema is the old behaviour, not a failure: unticked boxes,
           which is what both surfaces drew before this existed. */
        if (missingColumn(got.error)) return json({ ok: true, convos: {}, pending: true });
        console.error('[convos] read failed:', got.error);
        return json({ ok: false, error: 'could not read your conversations' }, 503);
      }
      return json({ ok: true, convos: got.convos });
    }

    if (req.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405);

    /**
     * ── THE PARSE ANSWERS { body } OR { error }, NOT THE BODY ────────────
     * This read `body.key` off the wrapper, so the key was undefined on every
     * request and the endpoint answered "bad conversation" to a perfectly good
     * one. The second bug of exactly this shape in this file: a function's
     * return given the right NAME and the wrong keys.
     *
     * Every other caller of jsonBody in api/ uses the three-line form below,
     * and check-body-parsing.mjs now fails the build on one that does not.
     */
    const _parsed = await jsonBody(req);
    if (_parsed.error) return _parsed.error;
    const body = _parsed.body;
    const key = convoKey(body?.key);
    if (!key) return json({ ok: false, error: 'bad conversation' }, 400);
    const done = body?.done !== false;

    const got = await readRow();
    if (got.error) {
      if (missingColumn(got.error)) return json({ ok: false, error: 'not ready yet', pending: true }, 503);
      console.error('[convos] read-before-write failed:', got.error);
      return json({ ok: false, error: 'could not save that' }, 503);
    }

    /* Read, change the one key, write the whole object back. Last write wins,
       which is what the checklist on this same row already does and what a set
       of tick boxes can stand; two people ticking different rows in the same
       second is the only way to lose one, and the loser is a tick. */
    const convos = { ...got.convos };
    if (done) convos[key] = new Date().toISOString();
    else delete convos[key];

    const w = await rest('couple_tools?on_conflict=couple_key', {
      method: 'POST',
      headers: { ...svc, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ couple_key: coupleKey, convos_data: convos, updated_at: new Date().toISOString() }),
    });
    if (!w.ok) {
      const detail = await w.text().catch(() => `${w.status}`);
      if (missingColumn(detail)) return json({ ok: false, error: 'not ready yet', pending: true }, 503);
      console.error('[convos] write failed:', w.status, detail);
      return json({ ok: false, error: 'could not save that' }, 503);
    }
    return json({ ok: true, convos });
  } catch (e) {
    return json({ ok: false, error: safeError('convos', e, 'could not save that') }, 500);
  }
}
