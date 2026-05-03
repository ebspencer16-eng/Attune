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

---

## Section 4 — Partner invite flow ✓

**Scope:** Partner A submits signup with partnerEmail → invite send → Partner B clicks link → PartnerLandingScreen → Partner B signup → /api/partner-sync action=link → Partner B exercise flow → notification back to Partner A

**Files reviewed:** `src/App.jsx` (PartnerLandingScreen, savePartnerSession, partner-sync poll, sign-in flow, invite link generation), `api/partner-sync.js`, `api/send-email.js` (partner_invite, partner_joined_notification)

### Issues found

| # | Severity | Description | Status |
|---|---|---|---|
| 4.1 | **HIGH** (regression I introduced in §3) | Sign-in flow's partner-sync call had no auth header. After §3 added auth to that endpoint, sign-in's partner-session restore would silently 401. | FIXED — sign-in now reads session.access_token and passes Authorization header |
| 4.2 | medium | If `/api/create-profile` failed for Partner B but auth.signUp had succeeded, the partner-sync link would update zero rows on B's side. Partner A's profile would point to a non-existent partner profile. | FIXED — retry create-profile once; fail-fast if both attempts fail |
| 4.3 | medium | If 2 different people clicked the same invite link, the 2nd person's signup would create an auth user but link would 409. The 2nd click was treated as success → dashboard with no partner data. | FIXED — 409 surfaced as user-facing error; signup blocked |
| 4.4 | none | Returning Partner B clicking their own invite again — routes correctly to dashboard (Cases 2/3 catch it). | OK |
| 4.5 | none | Partner A clicking their own invite while signed-out → PartnerLandingScreen → email collision returns "account already exists". Confusing but not broken. | NOTED |
| 4.6 | medium | `pae` (partner-A-email) URL param uniqueness check existed in AuthModal but NOT in PartnerLandingScreen. Partner B could try to use Partner A's email → got "account exists, try signing in" which would log them in AS Partner A. | FIXED — pae check added to PartnerLandingScreen |
| 4.7 | low | partner_invite email is fire-and-forget. If first send fails Partner A doesn't know. UI has resend button as fallback. | NOTED |
| 4.8 | **HIGH** | When email confirmation is ON, post-signup writes (exercise saves) silently fail RLS because no session. Local data is saved but never reaches server. Partner-sync poll on the OTHER partner's device never sees the exercise data. | FIXED — onAuthStateChange SIGNED_IN handler now retries syncing local exercise data to server when session becomes available (post-confirm) |
| 4.9 | flag | partner_joined_notification email fires at exercise completion, not at signup. Email body says "joined" but trigger is "completed exercises". Content vs functional mismatch. | NOTED — would require content change |
| 4.10 | low | Partner A's local `account.partnerJoined` flag only flipped when Partner B finished exercises, not when they signed up. Server-side `partner_joined` was set correctly, but local cache stale. UI elements gated on `partnerJoined` (e.g. "Partner has joined" indicator) never lit up during the in-between window. | FIXED — partner-sync poll now sets partnerJoined as soon as partner_profile_id link is detected |

### Files changed

- `src/App.jsx`:
  - Sign-in partner-sync call: now sends Bearer auth token
  - Partner B "is partner A done" poll: now sends Bearer auth token
  - PartnerLandingScreen: pae check; create-profile retry-once with fail-fast; 409 handling on link; explicit user-facing error states
  - onAuthStateChange SIGNED_IN: retry-sync local exercise data to server (closes pending-confirm RLS gap)
  - partner-sync poll: set local partnerJoined as soon as link detected (was waiting for exercise completion)
- `api/partner-sync.js` (already from §3): auth required for Mode B

### What was confirmed working

- Invite URL generation: `?invite=CODE&from=NAME&pae=EMAIL` consistent across all 4 send paths (gift recipient, AuthModal, sign-in resend, localStorage fallback)
- Routing logic: `urlInviteCode && !account` → PartnerLandingScreen; `joinedViaInvite && !partnerSession` → exercise flow; etc.
- partner-sync link logic: rejects self-linking, rejects different-partner re-link (409), idempotent on same-partner re-link
- partner_joined_notification fires when partnerSession is saved (exercise completion)
- Cross-device session restore correctly populates `partnerJoined` from profile.partner_joined
- UI resend invite button (handleResend) calls /api/send-email with same parameters

