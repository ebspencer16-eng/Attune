# Security audit

Reviewed 2026-09-08 by reading each endpoint, not by pattern matching. Every
finding below was confirmed in the code; where something looked like a problem
and turned out not to be, that is recorded too, because the next person to scan
this repo will find the same shapes.

Severity is about this product: what a stranger, a customer, or a partner can
actually reach.

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Anyone can grant themselves any package | **High** | **Fixed** |
| 2 | A partner's raw Conflict Patterns are served | **High** | **Fixed** |
| 3 | `save-exercise` can write another person's answers | Medium | Recommended |
| 4 | `generate-card` is open when `CARD_SECRET` is unset | Medium | **Fixed** |
| 5 | Sign-in reveals whether an account exists | Medium | **Fixed** |
| 6 | No server-side rate limiting anywhere | Medium | Recommended |
| 7 | Exercise answers are stored without validation | Medium | Recommended |
| 8 | Partner link accepts an unconfirmed email match | Low | Recommended |
| 9 | Session tokens and both partners' answers sit in localStorage | Low | Recommended |
| 10 | `create-profile` allows profile squatting | Low | Recommended |
| 11 | Wildcard CORS on six endpoints | Low | **Fixed** |
| 12 | Raw database errors returned to callers, 29 sites | Medium | **Fixed** |
| 13 | Missing security headers | Medium | **Fixed** |
| 14 | Unencoded values in PostgREST URLs | Low | **Fixed** |
| 15 | Workbook scorer reads relative answers backwards | Medium | Recommended |

---

## 1. Anyone can grant themselves any package — High

`POST /api/create-profile` takes no authentication and accepts `pkg` from the
request body. It is allowlisted to the four package names, which includes
`premium`.

```js
pkg: typeof body.pkg === 'string'
  && ['core','newlywed','anniversary','premium'].includes(body.pkg) ? body.pkg : 'core',
```

`profiles.pkg` is a grant source. `api/_lib/entitlements.js` pushes it into the
rows it computes capabilities from, alongside real orders, and
`mergeEntitlementsGrantOnly` never strips a grant once present. So the package
chosen here is permanent.

The website already passes it straight through from the URL during signup:

```js
pkg: new URLSearchParams(window.location.search).get("pkg") || "core"
```

So signing up at `/app?signup=1&pkg=premium` is enough. No payment, no order
row, no admin action. The only guard is that a profile must not already exist
for that id, which is exactly the state a real person is in when they sign up.

**Fixed.** `pkg` is no longer read from the body. It is derived from orders
matched on user id and on the email held by the auth record, because a guest
checkout writes `buyer_email` before any user id exists. The best package
across those orders wins, ranked by `PKG_CAPS` rather than by a list written at
the call site. No order means `core`, which grants nothing, and that is
self-correcting for a real customer: `/api/claim-order` links the order moments
later and `/api/recompute-entitlements` grants from it on the next load. A
package the client asks for is an intent and is no longer recorded at all.

`check-entitlement-inputs.mjs` fails the build if any endpoint reads a package
or an add-on column from the request. Verified by planting.

**Still to do: find out whether anyone used it.** `supabase/diagnostics/
pkg-without-order.sql` lists every profile above `core` and labels each PAID,
COMP, PARTNER or NO SOURCE. NO SOURCE is the list that matters, and it cannot
tell an exploit from an undocumented manual grant, because neither leaves a
trace. Run it before launch.

## 2. A partner's raw Conflict Patterns are served — High

`GET /api/partner-sync?partnerProfileId=…` is authorised correctly: the caller
must be linked to that partner. It then returns their complete answer sets.

```js
.select('name, pronouns, ex1_answers, ex2_answers, ex3_answers, ex3_completed,
         relationship_status, joined_via_invite, intimacy_data, conflict_data')
```

