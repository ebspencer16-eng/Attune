/**
 * The two tools' saved state: Starting Out and Build a Budget.
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

import { capabilitiesFor, OWNERSHIP_COLUMNS } from './_lib/ownership.js';
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
        const oRes = await rest(
          `orders?user_id=eq.${me}&workbook_url=not.is.null&select=workbook_url&order=created_at.desc&limit=1`,
          { headers: svc });
        const row = (await oRes.json().catch(() => []))?.[0];
        workbook = {
          url: row?.workbook_url || null,
          fileName: workbookFileName(profile.name, partnerName),
          copy: WORKBOOK_COPY,
        };
      }

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
        checklist: caps.ownsChecklist ? (profile.checklist_data || null) : null,
        budget: caps.ownsBudget ? (profile.budget_data || null) : null,
      });
    }

    if (req.method !== 'POST') return json({ ok: false, error: 'GET or POST only' }, 405);

    const body = await req.json().catch(() => ({}));
    const tool = TOOLS[body?.tool];
    if (!tool) return json({ ok: false, error: 'unknown tool' }, 400);
    if (!caps[tool.capability]) return json({ ok: false, error: 'not included in your package' }, 403);

    const data = body?.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return json({ ok: false, error: 'data must be an object' }, 400);
    }
    if (JSON.stringify(data).length > MAX_BYTES) {
      return json({ ok: false, error: 'too large' }, 413);
    }

    const uRes2 = await rest(`profiles?id=eq.${me}`, {
      method: 'PATCH',
      headers: { ...svc, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ [tool.column]: data }),
    });
    if (!uRes2.ok) {
      console.error('[tool-data] write failed:', uRes2.status);
      return json({ ok: false, error: 'could not save' }, 500);
    }
    return json({ ok: true });
  } catch (e) {
    console.error('[tool-data] failed:', e);
    return json({ ok: false, error: 'tool data unavailable' }, 500);
  }
}
