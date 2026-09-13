/**
 * GET /api/admin-engagement
 *
 * What the Engagement tab draws. Admin-authenticated, like every other admin
 * endpoint.
 *
 * ── WHAT IS HERE, AND WHAT IS NOT ─────────────────────────────────────────
 * Ellie asked for nine measures. Four can be computed from what the product
 * already stores, and they are computed here. Five would need the site to
 * start recording things it does not record: how long someone spent on a page,
 * how many people visited, how many downloaded the app.
 *
 * Those five are not quietly stubbed with zeros. Zero and "we do not measure
 * this" look identical on a chart, and a dashboard that cannot tell them apart
 * is how a business ends up confident about a number nobody produced. Each one
 * comes back as `{ available: false, needs: '...' }` and the tab says so.
 *
 * Starting to collect them is a real decision and not only an engineering one.
 * Timing every page is behavioural data about customers, it would have to
 * appear in the privacy policy, and in the EU it would sit behind the consent
 * banner that went up today. That is Ellie's call to make, not a thing to
 * switch on because a tile looked empty.
 *
 * ── THE FOUR THAT ARE REAL ────────────────────────────────────────────────
 *   funnel        profiles, counted by how far each person got
 *   notesPer      notes and annotations, grouped by what they are anchored to
 *   tags          tags and note_tags, standard and custom, by use
 *   articleReads  post_reads, which covers posts in the table only
 *
 * Every one carries its own n, because a rate over four couples is a
 * different fact from the same rate over four hundred.
 */

import { checkAdminAuth } from './_lib/admin-auth.js';
import { EXERCISES } from './_exercises.js';

export const config = { runtime: 'edge' };

const json = (b, s = 200) => new Response(JSON.stringify(b), {
  status: s, headers: { 'Content-Type': 'application/json' },
});

/** Every row of a table, paged past PostgREST's default limit. */
async function all(url, key, path) {
  const out = [];
  const step = 1000;
  for (let from = 0; ; from += step) {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Range: `${from}-${from + step - 1}`,
        Prefer: 'count=none',
      },
    });
    if (!res.ok) break;
    const rows = await res.json().catch(() => []);
    if (!Array.isArray(rows) || rows.length === 0) break;
    out.push(...rows);
    if (rows.length < step) break;
  }
  return out;
}

/**
 * The four measures that come from page_events.
 *
 * ── ONE CALCULATION, THREE TILES ──────────────────────────────────────────
 * Time per marketing page, time per exercise and time per dashboard page are
 * the same arithmetic over different keys. A path is the marketing site. An
 * 'app:<view>' key is inside the product, and whether it is an exercise is the
 * registry's answer, not a list here.
 *
 * ── WHY THE MEDIAN AS WELL AS THE MEAN ────────────────────────────────────
 * One person who left a tab open for two hours moves a mean over forty
 * sessions by three minutes. The endpoint caps a single event at two hours,
 * which stops the worst of it, and reporting both numbers says when they
 * disagree, which is exactly when the mean should not be quoted.
 */
function engagementFromEvents(events) {
  const measured = Array.isArray(events) && events.length > 0;
  if (!measured) {
    const notYet = unavailable('Nothing recorded yet. The collection is built and migration 060 creates the table it writes to; until that is run, and until somebody visits, this stays empty.');
    return {
      siteVisits: notYet,
      timePerMarketingPage: notYet,
      timePerExercise: notYet,
      timePerDashboardPage: notYet,
    };
  }

  const EXERCISE_VIEWS = new Set(EXERCISES.map((e) => `app:${e.view}`));
  const stat = (list) => {
    if (!list.length) return null;
    const sorted = [...list].sort((a, b) => a - b);
    const mean = sorted.reduce((s, v) => s + v, 0) / sorted.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    return { seconds: Math.round(mean / 1000), medianSeconds: Math.round(median / 1000), n: sorted.length };
  };

  const byKey = {};
  for (const e of events) {
    if (e.kind !== 'page_time' || !Number.isFinite(Number(e.ms))) continue;
    (byKey[e.key] = byKey[e.key] || []).push(Number(e.ms));
  }
  const rows = (predicate) => Object.entries(byKey)
    .filter(([k]) => predicate(k))
    .map(([k, list]) => ({ key: k, ...stat(list) }))
    .sort((a, b) => b.n - a.n);

  const visits = events.filter((e) => e.kind === 'visit');
  const byPath = {};
  for (const v of visits) byPath[v.key] = (byPath[v.key] || 0) + 1;

  const since = events.reduce((oldest, e) => {
    const t = new Date(e.created_at).getTime();
    return Number.isFinite(t) && t < oldest ? t : oldest;
  }, Date.now());

  return {
    siteVisits: {
      available: true,
      total: visits.length,
      since: new Date(since).toISOString(),
      rows: Object.entries(byPath).map(([k, n]) => ({ key: k, visits: n })).sort((a, b) => b.visits - a.visits),
      note: 'Visits, not people. Nothing here can tell two visits by one person from one visit by two, which is deliberate.',
    },
    timePerMarketingPage: { available: true, rows: rows((k) => k.startsWith('/')) },
    timePerExercise: { available: true, rows: rows((k) => EXERCISE_VIEWS.has(k)) },
    timePerDashboardPage: {
      available: true,
      rows: rows((k) => k.startsWith('app:') && !EXERCISE_VIEWS.has(k)),
    },
  };
}

/** A measure we do not collect, said plainly rather than drawn as zero. */
const unavailable = (needs) => ({ available: false, needs });