This contradicts the design of the two endpoints built for these sections.
`/api/conflict-results` uses an allowlist, `partnerView()`, that deliberately
omits every pattern field, and `check-conflict-privacy.mjs` fails the build if
that changes. `/api/results` sends intimacy as distances only, and
`check-intimacy-privacy.mjs` fails the build if a question id or an answer
label ever appears in it.

Both gates guard one door while this one stands open. The website then writes
the result to `localStorage.attune_partner_session`, so it also lands on disk.

**Fixed, for conflict.** The decision was not close, because there is a promise
in writing. The Conflict Patterns screen tells the customer:

> "Not visible to your partner. This is the one section that stays private,
> always."

That is `patternsPrivacy` in `api/_conflict-results-prose.js`, rendered by
`src/App.jsx` and by the app's `conflict-results.tsx`. It ships. Serving those
fields to a partner breaks a commitment already made to the person whose
answers they are, so it closed regardless of cost.

`partnerView` moved to `api/_lib/conflict-partner-view.js` and `partner-sync`
now applies it. The comment there names the promise and where the copy lives,
because a rule with no stated reason gets relaxed by whoever finds it
inconvenient.

**Intimacy went the other way, after checking what was promised.** Every
customer-facing surface was searched for a privacy claim attached to the
exercise. There is none. The opposite is promised, repeatedly:

- The exercise intro: "You answer on your own. Neither of you sees the other's
  answers **until you have both finished**." Until, not never.
- The catalogue includes list: "Answered independently, **compared side by
  side**."
- `checkout.html`: "answered independently and compared side by side."
- `start.html` and the purchase email: "scored for gaps and conversation, like
  the rest of your results."

"A private set of questions" appears six times and always describes the subject
matter and answering alone. In the includes list it sits beside "compared side
by side".

So `/api/results` was stricter than the product, not safer than it. It sent
distances only, which meant the app could not draw the side-by-side screen the
website has always had, and the two surfaces disagreed about what a customer
had bought. The payload now carries each person's position per question, and
the app renders the comparison.

**One string did promise privacy, and it was ours.** The app's intimacy
exercise said "Your partner never sees your answers", and the completion screen
said "your partner cannot see them". Both were written to match the gate rather
than the product, and both are now the website's own wording.

`check-intimacy-privacy.mjs` was rewritten rather than deleted. It now enforces
what was actually promised: nothing leaves before both partners have finished,
positions may pass between the two of them once both are done, and no other
endpoint may return the raw record. It also asserts the comparison is still
there, because a gate that only removes things eventually removes the feature.

Two gates now cover the rule between them, and the split is deliberate:
`check-conflict-privacy.mjs` proves `partnerView` carries no pattern data and
still carries what the screens need; `check-partner-privacy.mjs` proves no
endpoint bypasses it by returning the raw record. The second is scoped to
conflict on purpose, and says so, so nobody reads it as "partner data is
private" and either breaks intimacy or loosens the gate.

## 3. `save-exercise` can write another person's answers — Medium

`POST /api/save-exercise` has a second auth mode for the window between signup
and email confirmation, when the client has a user id but no session:

```
no Bearer token + body { userId, email }
→ look up the user, require the email to match and email_confirmed_at to be null
```

Anyone holding both the target's account id and their email address can write
that person's exercise answers, as long as the account is unconfirmed. Ids are
UUIDs and not enumerable, so this needs a specific target and a leaked id. It is
still an authentication bypass by design, and it writes into the scoring inputs.

**Recommended fix.** Give the pending-confirm client a short-lived token at
signup and require it here, or drop the mode and rely on localStorage until
confirmation, which is what it replaced.

## 4. `generate-card` is open when `CARD_SECRET` is unset — Medium

```js
const secret = process.env.CARD_SECRET;
if (secret && searchParams.get('secret') !== secret) {
  return new Response('Unauthorized', { status: 401 });
}
```

If the variable is not set the check is skipped and the endpoint is public. This
is the pattern `checkAdminAuth` and the Stripe webhook were both deliberately
changed away from; the comment on `admin-csv.js` records what it cost last time.

