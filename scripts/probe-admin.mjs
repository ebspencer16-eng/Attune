#!/usr/bin/env node
/**
 * Render the admin with stubbed data and take a picture of it.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * Ellie, after a round of admin changes: "Still seeing gridlines and x axis
 * labels on the type distribution pie charts, I shouldn't. Also, couple type
 * distribution pie chart still says loading and it's been minutes." And:
 * "I'm worried about your quality of work."
 *
 * She was right. Those changes were checked by reading the code and running
 * the gates, and the gates have nothing to say about a chart: check-admin-html
 * parses the inline scripts and check-tag-closure counts brackets. Neither can
 * see that a tile was handed a div instead of a canvas, which is what made
 * that pie sit on "Loading" for ever.
 *
 * So this draws it. The admin is one static page whose charts all come from
 * /api/admin-explore, so stubbing that one endpoint is enough to get every
 * tile on screen with believable numbers.
 *
 * ── WHAT IT IS NOT ────────────────────────────────────────────────────────
 * Not a gate, and not in `npm run check`: it needs Chrome, it takes a few
 * seconds, and its output is a picture for a person rather than a pass or a
 * fail. It is the thing to run before saying an admin chart works.
 *
 *   node scripts/probe-admin.mjs responses
 *   node scripts/probe-admin.mjs types
 *
 * It reports anything the page logged to console.error, which is how a chart
 * that failed to draw announces itself now.
 */

import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { launch } from './_lib/browser.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const PAGE = process.argv[2] || 'responses';
const OUT = process.env.OUT || `admin-${PAGE}.png`;

/* ── THE STUB ──────────────────────────────────────────────────────────────
   Shaped like the real cube: a `fields` catalogue and one row per person.
   Built from the product's own question sets so a renamed question or a new
   option shows up here rather than being invented. */
const { CONFLICT_QUESTIONS, FREQUENCY_OPTIONS } = await import(`${ROOT}api/_conflict-questions.js`);
const { INTIMACY_QUESTIONS } = await import(`${ROOT}api/_intimacy-questions.js`);

const DIMS = ['energy', 'expression', 'reassurance', 'love', 'needs', 'bids', 'listening', 'conflict', 'repair', 'feedback'];
const TYPES = ['W', 'X', 'Y', 'Z'];
const COUPLE_TYPES = ['WW', 'WX', 'WY', 'WZ', 'XX', 'XY', 'XZ', 'YY', 'YZ', 'ZZ'];
const pick = (a, i) => a[i % a.length];

const fields = [
  { key: 'type', label: 'Individual type', group: 'Type & axes', kind: 'cat', options: TYPES.map((v) => ({ v, label: v })), partnerable: true },
  { key: 'couple_type', label: 'Couple type', group: 'Type & axes', kind: 'cat' },
  ...DIMS.map((d) => ({ key: `dim_${d}`, label: d, group: 'Dimensions (score 1–5)', kind: 'scale', partnerable: true })),
  ...CONFLICT_QUESTIONS.flatMap((q) => {
    let options = null;
    if (q.kind === 'scale') options = (q.options || []).map((o) => ({ v: o.label, label: o.label }));
    else if (q.kind === 'frequency') options = FREQUENCY_OPTIONS.map((o) => ({ v: o.label, label: o.label }));
    else if (q.kind === 'forcedAB') options = [{ v: q.a, label: q.a }, { v: q.b, label: q.b }];
    else if (q.kind === 'pickOne') options = (q.options || []).map((o) => ({ v: o.label || o, label: o.label || o }));
    if (!options) return [];
    return [{ key: `cq_${q.id}`, label: (q.riskLabel ? `${q.riskLabel} · ` : '') + q.text, group: 'Conflict Patterns', kind: 'cat', options, partnerable: true, section: q.section }];
  }),
  ...INTIMACY_QUESTIONS.filter((q) => q.kind !== 'multi').slice(0, 6).map((q) => ({
    key: `iq_${q.id}`, label: q.premarital || q.id, group: 'Physical Intimacy', kind: 'cat',
    options: (q.options || []).map((o) => ({ v: o.label, label: o.label })), partnerable: true,
    dim: q.dimension, dimLabel: q.dimension,
  })),
];

