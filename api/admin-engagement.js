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
import { resultsNav } from './_lib/results-sections.js';
import { axisScores, calcDimScores, typeCodeFromAxes } from './_type-engine.js';

export const config = { runtime: 'edge' };

const json = (b, s = 200) => new Response(JSON.stringify(b), {
  status: s, headers: { 'Content-Type': 'application/json' },
});

/** Every row of a table, paged past PostgREST's default limit. */
/**
 * Every row of a table, in pages.
 *
 * Returns the error as well as the rows, and that is the point. This used to
 * stop on a bad response and return an empty array, so a select naming a
 * column that does not exist looked exactly like a table with nothing in it.
 * That is what happened: the events select asked for `surface`, migration 061
 * had not been run, PostgREST rejected the whole select, and every chart on
 * the page read zero while the data sat in the table.
 *
 * A tool that cannot tell "broken" from "nothing here yet" is a tool that
 * reports the wrong thing confidently, which is worse than reporting nothing.
 */
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
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return { rows: out, error: `${path.split('?')[0]}: ${res.status} ${detail.slice(0, 160)}` };
    }
    const rows = await res.json().catch(() => []);
    if (!Array.isArray(rows) || rows.length === 0) break;
    out.push(...rows);
    if (rows.length < step) break;
  }
  return { rows: out, error: null };
}

/**
 * Everything the Engagement page draws, from what the product stores.
 *
 * ── THE SHAPES ────────────────────────────────────────────────────────────
 * Four headline numbers with a 30-day window and the 30 before it; two lines
 * over time; five time-per-page charts; two tables and two note charts.
 *
 * ── WHERE THE CATEGORIES COME FROM ────────────────────────────────────────
 * resultsNav and api/_exercises.js. The eight results groups and the pages
 * inside each one are the app's own navigation, so a section added tomorrow
 * appears here without anybody editing this file. That is the rule this repo
 * keeps relearning.
 *
 * ── SURFACE ───────────────────────────────────────────────────────────────
 * 'site' is the marketing pages and the portal; 'app' is iOS. Rows written
 * before migration 061 have neither, and are counted as unknown rather than
 * assigned, because these charts exist to compare the two and a guess would be
 * invented data in the comparison itself.
 */

/**
 * One segment value for one person.
 *
 * The demographic fields are columns. The type is scored from the answers with
 * the same functions api/admin-explore.js uses, rather than a second
 * implementation of the same maths.
 */
function typeOf(profile, field) {
  if (field === 'type') {
    const answers = profile.ex1_answers;
    if (!answers || !Object.keys(answers).length) return null;
    const { withdrawScore, openScore } = axisScores(calcDimScores(answers));
    return typeCodeFromAxes(withdrawScore, openScore);
  }
  return profile[field] ?? null;
}

const DAY = 864e5;

/** Reads a window of events, and the same length of time before it. */
function windows(events, days = 30, now = Date.now()) {
  const from = now - days * DAY;
  const prevFrom = from - days * DAY;
  const at = (e) => new Date(e.created_at).getTime();
  return {
    days,
    from: new Date(from).toISOString(),
    current: events.filter((e) => at(e) >= from),
    previous: events.filter((e) => at(e) >= prevFrom && at(e) < from),
  };
}

/** A headline number, with the change against the period before it. */
function headline(value, prev) {
  const change = prev > 0 ? Math.round(((value - prev) / prev) * 100) : null;
  return { available: true, value, prev, change };
}

/** The last twelve months, oldest first, as keys and labels. */
function monthsBack(n = 12, now = new Date()) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-US', { month: 'short' }),
    });
  }
  return out;
}

const monthOf = (iso) => (iso ? String(iso).slice(0, 7) : null);

/** Mean and median seconds for a list of milliseconds. */
function stat(list) {
  if (!list.length) return { seconds: 0, medianSeconds: 0, n: 0 };
  const sorted = [...list].sort((a, b) => a - b);
  const mean = sorted.reduce((s, v) => s + v, 0) / sorted.length;
  return {
    seconds: Math.round(mean / 1000),
    medianSeconds: Math.round(sorted[Math.floor(sorted.length / 2)] / 1000),
    n: sorted.length,
  };
}

/**
 * Mean seconds per key, split by surface, for a set of keys.
 *
 * Returns the shape a clustered column chart wants: one label list and one
 * series per surface, aligned.
 */