The comparison is also `!==` rather than constant-time.

**Fixed.** Refuses with 503 when `CARD_SECRET` is unset, and compares in
constant time.

## 5. Sign-in reveals whether an account exists — Medium

The lead named the password reset flow. Reset is correct: it always reports
success and never says whether the address is known.

```js
await sb.auth.resetPasswordForEmail(...)
// Always show success (don't reveal whether the email exists)
```

Sign-in is where the leak is. It sorts the failure into three answers:

```js
if (msg.includes('email not confirmed')) return setErr("This account hasn't been confirmed yet…");
if (msg.includes('user not found'))      return setErr("Wrong email, no account found.");
return setErr("Wrong password. Please try again.");
```

"Wrong email, no account found" and "Wrong password" distinguish a real address
from a fake one, and "hasn't been confirmed yet" confirms an account exists and
names its state. For a product about people's relationships, confirming that a
particular person has an account is itself the disclosure.

**Fixed.** One message for every credential failure: "That email and password
don't match. Check both, or reset your password below." The unconfirmed case is
folded in deliberately, because telling an attacker an account exists but is
unconfirmed is the same disclosure with a detail attached. Someone who has
genuinely not confirmed still has the confirmation email.

**Knowingly left.** Signup still says "that email is already registered" when
it is. That is a weaker leak on a screen the person reached after paying, and
collapsing it would strand a real customer with no way to understand why they
cannot proceed. Worth revisiting if signup is ever opened to the public.

## 6. No server-side rate limiting anywhere — Medium

`api/notifications.js` is the only endpoint with any limiting, and it limits
writes rather than attempts.

Sign-in has a lockout, but it is client state:

```js
if (attempts >= 5) { setLockedUntil(Date.now() + 30000); … }
```

It is a variable in the browser. It does not survive a page reload with intent
behind it, and it does not exist at all for a script talking to Supabase
directly.

Unprotected and worth protecting, in order:

- **Sign-in.** Credential stuffing. Supabase applies its own limits, which are
  the real backstop today, but nothing here is deliberate.
- **Password reset.** Free mail sending to any address, from our domain.
- **`/api/validate-promo`.** Unauthenticated, unlimited, and answers whether a
  code is valid. Promo codes are brute-forceable.
- **`/api/create-profile`.** Unauthenticated write, see finding 1.
- **`/api/send-email`.** Guarded by an Origin allowlist, which stops a browser
  but not a script: `Origin` is a header, and anything outside a browser can
  set it. The internal-secret path is only reached when `Origin` is absent.

**Recommended fix.** Rate limit by IP at the edge for the unauthenticated
endpoints, and by user id for the authenticated ones. Vercel KV is already a
dependency and `notifications.js` has the pattern.

## 7. Exercise answers are stored without validation — Medium

`save-exercise` checks that `answers` is an object and writes it:

```js
if (!answers || typeof answers !== 'object') return err(400, 'Missing answers');
```

Nothing checks the keys, the value types, or the ranges. A five-point scale
accepts 99, and a gap of 104 is computed from it and rendered. Nothing errors;
the results are simply wrong, and they are frozen once written.

The client is the only thing keeping answers in range today.

**Recommended fix.** Validate against the question registry: known ids, values
within the scale. `api/_questions.js` and `api/_intimacy-questions.js` already
describe every option. This touches the scoring inputs, so it needs a decision.

Related, smaller: `VALID_EXERCISES` in `save-exercise.js` writes out the five
exercise keys by hand rather than reading `api/_exercises.js`. A sixth exercise
would be rejected by an endpoint that never heard about it.

## 8. Partner link accepts an unconfirmed email match — Low

`partner-sync` authorises a link two ways: a token proving the caller is Partner
B, or Partner B's email matching the address Partner A sent the invite to.