const rows = [];
for (let i = 0; i < 40; i++) {
  const r = {
    couple_id: 'c' + Math.floor(i / 2),
    type: pick(TYPES, i),
    couple_type: pick(COUPLE_TYPES, Math.floor(i / 2)),
  };
  DIMS.forEach((d, k) => { r[`dim_${d}`] = 2 + ((i + k) % 3); r[`p_pvdim_${d}`] = 2 + ((i + k + 1) % 3); });
  for (const f of fields) {
    if (!f.options || !f.options.length) continue;
    if (f.key.startsWith('cq_') || f.key.startsWith('iq_')) {
      r[f.key] = pick(f.options, i + f.key.length).v;
      r['p_' + f.key] = pick(f.options, i + 1 + f.key.length).v;
    }
  }
  rows.push(r);
}
const CUBE = { ok: true, fields, rows, orders: [], demoFilterApplied: true };

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/admin-explore')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(CUBE));
    return;
  }
  /* The Type Analytics page needs this one as well as the cube: it was the
     only page that came back blank with no error, because every other /api/
     path fell through to the empty answer below and that page reads
     `TYPES_DATA.individuals` straight off it. */
  /* The Responses page's tiles come from here, not the cube: the radar, the
     responsibilities chart and the Life & Values chart all read
     `responses.pairs`. Without it those canvases are never touched and look
     identical to a chart that drew nothing. */
  if (url.pathname.startsWith('/api/admin-data')) {
    /* The exact shape shapeResponses reads: dimLabels + dimScores by index,
       expLabels + expAlign, lifeGaps, respAgreement, relationshipFeel. Read
       off that function rather than invented, because a stub that does not
       match leaves the tiles blank and looks like the product being broken. */
    const payload = {
      /* A COUNT, which is what api/admin-data.js sends: `pairs: pairs.length`.
         Sending the array here printed "n=[object Object],[object Object]…"
         across the tile subtitles and looked exactly like a product bug. The
         harness is the first thing to suspect. */
      pairs: Math.floor(rows.length / 2),
      dimLabels: DIMS,
      dimScores: DIMS.map((d, k) => 45 + (k * 6) % 50),
      expLabels: ['Household', 'Financial', 'Career', 'Extended family', 'Emotional'],
      expAlign: [72, 58, 81, 64, 49],
      relationshipFeel: [2, 5, 11, 14, 8],
      lifeGaps: [
        { label: 'Children', pct: 41 }, { label: 'Faith', pct: 33 },
        { label: 'Where to live', pct: 28 }, { label: 'Money', pct: 22 },
        { label: 'Social life', pct: 17 },
      ],
      respAgreement: ['Cooking', 'Bills', 'Planning visits', 'Mental load', 'Savings']
        .map((l, k) => ({ label: l, pct: 40 + (k * 9) % 50, category: 'Household', n: 20 })),
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    /* Orders too. The page only reaches loadRealResponses from the branch
       that finds real orders: with none, every Responses tile stayed at its
       empty state and the probe reported "no errors" about a page that had
       drawn nothing. */
    const orders = rows.map((r, i) => ({
      order_num: 'A' + (1000 + i), pkg_key: ['core', 'newlywed', 'anniversary', 'premium'][i % 4],
      total: [89, 139, 139, 198][i % 4], created_at: new Date(Date.now() - i * 864e5).toISOString(),
      buyer_email: null, shipping_state: 'CA', shipping_country: 'US',
    }));
    res.end(JSON.stringify({ ok: true, orders, responses: payload }));
    return;
  }
  if (url.pathname.startsWith('/api/admin-typing')) {
    const individuals = rows.map((r, i) => ({
      type: r.type, pronouns: ['she/her', 'he/him', 'they/them'][i % 3],
      relLength: ['< 1 year', '1-3 years', '3+ years'][i % 3],
      relStatus: ['Engaged', 'Married', 'Dating'][i % 3],
      withdrawScore: 2 + (i % 3), openScore: 2 + ((i + 1) % 3),
    }));
    const couples = [];
    for (let i = 0; i + 1 < rows.length; i += 2) {
      couples.push({ coupleType: rows[i].couple_type, a: individuals[i], b: individuals[i + 1] });
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, individuals, couples, generatedAt: new Date().toISOString(),
      config: { axisConfig: {}, weights: {}, flipped: [] } }));
    return;
  }
  if (url.pathname.startsWith('/api/')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, rows: [], data: [] }));
    return;
  }
  const p = join(`${ROOT}public`, url.pathname === '/' ? 'admin.html' : url.pathname.slice(1));
  if (!existsSync(p)) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

