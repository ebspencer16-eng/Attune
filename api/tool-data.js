/**
 * The two tools' saved state: the Merging Lives Checklist and Build a Budget.
 *
 *   GET  /api/tool-data              → { ok, checklist, budget, owned }
 *   POST /api/tool-data { tool, data } → { ok }
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * The website writes profiles.checklist_data and profiles.budget_data straight
 * from the browser with the user's own Supabase session. The app has no
 * Supabase client; every other thing it saves goes through an endpoint with a
 * bearer token, and these two had none, so the tools could only ever exist on
 * the website.
 *
 * Ellie: "I want all of these to open in app if the user is in the app."
 *
 * ── WHAT IT WILL NOT DO ────────────────────────────────────────────────────
 * Write a tool the caller does not own. The website relies on RLS and on the
 * page not being reachable; an endpoint has to say no itself. Ownership comes
 * from capabilitiesFor, the same answer every other surface gets, rather than
 * a package name compared here.
 *
 * It also stores the state and nothing else. No merging, no reconciliation
 * between devices: last write wins, which is what the website has always done
 * and what a checkbox list can stand. A budget two people edit at once is a
 * different problem and is not this one.
 */

import { jsonBody } from './_lib/http.js';
import { freshWorkbookUrl, signedUrlIsLive } from './_lib/workbook-link.js';
import { isWorkbookUrl } from './_lib/workbook-format.js';
import { capabilitiesFor, OWNERSHIP_COLUMNS } from './_lib/ownership.js';
import { coupleKeyOf } from './_lib/couple-key.js';
// The checklist's own content, so the app renders the website's words rather
// than a copy of them. Sent with the state because the app has one call here
// and a second round trip for a static list would be worse than the bytes.
import { CHECKLIST_AREAS, CHECKLIST_COPY } from './_checklist.js';
// The budget's categories, models and words. The arithmetic is mirrored in the
// app rather than sent, because the reveal updates as you type; see
// check-budget-mirror.mjs.
import { BUDGET_CATEGORIES, POOLING_MODELS, BUDGET_COPY } from './_budget.js';
// What a surface says about the workbook, and what the file is called.
import { WORKBOOK_COPY, workbookFileName } from './_lib/workbook-copy.js';

export const config = { runtime: 'edge' };

const HEADERS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: HEADERS });

/** The tools this endpoint serves, and the column each one lives in. */
/**
 * The couple's shared row, and everything that follows from there being one.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * Ellie: "Budget and checklist should be mirrored for each partner. One partner
 * checking something off should show on both partners' checklists, same with
 * budget inputs. This structure should persist regardless of where the users are
 * accessing the resources (app or site)."
 *
 * Both tools lived on the editor's own profile and nothing read the partner's,
 * so a couple had one budget each and no way to see the other. The Shared Budget
 * keys both of their incomes by name, so the design always assumed one row.
 *
 * ── WHAT HAPPENS TO WHAT THEY ALREADY WROTE ───────────────────────────────
 * It is moved up the first time either of them opens a tool, which is the only
 * moment both profiles are in hand. If both partners have something, the one
 * with more in it wins and the other is not deleted: it stays on the profile
 * column, so nothing is destroyed by a merge nobody asked for, and it can be
 * looked at if anyone reports losing work.
 *
 * ── UNTIL MIGRATION 076 IS RUN ────────────────────────────────────────────
 * Every read here fails and the endpoint falls back to the caller's own profile,
 * which is exactly what it did before. So a behind schema is the old behaviour
 * rather than an error, and supabase/diagnostics/migrations-actually-run.sql is
 * where to find out.
 */
/** How long a focus stamp means anybody. */
const PRESENCE_SECONDS = 12;

/**
 * What the couple's tools hold, and who is in them.
 *
 * Seeds the shared row the first time it is asked for, from whichever partner's
 * profile has more in it. The loser is left on its profile column rather than
 * deleted: a merge nobody asked for should not be able to destroy work, and if
 * anyone reports losing a budget it is still there to look at.
 */