### New error strings introduced

I introduced 3 new user-facing error strings in PartnerLandingScreen for previously-silent failure modes. All are functional error states, not marketing copy. Listed for review:

1. `"That's your partner's email. Each of you needs your own account, so use a different email."` (Issue 4.6 — pae collision)
2. `"This invite link has already been used by someone else. If you think this is a mistake, ask your partner to send a fresh link."` (Issue 4.3 — 409 from link)
3. `"Something went wrong linking your accounts. Please try again in a moment."` (Issue 4.3 — non-409 link error)
4. `"Account creation hit a snag. Please try again in a moment."` (Issue 4.2 — create-profile retries exhausted)

Edit these as you see fit. They're in PartnerLandingScreen.handleSubmit.

### Open architectural concern (Issue 4.8)

The pending-confirm RLS gap (auth user exists, no session, RLS blocks all writes) is now mitigated by retry-on-SIGNED-IN. But a more robust fix would be to use service-role endpoints for exercise saves so they work regardless of session state. Current fix relies on:
- User actually clicking the confirm-email link
- The localStorage data still existing on the same browser when they confirm

If the user signs up on phone, completes exercises, then opens the confirm link on laptop instead, their answers are stuck on the phone. Edge case but real.

Would require a new `/api/save-exercise` service-role endpoint to fully close. Flagging for later.

---

## Section 5 — Results display ✓

**Scope:** bothDone evaluation → "View Results" click → ResultsHighlights → couple type computed → results_viewed email → portal navigation between sections

**Files reviewed:** `src/App.jsx` (UnifiedResults, ResultsHighlights, deriveNewCoupleType, computeIndividualType, view=results routing, results email trigger, workbook auto-gen), `api/generate-workbook.js` (couple type usage), `api/send-email.js` (results_viewed)

### Issues found

| # | Severity | Description | Status |
|---|---|---|---|
| 5.1 | none | `ex1Answers \|\| sarahEx1` defensive fallback in ResultsHighlights props. All `setView("results")` triggers are gated on bothDone, so demo data never rendered for real users. | OK |
| 5.2 | flag | `computeIndividualType` boundary at exactly 3.0 → engage AND open → type W. If user defaults to all 3s (no answers), they get "The Initiator". Edge case but methodology-relevant. | NOTED |
| 5.3 | none | Results email gating (highlightsSeen + localStorage flag + server-side dedup from §3) all working correctly. | OK |
| 5.4 | none | `pkg.hasReflection/hasBudget/hasLMFT` correctly merged from base config + addons in order. | OK |
| 5.5 | medium | Workbook auto-gen on Ex02 finish used STALE bothDone (closure value of ex2Answers, before setEx2State flushed). When the FINISHING partner's Ex02 made bothDone true, auto-gen failed to fire. | FIXED — recompute bothDone using just-completed answers `a` |
| 5.6 | flag | Partner B sees PartnerBCompletionScreen instead of results, so the results_viewed effect never fires on B's device. Partner B receives NO email when results are ready. | NOTED — would require new email template/content change |
| 5.7 | none | Line 6285 `theirs = mine ? partnerEx2 : null` — odd write but functionally correct because all consumers filter on `bothAnswered`. | OK |
| 5.8 | flag | `getCoupleTypeNew` falls back to `NEW_COUPLE_TYPES[0]` ("WW — The ignition") if pair lookup fails. All 10 pairs are defined so fallback shouldn't trigger, but silent default is a code smell. | NOTED |

### Files changed

- `src/App.jsx` — workbook auto-gen now uses `_bothDoneNow` computed from just-completed `a` instead of stale `bothDone` closure value

### What was confirmed working

