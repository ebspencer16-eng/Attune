/* Shared Attune cart widget. Extracted verbatim from offerings.html so behaviour and rendering match. State lives in sessionStorage['attune_cart']. Do NOT include this on offerings.html (it has its own inline copy). */
// Canonical pricing — matches the offering cards and checkout.html PACKAGES.
// If you change prices, update checkout.html/PACKAGES too.
const CART_PKGS = {
  core: {
    name: 'The Attune Assessment', badge: 'The Foundation',
    badgeColor: '#FFF0EB', badgeText: '#E8673A',
    digitalPrice: 89, physicalPrice: 124,
    supportsPhysical: true,
  },
  newlywed: {
    name: 'Starting Out Collection', badge: 'Wedding Gift',
    badgeColor: '#FFF0EB', badgeText: '#E8673A',
    digitalPrice: 139, physicalPrice: 174,
    supportsPhysical: true,
  },
  anniversary: {
    name: 'Relationship Reflection', badge: 'Anniversary Gift',
    badgeColor: '#EEEFFF', badgeText: '#5B6DF8',
    digitalPrice: 139, physicalPrice: 174,
    supportsPhysical: true,
  },
  premium: {
    name: 'Attune Premium', badge: 'Most Complete',
    badgeColor: 'rgba(91,109,248,.12)', badgeText: '#7b8fff',
    digitalPrice: 295, physicalPrice: 330,
    supportsPhysical: true,
  },
};

// Add-on pricing — also mirrored in checkout.html and api/create-payment-intent.js
const ADDON_PRICES = {
  workbookDigital: 19,
  workbookPrint:   39,
  lmft:           150,
  reflection:      40,   // The Relationship Reflection exercise
  budget:          20,   // Build a Budget / Budgeting Activity
  checklist:       20,   // Starting Out Checklist
};

// ── State ──────────────────────────────────────────────────────────────────
// Each item: { id, pkg, format, qty, addons: { workbook, workbookVariant, lmft, reflection, budget, checklist } }
let _cartItems = [];
// Track which format is currently selected on each offering card
let _currentFormats = { core:'digital', newlywed:'physical', anniversary:'physical', premium:'digital' };
// Which item's add-on panel is currently expanded (null = none)
let _expandedItemId = null;