const page = await launch({ width: 1500, height: 1100 });
const errors = [];
page.on('console', (m) => { if (/error/i.test(m.type || '')) errors.push(m.text); });

/* The page gates on `attune_admin_s`, read by window.adminApiSecret, and
   hides #admin-login-gate once signed in. Both are set before the first script
   runs, the same state a signed-in browser is in. The first version of this
   guessed two other key names and left the login overlay up, so every tile sat
   on "Loading" and the probe cheerfully reported no errors: a harness that
   measures its own stub. */
await page.onNewDocument(`
  try { localStorage.setItem('attune_admin_s', 'probe'); } catch (e) {}
  document.addEventListener('DOMContentLoaded', function () {
    var g = document.getElementById('admin-login-gate');
    if (g) g.classList.add('hidden');
  });
  window.__probeErrors = [];
  const _ce = console.error;
  console.error = function () { try { window.__probeErrors.push([].slice.call(arguments).join(' ')); } catch (e) {} return _ce.apply(console, arguments); };
`);
await page.goto(`http://127.0.0.1:${PORT}/`);
await new Promise((r) => setTimeout(r, 2500));

/* Click the sidebar item rather than calling showPage: the real navigation
   does whatever else a page needs on the way in, and calling the function
   alone left the overview on screen while reporting success. */
const shown = await page.evaluate((name) => {
  const el = [...document.querySelectorAll('[onclick]')]
    .find((x) => (x.getAttribute('onclick') || '').includes(`showPage('${name}')`));
  if (!el) return 'no sidebar item for ' + name;
  el.click();
  return 'clicked';
}, PAGE);
await new Promise((r) => setTimeout(r, 4000));

/* An inner tab on the Responses page, so a picture of the conflict tab is
   possible at all. Without this the probe could only ever photograph
   Communication. */
if (process.env.TAB) {
  await page.evaluate((t) => {
    const el = [...document.querySelectorAll('.tab')].find((x) => (x.textContent || '').trim() === t);
    if (el) el.click();
  }, process.env.TAB);
  await new Promise((r) => setTimeout(r, 2500));
}

/* What the page actually got from the stub. A blank chart and a chart with no
   data look the same; this says which. */
const cubeState = await page.evaluate(async () => {
  try {
    const c = await ensureCube();
    return { ok: true, rows: (c.rows || []).length, fields: (c.fields || []).length };
  } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
});
console.log('cube: ' + JSON.stringify(cubeState));

