/**
 * Attune Workbook PDF Renderer
 * ============================
 * Two modes:
 *
 *   Local sample (default):
 *     node scripts/render_workbook.mjs
 *     Reads sample HTML from /mnt/user-data/outputs/ and writes PDFs
 *     next to them.
 *
 *   Service mode (production):
 *     node scripts/render_workbook.mjs --from-stdin > out.pdf
 *     Reads HTML from stdin, writes PDF bytes to stdout. Pairs with
 *     `python3 scripts/build_workbook.py --from-stdin` to form the
 *     end-to-end pipeline:
 *       echo "$payload_json" | python3 build_workbook.py --from-stdin |
 *         node render_workbook.mjs --from-stdin > workbook.pdf
 *
 * Uses absolute Playwright path so it works without setting NODE_PATH.
 */

import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import { existsSync, readFileSync, mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const isService = process.argv.includes('--from-stdin');

if (isService) {
  // Read full HTML from stdin
  const html = readFileSync(0, 'utf-8');
  if (!html || html.length < 100) {
    process.stderr.write('Empty or implausibly short HTML on stdin\n');
    process.exit(1);
  }
  // Playwright page.goto() needs a URL; the cleanest way to load
  // arbitrary HTML is to write it to a temp file and load via file://.
  // (page.setContent works but doesn't reliably resolve relative URLs
  // or external fonts the way file:// + waitUntil:networkidle does.)
  const dir = mkdtempSync(path.join(tmpdir(), 'attune-render-'));
  const htmlPath = path.join(dir, 'workbook.html');
  const pdfPath  = path.join(dir, 'workbook.pdf');
  writeFileSync(htmlPath, html);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    // Wait for the document to fire `load` (DOM + subresources) rather than
    // `networkidle`. networkidle requires the network to go fully quiet for
    // 500ms, which can fail in containerized environments where Google Fonts
    // requests stay in flight indefinitely. The 60s timeout is ample for
    // local file:// loads; the only thing that can take real time is font
    // fetching, which we then wait for explicitly.
    await page.goto('file://' + htmlPath, { waitUntil: 'load', timeout: 60000 });

    // Explicit web-font readiness. The CSS Font Loading API resolves
    // document.fonts.ready once every @font-face used in the document is
    // either downloaded and applied, OR has timed out and substituted.
    // Either outcome is fine for us — what we DON'T want is to start
    // page.pdf() while Chromium is still mid-fetch on a font, which is
    // what produces the partial PDFs.
    try {
      await page.evaluate(() => document.fonts.ready);
    } catch (e) {
      process.stderr.write(`font-ready evaluate failed: ${e.message}\n`);
    }

    // Diagnostic: how many fonts did the page declare, and how many
    // actually loaded? If "loaded=0" but "declared>0" we know Google Fonts
    // can't be reached from this container.
    try {
      const fontInfo = await page.evaluate(() => {
        const faces = Array.from(document.fonts);
        const summary = faces.map(f => ({
          family: f.family, weight: f.weight, style: f.style,
          status: f.status, // 'unloaded' | 'loading' | 'loaded' | 'error'
        }));
        return {
          declared: faces.length,
          loaded: summary.filter(s => s.status === 'loaded').length,
          error:  summary.filter(s => s.status === 'error').length,
          unloaded: summary.filter(s => s.status === 'unloaded').length,
          loading: summary.filter(s => s.status === 'loading').length,
          docHeight: document.documentElement.scrollHeight,
          bodyText: document.body.innerText.slice(0, 100),
        };
      });
      process.stderr.write(`fonts: declared=${fontInfo.declared} loaded=${fontInfo.loaded} error=${fontInfo.error} unloaded=${fontInfo.unloaded} loading=${fontInfo.loading} docHeight=${fontInfo.docHeight}\n`);
      process.stderr.write(`bodyText preview: ${JSON.stringify(fontInfo.bodyText)}\n`);
    } catch (e) {
      process.stderr.write(`font-info evaluate failed: ${e.message}\n`);
    }

    // Small buffer for any final layout settling (image decoding, custom
    // CSS that ran on font load events, etc).
    await page.waitForTimeout(2000);

    await page.addStyleTag({ content: '@page { size: 8.5in 11in; margin: 0; }' });
    try {
      await page.pdf({
        path: pdfPath,
        format: 'Letter',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
        preferCSSPageSize: true,
        timeout: 60000,
      });
    } catch (e) {
      process.stderr.write(`page.pdf() failed: ${e.message}\n`);
      throw e;
    }
    await page.close();
  } finally {
    await browser.close();
  }
  process.stdout.write(readFileSync(pdfPath));
  // Best-effort cleanup
  try { unlinkSync(htmlPath); unlinkSync(pdfPath); rmdirSync(dir); } catch (_) {}
  process.exit(0);
}

// ── Local sample mode (default) ──────────────────────────────────────────────
const VARIANTS = [
  { html: '/mnt/user-data/outputs/attune_workbook_sample.html',           pdf: '/mnt/user-data/outputs/attune_workbook_sample.pdf' },
  { html: '/mnt/user-data/outputs/attune_workbook_sample_same_type.html', pdf: '/mnt/user-data/outputs/attune_workbook_sample_same_type.pdf' },
];

const browser = await chromium.launch();
for (const v of VARIANTS) {
  if (!existsSync(v.html)) {
    console.log(`Skip: ${v.html} not present`);
    continue;
  }
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve(v.html), { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.addStyleTag({ content: '@page { size: 8.5in 11in; margin: 0; }' });
  await page.pdf({
    path: v.pdf,
    format: 'Letter',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
    preferCSSPageSize: true,
  });
  await page.close();
  console.log(`Wrote ${v.pdf}`);
}
await browser.close();
