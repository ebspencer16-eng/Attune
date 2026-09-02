# App onboarding: get started to dashboard

Specification for the first-run flow, ready to build once the developer account
lands. Written against decisions already made with Ellie.

---

## The purchase constraint, which shapes everything before it

The app **does not sell**. No package selection, no add-on selection, no cart,
no checkout.

Apple permits a link that opens the **default browser** and leaves the app, on
the US storefront, since the 2025 Epic ruling. It rejects in-app webviews and
flows where the app is clearly the storefront with payment offshored. An app
that builds a cart and hands it to an external payment page is the second
thing, even when the link opens externally.

So Get Started is one button that opens `attune-relationships.com/start` in the
browser. No cart state crosses. The person buys on the web exactly as they do
today.

**This is the conservative reading and it should be confirmed with counsel
before launch.** The alternative is in-app purchase at 15% under the Small
Business Program, which would allow the whole flow in-app. That is a business
decision, not a technical one.

---

## 1. Landing screen (not signed in)

Three routes, in this order:

| Action | Behaviour |
|---|---|
| Sign in | Email and password. Standard Supabase auth. |
| Scan QR code | Camera opens; a physical card's QR resolves to a claim token. |
| Get started | Opens `/start` in the **system browser**, not a webview. |

The QR route matters more than it looks: it is the only path where someone
arrives holding a physical product with no account, and it must not dead-end
into "sign in first".

---

## 2. Purchase email and the deep link

The post-purchase email currently sends people to the web setup page. It gains:

- A line telling the buyer to **download the app** to set up their account.
- A **universal link**, not a custom scheme. The same URL works in a browser and
  opens the app when installed, so the email is correct whether or not they have
  the app yet.

Link shape: `https://attune-relationships.com/setup?token=<setup-token>`

The token already exists in the purchase-to-setup chain. The app claims it,
exchanges it for a session, and lands the person directly in profile setup.
Nobody should have to find "set up my account" in a menu.

**Requires** an `apple-app-site-association` file served from the domain root,
and the associated-domains entitlement in the app. Both are trivial and both
must be in place before the first TestFlight build, or the link silently opens
the browser instead.

### Marketing site banner

Built, gated behind `APP_BANNER_ENABLED` in `public/_flags.js`, off until the
app is live. A slim bar on every customer-facing static page, phones only,
dismissal remembered, hidden when already running as an installed app. Flip the
flag and set `APP_STORE_URL` in two places: that file and `src/App.jsx`.

---

## 3. Profile setup

Same steps as the web, in the same order, because the data model is shared:

1. Name and pronouns. **Pronouns are required**, not skippable: every exercise
   and every line of results prose depends on them, and a missing value
   misgenders someone for the life of their results.
2. Partner's name, pronouns, and email.
3. Send the partner invite.
4. Relationship context: status, length, children.

The invite send is the one step that must not fail silently. If the email does
not go, say so and offer to copy the invite link.

---

## 4. Orientation

**Not a card, and not arrows pointing at things.** Ellie's decision: the home
screen's landing content changes each time the app is opened, and orientation is
simply what it shows first.

So the priority engine gains a top-priority entry that fires only while
`orientation_seen` is false. It presents the four tabs in one screen, in plain
language, and is dismissed by starting the first exercise rather than by a
"Got it" button. One pass, never shown again.

Coach marks were considered and rejected: they test badly, people dismiss them
reflexively, and they cover the interface at the moment someone is trying to
read it.

---

## 5. Steady state

After orientation the home screen is the priority engine's output, already
built and tested at 26 cases in `api/_lib/next-action.js`. Its ladder, highest
first:

profile setup, own unfinished exercise, nudge partner, results ready and never
opened, unused paid resource, new In Practice post, revisit anchored to the
widest gap, feedback request, all caught up.

Ellie wants to revisit this ordering later. It is one file and one test suite,
so reordering is cheap.

---

## Build order once the account lands

1. `apple-app-site-association` + entitlement. Blocks the deep link and takes
   days to propagate, so it goes first.
2. Landing screen with the three routes.
3. Universal-link handling and token exchange.
4. Profile setup screens against the existing endpoints.
5. Orientation entry in the priority engine.
6. Home screen against `/api/home`, which already returns everything needed.

Steps 4 to 6 need no new backend. The endpoints, the priority engine, the
notification rules and the typed client all exist and are tested.
