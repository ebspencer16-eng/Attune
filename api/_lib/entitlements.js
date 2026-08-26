/**
 * Single source of truth for entitlement logic, shared by the client
 * (src/App.jsx) and the server writers (stripe-webhook, partner-sync, etc.).
 *
 * The pure functions (computeEntitlements, mergeEntitlementsGrantOnly) carry
 * the rule; keeping them in one file is what stops the client and server from
 * drifting. writeEntitlements is the server-only writer: it reads the account's
 * orders + profile, computes the union, and stores it authoritatively on
 * profiles.entitlements so the client can read one column instead of deriving
 * from raw order rows.
 *
 * Edge-safe: no Node-only APIs, fetch only.
 */

// Capability flags per package key. These MUST mirror pkgConfig in the
// dashboard component (src/App.jsx). Verified against it.
// only; reflection/budget/checklist come from explicit add-on flags. Claiming
// a package grants more than it does inflates entitlements; claiming less
// strips them.
export const PKG_CAPS = {
  core:        { rank: 0, hasChecklist: false, hasReflection: false, hasBudget: false },
  newlywed:    { rank: 1, hasChecklist: true,  hasReflection: false, hasBudget: true },
  anniversary: { rank: 1, hasChecklist: false, hasReflection: true,  hasBudget: false },
  premium:     { rank: 2, hasChecklist: false, hasReflection: true,  hasBudget: true,  hasIntimacy: true, hasWorkbook: 'digital' },
};

export const ORDER_SELECT = 'order_num,pkg_key,is_physical,addon_reflection,addon_budget,addon_checklist,addon_intimacy,addon_workbook,created_at';

// Entitlements are cumulative, never chronological. Union every order the
// account owns (plus its profile columns, plus any comp grant) so a newer or
// partial order can only ADD access, never strip it. A row with
// { pkg_key, addon_*, order_num, created_at } is the shape both real orders and
// the profile pseudo-row use.
export function computeEntitlements(rows, profile) {
  // Comp accounts get full access with no dependence on an order row.
  if (profile?.is_comp) {
    return {
      comp: true, hasGrant: true,
      pkg: 'premium', orderNum: '', isPhysical: false,
      addonReflection: true, addonBudget: true,
      addonChecklist: true, addonIntimacy: true, addonWorkbook: 'digital',
    };
  }
  const list = (Array.isArray(rows) ? rows : []).filter(Boolean);
  let pkg = 'core', bestRank = -1, orderNum = '', newestAt = -1, isPhysical = false;
  let addonReflection = false, addonBudget = false;
  let addonChecklist = false, addonIntimacy = false, addonWorkbook = '';
  let hasGrant = false;
  for (const o of list) {
    const key = o.pkg_key || 'core';
    const cap = PKG_CAPS[key] || PKG_CAPS.core;
    if (cap.rank > bestRank) { bestRank = cap.rank; pkg = key; }
    if (o.order_num) {
      const at = o.created_at ? new Date(o.created_at).getTime() : 0;
      if (at >= newestAt) { newestAt = at; orderNum = o.order_num; }
      hasGrant = true;
    }
    if (o.is_physical) isPhysical = true;
    // Capability = package-inherent OR the add-on flag.
    addonReflection = addonReflection || cap.hasReflection || !!o.addon_reflection;
    addonBudget     = addonBudget     || cap.hasBudget     || !!o.addon_budget;
    addonChecklist  = addonChecklist  || cap.hasChecklist  || !!o.addon_checklist;
    addonIntimacy   = addonIntimacy   || cap.hasIntimacy   || !!o.addon_intimacy;
    if (o.addon_workbook === 'printed') addonWorkbook = 'printed';
    else if (o.addon_workbook) addonWorkbook = addonWorkbook || o.addon_workbook;
    else if (cap.hasWorkbook && !addonWorkbook) addonWorkbook = cap.hasWorkbook;
    if (cap.rank > 0 || o.addon_reflection || o.addon_budget || o.addon_checklist || o.addon_intimacy || o.addon_workbook) hasGrant = true;
  }
  return { comp: false, hasGrant, pkg, orderNum, isPhysical,
    addonReflection, addonBudget, addonChecklist, addonIntimacy, addonWorkbook };
}

// Merge two entitlement objects grant-only (OR the capabilities). Used on the
// client returning-device path so a resync can never strip what the account
// already had locally.
export function mergeEntitlementsGrantOnly(a, b) {
  const rankOf = (p) => (PKG_CAPS[p]?.rank ?? 0);
  return {
    comp: !!(a?.comp || b?.comp),
    hasGrant: !!(a?.hasGrant || b?.hasGrant),
    pkg: rankOf(b?.pkg) >= rankOf(a?.pkg) ? (b?.pkg || a?.pkg || 'core') : (a?.pkg || 'core'),
    orderNum: b?.orderNum || a?.orderNum || '',
    isPhysical: !!(a?.isPhysical || b?.isPhysical),
    addonReflection: !!(a?.addonReflection || b?.addonReflection),
    addonBudget: !!(a?.addonBudget || b?.addonBudget),
    addonChecklist: !!(a?.addonChecklist || b?.addonChecklist),
    addonIntimacy: !!(a?.addonIntimacy || b?.addonIntimacy),
    addonWorkbook: (a?.addonWorkbook === 'printed' || b?.addonWorkbook === 'printed') ? 'printed' : (b?.addonWorkbook || a?.addonWorkbook || ''),
  };
}