async function readShared({ rest, svc, me, profile, coupleKey, wantsChecklist, wantsBudget }) {
  const fallback = {
    checklist: profile.checklist_data || null,
    budget: profile.budget_data || null,
    editing: {},
  };

  let row = await sharedRow({ rest, svc, coupleKey });

  if (!row) {
    /* Nothing yet. Seed from both profiles, so a couple who filled one in
       before this existed opens it and finds their work. */
    let theirs = null;
    if (profile.partner_profile_id) {
      try {
        const r = await rest(
          `profiles?id=eq.${profile.partner_profile_id}&select=checklist_data,budget_data`,
          { headers: svc });
        if (r.ok) theirs = (await r.json().catch(() => []))?.[0] || null;
      } catch { /* their row is not required to seed mine */ }
    }
    const pick = (a, b) => (toolWeight(a) >= toolWeight(b) ? a : b) || null;
    const seeded = {
      couple_key: coupleKey,
      checklist_data: pick(profile.checklist_data, theirs?.checklist_data),
      budget_data: pick(profile.budget_data, theirs?.budget_data),
    };
    if (seeded.checklist_data || seeded.budget_data) {
      try {
        await rest('couple_tools?on_conflict=couple_key', {
          method: 'POST',
          headers: { ...svc, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(seeded),
        });
      } catch { /* a failed seed is a fallback read, not a failed request */ }
    }
    row = await sharedRow({ rest, svc, coupleKey });
    if (!row) return fallback;
  }

  /* Who has a field open, other than the reader, recently enough to mean it. */
  const editing = {};
  const cutoff = Date.now() - PRESENCE_SECONDS * 1000;
  for (const [field, at] of Object.entries(row.editing || {})) {
    if (!at || typeof at !== 'object') continue;
    if (at.by === me) continue;
    if (!(new Date(at.at).getTime() > cutoff)) continue;
    editing[field] = true;
  }

  return {
    checklist: wantsChecklist ? (row.checklist_data ?? null) : null,
    budget: wantsBudget ? (row.budget_data ?? null) : null,
    editing,
  };
}

async function sharedRow({ rest, svc, coupleKey }) {
  if (!coupleKey) return null;
  try {
    const r = await rest(`couple_tools?couple_key=eq.${encodeURIComponent(coupleKey)}&select=*`, { headers: svc });
    if (!r.ok) return null;
    return (await r.json().catch(() => []))?.[0] || null;
  } catch { return null; }
}

/** How much someone has actually put into a tool, for deciding which copy wins. */
function toolWeight(v) {
  if (!v || typeof v !== 'object') return 0;
  return JSON.stringify(v).length;
}

const TOOLS = {
  checklist: { column: 'checklist_data', capability: 'ownsChecklist' },
  budget: { column: 'budget_data', capability: 'ownsBudget' },
};

/**
 * A tool's state is a JSON object the client owns the shape of. What is
 * checked here is that it IS an object and that it is not enormous: an
 * endpoint that will write anything into a column is how a column becomes a
 * place to put anything.
 */
const MAX_BYTES = 256 * 1024;

export default async function handler(req) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE_KEY
                  || process.env.SUPABASE_SERVICE_ROLE;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || serviceKey;
  if (!supabaseUrl || !serviceKey) return json({ ok: false, error: 'Server not configured' }, 500);

  const token = (req.headers.get('authorization') || req.headers.get('Authorization') || '')
    .replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ ok: false, error: 'missing auth token' }, 401);

  try {
    const uRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    });
    if (!uRes.ok) return json({ ok: false, error: 'invalid auth token' }, 401);
    const user = await uRes.json().catch(() => null);
    if (!user?.id) return json({ ok: false, error: 'invalid auth token' }, 401);
    const me = user.id;

    const svc = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
    const rest = (path, init) => fetch(`${supabaseUrl}/rest/v1/${path}`, init);

    // `name` and the partner's, because the budget keys its income and
    // personal-spending entries BY NAME. See budgetNames below.
    const cols = ['name', 'partner_name', 'partner_profile_id',
      'checklist_data', 'budget_data', ...OWNERSHIP_COLUMNS].join(',');
    const pRes = await rest(`profiles?id=eq.${me}&select=${cols}`, { headers: svc });
    const profile = (await pRes.json().catch(() => []))?.[0] || null;
    if (!profile) return json({ ok: false, error: 'profile not found' }, 404);

    const caps = capabilitiesFor(profile);

    // ── Read ────────────────────────────────────────────────────────────────
    // Only what they own. A tool someone has not bought comes back null rather
    // than absent, so the app can tell "nothing saved" from "not yours" by
    // asking `owned` rather than by guessing from a missing key.
    if (req.method === 'GET') {
      /**
       * ── THE NAMES THE BUDGET IS KEYED BY ────────────────────────────────
       * A budget stores incomes and personal spending as
       * { [name]: amount }, so the name is a key and not a label.
       *
       * The website uses account.name, which is profiles.name in full. The
       * app's home payload sends firstName, which is the first word of it. A
       * couple called "Ellie Bowman" would have written their income under
       * "Ellie Bowman" on a laptop and read "Ellie" on a phone, so each
       * surface would show the other's figures as empty and overwrite them on
       * the next save.
       *
       * So the names come from here, in the form the website already wrote
       * them in. The partner's own row is preferred over partner_name, which
       * is what the buyer typed at setup and can differ from what the partner
       * later called themselves.
       */
      let partnerName = profile.partner_name || null;
      if (profile.partner_profile_id) {
        const bRes = await rest(`profiles?id=eq.${profile.partner_profile_id}&select=name`, { headers: svc });
        const b = (await bRes.json().catch(() => []))?.[0];
        if (b?.name) partnerName = b.name;
      }

      /**
       * ── THE WORKBOOK IS A FILE, NOT A SCREEN ────────────────────────────
       * /app?view=workbook on the website is the page that sells it. The
       * workbook itself is a generated .docx behind orders.workbook_url, so
       * the app's job is to hand the reader the file, not to draw one. It is
       * also why this does not become an app screen: CLAUDE.md says the app
       * does not sell, and a page describing something you can buy is the
       * thing that rule is about.
       *
       * Null until it exists. The two states a surface can be in, ready and
       * generating, have one wording between them in _lib/workbook-copy.js.
       */
      let workbook = null;
      if (caps.ownsWorkbook) {
        /**
         * The buyer's order, which for an invitee is their partner's.
         *
         * This asked only for rows owned by the reader, so Partner B, who
         * never bought anything, never found the file their couple owns. The
         * same shape of miss as the generation trigger that only ever ran in
         * the buyer's browser.
         */
        const owners = [me, profile.partner_profile_id].filter(Boolean)
          .map((id) => `user_id.eq.${id}`).join(',');
        const oRes = await rest(
          `orders?or=(${owners})&workbook_url=not.is.null&select=order_num,workbook_url&order=created_at.desc&limit=1`,
          { headers: svc });
        const row = (await oRes.json().catch(() => []))?.[0];
        // The stored URL was signed for seven days when the file was made, so
        // for most couples it is already dead by the time they ask for it. Mint
        // a new signature over the same file; fall back to the stored one only
        // if it is somehow still live, and to null rather than to a link that
        // opens an error page.
        const fresh = await freshWorkbookUrl({
          supabaseUrl, serviceKey, orderNum: row?.order_num,
        });
        /**
         * The stored link is held to the same rule as a minted one.
         *
         * It was not, and minting returns null for precisely the couples whose
         * folder holds no PDF, so this fallback handed every one of them the old
         * Word file. Ellie saw it open in the app as
         * `Attune_Workbook_..._and_Preston.docx`. See isWorkbookUrl.
         */
        const stored = isWorkbookUrl(row?.workbook_url) && signedUrlIsLive(row?.workbook_url)
          ? row.workbook_url
          : null;
        workbook = {
          url: fresh || stored,
          fileName: workbookFileName(profile.name, partnerName),
          copy: WORKBOOK_COPY,
        };
      }

      /**
       * ── ONE BUDGET AND ONE CHECKLIST BETWEEN THEM ────────────────────────
       * Read from the couple's row, and seeded from the two profiles the first
       * time anyone asks. Falls back to the reader's own profile when migration
       * 076 has not been run, which is the behaviour this replaced.
       */
      const shared = await readShared({
        rest, svc, me, profile, coupleKey: coupleKeyOf(me, profile.partner_profile_id || me),
        wantsChecklist: caps.ownsChecklist, wantsBudget: caps.ownsBudget,
      });

      return json({
        ok: true,
        owned: caps.owned || [],
        workbook,
        budgetNames: {
          you: profile.name || 'You',
          them: partnerName || 'Your partner',
        },
        // The list itself, for whoever owns it. Not sent otherwise: it is a
        // product someone can buy.
        areas: caps.ownsChecklist ? CHECKLIST_AREAS : null,
        copy: caps.ownsChecklist ? CHECKLIST_COPY : null,
        budgetCategories: caps.ownsBudget ? BUDGET_CATEGORIES : null,
        poolingModels: caps.ownsBudget ? POOLING_MODELS : null,
        budgetCopy: caps.ownsBudget ? BUDGET_COPY : null,
        checklist: caps.ownsChecklist ? shared.checklist : null,
        budget: caps.ownsBudget ? shared.budget : null,
        /**
         * Who is in a field right now, if anyone, and it is never the reader.
         * Stamps older than PRESENCE_SECONDS are nobody: this is rewritten on
         * every focus and nothing reliably clears it, because a phone going to
         * sleep sends no blur.
         */
        editing: shared.editing,
      });
    }

    if (req.method !== 'POST') return json({ ok: false, error: 'GET or POST only' }, 405);

    const _parsed = await jsonBody(req);
    if (_parsed.error) return _parsed.error;
    const body = _parsed.body;
    const tool = TOOLS[body?.tool];
    if (!tool) return json({ ok: false, error: 'unknown tool' }, 400);
    if (!caps[tool.capability]) return json({ ok: false, error: 'not included in your package' }, 403);

    const coupleKey = coupleKeyOf(me, profile.partner_profile_id || me);

    /**
     * ── SOMEONE PUT THEIR CURSOR IN A FIELD ────────────────────────────────
     * Ellie: "The budget should show your partner's icon or something in a text
     * box if they're currently editing that figure."
     *
     * Not a save. A stamp saying who is in which field, so the other one can be
     * told, and it carries no data of its own. Nothing reliably clears it, since
     * a phone going to sleep sends no blur, so it is read as stale after
     * PRESENCE_SECONDS rather than trusted until someone says otherwise.
     *
     * It is on this endpoint rather than a realtime channel because the app
     * deliberately does not carry a realtime client, which is written down in
     * attune-app/src/api/auth.ts. A poll while the screen is open is the price.
     */
    if (body.editing !== undefined) {
      const field = String(body.editing || '').slice(0, 120);
      if (!profile.partner_profile_id) return json({ ok: true, editing: {} });
      const row = await sharedRow({ rest, svc, coupleKey });
      const next = { ...(row?.editing || {}) };
      /* Drop this person from wherever they were, then mark where they are.
         Without the first half, leaving a field silently keeps them in it for
         the full window and the partner sees two fields held at once. */
      for (const [k, v] of Object.entries(next)) if (v?.by === me) delete next[k];
      if (field) next[field] = { by: me, at: new Date().toISOString() };
      try {
        await rest('couple_tools?on_conflict=couple_key', {
          method: 'POST',
          headers: { ...svc, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({ couple_key: coupleKey, editing: next }),
        });
      } catch { /* presence is a courtesy; failing it must not fail the screen */ }
      return json({ ok: true });
    }

    const data = body?.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return json({ ok: false, error: 'data must be an object' }, 400);
    }
    if (JSON.stringify(data).length > MAX_BYTES) {
      return json({ ok: false, error: 'too large' }, 413);
    }

    /**
     * ── THE COUPLE'S ROW FIRST, THEN THE PROFILE ───────────────────────────
     * The shared row is the one both of them read, so it is the write that has
     * to succeed. The profile column is written too, and deliberately: it is
     * what the endpoint falls back to while migration 076 has not been run, and
     * it is a per-person copy of the last thing that person saved, which is the
     * only thing anybody could look at if a merge ever went wrong.
     *
     * If the shared write fails and the profile write succeeds, the save is
     * reported as failed. Telling someone their budget saved when their partner
     * cannot see it is the failure this whole change is about.
     */
    let sharedOk = true;
    try {
      const cRes = await rest('couple_tools?on_conflict=couple_key', {
        method: 'POST',
        headers: { ...svc, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({
          couple_key: coupleKey,
          [tool.column]: data,
          updated_at: new Date().toISOString(),
        }),
      });
      if (!cRes.ok) sharedOk = false;
    } catch { sharedOk = false; }

    const uRes2 = await rest(`profiles?id=eq.${me}`, {
      method: 'PATCH',
      headers: { ...svc, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ [tool.column]: data }),
    });
    if (!uRes2.ok) {
      console.error('[tool-data] write failed:', uRes2.status);
      return json({ ok: false, error: 'could not save' }, 500);
    }
    if (!sharedOk) {
      console.error('[tool-data] the couple row did not take the write; migration 076 may not be run');
      return json({ ok: false, error: 'could not save' }, 500);
    }
    return json({ ok: true });
  } catch (e) {
    console.error('[tool-data] failed:', e);
    return json({ ok: false, error: 'tool data unavailable' }, 500);
  }
}