The second path does not require the email to be confirmed. Someone holding an
invite code who also knows the invited address can register with that address,
leave it unconfirmed, and link. They then inherit the couple's package and
Partner A's answers.

Invite codes are eight base-36 characters, so this needs the actual invite link
rather than guessing.

**Recommended fix.** Require `email_confirmed_at` on the email path, or drop
the path and require a token.

## 9. Session tokens and both partners' answers sit in localStorage — Low

`localStorage` holds, on the reader's device:

- **The Supabase session.** `persistSession: true` writes `sb-<ref>-auth-token`,
  containing the access and refresh tokens. The refresh token is the sensitive
  one: it outlives the access token.
- **Both people's exercise answers**, including `attune_intimacy` and
  `attune_conflict`, and `attune_partner_session`, which carries the partner's
  answers as described in finding 2.
- **Notes** (`attune_notes`), the order and its entitlements (`attune_order`),
  the account's name, email and partner email (`attune_account`), and the
  generated workbook (`attune_workbook_blob`).

This is normal for a browser app and is not itself a vulnerability. It matters
because of what it is: the most private content this product holds, readable by
any script that runs on the page, and persistent on a shared computer until
sign-out clears it.

The one mitigation that already exists and is worth keeping correct:
`clearAllUserLocalStorage()` runs on sign-out and on account switch, and
`check-localstorage-keys.mjs` fails the build if a key drifts out of the list.

**Recommended fix.** Nothing urgent. Two things worth doing when convenient:
keep answers out of `localStorage` where the screen can fetch them instead, and
tighten the CSP (finding 13) so that a single injected script cannot read all of
it at once. The second is the one that changes the risk.

## 10. `create-profile` allows profile squatting — Low

The endpoint refuses to overwrite a profile that exists, but anyone who learns a
user id belonging to an account with no profile row can create one first, with
an attacker-chosen name and partner name. The victim then holds an account whose
profile they did not write and cannot replace through this path.

Same root cause as finding 1: this endpoint is unauthenticated by design,
because during signup with email confirmation the client has no session yet.

**Recommended fix.** Same as finding 3: a short-lived signup token.

## 11–14. Fixed in this pass

**11. Wildcard CORS — Low, fixed.** Six sites in five files answered
`Access-Control-Allow-Origin: *`: `admin-actions`, `admin-data`,
`admin-explore`, `get-feedback` and `featured-testimonials`. All are fetched by
our own pages with relative URLs, so CORS never applied to their only callers,
and four are behind `ADMIN_SECRET` regardless. They now send no origin header at
all, which refuses a cross-origin read outright. `corsHeaders(req)` in
`api/_lib/http.js` does an allowlist for anything that needs one.

**12. Raw database errors — Medium, fixed.** 29 sites across 14 files returned
the exception or the PostgREST error to the caller. Those strings name tables,
columns and constraints, and a constraint violation can quote back the value
that collided. `safeError()` logs the detail and returns a fixed sentence.
Response shapes are unchanged.

**13. Missing security headers — Medium, fixed.** `vercel.json` now sets HSTS,
`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy` and
`Permissions-Policy` on every route.

**14. Unencoded values in PostgREST URLs — Low, fixed.** `notes.js` interpolated
a client-supplied note id into two queries, one of them an unscoped delete of
`note_tags`. `send-email.js` interpolated a client-supplied `userId` into two
filters. All four now shape-check as a UUID and encode. Every other value that
looked client-supplied resolves to an id taken from a verified token.

`check-api-responses.mjs` fails the build on either of the first two patterns.

## 15. The workbook scorer reads relative answers backwards — Medium

Not in the original list. Found while fixing the smoke test.

`scoreResponsibilityPair` in `api/_workbook-content.js` maps "Primarily mine" to
the same rank whichever partner said it. But that answer is relative to whoever
gave it, so two people who both say it have claimed the same job and disagree:

