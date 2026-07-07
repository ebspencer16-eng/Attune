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

// Capability flags per package key. MUST stay in sync with pkgConfig in the
// dashboard component (src/App.jsx). core grants nothing on its own.
export const PKG_CAPS = {
  core:        { rank: 0, hasChecklist: false, hasReflection: false, hasBudget: false, hasLmft: false },
  newlywed:    { rank: 1, hasChecklist: true,  hasReflection: false, hasBudget: true,  hasLmft: false },
  anniversary: { rank: 1, hasChecklist: false, hasReflection: true,  hasBudget: false, hasLmft: false },
  premium:     { rank: 2, hasChecklist: false, hasReflection: true,  hasBudget: true,  hasLmft: true  },
};

export const ORDER_SELECT = 'order_num,pkg_key,is_physical,addon_lmft,addon_reflection,addon_budget,addon_checklist,addon_intimacy,addon_workbook,created_at';

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
      addonLmft: true, addonReflection: true, addonBudget: true,
      addonChecklist: true, addonIntimacy: true, addonWorkbook: 'digital',
    };
  }
  const list = (Array.isArray(rows) ? rows : []).filter(Boolean);
  let pkg = 'core', bestRank = -1, orderNum = '', newestAt = -1, isPhysical = false;
  let addonLmft = false, addonReflection = false, addonBudget = false;
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
    addonLmft       = addonLmft       || cap.hasLmft       || !!o.addon_lmft;
    addonReflection = addonReflection || cap.hasReflection || !!o.addon_reflection;
    addonBudget     = addonBudget     || cap.hasBudget     || !!o.addon_budget;
    addonChecklist  = addonChecklist  || cap.hasChecklist  || !!o.addon_checklist;
    addonIntimacy   = addonIntimacy   || !!o.addon_intimacy;
    if (o.addon_workbook === 'printed') addonWorkbook = 'printed';
    else if (!addonWorkbook && o.addon_workbook) addonWorkbook = o.addon_workbook;
    if (cap.rank > 0 || o.addon_lmft || o.addon_reflection || o.addon_budget || o.addon_checklist || o.addon_intimacy || o.addon_workbook) hasGrant = true;
  }
  return { comp: false, hasGrant, pkg, orderNum, isPhysical,
    addonLmft, addonReflection, addonBudget, addonChecklist, addonIntimacy, addonWorkbook };
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
    addonLmft: !!(a?.addonLmft || b?.addonLmft),
    addonReflection: !!(a?.addonReflection || b?.addonReflection),
    addonBudget: !!(a?.addonBudget || b?.addonBudget),
    addonChecklist: !!(a?.addonChecklist || b?.addonChecklist),
    addonIntimacy: !!(a?.addonIntimacy || b?.addonIntimacy),
    addonWorkbook: (a?.addonWorkbook === 'printed' || b?.addonWorkbook === 'printed') ? 'printed' : (b?.addonWorkbook || a?.addonWorkbook || ''),
  };
}

// ── SERVER WRITER ─────────────────────────────────────────────────────────────

async function restGet(url, serviceKey, path) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!res.ok) return [];
  try { return await res.json(); } catch { return []; }
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
    const profileSelect = 'id,email,is_comp,pkg,addon_lmft,addon_reflection,addon_budget,addon_checklist,addon_intimacy,addon_workbook,joined_via_invite,partner_profile_id';
    const profiles = await restGet(supabaseUrl, serviceKey, `profiles?id=eq.${encodeURIComponent(userId)}&select=${profileSelect}`);
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
    // Profile's own columns as a grant source.
    rows.push({
      order_num: null, pkg_key: profile.pkg || null, is_physical: false,
      addon_lmft: profile.addon_lmft, addon_reflection: profile.addon_reflection,
      addon_budget: profile.addon_budget, addon_checklist: profile.addon_checklist,
      addon_intimacy: profile.addon_intimacy, addon_workbook: profile.addon_workbook,
      created_at: null,
    });

    if (!profile.is_comp) {
      add(await restGet(supabaseUrl, serviceKey, `orders?user_id=eq.${encodeURIComponent(userId)}&select=${ORDER_SELECT}`));
      const em = (email || profile.email || '').toLowerCase();
      if (em) add(await restGet(supabaseUrl, serviceKey, `orders?buyer_email=eq.${encodeURIComponent(em)}&select=${ORDER_SELECT}`));
      // Invitee inherits Partner A's orders through the partner link.
      if (profile.joined_via_invite && profile.partner_profile_id) {
        add(await restGet(supabaseUrl, serviceKey, `orders?user_id=eq.${encodeURIComponent(profile.partner_profile_id)}&select=${ORDER_SELECT}`));
      }
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