- All `setView("results")` triggers (8 places) are correctly gated on `bothDone` or already-results-viewing context
- `deriveCoupleTypeFromExercise` returns null on exception; downstream code handles null gracefully
- `computeIndividualType` correctly maps scores → typeCode via withdraw/open boundaries
- All 10 couple type pairings (4 same + 6 cross) are defined in `NEW_COUPLE_TYPES`
- Results email server-side dedup (from §3) prevents duplicate emails when both partners hit results simultaneously
- `attune_results_email_sent` localStorage flag prevents same-device duplicates
- `pkg` config correctly merges base package + add-on flags from order
- Workbook generator's `coupleType` consumers all guard against null
- Side nav within results (`activeResult` state) routes between overview/personality/expectations/anniversary/what-comes-next correctly

### Open functional gap (Issue 5.6)

Partner B never receives a "results are ready" email because their device shows `PartnerBCompletionScreen` instead of `ResultsHighlights`, and the email is wired to fire from the highlights component's `onDone` callback. They have to manually check Partner A's device or open the platform on their own to see results.

This would require either:
1. A separate email template like `partner_b_results_ready` (content change — out of scope)
2. Letting Partner B see results on their own device (architectural change)
3. Firing the existing `results_viewed` email from `PartnerBCompletionScreen` when `partnerADone` becomes true (functional but might feel like spam-targeted-at-Partner-B)

Flagging for product decision.

---

## Section 6 — Add-ons & post-results (in progress)

**Scope:** Workbook generation/download, LMFT Calendly booking, Ex03 anniversary exercise, budget tool, starting-out checklist, notes view

**Files reviewed so far:** `src/App.jsx` (workbook auto-gen, download paths, LMFTSession, AnniversaryExercise, BudgetTool, StartingOutChecklist, NotesView, view branches), `public/lmft-booking.html`, `api/calendly-webhook.js`

### Issues found (partial)

| # | Severity | Description | Status |
|---|---|---|---|
| 6.1 | low | Workbook blob localStorage size risk (handled by existing try/catch) | OK |
| 6.2 | medium | `attune_workbook_blob` was written every successful generation but NEVER read on download. Pure dead weight, ~533KB per workbook in localStorage, increasing the chance of quota errors that wipe other state. | FIXED — removed write entirely; download path has its own multi-tier fallbacks |
| 6.3 | low | `/lmft-booking` Calendly init polled `setTimeout(initCalendly, 100)` forever if the Calendly script never loaded (CDN issue, ad-blocker). | FIXED — caps at 150 attempts (~15s), then shows fallback message pointing to email |
| 6.4 | medium | Ex03 completion screen unconditionally showed "See Your Results" with no `bothDone` gate. Users could land on results with `partnerEx1=null` and see misleading data computed against partner=all-3s defaults. | FIXED — gated on bothDone, falls back to "Back to Dashboard" otherwise |
| 6.5 | **HIGH** | Newlywed Starting Out Checklist was pure React state. No localStorage, no Supabase. Every refresh wiped progress. | FIXED — added localStorage hydrate, debounced no (instant) Supabase write, cross-device hydration on sign-in. Requires migration 011 to add `checklist_data` jsonb column. |
| 6.6 | **HIGH** | Notes view explicitly labeled "auto-saved" but state never persisted anywhere. UI was lying to users. | FIXED — same pattern as checklist (localStorage + debounced 1.5s Supabase write). Requires migration 012 to add `notes_data` jsonb column. |

### Files changed (so far)

- `src/App.jsx`:
  - Removed `attune_workbook_blob` write + orphaned `reader.readAsDataURL` call
  - Ex03 completion: `bothDone ? <See Results> : <Back to Dashboard>`
  - `checklistState`: localStorage hydrate, wrapped setter persists to LS + Supabase
  - `notesState`: same pattern with 1.5s debounced server writes
  - Cross-device hydration: added `checklist_data` and `notes_data` to both sign-in restore paths
- `public/lmft-booking.html`: Calendly polling timeout
- `supabase/migrations/011_checklist_data.sql`: new column
- `supabase/migrations/012_notes_data.sql`: new column

### Action items for Ellie (must run BEFORE this commit goes live)

1. Run migration 011 + 012 in Supabase SQL Editor
2. Smoke-test checklist persistence: check items → refresh → still checked
3. Smoke-test notes persistence: type → refresh → text still there

### Still pending in this section

