#!/usr/bin/env node
/**
 * check-custom-build: the custom build puts things in the cart, and the cart
 * can draw what it was given.
 *
 * ── WHAT BROKE ────────────────────────────────────────────────────────────
 * Ellie (A237, A239): "I had to click add to cart a few times before it
 * looked like anything happened... there's not a # up by the cart icon or
 * any popup", and "Tried clicking my cart and it won't open".
 *
 * One cause. The first add-on into an empty cart was pushed as a line with no
 * package, and every function that draws the cart looked the package up and
 * read a field off it. So renderCart threw on every call: the badge update
 * after it never ran, the confirmation never appeared, and openCart threw
 * before it opened anything. Nothing reached the page; the line was saved,
 * so every later visit was broken too.
 *
 * ── WHAT THIS DOES ────────────────────────────────────────────────────────
 * Runs the shipped public/cart.js in a sandbox with a small stand-in for the
 * page, and drives it the way the add-on tiles do:
 *
 *   a new visitor's first add-on brings the core exercises with it, marked as
 *     a custom build, and the cart counts two (her words: "the first addition
 *     to cart should register as 2 things");
 *   the cart draws that line with her note under the core exercises (A241);
 *   a signed-in account that owns the core exercises gets a line with no
 *     package, which draws, opens, and totals the add-on alone (A236);
 *   an add-on that account already owns is not added.
 *
 * What it does not cover: how the page looks, and checkout, which
 * check-standalone-ownership and the server's own guard hold.
 */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = readFileSync(`${ROOT}public/cart.js`, 'utf8');
const fails = [];

function page(owner) {
  const els = new Map();
  const el = (id) => {
    if (!els.has(id)) {
      const cls = new Set();
      els.set(id, {
        id, style: {}, dataset: {}, innerHTML: '', textContent: '',
        classList: {
          add: (c) => cls.add(c), remove: (c) => cls.delete(c),
          contains: (c) => cls.has(c), toggle: (c, on) => (on ?? !cls.has(c)) ? cls.add(c) : cls.delete(c),
        },
      });
    }
    return els.get(id);
  };
  const store = new Map();
  const ctx = {
    console,
    setTimeout: () => 0,
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    },
    document: {
      readyState: 'complete',
      body: { style: {}, insertAdjacentHTML() {} },
      getElementById: el,
      querySelector: () => null,
      addEventListener() {},
      createElement: () => ({ innerHTML: '', firstChild: null }),
    },
  };
  ctx.window = ctx;
  ctx.ATTUNE_FLAGS = { PHYSICAL_ENABLED: false };
  ctx.ATTUNE_PKG_INCLUDED = { core: {}, newlywed: { budget: true, checklist: true }, anniversary: { reflection: true }, premium: { reflection: true, budget: true, conflict: true, workbook: true } };
  if (owner) ctx._attuneOwner = owner;
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx, { filename: 'public/cart.js' });
  const cart = () => JSON.parse(store.get('attune_cart') || '[]');
  return { ctx, el, cart };
}

const btn = () => ({ dataset: {}, textContent: 'Add to cart', classList: { toggle() {}, remove() {} } });
const press = (p, key) => {
  const b = btn();
  try { p.ctx.addAddonToCart(key, { currentTarget: b, stopPropagation() {} }); }
  catch (e) { fails.push(`adding ${key} threw: ${e.message}`); }
  return b;
};

/* A gate that has lost its subject must never report success. */
for (const name of ['addAddonToCart', 'renderCart', 'openCart', 'updateCartBadge']) {
  if (!new RegExp(`function ${name}\\(`).test(SRC)) fails.push(`public/cart.js has no ${name}; this gate drives it and cannot.`);
}

// ── A new visitor ─────────────────────────────────────────────────────────
{
  const p = page(null);
  press(p, 'conflict');
  const c = p.cart();
  if (c.length !== 1 || c[0].pkg !== 'core' || !c[0].custom || !c[0].addons?.conflict) {
    fails.push(`a new visitor's first add-on should be the core exercises with it on, marked custom; the cart holds ${JSON.stringify(c)}.`);
  }
  const badge = p.el('cart-badge');
  if (badge.textContent !== '2' || !badge.classList.contains('show')) {
    fails.push(`after one add-on the cart icon should read 2 (the core exercises and the add-on); it reads "${badge.textContent}".`);
  }
  if (p.el('added-modal').style.display !== 'flex') fails.push('adding an add-on shows no "added to cart" pop-up with View cart and Continue browsing.');
  const html = p.el('cart-items').innerHTML;
  if (!/Automatically included for new accounts/.test(html)) fails.push("the custom build's core line in the cart has no note saying it comes out for an existing account (A241).");
  if (!/Conflict Patterns Exercise/.test(html)) fails.push('the cart does not draw the add-on line of a custom build.');
  press(p, 'intimacy');
  if (p.cart().length !== 1 || !p.cart()[0]?.addons?.intimacy) fails.push('a second add-on started a new line instead of joining the custom build.');
  if (p.el('cart-badge').textContent !== '3') fails.push(`two add-ons and the core exercises should read 3; it reads "${p.el('cart-badge').textContent}".`);
}

// ── Signed in, owning the core exercises and Build a Budget ───────────────
{
  const p = page({ ownsCore: true, owned: ['budget'] });
  press(p, 'conflict');
  const c = p.cart();
  if (c.length !== 1 || c[0].pkg !== null || !c[0].addons?.conflict) {
    fails.push(`an account that owns the core exercises should get its add-on on a line with no package; the cart holds ${JSON.stringify(c)}.`);
  }
  try { p.ctx.openCart(); } catch (e) { fails.push(`the cart does not open with a no-package line in it: ${e.message}`); }
  if (!p.el('cart-overlay').classList.contains('open')) fails.push('openCart did not open the cart.');
  if (p.el('cart-total').textContent !== '$40') fails.push(`a lone Conflict Patterns should total $40; the cart says ${p.el('cart-total').textContent}.`);
  if (p.el('cart-badge').textContent !== '1') fails.push(`one add-on and no package should read 1; it reads "${p.el('cart-badge').textContent}".`);
  const b = press(p, 'budget');
  if (p.cart()[0]?.addons?.budget) fails.push('an add-on the signed-in account already owns went into the cart.');
  if (b.textContent !== 'Already purchased') fails.push(`pressing an owned add-on should say "Already purchased"; it said "${b.textContent}".`);
}

if (fails.length) {
  console.error('[check-custom-build] FAILED:\n  ' + fails.join('\n  '));
  process.exit(1);
}
console.log('[check-custom-build] the custom build adds the core exercises and counts two; a signed-in owner\'s add-ons go on their own line, which draws, opens and totals; an owned add-on is refused.');
