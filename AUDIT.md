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

---

## Section 2 — First-time signup flow ✓

**Scope:** Stripe success → `/app?signup=1` → AuthModal → `auth.signUp()` → confirmation email → click link → land on `/app` → dashboard

**Files reviewed:** `src/App.jsx` (AuthModal, PartnerLandingScreen, gift-recipient signup, cross-device session sync), `api/create-profile.js` (NEW)

### Issues found

| # | Severity | Description | Status |
|---|---|---|---|
| 2.1 | **HIGH** | When email confirmation is ON in Supabase, `auth.signUp()` returns user with no session. Direct `profiles.upsert()` from client then fails RLS (requires `auth.uid() = id`). Profile row never gets created until next login. | FIXED — created `/api/create-profile` service-role endpoint, all 3 signup paths call it instead |
| 2.2 | none (false alarm) | `/api/partner-sync` link call would also fail without session | NOT A BUG — partner-sync uses service role internally |
| 2.3 | low | `email_opt_in: profile?.email_opt_in \|\| false` masks user's actual `false` preference vs missing field. Cosmetic, no functional impact. | NOTED |
| 2.4 | none | Account state init order — `clearAllUserLocalStorage` doesn't clear `attune_account` itself, so signup writes survive. | OK |
| 2.5 | medium | Just-signed-up user who hadn't confirmed email yet would get bounced to login on page refresh. Cross-device sync saw "no session + account exists" and assumed expired. | FIXED — 15-minute grace period for accounts in pending-confirmation state |
| 2.6 | flag | Welcome email fires immediately at signup, before email is confirmed. User gets 2 emails (Supabase confirm + Attune welcome) within seconds. Not broken, just busy. | NOTED |
| 2.7 | flag | QR-token claim is fire-and-forget. No retry if network drops. Not critical for v1. | NOTED |

### Files changed

- `api/create-profile.js` (NEW) — service-role endpoint that creates profile rows, bypasses RLS, validates input
- `vercel.json` — rewrite for `/api/create-profile`
- `src/App.jsx` — all 3 signup paths (Partner A AuthModal, Partner B PartnerLandingScreen, gift-recipient) now call `/api/create-profile` instead of direct upsert
- `src/App.jsx` — cross-device session sync respects 15-minute grace period for pending-confirmation accounts

### What was confirmed working

- AuthModal opens correctly when URL has `?signup=1` and user is not logged in.
- Already-logged-in user with `?signup=1` skips the modal (no double-trigger).
- `emailRedirectTo` is set on all 3 signup paths.
- `clearAllUserLocalStorage()` runs BEFORE `attune_account` is set, so the new account survives.
- Cross-device session sync at line 10070 handles the "session valid + no localAcct" case by rebuilding from profile/order data (already audited in Section earlier).
- Sign-in flow (existing user) fetches profile correctly with valid session.
- Failed login attempts trigger lockout after 5 (line 8696) and shake animation feedback.
- `signup` URL param is stripped after AuthModal closes so refresh doesn't re-open.

### Remaining notes

- Issue 2.6 (duplicate emails on signup) is out-of-scope per user's "functional only, no content changes" rule. Could be improved later by deferring welcome email until first confirmed login.
- The `/api/create-profile` endpoint is explicitly safe to retry: it checks for existing profile and returns `{ existed: true }` without overwriting. Good for idempotency on flaky networks.

---

## Section 3 — Exercise flow ✓

**Scope:** Ex01 entry → answers → Ex02 → Ex03 (if applicable) → completion → bothDone → results unlock

**Files reviewed:** `src/App.jsx` (Exercise01Flow, ExpectationsExercise, AnniversaryExercise, PartnerBExerciseFlow, calcDimScores, saveExerciseWithRetakeSnapshot), `api/partner-sync.js`

### Issues found