- Order/payment flow audit (Stripe success → order creation → email triggers)
- Retake flow audit (re-doing Ex01/Ex02/Ex03 → prior snapshot preservation)
- Workbook download UI gating
- Resources view links
- Section 6 commit and continue from where the limit was hit

### Section 6 — additional issues (continuing from partial commit)

| # | Severity | Description | Status |
|---|---|---|---|
| 6.7 | medium | Stripe webhook duplicate delivery → duplicate confirmation emails. UNIQUE constraint on stripe_payment_intent_id rejected the row but the email fired anyway. | FIXED — track orderCreated flag, skip emails on duplicate webhook delivery |
| 6.8 | flag | Ex01 retake doesn't trigger workbook regen (only Ex02 does). | NOTED |
| 6.9 | none | Resources blog post links — all 6 verified to exist. | OK |
| 6.10 | medium | `lq_${key}` had a fallback to `lq_children` — would corrupt the workbook by showing the children answer in place of any missing answer for any other category. | FIXED — null fallback only |
| 6.11 | **HIGH** revenue leak | Workbook download CTA was unconditional — every results-page user could download the $19 workbook regardless of purchase. | FIXED — gated on hasWorkbook prop |
| 6.12 | **HIGH** revenue leak | `/api/generate-workbook` had NO auth or payment check — direct API call gave free workbook to anyone. | FIXED — Bearer token required, validates against orders.addon_workbook |
| 6.13 | **HIGH** revenue leak | `/api/store-workbook` had the same gap — generated AND stored workbook to Supabase Storage with no auth. | FIXED — same auth pattern |
| 6.14 | medium | Order created at checkout had user_id=null. AuthModal signup didn't read URL `orderNum` to link the order to the new auth user. Linkage relied on buyer_email match on later sign-in. | FIXED — signup now does `orders.update({user_id}).eq(order_num, urlOrderNum)` |
| 6.15 | flag | Ex01 and Ex03 retake priors are captured + stored but never surfaced anywhere. Only Ex02 has a RetakeComparisonCard. | NOTED — methodology |

### Auth gate architecture (Issues 6.12 + 6.13)

Both `generate-workbook` and `store-workbook` now require one of:
1. `Authorization: Bearer <supabase-access-token>` — validates token via Supabase auth, then checks orders table for any order with `addon_workbook` set, joined by either `user_id` or `buyer_email`.
2. `X-Admin-Key: <ADMIN_API_KEY>` — bypasses user check. Used by `store-workbook` when calling `generate-workbook` server-to-server, and available for admin tools/cron.

**Action required:** Set `ADMIN_API_KEY` in Vercel env vars (any random string, e.g. 32 chars from `openssl rand -hex 16`). Without this, store-workbook → generate-workbook server-to-server calls will fail because no Bearer token is forwarded.

Client-side callers (3 in App.jsx) all pull the token from `sb.auth.getSession()` and include it in the Authorization header.

### Additional files changed (continued)

- `src/App.jsx`:
  - 3x generate-workbook callers now send Bearer token
  - 1x store-workbook caller now sends Bearer token
  - AuthModal signup now links order by URL `orderNum` to auth user
- `api/generate-workbook.js`: auth + payment gate at top of handler
- `api/store-workbook.js`: same gate; passes X-Admin-Key when calling generate-workbook
- `api/stripe-webhook.js`: order idempotency tracking, email skip on duplicate

### Section 6 — final action items for Ellie

1. **Run migrations 011 + 012** in Supabase SQL Editor (already documented above)
2. **Set ADMIN_API_KEY** in Vercel environment variables — any random string (e.g. `openssl rand -hex 16` output). Required for the workbook auto-gen flow to bypass the Bearer auth check on server-to-server calls.
3. **Smoke tests:**
   - Checklist persists across refresh
   - Notes persist across refresh
   - Buy a package WITHOUT workbook addon → verify the "Download workbook" CTA does NOT appear on results page
   - Buy a package WITH workbook addon → verify download works
   - Direct GET to `/api/generate-workbook` (curl with no auth) returns 401
   - Direct GET to `/api/store-workbook` (curl with no auth) returns 401