function clustered(events, entries) {
  const bucket = {};
  for (const e of events) {
    if (e.kind !== 'page_time') continue;
    const n = Number(e.ms);
    if (!Number.isFinite(n)) continue;
    (bucket[e.key] = bucket[e.key] || { site: [], app: [], unknown: [] })[
      e.surface === 'app' ? 'app' : e.surface === 'site' ? 'site' : 'unknown'
    ].push(n);
  }
  const rows = entries.map(({ key, label }) => {
    const b = bucket[key] || { site: [], app: [], unknown: [] };
    return {
      key, label,
      site: stat(b.site),
      app: stat(b.app),
      unknown: stat(b.unknown),
    };
  });
  return {
    available: true,
    labels: rows.map((r) => r.label),
    site: rows.map((r) => r.site.seconds),
    app: rows.map((r) => r.app.seconds),
    n: rows.reduce((t, r) => t + r.site.n + r.app.n + r.unknown.n, 0),
    rows,
  };
}

/** Which of the eight results groups a section belongs to. */
function resultsGroups(nav) {
  const groups = [];
  for (const item of nav) {
    const children = item.children?.length
      ? item.children.map((c) => ({ key: `app:results:${c.id}`, label: c.label, id: c.id }))
      : [{ key: `app:results:${item.id}`, label: item.label, id: item.id }];
    groups.push({
      id: item.id,
      label: item.shortLabel || item.label,
      sections: children,
    });
  }
  return groups;
}

function engagementFromEvents(events, { profiles, notes, tags, noteTags, reads, nav }) {
  const measured = Array.isArray(events) && events.length > 0;
  const notYet = unavailable('Nothing recorded yet. The collection is built and migrations 060 and 061 create what it writes to; until those are run, and until somebody visits, this stays empty.');

  const w = windows(events || []);
  const groups = resultsGroups(nav);

  // ── Headline numbers ────────────────────────────────────────────────────
  const visitsIn = (list) => list.filter((e) => e.kind === 'visit' && e.surface !== 'app').length;
  const ownersIn = (rows, since) => new Set(
    rows.filter((r) => !since || new Date(r.created_at || 0).getTime() >= since).map((r) => r.owner_id).filter(Boolean),
  ).size;

  const since = Date.now() - 30 * DAY;
  const sincePrev = since - 30 * DAY;
  const inWindow = (r, a, b) => {
    const t = new Date(r.created_at || 0).getTime();
    return t >= a && (b == null || t < b);
  };

  const readersNow = new Set(reads.filter((r) => inWindow(r, since)).map((r) => r.owner_id)).size;
  const readersPrev = new Set(reads.filter((r) => inWindow(r, sincePrev, since)).map((r) => r.owner_id)).size;

  const annotatorsNow = new Set(notes.filter((n) => inWindow(n, since)).map((n) => n.owner_id)).size;
  const annotatorsPrev = new Set(notes.filter((n) => inWindow(n, sincePrev, since)).map((n) => n.owner_id)).size;

  const headlines = {
    siteVisits: measured ? headline(visitsIn(w.current), visitsIn(w.previous)) : notYet,
    appDownloads: unavailable('Only App Store Connect knows this. It needs an API key, an issuer id and a private key, and the app is not in the store yet.'),
    articleReaders: {
      ...headline(readersNow, readersPrev),
      note: 'People who opened an In Practice post in the app. Website article reads are page views without an account attached, so they are not counted here.',
    },
    annotators: headline(annotatorsNow, annotatorsPrev),
  };

  // ── The funnel, over time ───────────────────────────────────────────────
  //
  // Sign-ups count twice, because a couple is two people and one of them
  // arrives through the other's invite.
  const months = monthsBack();
  const countBy = (rows, when) => {
    const acc = {};
    for (const r of rows) {
      const m = monthOf(when(r));
      if (m) acc[m] = (acc[m] || 0) + 1;
    }
    return months.map((x) => acc[x.key] || 0);
  };

  const funnel = {
    available: profiles.length > 0,
    months: months.map((m) => m.label),
    series: [
      {
        step: 'Signed up',
        note: 'Counted twice: a sign-up is one half of a couple.',
        points: countBy(profiles, (p) => p.created_at).map((n) => n * 2),
      },
      ...EXERCISES.map((ex) => ({
        step: `Finished ${ex.label}`,
        points: countBy(profiles, (p) => p[`${ex.key}_completed_at`]),
      })),
    ],
  };

  // ── Visits and downloads, over time ─────────────────────────────────────
  const visitMonths = {};
  for (const e of events) {
    if (e.kind !== 'visit' || e.surface === 'app') continue;
    if (String(e.key || '').startsWith('app:')) continue;   // the portal is not the marketing site
    const m = monthOf(e.created_at);
    if (m) visitMonths[m] = (visitMonths[m] || 0) + 1;
  }
  const acquisition = {
    available: measured,
    months: months.map((m) => m.label),
    visits: months.map((m) => visitMonths[m.key] || 0),
    downloads: null,
    downloadsNeeds: headlines.appDownloads.needs,
    note: 'Visits, not unique visitors. Nothing stored can tell two visits by one person from one visit by two, which is deliberate.',
  };

  // ── Time per page ───────────────────────────────────────────────────────
  const marketingKeys = [...new Set(events
    .filter((e) => e.kind === 'page_time' && String(e.key || '').startsWith('/'))
    .map((e) => e.key))].sort();

  const exerciseEntries = EXERCISES.map((ex) => ({ key: `app:${ex.view}`, label: ex.label }));
  const RESOURCE_VIEWS = [
    { key: 'app:workbook', label: 'Workbook' },
    { key: 'app:budget', label: 'Shared Budget' },
    { key: 'app:checklist', label: 'Starting Out checklist' },
  ];

  const timePerPage = {
    marketing: measured
      ? clustered(events, marketingKeys.map((k) => ({ key: k, label: k })))
      : notYet,
    exercises: measured ? clustered(events, exerciseEntries) : notYet,
    resources: measured ? clustered(events, RESOURCE_VIEWS) : notYet,
    // One column per results group, summing the sections inside it.
    results: measured ? (() => {
      const rolled = events.map((e) => {
        if (e.kind !== 'page_time' || !String(e.key || '').startsWith('app:results:')) return e;
        const id = e.key.slice('app:results:'.length);
        const group = groups.find((g) => g.sections.some((sn) => sn.id === id));
        return group ? { ...e, key: `group:${group.id}` } : e;
      });
      return clustered(rolled, groups.map((g) => ({ key: `group:${g.id}`, label: g.label })));
    })() : notYet,
    // And the pages inside each group, for the dropdown.
    detailed: measured
      ? Object.fromEntries(groups.filter((g) => g.sections.length > 1).map((g) => [
        g.id,
        { label: g.label, ...clustered(events, g.sections.map((sn) => ({ key: sn.key, label: sn.label }))) },
      ]))
      : {},
  };

  return { headlines, funnel, acquisition, timePerPage, groups, window: { days: 30, from: w.from } };
}