export default async function handler(req) {
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  const auth = checkAdminAuth(req);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) return json({ error: 'Supabase env vars missing' }, 500);

  try {
    const columns = ['id', 'partner_profile_id', 'created_at', ...EXERCISES.map((e) => e.column)];
    const [profiles, notes, tags, noteTags, reads, events] = await Promise.all([
      all(url, key, `profiles?select=${columns.join(',')}`),
      all(url, key, 'notes?select=id,owner_id,anchor_type,anchor_key,body,visibility'),
      all(url, key, 'tags?select=id,owner_id,name,standard_key'),
      all(url, key, 'note_tags?select=note_id,tag_id'),
      all(url, key, 'post_reads?select=post_id,owner_id'),
      // Empty until migration 060 is run, which reads as "nothing measured
      // yet" rather than as an error, and the tiles say which.
      all(url, key, 'page_events?select=kind,key,ms,owner_id,created_at'),
    ]);

    // ── 1. The completion funnel ─────────────────────────────────────────
    //
    // One row per person, not per couple, and each step is a subset of the one
    // above it, so the chart reads as a funnel rather than five unrelated
    // counts. The exercise columns come from the registry: this had every
    // chance to become a sixth hand-maintained list of exercises.
    const done = (p, ex) => {
      const v = p[ex.column];
      if (!v) return false;
      if (ex.shape === 'record') return !!(v.completedAt || (v.answers && Object.keys(v.answers).length));
      return Object.keys(v).length > 0;
    };
    const core = EXERCISES.filter((e) => !e.capability);
    const funnel = [
      { step: 'Signed up', n: profiles.length },
      { step: 'Linked with a partner', n: profiles.filter((p) => p.partner_profile_id).length },
    ];
    for (const ex of EXERCISES) {
      funnel.push({ step: `Finished ${ex.label}`, n: profiles.filter((p) => done(p, ex)).length });
    }
    funnel.push({
      step: 'Both partners finished the core exercises',
      n: profiles.filter((p) => {
        if (!p.partner_profile_id) return false;
        const partner = profiles.find((q) => q.id === p.partner_profile_id);
        return !!partner && core.every((ex) => done(p, ex) && done(partner, ex));
      }).length,
    });

    // ── 2. Notes per thing ───────────────────────────────────────────────
    //
    // Grouped by what the note is anchored to. A standalone note has no
    // anchor and is counted separately rather than dropped, because "people
    // write notes that are not about anything on the page" is itself worth
    // knowing.
    const byAnchor = {};
    let standalone = 0;
    for (const n of notes) {
      if (!n.anchor_type) { standalone += 1; continue; }
      const bucket = (n.anchor_type === 'post' || n.anchor_type === 'post_block') ? 'article' : 'results';
      const keyName = n.anchor_key || '(none)';
      byAnchor[bucket] = byAnchor[bucket] || {};
      byAnchor[bucket][keyName] = (byAnchor[bucket][keyName] || 0) + 1;
    }
    const withNotes = new Set(notes.map((n) => n.owner_id)).size;
    const notesPer = {
      results: Object.entries(byAnchor.results || {}).map(([k, n]) => ({ key: k, notes: n }))
        .sort((a, b) => b.notes - a.notes),
      articles: Object.entries(byAnchor.article || {}).map(([k, n]) => ({ key: k, notes: n }))
        .sort((a, b) => b.notes - a.notes),
      standalone,
      total: notes.length,
      people: withNotes,
      perPerson: withNotes ? Number((notes.length / withNotes).toFixed(2)) : 0,
      shared: notes.filter((n) => n.visibility === 'shared').length,
    };

    // ── 3. Tags ──────────────────────────────────────────────────────────
    //
    // Standard and custom together, which is what was asked for. A tag row is
    // per person, so the same name from twelve people is twelve rows; they are
    // grouped by name, lowercased, and the count is of notes carrying them
    // rather than of the tags themselves. A tag nobody has used on a note is a
    // tag that was seeded, not a tag that was chosen.
    const tagById = new Map(tags.map((t) => [t.id, t]));
    const uses = {};
    for (const nt of noteTags) {
      const t = tagById.get(nt.tag_id);
      if (!t) continue;
      const name = String(t.name || '').trim();
      if (!name) continue;
      const k = name.toLowerCase();
      uses[k] = uses[k] || { name, standard: !!t.standard_key, notes: 0, people: new Set() };
      uses[k].notes += 1;
      uses[k].people.add(t.owner_id);
    }
    const tagUse = Object.values(uses)
      .map((t) => ({ name: t.name, standard: t.standard, notes: t.notes, people: t.people.size }))
      .sort((a, b) => b.notes - a.notes || b.people - a.people);
    const seeded = tags.filter((t) => !noteTags.some((nt) => nt.tag_id === t.id)).length;

    // ── 4. Article reads ─────────────────────────────────────────────────
    //
    // post_reads only. The twelve In Practice pieces on the website are static
    // HTML and record nothing, so this covers posts in the table, which today
    // is however many have been published through the admin. Said on the tile
    // rather than left for someone to infer from a small number.
    const readCounts = {};
    for (const r of reads) readCounts[r.post_id] = (readCounts[r.post_id] || 0) + 1;
    const articleReads = {
      rows: Object.entries(readCounts).map(([id, n]) => ({ id, reads: n })).sort((a, b) => b.reads - a.reads),
      readers: new Set(reads.map((r) => r.owner_id)).size,
      audience: profiles.length,
    };

    return json({
      ok: true,
      generatedAt: new Date().toISOString(),
      funnel,
      notesPer,
      tags: { used: tagUse, seededUnused: seeded, total: tags.length },
      articleReads,

      ...engagementFromEvents(events),

      // The one that still needs something nobody here can supply.
      appDownloads: unavailable('Only App Store Connect knows this. It needs an API key, an issuer id and a private key in the environment, and the app is not in the store yet. Everything else on this tab is measured now.'),
    });
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
}
