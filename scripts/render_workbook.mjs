/**
 * Attune Workbook PDF Renderer
 * ============================
 * Reads both attune_workbook_sample.html (cross-type) and
 * attune_workbook_sample_same_type.html, renders each to PDF
 * via Playwright at letter size, full bleed.
 *
 * Run:
 *   python3 scripts/build_workbook.py
 *   node    scripts/render_workbook.mjs
 *
 * Uses absolute Playwright path so it works without setting NODE_PATH.
 */

import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
import { existsSync } from 'node:fs';
import path from 'node:path';

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