/**
 * The learning half: what people read, what they tag, and where they write.
 *
 * ── THE FOUR KINDS OF ENGAGEMENT ──────────────────────────────────────────
 * notes.kind is 'note', 'highlight' or 'underline'; visibility is 'private' or
 * 'shared'; a tag is a note_tags row. Ellie asked for those four as separate
 * columns behind a dropdown, with the total as the default, so both shapes are
 * returned and the page chooses.
 */
function learningFromData({ events, notes, tags, noteTags, reads, posts, groups }) {
  const taggedNotes = new Set(noteTags.map((nt) => nt.note_id));

  const kindOf = (n) => {
    if (n.kind === 'highlight' || n.kind === 'underline') return 'highlights';
    if (n.visibility === 'shared') return 'shared';
    return 'personal';
  };

  /** Totals and the four-way split, for a set of notes grouped by a label. */
  const tally = (rows, labelFor) => {
    const acc = {};
    for (const n of rows) {
      const label = labelFor(n);
      if (!label) continue;
      const a = acc[label] = acc[label] || { total: 0, highlights: 0, tags: 0, personal: 0, shared: 0 };
      a.total += 1;
      a[kindOf(n)] += 1;
      if (taggedNotes.has(n.id)) a.tags += 1;
    }
    return acc;
  };

  const shape = (acc, labels) => ({
    available: true,
    labels,
    total: labels.map((l) => acc[l]?.total || 0),
    breakdown: {
      highlights: labels.map((l) => acc[l]?.highlights || 0),
      tags: labels.map((l) => acc[l]?.tags || 0),
      personal: labels.map((l) => acc[l]?.personal || 0),
      shared: labels.map((l) => acc[l]?.shared || 0),
    },
  });

  // ── Articles read ───────────────────────────────────────────────────────
  //
  // Two sources, and they count different things. post_reads is a person
  // opening a post in the app. A page_time row on /practice/<slug> is somebody
  // reading the article on the website, with no account attached. Both are
  // reads; the table says which is which rather than adding them into one
  // number that means neither.
  const byPost = {};
  for (const r of reads) byPost[r.post_id] = (byPost[r.post_id] || 0) + 1;
  const bySlug = {};
  for (const e of events) {
    if (e.kind !== 'visit') continue;
    const k = String(e.key || '');
    if (!k.startsWith('/practice/')) continue;
    const slug = k.slice('/practice/'.length);
    if (!slug || slug === 'all') continue;
    bySlug[slug] = (bySlug[slug] || 0) + 1;
  }
  const titleOf = (id) => posts.find((p) => p.id === id)?.title || id;
  const articleRows = [...new Set([...Object.keys(byPost), ...Object.keys(bySlug)])]
    .map((id) => ({ id, title: titleOf(id), inApp: byPost[id] || 0, onSite: bySlug[id] || 0 }))
    .map((r) => ({ ...r, reads: r.inApp + r.onSite }))
    .sort((a, b) => b.reads - a.reads);

  // ── Tags ────────────────────────────────────────────────────────────────
  const tagById = new Map(tags.map((t) => [t.id, t]));
  const tagUse = {};
  for (const nt of noteTags) {
    const t = tagById.get(nt.tag_id);
    if (!t) continue;
    const name = String(t.name || '').trim();
    if (!name) continue;
    const k = name.toLowerCase();
    tagUse[k] = tagUse[k] || { name, standard: !!t.standard_key, uses: 0, people: new Set() };
    tagUse[k].uses += 1;
    tagUse[k].people.add(t.owner_id);
  }
  const tagRows = Object.values(tagUse)
    .map((t) => ({ name: t.name, standard: t.standard, uses: t.uses, people: t.people.size }))
    .sort((a, b) => b.uses - a.uses || b.people - a.people);

  // ── Notes by section, and by page ───────────────────────────────────────
  const IN_PRACTICE_LABEL = 'In Practice';
  const groupFor = (anchorKey) => {
    const g = groups.find((x) => x.sections.some((sn) => sn.id === anchorKey));
    return g ? g.label : null;
  };
  const sectionLabels = [...groups.map((g) => g.label), IN_PRACTICE_LABEL];

  const bySection = tally(notes, (n) => {
    if (n.anchor_type === 'post' || n.anchor_type === 'post_block') return IN_PRACTICE_LABEL;
    if (!n.anchor_key) return null;
    return groupFor(n.anchor_key);
  });

  const byDetailed = {};
  for (const g of groups.filter((x) => x.sections.length > 1)) {
    const labels = g.sections.map((sn) => sn.label);
    const acc = tally(
      notes.filter((n) => g.sections.some((sn) => sn.id === n.anchor_key)),
      (n) => g.sections.find((sn) => sn.id === n.anchor_key)?.label,
    );
    byDetailed[g.id] = { label: g.label, ...shape(acc, labels) };
  }
  // In Practice, the eight most annotated articles.
  const articleAcc = tally(
    notes.filter((n) => n.anchor_type === 'post' || n.anchor_type === 'post_block'),
    (n) => titleOf(String(n.anchor_key || '').split(':')[0]),
  );
  const topArticles = Object.entries(articleAcc)
    .sort((a, b) => b[1].total - a[1].total).slice(0, 8).map(([l]) => l);
  byDetailed.in_practice = { label: IN_PRACTICE_LABEL, ...shape(articleAcc, topArticles) };

  return {
    articles: { available: true, rows: articleRows },
    tags: { available: true, rows: tagRows, total: tags.length },
    notesBySection: shape(bySection, sectionLabels),
    notesByDetailed: byDetailed,
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
    const columns = [
      'id', 'partner_profile_id', 'created_at',
      ...EXERCISES.map((e) => e.column),
      // When each exercise was finished, for the funnel over time. A funnel
      // without dates is one bar per step and answers nothing about whether
      // things are getting better.
      ...EXERCISES.map((e) => `${e.key}_completed_at`),
      // What the slicer cuts by. The demographics are columns; the type is
      // scored from ex1_answers, which the exercise columns above already
      // bring along.
      'age_range', 'gender', 'relationship_status', 'relationship_length',
      'children', 'signup_source', 'pkg',
    ];
    const EVENT_COLS = 'kind,key,ms,owner_id,created_at';
    const results = await Promise.all([
      all(url, key, `profiles?select=${columns.join(',')}`),
      all(url, key, 'notes?select=id,owner_id,anchor_type,anchor_key,visibility,kind,created_at'),
      all(url, key, 'tags?select=id,owner_id,name,standard_key'),
      all(url, key, 'note_tags?select=note_id,tag_id'),
      all(url, key, 'post_reads?select=post_id,owner_id,read_at'),
      all(url, key, 'posts?select=id,title'),
      // With the surface first. Migration 061 adds that column, and asking for
      // a column that does not exist fails the whole select, so the fallback
      // below asks again without it rather than reporting an empty table.
      all(url, key, `page_events?select=${EVENT_COLS},surface`),
    ]);

    let [profilesR, notesR, tagsR, noteTagsR, readsR, postsR, eventsR] = results;
    let surfaceKnown = true;
    if (eventsR.error) {
      surfaceKnown = false;
      eventsR = await all(url, key, `page_events?select=${EVENT_COLS}`);
    }

    // A query that failed is not a measure that is empty, and the page says
    // which is which rather than drawing zero.
    const queryErrors = [
      ...[profilesR, notesR, tagsR, noteTagsR, readsR, postsR, eventsR]
        .map((r) => r.error).filter(Boolean),
      ...(surfaceKnown ? [] : ['page_events has no `surface` column yet, so app and site cannot be told apart. Run migration 061.']),
    ];

    const profiles = profilesR.rows;
    const notes = notesR.rows;
    const tags = tagsR.rows;
    const noteTags = noteTagsR.rows;
    const reads = readsR.rows;
    const posts = postsR.rows;
    const events = eventsR.rows;

    // ── The slicer ──────────────────────────────────────────────────────
    //
    // Ellie: "All data views on this page should use the same slicer as the
    // rest of the admin visuals have." The rest of the admin cuts by a
    // demographic or a type, from SLICE_DIMS in the page. The options come
    // from the same place; the cut happens here, before anything is counted,
    // so there is one piece of arithmetic rather than one on each side.
    //
    // What it cannot cut: an anonymous visit. A marketing page view has no
    // account attached, by design, so a slice by age leaves it out rather than
    // guessing. The page says so on the tiles it affects.
    const slice = (() => {
      let raw = '';
      try { raw = new URL(req.url).searchParams.get('slice') || ''; } catch { /* no url */ }
      const at = raw.indexOf('::');
      if (at < 0) return null;
      const field = raw.slice(0, at);
      const value = raw.slice(at + 2);
      if (!/^[a-z_]+$/.test(field) || !value) return null;
      return { field, value };
    })();

    let sliced = { profiles, notes, reads, events };
    if (slice) {
      const keep = new Set(
        profiles.filter((p) => String(typeOf(p, slice.field) ?? '') === slice.value).map((p) => p.id),
      );
      sliced = {
        profiles: profiles.filter((p) => keep.has(p.id)),
        notes: notes.filter((n) => keep.has(n.owner_id)),
        reads: reads.filter((r) => keep.has(r.owner_id)),
        // An event with no owner cannot be attributed to anybody, so a slice
        // drops it rather than counting it under whichever segment was picked.
        events: events.filter((e) => e.owner_id && keep.has(e.owner_id)),
      };
    }

    // post_reads dates its rows read_at, and everything else here uses
    // created_at. Normalised once rather than in three places.
    for (const r of reads) r.created_at = r.created_at || r.read_at;

    // Every group, not a particular couple's. The admin is looking at the
    // whole product, so the nav is asked for its widest shape; the flags are
    // the ones resultsNav actually takes, which is why the first attempt
    // silently produced five groups instead of eight.
    const nav = resultsNav({ hasReflection: true, intimacyReady: true, conflictListed: true });

    const core = engagementFromEvents(sliced.events, {
      profiles: sliced.profiles, notes: sliced.notes, tags, noteTags, reads: sliced.reads, nav,
    });
    const learning = learningFromData({
      events: sliced.events, notes: sliced.notes, tags, noteTags, reads: sliced.reads, posts,
      groups: core.groups,
    });

    return json({
      ok: true,
      generatedAt: new Date().toISOString(),
      window: core.window,
      slice: slice ? { ...slice, people: sliced.profiles.length } : null,
      headlines: core.headlines,
      funnel: core.funnel,
      acquisition: core.acquisition,
      timePerPage: core.timePerPage,
      learning,
      // The groups the page draws its dropdowns from, so it never holds its
      // own copy of the results navigation.
      groups: core.groups.map((g) => ({ id: g.id, label: g.label, pages: g.sections.length })),
      // Anything that failed rather than came back empty. The page prints
      // these, because a chart of zeros drawn from a rejected query is the
      // most misleading thing this tab could do.
      queryErrors,
      rowsRead: {
        profiles: profiles.length,
        notes: notes.length,
        tags: tags.length,
        articleReads: reads.length,
        events: events.length,
      },
    });
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
}