// Cheap equality check on the capability-bearing fields. The client uses this
// to decide whether the stored blob is stale and a recompute should be fired.
export function sameEntitlements(a, b) {
  if (!a || !b) return false;
  return a.pkg === b.pkg
    && !!a.addonReflection === !!b.addonReflection
    && !!a.addonBudget === !!b.addonBudget
    && !!a.addonChecklist === !!b.addonChecklist
    && !!a.addonIntimacy === !!b.addonIntimacy
    && (a.addonWorkbook || '') === (b.addonWorkbook || '')
    && !!a.comp === !!b.comp;
}

// ── SERVER WRITER ─────────────────────────────────────────────────────────────

// Returns { data, error }. Never collapses a failed request into an empty
// list: a 400 (e.g. selecting a column that doesn't exist) previously looked
// identical to "no rows", which silently produced wrong entitlements.
async function restGet(url, serviceKey, path) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    const error = `${res.status} ${detail}`.trim();
    console.error('[entitlements] REST read failed:', path.split('?')[0], error);
    return { data: null, error };
  }
  try { return { data: await res.json(), error: null }; }
  catch (e) { return { data: null, error: `bad json: ${e}` }; }
}

/**
 * Recompute an account's entitlements from all authoritative sources (its
 * orders, its profile columns, any comp grant, and, for an invitee, Partner A's
 * orders) and write the union to profiles.entitlements. Call this after any
 * event that can change entitlements: order created/updated, comp toggled,
 * invitee linked, QR claimed.
 *
 * Returns { ok, entitlements } or { ok: false, error }.
 */
export async function writeEntitlements({ supabaseUrl, serviceKey, userId, email }) {
  if (!supabaseUrl || !serviceKey || !userId) {
    return { ok: false, error: 'missing supabaseUrl/serviceKey/userId' };
  }
  try {
    // Select * : profiles has drifted from the migrations (no `pkg`, no
    // `addon_checklist`), and naming a nonexistent column makes PostgREST
    // return 400 for the whole row. `*` is resilient to that drift.
    const { data: profiles, error: profErr } = await restGet(supabaseUrl, serviceKey, `profiles?id=eq.${encodeURIComponent(userId)}&select=*`);
    if (profErr) return { ok: false, error: `profile read failed: ${profErr}` };
    const profile = Array.isArray(profiles) ? profiles[0] : null;
    if (!profile) return { ok: false, error: 'profile not found' };

    const rows = [];
    const seen = new Set();
    const add = (data) => {
      for (const r of (data || [])) {
        const k = r.order_num || `${r.pkg_key}:${r.created_at}`;
        if (!seen.has(k)) { seen.add(k); rows.push(r); }
      }
    };
    // Profile's own columns as a grant source. Missing columns read as
    // undefined, which computeEntitlements treats as "no grant".
    rows.push({
      order_num: null, pkg_key: profile.pkg || null, is_physical: false,
      addon_reflection: profile.addon_reflection,
      addon_budget: profile.addon_budget, addon_checklist: profile.addon_checklist,
      addon_intimacy: profile.addon_intimacy, addon_workbook: profile.addon_workbook,
      created_at: null,
    });

    if (!profile.is_comp) {
      const reads = [
        restGet(supabaseUrl, serviceKey, `orders?user_id=eq.${encodeURIComponent(userId)}&select=${ORDER_SELECT}`),
      ];
      const em = (email || profile.email || '').toLowerCase();
      if (em) reads.push(restGet(supabaseUrl, serviceKey, `orders?buyer_email=eq.${encodeURIComponent(em)}&select=${ORDER_SELECT}`));
      if (profile.joined_via_invite && profile.partner_profile_id) {
        reads.push(restGet(supabaseUrl, serviceKey, `orders?user_id=eq.${encodeURIComponent(profile.partner_profile_id)}&select=${ORDER_SELECT}`));
      }
      const results = await Promise.all(reads);
      // If ANY orders read failed we cannot know what the account owns.
      // Writing a blob now would persist a downgrade. Abort instead.
      const failed = results.find(r => r.error);
      if (failed) return { ok: false, error: `orders read failed: ${failed.error}` };
      for (const r of results) add(r.data);
    }

    const ent = computeEntitlements(rows, profile);
    const blob = { ...ent, computedAt: new Date().toISOString() };

    const patchRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ entitlements: blob, entitlements_updated_at: blob.computedAt }),
    });
    if (!patchRes.ok) {
      const detail = await patchRes.text().catch(() => '');
      return { ok: false, error: `profile patch failed: ${patchRes.status} ${detail}` };
    }
    return { ok: true, entitlements: blob };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
}
