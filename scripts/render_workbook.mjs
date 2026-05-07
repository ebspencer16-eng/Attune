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
    await page.goto('file://' + htmlPath, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.addStyleTag({ content: '@page { size: 8.5in 11in; margin: 0; }' });
    await page.pdf({
      path: pdfPath,
      format: 'Letter',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      preferCSSPageSize: true,
    });
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