| answers | correct | that scorer |
|---|---|---|
| both "Primarily mine" | 0.0 | 1.0 |
| opposite answers | 1.0 | 0.0 |

Exactly inverted for the career-set questions. The website has always had this
right in its own copy; `api/_lib/expectations-alignment.js` briefly used the
wrong one and now carries the correct implementation.

`_workbook-content.js` is untouched because it is the workbook's scorer and
changing it changes generated documents.

**Recommended fix.** Point the workbook at
`scoreResponsibilityPairSided` and regenerate a sample workbook to confirm the
Money domain percentage moves in the direction you expect. This is scoring, so
it is your call.

---

## Content-Security-Policy: what it would take to enforce

CSP ships as `Content-Security-Policy-Report-Only`. It is doing nothing today
except reporting. Two things block enforcement, and both are in our own markup:

1. **50 inline `<script>` blocks** across `public/*.html`. Enforcing needs
   `script-src 'unsafe-inline'`, which permits the injection CSP exists to stop.
2. **1,337 inline `style` attributes** across the site and `index.html`. Same
   problem for `style-src`.

To enforce it meaningfully:

- Move the inline scripts in `public/*.html` into files under `/assets`, or give
  each a per-response nonce. Vercel cannot generate a nonce for a static file, so
  moving them to files is the simpler path.
- Inline `style` attributes are lower risk than inline scripts and can keep
  `'unsafe-inline'` for a while. Dropping `script-src 'unsafe-inline'` is where
  nearly all the value is.
- Watch the reports first. A `report-uri` or `report-to` endpoint collecting
  violations for a fortnight will show what actually loads before anything is
  enforced, including whatever Stripe and Sentry do that we have not predicted.

Until then this header is documentation, not a control. It should not be left in
Report-Only indefinitely on the assumption that it is protecting anything.

## SheetJS

**What uses it.** One function, `exportCombinedXlsx` in `api/admin-csv.js`,
behind the admin dashboard's "All data (XLSX, merged headers)" button.

**Reachable unauthenticated?** No. `checkAdminAuth` runs first and fails closed
when `ADMIN_SECRET` is unset.

**Does the advisory apply?** Both advisories, prototype pollution
(GHSA-4r6h-8v6p-xvw6) and ReDoS (GHSA-5pgg-2g8v-p4x9), are in the **parsing**
path. This code only writes: `aoa_to_sheet`, `book_new`, `book_append_sheet`,
`write`, and the `utils` address helpers. `XLSX.read` is never called, and no
untrusted file ever reaches the library. `npm audit` reports high severity with
`fixAvailable: false`, which is accurate for the package and not for this usage.

**What breaks if removed.** The XLSX export button, and nothing else. The
`combined` CSV export builds from the same data and stays. The only loss is
merged header cells, bold headers and the auto-filter.

**Recommendation.** Low urgency. Removing it clears the only unfixable advisory
in the tree; keeping it is defensible because the vulnerable code path is not
reachable. If it stays, pin it and re-check whenever `npm audit` changes, since
a future advisory may land in the write path.

---

## The render smoke test: why it reports 25, not 26

It reported "25 of 26" before and reports "25 of 25" now. **No section stopped
rendering.** The same 25 render in both.

The old list was written out by hand and contained `exp-convo-5`, which has
never existed. `RESPONSIBILITY_CATEGORIES` has had exactly five entries in every
commit back to 25 August — household, financial, career, emotional,
extended_family — so the conversations are `exp-convo-0` through `exp-convo-4`.
The sixth was a phantom, and it reported as SKIP, which reads like missing demo
data rather than a list that had stopped matching the product.

Confirmed by running the original 26-entry list against the current build:
`25 of 26 sections rendered clean … skipped: exp-convo-5`. Identical coverage,
different denominator.

The list now derives from `RESULTS_SECTIONS`, so it cannot drift again. Conflict
is excluded by name, from the same registry, because the demo does not stand up
`/api/conflict-results`.
