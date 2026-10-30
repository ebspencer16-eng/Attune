/**
 * What the order emails are given, built on the server from the payment.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Every card order sent two confirmation emails (A203b). Checkout posted the
 * order to /api/send-order-email after the card went through, which built
 * Ellie's emails from the email catalogue; the Stripe webhook built a second,
 * older one inline that never appeared in /email-preview and left Conflict
 * Patterns off. Apple Pay buyers got only the old one, because that path never
 * called the endpoint. Ellie: "Keep only mine."
 *
 * So the webhook sends hers, from this context, when the payment lands, which
 * is also the one moment that happens whether or not the buyer keeps the tab
 * open. Checkout still posts for a free promo order, which has no webhook.
 *
 * ── THE LINES ─────────────────────────────────────────────────────────────
 * Priced by api/_lib/cart-pricing.js, the module that sets the charge, from
 * the item after normalizeItem has taken off what the package includes. The
 * page's version listed an included add-on at full price. Named by
 * SHOP_NAMES and PACKAGE_NAMES (api/_catalogue.js), which is what the shop
 * calls them (A204d).
 */
import { SITE_URL } from './site.js';
import { PACKAGE_NAMES, SHOP_NAMES, ADDON_PRICES } from '../_catalogue.js';
import { itemBasePrice, workbookAmount, normalizeItem } from './cart-pricing.js';

/** The workbook's line, as checkout's summary words it. */
function workbookLine(item) {
  const print = item.addonWorkbook === 'print';
  const how = item.pkgKey === 'premium' ? (print ? 'printed' : 'included') : (print ? 'printed' : 'digital');
  return { label: `${SHOP_NAMES.workbook} (${how})`, price: workbookAmount(item) };
}

/** The receipt's lines for one item: the package, then each add-on bought. */
export function receiptLines(raw) {
  const item = normalizeItem(raw);
  const lines = [{ label: PACKAGE_NAMES[item.pkgKey] || item.pkgKey, price: itemBasePrice(item) }];
  if (item.addonWorkbook) lines.push(workbookLine(item));
  for (const key of ['reflection', 'budget', 'intimacy', 'conflict', 'checklist']) {
    const flag = `addon${key[0].toUpperCase()}${key.slice(1)}`;
    if (item[flag]) lines.push({ label: SHOP_NAMES[key], price: ADDON_PRICES[key] });
  }
  return { item, lines };
}

/**
 * One item of a paid order, as the webhook has it in the payment's metadata
 * (create-payment-intent's compact shape), into the context ORDER_EMAILS
 * reads: the same fields checkout used to post, plus the two links.
 */
export function orderEmailContext({ compact, buyerName, buyerEmail, orderNum, charged = null, promoCoversBase = false }) {
  const raw = {
    pkgKey: compact.p, isPhysical: !!compact.ph, isGift: !!compact.g,
    partner1Name: compact.p1 || null, partner2Name: compact.p2 || null,
    giftNote: compact.gn || null, addonWorkbook: compact.w || null,
    addonReflection: !!compact.r, addonBudget: !!compact.b, addonIntimacy: !!compact.i,
    addonConflict: !!compact.cf, addonChecklist: !!compact.c,
  };
  const { item, lines } = receiptLines(raw);

  /* The setup link checkout puts on its success page, with the same terms. */
  const q = new URLSearchParams({ signup: '1', pkg: item.pkgKey, p1: raw.partner1Name || '', p2: raw.partner2Name || '' });
  if (item.addonReflection) q.set('addon_reflection', '1');
  if (item.addonWorkbook) q.set('addon_workbook', item.addonWorkbook);
  if (item.addonBudget) q.set('addon_budget', '1');
  if (item.addonIntimacy) q.set('addon_intimacy', '1');
  if (item.isGift) q.set('gift', '1');
  if (orderNum) q.set('orderNum', orderNum);

  return {
    pkgKey: item.pkgKey,
    pkgName: PACKAGE_NAMES[item.pkgKey] || item.pkgKey,
    isGift: item.isGift,
    isPhysical: item.isPhysical,
    buyerName: buyerName || raw.partner1Name || null,
    buyerEmail,
    partnerName: raw.partner2Name,
    orderNum,
    lineItems: lines,
    /* What was charged for this item, before tax. The template draws "Promo
       applied" as the lines minus this, so a promo that covered the package
       has to arrive here or the receipt shows the full price as paid. */
    total: charged != null ? charged
      : lines.reduce((sum, l) => sum + l.price, 0) - (promoCoversBase ? lines[0].price : 0),
    addonWorkbook: item.addonWorkbook,
    addonReflection: item.addonReflection,
    addonBudget: item.addonBudget,
    addonIntimacy: item.addonIntimacy,
    addonConflict: item.addonConflict,
    addonChecklist: item.addonChecklist,
    giftNote: raw.giftNote,
    setupUrl: `${SITE_URL}/app?${q.toString()}`,
    giftUrl: `${SITE_URL}/app?signup=1&pkg=${encodeURIComponent(item.pkgKey)}&gift=1`,
  };
}