function _newItemId() { return 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

function _defaultAddons() {
  return { workbook:false, workbookVariant:'digital', lmft:false, reflection:false, budget:false, checklist:false };
}

function _itemPrice(item) {
  const p = CART_PKGS[item.pkg];
  const base = item.format === 'physical' ? p.physicalPrice : p.digitalPrice;
  let add = 0;
  if (item.addons.workbook)   add += item.addons.workbookVariant === 'print' ? ADDON_PRICES.workbookPrint : ADDON_PRICES.workbookDigital;
  if (item.addons.lmft)       add += ADDON_PRICES.lmft;
  if (item.addons.reflection) add += ADDON_PRICES.reflection;
  if (item.addons.budget)     add += ADDON_PRICES.budget;
  if (item.addons.checklist)  add += ADDON_PRICES.checklist;
  return base + add;
}

function _cartItemCount() {
  return _cartItems.reduce((sum, i) => sum + i.qty, 0);
}

function addToCart(pkg) {
  const cfg = CART_PKGS[pkg];
  if (!cfg) return;
  const format = cfg.supportsPhysical ? (_currentFormats[pkg] || 'digital') : 'digital';
  // Reuse existing line item if it matches pkg + format + default addons
  // (user can customize addons separately). New line item gets fresh addons.
  const sig = (it) => [it.pkg, it.format, JSON.stringify(it.addons)].join('|');
  const defaultAddons = _defaultAddons();
  const newItem = { id: _newItemId(), pkg, format, qty: 1, addons: defaultAddons };
  const existing = _cartItems.find(i => sig(i) === sig(newItem));
  if (existing) {
    existing.qty += 1;
  } else {
    _cartItems.push(newItem);
  }
  renderCart();
  updateCartBadge();
  _persistCart();
  // Show the "added to cart" confirmation modal
  const modal = document.getElementById('added-modal');
  const nameEl = document.getElementById('added-modal-name');
  if (nameEl) {
    const count = _cartItemCount();
    nameEl.textContent = count > 1
      ? `${cfg.name} added (${count} items in cart)`
      : `${cfg.name} added to cart`;
  }
  if (modal) {
    modal.style.display = 'flex';
    modal.style.background = 'rgba(14,11,7,0.5)';
    modal.style.backdropFilter = 'blur(4px)';
  }
}

function closeAddedModal() {
  const modal = document.getElementById('added-modal');
  if (modal) modal.style.display = 'none';
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  const n = _cartItemCount();
  if (n > 0) {
    badge.classList.add('show');
    badge.textContent = String(n);
  } else {
    badge.classList.remove('show');
  }
}

// Persist cart to sessionStorage. Called after every mutation so refreshing
// the page or navigating away and back doesn't lose the cart. Previously
// only saved at the moment of clicking "Proceed to Checkout."
function _persistCart() {
  try { sessionStorage.setItem('attune_cart', JSON.stringify(_cartItems)); } catch (e) { /* private mode, ignore */ }
}

function removeItem(id) {
  _cartItems = _cartItems.filter(i => i.id !== id);
  if (_expandedItemId === id) _expandedItemId = null;
  renderCart();
  updateCartBadge();
  _persistCart();
}

function changeQty(id, delta) {
  const item = _cartItems.find(i => i.id === id);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  renderCart();
  updateCartBadge();
  _persistCart();
}

function toggleItemAddon(id, addon) {
  const item = _cartItems.find(i => i.id === id);
  if (!item) return;
  item.addons[addon] = !item.addons[addon];
  // If turning off workbook, reset variant to digital
  if (addon === 'workbook' && !item.addons.workbook) item.addons.workbookVariant = 'digital';
  renderCart();
  _persistCart();
}

function setItemWorkbookVariant(id, variant, ev) {
  if (ev) ev.stopPropagation();
  const item = _cartItems.find(i => i.id === id);
  if (!item) return;
  item.addons.workbookVariant = variant;
  renderCart();
  _persistCart();
}

function toggleItemPanel(id) {
  _expandedItemId = (_expandedItemId === id) ? null : id;
  renderCart();
}

function renderCart() {
  const container = document.getElementById('cart-items');
  const filled = document.getElementById('cart-filled');
  const empty  = document.getElementById('cart-empty-state');
  if (!container) return;

  if (_cartItems.length === 0) {
    filled.style.display = 'none';
    empty.style.display = '';
    return;
  }
  filled.style.display = '';
  empty.style.display = 'none';

  const itemHtml = (item) => {
    const cfg = CART_PKGS[item.pkg];
    const unitPrice = _itemPrice(item);
    const lineTotal = unitPrice * item.qty;
    const expanded = _expandedItemId === item.id;
    const formatLabel = cfg.supportsPhysical
      ? (item.format === 'physical' ? 'Physical gift box' : 'Digital · instant access')
      : 'Digital · instant access';
    // Addon chips summary when collapsed
    const activeAddons = [];
    if (item.addons.workbook)   activeAddons.push('Workbook ' + (item.addons.workbookVariant === 'print' ? '(print)' : '(digital)'));
    if (item.addons.lmft)       activeAddons.push('LMFT');
    if (item.addons.reflection) activeAddons.push('Reflection');
    if (item.addons.budget)     activeAddons.push('Budget');
    if (item.addons.checklist)  activeAddons.push('Checklist');

    return `
    <div class="cart-item" data-id="${item.id}">
      <div class="cart-item-top">
        <div class="cart-item-info">
          <span class="cart-pkg-badge" style="background:${cfg.badgeColor};color:${cfg.badgeText}">${cfg.badge}</span>
          <div class="cart-item-name">${cfg.name}</div>
          <div class="cart-item-sub">${formatLabel}</div>
          ${cfg.supportsPhysical ? `
            <div class="cart-item-fmt-row">
              <button class="cart-fmt-btn ${item.format==='physical'?'active':''}" onclick="setItemFormat('${item.id}','physical')">Physical</button>
              <button class="cart-fmt-btn ${item.format==='digital'?'active':''}" onclick="setItemFormat('${item.id}','digital')">Digital</button>
            </div>
          ` : ''}
        </div>
        <div class="cart-item-right">
          <div class="cart-item-price">$${lineTotal}</div>
          ${item.qty > 1 ? `<div class="cart-item-price-sub">$${unitPrice} each</div>` : ''}
        </div>
      </div>

      <div class="cart-item-controls">
        <div class="qty-ctrl">
          <button onclick="changeQty('${item.id}',-1)" aria-label="Decrease">−</button>
          <span class="qty-val">${item.qty}</span>
          <button onclick="changeQty('${item.id}',1)" aria-label="Increase">+</button>
        </div>
        <button class="cart-item-customize" onclick="toggleItemPanel('${item.id}')">
          ${expanded ? 'Hide add-ons' : (activeAddons.length ? activeAddons.join(' · ') : 'Add-ons')} ${expanded ? '▾' : '▸'}
        </button>
        <button class="cart-item-remove" onclick="removeItem('${item.id}')" aria-label="Remove">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
        </button>
      </div>

      ${expanded ? `
      <div class="cart-item-addons">
        ${(() => {
          // Package inclusion map — these come WITH the package, so don't
          // show them as add-ons.
          //   newlywed    → checklist + budget
          //   anniversary → reflection
          //   premium     → reflection + budget + LMFT
          const included = {
            core:        { checklist: false, budget: false, reflection: false, lmft: false },
            newlywed:    { checklist: true,  budget: true,  reflection: false, lmft: false },
            anniversary: { checklist: false, budget: false, reflection: true,  lmft: false },
            premium:     { checklist: false, budget: true,  reflection: true,  lmft: true  },
          }[item.pkg] || { checklist: false, budget: false, reflection: false, lmft: false };

          // Ordered by cheapest → most expensive (user-requested).
          // Workbook has a format toggle so it renders separately below; here
          // we just pass its base (digital) price for sort purposes.
          const addons = [
            { key: 'workbook',   price: ADDON_PRICES.workbookDigital, title: 'Personalized Workbook',  desc: 'Conversation prompts drawn from your results',
              // Workbook is never "included" in a package; always offered.
              alwaysShow: true },
            { key: 'budget',     price: ADDON_PRICES.budget,          title: 'Shared Budgeting Activity', desc: 'Build a shared budget together' },
            { key: 'checklist',  price: ADDON_PRICES.checklist,       title: 'Starting Out Checklist',    desc: 'Merging lives, finances, logistics' },
            { key: 'reflection', price: ADDON_PRICES.reflection,      title: 'Relationship Reflection',   desc: 'Exercise on experiences that shaped you' },
            { key: 'lmft',       price: ADDON_PRICES.lmft,            title: 'LMFT Session',              desc: 'Licensed therapist reviews your results' },
          ];

          // Sort ascending by price, then filter out anything already included.
          const visible = addons
            .sort((a, b) => a.price - b.price)
            .filter(a => a.alwaysShow || !included[a.key]);

          return visible.map(a => {
            const selected = !!item.addons[a.key];
            // Workbook gets its own pricing display because of the digital/print toggle
            const priceDisplay = a.key === 'workbook'
              ? (item.addons.workbook ? '$'+(item.addons.workbookVariant==='print'?ADDON_PRICES.workbookPrint:ADDON_PRICES.workbookDigital) : '$'+ADDON_PRICES.workbookDigital)
              : '$' + a.price;
            // The main card
            const card = `<div class="mini-addon ${selected?'sel':''}" onclick="toggleItemAddon('${item.id}','${a.key}')">
              <div><div class="mini-addon-title">${a.title}</div><div class="mini-addon-desc">${a.desc}</div></div>
              <div class="mini-addon-right"><div class="mini-addon-price">${priceDisplay}</div><div class="mini-check ${selected?'sel':''}"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div></div>
            </div>`;
            // Workbook has a format variant selector when selected
            const variantSelector = (a.key === 'workbook' && item.addons.workbook) ? `
              <div class="mini-variants">
                <button class="mini-variant ${item.addons.workbookVariant==='digital'?'sel':''}" onclick="setItemWorkbookVariant('${item.id}','digital',event)">Digital · $${ADDON_PRICES.workbookDigital}</button>
                <button class="mini-variant ${item.addons.workbookVariant==='print'?'sel':''}" onclick="setItemWorkbookVariant('${item.id}','print',event)">Print · $${ADDON_PRICES.workbookPrint}</button>
              </div>` : '';
            return card + variantSelector;
          }).join('');
        })()}
      </div>
      ` : ''}
    </div>`;
  };

  container.innerHTML = _cartItems.map(itemHtml).join('');
  updateTotal();
}

function setItemFormat(id, format) {
  const item = _cartItems.find(i => i.id === id);
  if (!item) return;
  const cfg = CART_PKGS[item.pkg];
  if (!cfg.supportsPhysical) return;
  item.format = format;
  renderCart();
}

function updateTotal() {
  const total = _cartItems.reduce((sum, i) => sum + _itemPrice(i) * i.qty, 0);
  const el = document.getElementById('cart-total');
  if (el) el.textContent = '$' + total;
}

function openCart() {
  const overlay = document.getElementById('cart-overlay');
  renderCart();  // ensure fresh
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCart() { document.getElementById('cart-overlay').classList.remove('open'); document.body.style.overflow = ''; }
function overlayClick(e) { if (e.target === document.getElementById('cart-overlay')) closeCart(); }

function addToCartWithIntent(pkgId) {
  addToCart(pkgId);
}

// ── Checkout handoff ─────────────────────────────────────────────────────
// Encode the full cart (items, qty, addons) and hand off to /checkout.
// Checkout reads from sessionStorage because URL params would explode for
// multi-item carts with addons.
function goCheckout() {
  if (_cartItems.length === 0) return;
  try {
    sessionStorage.setItem('attune_cart', JSON.stringify(_cartItems));
  } catch (e) {
    console.warn('[cart] sessionStorage write failed:', e);
  }
  // Preserve a simple URL param for the first item as fallback (so checkout
  // still works if sessionStorage is blocked, e.g. private browsing edge case)
  const first = _cartItems[0];
  const params = new URLSearchParams({ pkg: first.pkg });
  if (first.format === 'physical') params.set('format', 'physical');
  if (first.addons.workbook) params.set('addon_workbook', first.addons.workbookVariant);
  if (first.addons.lmft) params.set('addon_lmft', '1');
  if (first.addons.reflection) params.set('addon_reflection', '1');
  if (first.addons.budget) params.set('addon_budget', '1');
  if (_cartItems.length > 1 || _cartItems[0].qty > 1) params.set('multi', '1');
  window.location.href = '/checkout?' + params.toString();
}
// ─────────────────────────────────────────────────────────────────────────────


/* ---- Shared widget bootstrap: inject button + drawer, load saved cart ---- */
var CART_MARKUP = `<div class="cart-toast" id="cart-toast">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
  <span id="cart-toast-text">Added to cart</span>
  <span onclick="openCart()" style="margin-left:.6rem;text-decoration:underline;cursor:pointer;opacity:.75;white-space:nowrap">View cart</span>
</div>

<!-- CART MODAL -->
<div class="cart-overlay" id="cart-overlay" onclick="overlayClick(event)">
  <div class="cart-modal" id="cart-modal">
    <div class="cart-header">
      <div class="cart-header-title">Your order</div>
      <button class="cart-close" onclick="closeCart()" aria-label="Close">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>

    <!-- Empty state -->
    <div id="cart-empty-state" style="display:none;padding:3rem 1.75rem;text-align:center;">
      <div style="width:48px;height:48px;border-radius:12px;background:var(--warm);border:1.5px solid var(--stone);display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="1.6" stroke-linecap="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
      </div>
      <p style="font-family:var(--hfont);font-size:1.1rem;font-weight:700;color:var(--ink);margin-bottom:.5rem;">Your cart is empty</p>
      <p style="font-size:.82rem;color:var(--muted);line-height:1.65;margin-bottom:1.5rem;">Choose a package to get started.</p>
      <a href="/offerings" onclick="closeCart()" style="display:inline-block;background:linear-gradient(135deg,var(--orange),#d45a2e);color:white;padding:.75rem 1.75rem;border-radius:12px;font-size:.82rem;font-weight:700;text-decoration:none;letter-spacing:.04em;">Browse packages →</a>
    </div>

    <!-- Filled cart -->
    <div id="cart-filled">
    <!-- Line items (dynamically rendered) -->
    <div id="cart-items"></div>

    <!-- Total -->
    <div class="cart-total">
      <div class="cart-total-label">Total</div>
      <div class="cart-total-amount" id="cart-total">$0</div>
    </div>

    <!-- Actions -->
    <div class="cart-actions">
      <button class="cart-checkout-btn" onclick="goCheckout()">Proceed to checkout →</button>
      <button class="cart-browse-btn" onclick="closeCart()">Keep browsing</button>
    </div>
      </div><!-- #cart-filled -->
  </div>
</div>

<div id="added-modal" style="display:none;position:fixed;inset:0;z-index:9999;align-items:center;justify-content:center;padding:1.25rem;" onclick="if(event.target===this)closeAddedModal()">
  <div style="background:white;border-radius:20px;padding:2rem 2rem 1.75rem;max-width:380px;width:100%;box-shadow:0 24px 80px rgba(14,11,7,.22);text-align:center;">
    <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#E8673A,#1B5FE8);display:flex;align-items:center;justify-content:center;margin:0 auto 1.1rem;">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
    </div>
    <h3 id="added-modal-name" style="font-family:'Playfair Display',Georgia,serif;font-size:1.2rem;font-weight:700;color:#0E0B07;margin-bottom:.4rem;line-height:1.2;">Added to cart</h3>
    <p style="font-size:.82rem;color:#8C7A68;line-height:1.6;margin-bottom:1.5rem;">Your package is in your cart. Ready to continue?</p>
    <div style="display:flex;flex-direction:column;gap:.65rem;">
      <button onclick="openCart();closeAddedModal();" style="background:linear-gradient(135deg,#E8673A,#d45a2e);color:white;border:none;padding:.85rem 1.5rem;border-radius:12px;font-size:.82rem;font-weight:700;font-family:'DM Sans',sans-serif;cursor:pointer;letter-spacing:.04em;text-transform:uppercase;">View cart →</button>
      <button onclick="closeAddedModal();" style="background:none;border:1.5px solid #E8DDD0;color:#8C7A68;padding:.75rem 1.5rem;border-radius:12px;font-size:.82rem;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;">Continue browsing</button>
    </div>
  </div>
</div>
`;
var CART_BTN_HTML = `<button class="cart-btn" id="nav-cart-btn" onclick="openCart()" aria-label="View cart">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
      Cart
      <span class="cart-badge" id="cart-badge">1</span>
    </button>`;
(function(){
  function initCart(){
    if (!document.getElementById('cart-overlay')) {
      document.body.insertAdjacentHTML('beforeend', CART_MARKUP);
    }
    var nr = document.querySelector('.nav-right');
    if (nr && !document.getElementById('nav-cart-btn')) {
      var holder = document.createElement('div');
      holder.innerHTML = CART_BTN_HTML.trim();
      var el = holder.firstChild;
      var getStarted = nr.querySelector('.btn-nav');
      if (getStarted) nr.insertBefore(el, getStarted); else nr.appendChild(el);
    }
    try {
      var raw = sessionStorage.getItem('attune_cart');
      if (raw) { var arr = JSON.parse(raw); if (Array.isArray(arr)) _cartItems = arr; }
    } catch (e) { /* private mode */ }
    try { updateCartBadge(); } catch(e){}
    try { renderCart(); } catch(e){}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initCart);
  else initCart();
})();