| # | Severity | Description | Status |
|---|---|---|---|
| 3.1 | low | Save fires fire-and-forget for Ex01/Ex02 (Ex03 awaits). Local save is the safety net. trackedSupabaseWrite shows toast on next save if last failed. Not user-blocking. | NOTED — pattern works |
| 3.2 | low | Duplicated `useEffect` for toast wiring (lines 9915 & 9918, identical). Functional duplication only. | FIXED |
| 3.3 | low | Inconsistency: Partner B awaits exercise saves; Partner A fire-and-forgets. Not user-facing. | NOTED |
| 3.4 | **HIGH** | `/api/partner-sync` partner profile lookup mode (Mode B) used service role with no auth check. Anyone with a UUID could pull exercise answers + name. UUID space is 122 bits so brute force infeasible, but defense-in-depth violation. | FIXED — endpoint now requires Bearer token, validates caller is linked to requested partner |
| 3.5 | flag | Mid-exercise progress saves (`attune_ex{N}_progress`) are NOT synced to Supabase. Cross-device resume gap if user switches devices mid-exercise. | NOTED — would require per-question writes, heavy |
| 3.6 | none | `calcDimScores` defaults to 3 (mid-scale) when no values exist. Masks "didn't answer" from "neutral answer" but functionally correct. | OK |
| 3.7 | flag | `PERSONALITY_QUESTIONS` array has 28 questions but `calcDimScores` `avg()` expects 5 per dim (en1-en5). Actual data is 3 per dim. `avg()` filters undefined so works. `closeness` dim has only 1 question. | NOTED — methodology, not bug |
| 3.8 | none | Partner B exercise wrapper passes `account.name` and `account.partnerName` correctly. | OK |
| 3.9 | flag | Dashboard falls back to "Sarah"/"James" if `account.name` is empty. With Section 2 fixes, this shouldn't occur. Pre-existing intentional design for demo. | NOTED |
| 3.10 | low (cleanup) | Convoluted `allAnswered && (() => {...})()` pattern in Ex02 finish (2 occurrences). Functional but unreadable. | FIXED — replaced with clean `if (!allAnswered) return; ...` |

### Files changed

- `src/App.jsx` — removed duplicate toast wiring useEffect; cleaned up Ex02 finish onClick handlers (2 places); updated partner-sync poll caller to send auth token
- `api/partner-sync.js` — Mode B (partner profile lookup) now requires Bearer token, validates caller's profile.partner_profile_id matches requested ID

### What was confirmed working

- `Exercise01Flow` mid-exercise progress save: each answer immediately persists to `attune_ex1_progress` localStorage
- `Exercise01Flow` resume on mount: hydrates `idx` and `answers` from progress key, skips intro if any progress exists
- `saveExerciseWithRetakeSnapshot`: detects retake via SELECT, preserves prior answers in `ex{N}_answers_prior` + `ex{N}_prior_completed_at`
- `bothDone` flow: requires `ex1Answers && ex2Answers && (isDemo || hasRealPartner)`. Partner-joined-but-not-completed correctly does NOT unlock (fixed earlier).
- Partner B `PartnerBExerciseFlow`: completes Ex01, Ex02, optionally Ex03, builds session, calls `onComplete(session)`, parent saves to `attune_partner_session`
- Partner-sync poll (15s interval): looks up `partner_profile_id`, fetches partner profile, populates `partnerSession` if both ex1+ex2 exist
- `calcDimScores` works correctly with 3-question-per-dim data (filters undefined keys)
- Dashboard shows "Both exercises complete. Your joint results are ready" when bothDone, "Waiting on partner" when not

### Security tightening (Issue 3.4)

Before this audit, anyone calling `/api/partner-sync?partnerProfileId=XXX` would get exercise answers + name with no authentication. Now requires:
1. Valid Supabase auth token in `Authorization: Bearer <token>` header
2. Caller's profile.partner_profile_id must equal the requested partnerProfileId

Returns 401 if missing/invalid token, 403 if not authorized for that partner.