const report = await page.evaluate(() => ({
  errors: window.__probeErrors || [],
  gated: !document.getElementById('admin-login-gate')?.classList.contains('hidden'),
  loading: [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && /^loading/i.test((e.textContent || '').trim())).length,
  canvases: [...document.querySelectorAll('canvas')].filter((c) => c.offsetParent !== null).length,
  /* Computed display, not the inline attribute. The first version of this
     matched on `[style*="display: none"]` and reported the overview as visible
     on every page, which is a harness lying about the thing it exists to
     check. */
  /* Which canvases actually have a chart on them. A canvas with no Chart
     instance is a blank rectangle, and that looks identical to a chart with
     no data; this is the one thing that tells them apart. */
  /* The box each canvas actually got. A chart that looks too small is a
     canvas that was given the wrong size, and the only way to tell which is
     to read it rather than guess at the CSS. */
  boxes: [...document.querySelectorAll('canvas')].filter((c) => c.offsetParent !== null)
    .map((c) => { const r = c.getBoundingClientRect(); const p = c.parentElement.getBoundingClientRect();
      return c.id + ' css ' + Math.round(r.width) + 'x' + Math.round(r.height) + '  bitmap ' + c.width + 'x' + c.height + '  in ' + Math.round(p.width) + 'x' + Math.round(p.height) + ' @top ' + Math.round(r.top); }),
  charts: [...document.querySelectorAll('canvas')]
    .filter((c) => c.offsetParent !== null)
    .map((c) => c.id + ':' + (window.Chart && Chart.getChart(c) ? 'drawn' : 'EMPTY')),
  /* ── WHAT KIND OF CHART, AND WHICH AXES IT HAS ────────────────────────
     Ellie, twice: "Still seeing gridlines and x axis labels on the type
     distribution pie charts, I shouldn't." A screenshot could not settle
     that: a full-page capture re-lays-out a responsive chart mid-shot, so
     the picture shows an axis the chart does not have. Asking the chart is
     the measurement; the picture is the illustration. */
  kinds: [...document.querySelectorAll('canvas')].filter((c) => c.offsetParent !== null)
    .map((c) => {
      const ch = window.Chart && Chart.getChart(c);
      if (!ch) return c.id + ': no chart';
      const scales = Object.keys(ch.scales || {});
      const drawn = scales.filter((k) => {
        const sc = ch.scales[k];
        return sc && sc.options && sc.options.display !== false;
      });
      const grids = scales.filter((k) => {
        const g = ch.scales[k] && ch.scales[k].options && ch.scales[k].options.grid;
        return g && g.display !== false;
      });
      const legend = !!(ch.options.plugins && ch.options.plugins.legend
        && ch.options.plugins.legend.display !== false);
      /* ── AND WHETHER THE BARS SIT UNDER THEIR LABELS ───────────────
         A chart built while its tab was hidden lays its bars out for a
         container a few pixels wide. The axis re-measures when the tab is
         shown and the bars do not, so the names spread across the width and
         the columns stay huddled at the left. It reads as a broken chart and
         every structural check passes. The numbers are the evidence: the
         last bar's centre should be near the right of the drawing area. */
      let bars = '';
      if (ch.config.type === 'bar') {
        const meta = ch.getDatasetMeta(0);
        const pts = (meta && meta.data) || [];
        if (pts.length) {
          const area = Math.round(ch.chartArea.right - ch.chartArea.left);
          const last = Math.round(pts[pts.length - 1].x - ch.chartArea.left);
          const stale = pts.length > 1 && last < area * 0.6;
          bars = `  bars ${pts.length} first ${Math.round(pts[0].x - ch.chartArea.left)}`
            + ` last ${last} of ${area}${stale ? '  <-- LAID OUT FOR A NARROWER BOX' : ''}`;
        }
      }
      return `${c.id}: ${ch.config.type}  scales[${drawn.join(',') || 'none'}]`
        + `  gridlines[${grids.join(',') || 'none'}]  legend:${legend}${bars}`;
    }),
  /* What the Responses tiles read. An empty object here is why a canvas is
     never touched, and is indistinguishable on screen from a broken chart. */
  seg: Object.keys(window.__responsesBySeg || {}),
  /* A chart whose drawing area disagrees with its canvas was laid out for a
     different size and never re-measured, which is what a hidden page does to
     a responsive chart. */
  bars: (() => {
    const c = document.getElementById('svp-gap-canvas');
    const ch = c && window.Chart && Chart.getChart(c);
    if (!ch) return null;
    const meta = ch.getDatasetMeta(0);
    return {
      labels: ch.data.labels.length,
      points: ch.data.datasets[0].data.length,
      firstX: Math.round(meta.data[0].x), lastX: Math.round(meta.data[meta.data.length - 1].x),
      width: Math.round(meta.data[0].width),
      area: Math.round(ch.chartArea.right - ch.chartArea.left),
      ticks: ch.scales.x.ticks.length,
    };
  })(),
  geom: [...document.querySelectorAll('canvas')].filter((c) => c.offsetParent !== null)
    .map((c) => { const ch = window.Chart && Chart.getChart(c); if (!ch) return c.id + ':none';
      return c.id + ' area ' + Math.round(ch.chartArea.right - ch.chartArea.left) + ' of canvas ' + Math.round(c.getBoundingClientRect().width); }),
  /* Where the page's own blocks actually sit. A tile that draws nothing and a
     tile that is laid out at zero height look identical in a screenshot. */
  where: (() => {
    const c = document.getElementById('types-ct-bars');
    const pt = document.getElementById('page-types');
    const chain = [];
    let n = c;
    while (n && n !== document.body) { chain.push(n.tagName + (n.id ? '#' + n.id : '') + (n.className ? '.' + String(n.className).split(' ')[0] : '')); n = n.parentElement; }
    return { inPage: c && c.closest('.page') ? c.closest('.page').id : 'none',
      pageTypesChildren: pt ? pt.children.length : -1,
      pageTypesRect: pt ? Math.round(pt.getBoundingClientRect().height) : -1,
      chain: chain.slice(0, 10) };
  })(),
  blocks: (() => {
    const page = [...document.querySelectorAll('.page')].find((p) => getComputedStyle(p).display !== 'none');
    if (!page) return [];
    return [...page.children].map((el) => {
      const r = el.getBoundingClientRect();
      return `${el.tagName}.${(el.className || '').toString().split(' ')[0] || '-'} ${Math.round(r.width)}x${Math.round(r.height)} @${Math.round(r.top)}`;
    });
  })(),
  segDims: (window.__responsesBySeg && window.__responsesBySeg[''] && window.__responsesBySeg[''].dimScores) || null,
  visible: [...document.querySelectorAll('.page')]
    .filter((p) => getComputedStyle(p).display !== 'none').map((p) => p.id).join(',') || '(none)',
}));
if (report.gated) {
  console.error('the login gate is still up, so nothing fetched and every tile is a placeholder.');
  console.error('Refusing to report: a picture of the sign-in screen is not a picture of the admin.');
  await page.close(); server.close();
  process.exit(1);
}
console.log(`page: ${PAGE} (${shown})  visible: ${report.visible}`);
console.log('responsesBySeg keys: ' + JSON.stringify(report.seg) + '  dimScores: ' + JSON.stringify(report.segDims).slice(0,90));
for (const g of report.geom) console.log('  geom ' + g);
console.log('svp bars: ' + JSON.stringify(report.bars));
console.log('charts: ' + report.charts.join('  '));
for (const k of report.kinds) console.log('  kind ' + k);
for (const b of report.boxes) console.log('  ' + b);
for (const b of report.blocks) console.log('  block ' + b);
console.log('  where ' + JSON.stringify(report.where));
console.log(`canvases on screen: ${report.canvases}   elements still saying "Loading": ${report.loading}`);
if (report.errors.length) {
  console.log(`\nconsole.error (${report.errors.length}):`);
  for (const e of report.errors.slice(0, 8)) console.log('  ' + String(e).slice(0, 160));
} else {
  console.log('no console errors.');
}

/* A responsive chart laid out while its page was hidden keeps that layout
   until something makes it measure again. Resizing every chart before the
   picture tells a stale layout apart from a wrong one: if the picture is only
   right after this, the product needs the resize, not the probe. */
if (process.env.NO_RESIZE !== '1') {
  await page.evaluate(() => {
    for (const c of document.querySelectorAll('canvas')) {
      const ch = window.Chart && Chart.getChart(c);
      if (ch) ch.resize();
    }
  });
  await new Promise((r) => setTimeout(r, 600));
}
/* Viewport, not fullPage. A fullPage capture in this driver resizes the page
   to its whole height, and a responsive chart re-lays-out mid-capture: the
   bars were photographed on one layout and the axis on another, which looked
   exactly like a chart drawing its columns in the wrong place. The chart's own
   model said the bars spanned the full width the whole time. */
const shot = await page.screenshot({ fullPage: process.env.FULL_PAGE === '1' });
writeFileSync(OUT, Buffer.from(shot, 'base64'));
console.log('picture: ' + OUT);
await page.close();
server.close();
