# UX Audit — Running Findings Doc

Started: 2026-05-03
Branch: main
Scope: Full button-by-button trace of every state transition in the core flows.
Rule: Functional only. No text/content changes.

---

## Sections

1. Pre-purchase flow (`/home` → `/offerings` → `/checkout` → Stripe)
2. First-time signup flow (Stripe success → AuthModal → email confirm → dashboard)
3. Exercise flow (Ex01 → Ex02 → completion → result unlock)
4. Partner invite flow (invite send → Partner B email → landing → Partner B signup → exercise)
5. Results display (bothDone → joint results render → results email → portal nav)
6. Add-ons & post-results (workbook, LMFT, retake)
7. Edge cases (logout/login, cross-device, session expiry, failed payments, partial completions)

---

## Section 1 — Pre-purchase flow ✓

**Scope:** `/home` → `/offerings` → cart → `/checkout` → Stripe → success redirect

**Files reviewed:** `public/home.html`, `public/offerings.html`, `public/checkout.html`, `public/start.html`, `api/create-payment-intent.js`

### Issues found

| # | Severity | Description | Status |
|---|---|---|---|
| 1.1 | none (false alarm) | Cart format key mismatch `'ann'` vs `'anniversary'` — actually handled internally by `setFormat()` line 1692 of offerings.html | NOT A BUG |
| 1.2 | medium | Cart `_cartItems` only persisted to sessionStorage at "Proceed to Checkout" click. Refresh / navigate-away wiped cart. | FIXED |
| 1.3 | low | Checkout URL-fallback init (line 670) stored `addons.workbook` as `'digital'`/`'print'` string instead of boolean. Truthy check made it work but inconsistent with cart-loaded items. | FIXED |
| 1.4 | flag (not bug) | Multi-item carts: success URL only carries first item's pkg/p1/p2 fields. Each item is in DB with its own order_num, but URL/localStorage only reflects first. For typical single-couple use, fine. | NOTED |
| 1.5 | none | Free promo + paid add-ons billing logic — server side correct (charges add-ons via Stripe, package free). Client-side validation correct. | OK |
| 1.6 | medium | Free-promo flow: server wrote orders with one `order_num` (`ATT-${date}-PR${random}`) but client generated a different one from synthetic `paymentIntent.id`. Result: URL `orderNum` didn't match DB. | FIXED — server now returns `orderNums` array, client uses first |
| 1.7 | medium | Checkout success localStorage save (`attune_order`) didn't include `orderNum`. Cross-device rebuild self-healed it but immediate post-checkout sessions had no order number. | FIXED |

### Files changed

- `public/offerings.html` — added `_persistCart()` helper, called from all 5 cart mutation points
- `public/checkout.html` — boolean normalize for URL workbook param; orderNum included in localStorage save; uses server-returned orderNums for free promos
- `api/create-payment-intent.js` — free-promo path returns generated `orderNums` array

### What was confirmed working

- Beta code validation: client list (line 1655 checkout.html) matches server list (line 324 create-payment-intent.js) byte-for-byte. All 6 codes present.
- Stripe payment success path: redirects to `/app?signup=1&pkg=...&p1=...&p2=...&orderNum=...` with all expected params.
- Promo with add-ons: charges add-ons only, package free, server tracking via `beta_codes` table works.
- Submit button validation: requires `_items.length > 0` AND every item's name/shipping fields filled AND email valid AND card complete (or free promo).
- Multi-item cart split: each item becomes a separate order_num with `${baseOrderNum}-1`, `-2`, etc. Stripe webhook handles this correctly.
