# Attune — Session Handoff

> This file is updated at the end of every build session. Read this first.

---

## Stack
- **Frontend:** React/Vite → `/src/App.jsx` (8900+ lines, single file)
- **Public pages:** `/public/*.html` (static HTML, no framework)
- **API:** Vercel serverless functions → `/api/*.js` (Edge runtime unless noted)
- **DB:** Supabase (Postgres) — project `xixzdigqhmzuxymzezve.supabase.co`
- **Payments:** Stripe
- **Email:** Resend → `FROM_EMAIL=hello@attune-relationships.com`
- **Deploy:** Git push to `ebspencer16-eng/Attune` → Vercel auto-deploys
- **Live:** `attune-relationships.com` + `attune-six.vercel.app`

---

## Session Setup (do this first, every session)
The container is always fresh. Run this before anything else:

```bash
mkdir -p /home/claude/unison && cd /home/claude/unison
GH_TOKEN="[TOKEN]"
git clone "https://${GH_TOKEN}@github.com/ebspencer16-eng/Attune.git" . 2>/dev/null || (git remote set-url origin "https://${GH_TOKEN}@github.com/ebspencer16-eng/Attune.git" && git pull)
npm install --silent 2>/dev/null
```

The GitHub token is provided in the session prompt. Do not embed it in any committed file — GitHub secret scanning will block the push.

## Deployment (end of session)
```bash
cd /home/claude/unison
git add -A && git commit -m "description" && git push
```
Vercel auto-deploys on push. Takes ~30 seconds.

---

## Supabase Tables
| Table | Purpose |
|---|---|
| `profiles` | One row per user — names, pronouns, invite_code, pkg, email_opt_in, checkin_sent_at |
| `partner_sessions` | Partner B's exercise answers, keyed by invite_code |
| `orders` | Stripe orders — pkg, physical/digital, addons, shipping |
| `exercise_sessions` | (legacy, unused by current code) |
| `feedback` | Beta survey submissions |
| `workbooks` | (legacy, unused by current code) |
| `partner_sync` | (legacy, unused — `partner_sessions` is the live table) |

**Key:** Code uses `profiles` (not `user_profiles`). Partner B data writes to `partner_sessions`.

---

## Package Config
| Key | Name | Price | Features |
|---|---|---|---|
| `core` | The Attune Assessment | — | Ex1 + Ex2 only |
| `newlywed` | Starting Out Collection | $154 physical / $109 digital | + Checklist |
| `anniversary` | Anniversary Collection | $174 physical / $129 digital | + Reflection (Ex3) |
| `premium` | Attune Premium | $350 | + Budget tool + LMFT |

**LMFT add-on:** $150, available on any package. Stored as `addonLmft` in localStorage order and `addon_lmft` in Supabase orders.

---

## Key Flows

### Purchase → Account → Exercises → Results
1. `offerings.html` (cart) → `checkout.html` (Stripe)
2. On payment success: saves order to localStorage, redirects to `/app?signup=1&pkg=...&p1=...&p2=...`
3. App auto-opens auth modal (signup mode), pre-fills names from URL
4. Signup creates Supabase auth user + `profiles` row + fires partner invite email
5. Partner A does Ex1 + Ex2 → results unlock with demo partner data until Partner B submits
6. Partner B receives invite email → `/app?invite=CODE&from=NAME&pae=PARTNER_A_EMAIL`
7. Partner B creates account → independence warning → Ex1 + Ex2 → syncs to `partner_sessions`
8. Partner A's app polls `/api/partner-sync` every 15s → real results unlock

### Email triggers
| Event | Type | Where it fires |
|---|---|---|
| Purchase | Order confirmation | `stripe-webhook.js` |
| Purchase | Get-started + partner invite | `checkout.html` → `send-order-email.js` |
| Signup with partner email | Partner invite | `App.jsx` handleSignup |
| Profile save with new partner email | Partner invite | `App.jsx` profile save handler |
| Workbook generated | Workbook ready | `App.jsx` after generate-workbook call |
| Results page opt-in | Beta survey | `App.jsx` stay-in-touch form |
| 6 months post-signup | Check-in | Vercel cron daily 09:00 UTC → `api/cron-checkin.js` |

### Partner session lock
`partner_sessions` is write-once. Second POST to same `invite_code` returns 409. No re-submission possible.

---

## Account Integrity Protections
1. **Email uniqueness:** `pae=` (Partner A email) in invite URL → Partner B signup rejects matching email
2. **Session lock:** `partner_sessions.completed_at` set on first write → 409 on re-submit
3. **Independence warning:** Partner B intro screen warns explicitly against Partner A using the link
4. **Retake removed:** Both ex1 + ex2 retake buttons deleted. Results are final.
5. **Email confirmation:** Enabled in Supabase Auth — accounts require verified email

---

## Vercel Env Vars (all set)
`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
`RESEND_API_KEY`, `FROM_EMAIL`, `SUPPORT_EMAIL`
`KV_REST_API_URL`, `KV_REST_API_TOKEN`
`CRON_SECRET`

---

## Known Limitations / Next Up
- **Couple portrait:** UI exists (initials + color circles). Planned: integrate external silhouette rendering platform (Ellie to provide API). Session: TBD
- **Print workbook POD:** Digital workbook auto-generates. Print orders flag in admin but no POD API (Lulu/Mixam). Out of scope for now.
- **Live site verification:** Deployed at `attune-relationships.com` — not yet verified this session's code is running. Check with Chrome MCP + `document.documentElement.outerHTML.indexOf()` pattern.

---

## Google Drive
Drive is connected to Claude via the Google Drive connector in claude.ai settings. Full read/write access confirmed. Claude in Chrome must be set to "Allow on all sites" for Drive automation to work.

**Drive structure (completed Session 16):**
```
ATTUNE/
├── Internal/        ← Legal, Finances (folder), Passwords (file), Meeting Notes
├── Marketing/       ← empty, ready
└── Product/
    ├── Active/      ← Launch, Exercises, Results, Workbook, Feedback, Emails
    └── Archive/     ← Exercises (4 subfolders), Workbook, Emails, Misc
```

**Sync plan:** Drive is the working home for documents. Repo is the home for code. When docs are generated in a session, upload to the correct Active subfolder. Old versions move to Archive, never deleted. Naming convention: `Document Name (vXX) MM/DD/YYYY`.

**For Drive reorganization in future sessions:** Use Google Apps Script (`script.google.com`). Create a new project, paste a script using DriveApp, run it. Authorization is one-time. This executes 40+ moves in seconds vs. UI clicking.

---

## Code Conventions
- **Table names:** `profiles`, `partner_sessions`, `orders` — never `user_profiles`
- **Package key:** `pkg` column in Supabase (not `pkg_key` in profiles; `pkg_key` in orders is correct)
- **Editing App.jsx:** Use Python `str.replace()` on full file content — not sed (breaks on JSX)
- **Build:** `cd /home/claude/unison && npx vite build`
- **Push:** `git add -A && git commit -m "..." && git push`
- **Admin credentials:** Runtime fetch from `/api/admin-config` (not build-time injection)

---

## Tone / Style (Ellie's voice)
Short declarative sentences. No em dashes. No hedging language. No AI-sounding constructions. Catches off-tone copy immediately.

---

---

## Session 16 Notes — April 7, 2026

**Completed:**
- Google Drive fully reorganized via Apps Script. Product/Active and Product/Archive structure in place. All exercise subfolders renamed and versioned. Old versions in Archive.
- Partner B workbook score wiring fixed. `savePartnerSession` now updates `attune_live_session` with real `calcDimScores(partnerEx1)` and real Partner B expectations answers when Partner B's data arrives via polling. Also clears cached workbook blob so it regenerates with real scores. Previously, workbooks generated before Partner B finished used demo data permanently.
- `.gitignore` added — `dist/`, `node_modules/`, `.bak` files now excluded from repo.
- Google Drive connector confirmed working. Claude in Chrome domain access must be set to "Allow on all sites."
- Apps Script is the correct tool for bulk Drive operations. Much faster than UI automation.

**Still open:**
- Live site verification (not done this session)
- Couple portrait API integration (Ellie to provide platform)
- Print workbook POD

*Last updated: Session 16 — April 2026*

---

## Session 17 Notes — September 6, 2026

The Notes tab, the three copied lists CLAUDE.md named, and two anchor bugs.

**Done:**
- **Notes tab is built** (`attune-app/src/app/notes.tsx`), replacing the
  placeholder. One list, newest first: your notes, your annotations, and what
  your partner shared. Shared notes are read-only, annotations show the wording
  they were written against, and a compose sheet writes new ones with sharing
  as its own switch.
- **Anchor labels derive** (`attune-app/src/constants/anchors.ts`). An
  annotation stores `results_dimension` + `conflict` and nothing else, so
  something has to turn that into "Conflict Style". It reads the standard tags
  the server already seeds, whose `standard_key` is the same shape as the
  anchor, rather than keeping a copy of the dimension list.
- **The three lists are gone.** `EXERCISES`, `CATALOGUE` and `CATEGORIES` are
  deleted from the app. `/api/home` returns exercises with labels and order
  plus a new `catalogue`; `/api/posts` returns `categories`. New sources:
  `api/_catalogue.js`, `api/_lib/post-categories.js`. `api/home.js` was doing
  the same thing server-side and now derives too.
- **Two gates**, both verified by planting the bug they catch:
  `check-exercise-registry.mjs` extended to the app, and a new
  `check-app-derives.mjs`. Wired into `npm run check` and `npm run build`.
- **Conflict Patterns can be annotated.** The validator refused every
  `conflict-*` section, so those notes were dropped. The section list is now
  `api/_lib/results-sections.js`.
- **In Practice highlights can name their post.** `post_block` anchors are
  `post-slug#block-id` now. The old bare-block form is still read.

**Deliberately not built: Notes filtering.**

Filtering by tag, by source, by author, and highlight against commentary is
deferred until the Results experience exists. Every one of those filters cuts
on something Results and In Practice have not defined yet, so building the
controls first means guessing at the anchors and reworking them once the real
screens land. The one list is the whole screen until then.

**Next step: the Results experience.** It is the largest remaining piece, and
Notes anchors into it. `app/SCREENS.md` has it screen by screen.

**Open, and worth knowing:**
- The results section list is still restated in three places:
  `api/_lib/results-sections.js` (canonical), `src/App.jsx`
  (`availableSections()`), and `attune-app/src/constants/anchors.ts`. App.jsx
  can import the canonical one; attune-app cannot, since it is a separate
  package. Fold these together while building Results.
- Exercise completion changed. It now uses `isExerciseDone`, so a record-shaped
  exercise counts as done only when `completedAt` is set. Intimacy and Conflict
  Patterns may read as unfinished where they previously read as finished. The
  old check marked them done the moment someone opened them.
- `node_modules/` is partly tracked in git (`.package-lock.json`,
  `esbuild/bin/esbuild`) despite being gitignored. A local reinstall shows them
  as modified. Worth `git rm --cached`ing.
- The local `node_modules` was corrupted this session (`@supabase/*` and
  `@rollup/rollup-darwin-arm64` incomplete), which broke `npx vite build`. A
  clean `npm ci` fixed it. Not a code problem, but it will look like one.

### Continued: Insights, results gating, and the couple type blocker

**Done since the above:**
- **Insights switches to results when results exist.** It was reading
  `home.resultsReady`, which /api/home has never sent: it lives on the internal
  state object passed to the next-action engine, never on the response. Always
  undefined, so a couple with everything finished saw a progress list forever.
  `partnerName` was the same shape of bug, which is why the app said "your
  partner" to people whose partner has a name. Both are returned now, along
  with `firstName`, and the phantom declarations are gone from the client type.
- **The status table matches the website dashboard.** Row per exercise, column
  per partner, positional numbering, same three status colours. The web's own
  column is clickable and reads Start or Resume; this one is not, because the
  exercises live on the website and a button that cannot do what it names is
  worse than a plain status. Whether these rows should hand off to the browser
  is a product question.
- **Ranked gaps carry real labels**, applied when results are read rather than
  when they are computed. Results are frozen, so decorating at compute time
  reaches only couples who finish from now on and leaves everyone else reading
  raw keys. Scores are frozen; names for things should not be.
- **Sessions survive.** `refreshSession` existed and was called from nowhere, so
  every session died after about an hour and the only way back was typing a
  password. The client now refreshes once on a 401 and replays the request.

**The next real piece: move couple type content server-side.**

/api/results returns the code, `WX`. The name a customer should read, "The
jumpstart", with its tagline, description, nuance and famous duos, lives in
`src/App.jsx` as web-bundle content. The app cannot ask for it.

So the couple type card is deliberately not rendered. The two ways to make it
work are moving that content behind /api/results, or copying it into the app.
The second is the failure this project keeps having, and here it would be copy
about someone's relationship going stale rather than a label.

Every remaining results screen needs the same thing, so this move comes before
Highlights, Couple Type, the Communication domains, Expectations, Reflection,
Intimacy, the four Conflict Patterns screens, and What Comes Next.

**Verifying a server change in the simulator:** deep-linking to a tab that is
already mounted does not remount it, so no refetch happens and the old payload
stays on screen. This read as "the deploy has not landed" twice. Terminate and
relaunch (`xcrun simctl terminate booted host.exp.Exponent`) to actually see a
server-side change.

### Continued: the exercises and results experiences

Built while Ellie was away. Everything below is pushed and green on
`npm run check`, `npx vite build` and `tsc`.

**The blocker cleared first.** Results content lived in `src/App.jsx`, the
website bundle, so the app could only ever show the code `WX` and no name for
it. The ten couple types are now `api/_couple-types.js`, imported by the site
and attached by `/api/results` as a `content` block: couple type name, tagline,
description and nuance, plus per-dimension label, both pole names, accent, and
where each partner landed. Attached on read, never frozen with the scores, so
fixing a typo reaches couples who finished before the fix.

**Results experience** (`attune-app/src/components/results.tsx`). Section list,
a glance screen on a coloured ground, detail on the warm one. The dimension row
is one shared track with two marks rather than two bars: the subject is the
distance between two people, and two bars make that something you work out by
comparing lengths. Each person keeps one colour throughout, with a legend.

**Communication** (`exercise.tsx`) and **Expectations** (`expectations.tsx`)
are answerable in the app, served by the new `/api/questions`. The app holds no
question text at all. `twoPartEx1()`, `EX1_SCALE`, `CHILDHOOD_STRUCTURES` and
`substName` all moved into `api/_questions.js`, and the website now imports
them, so both surfaces ask one list in one order with one set of answer keys.

**Verify this before trusting it.** Both exercises were verified rendering
against fixtures generated from the real question modules, so the shapes are
the server's rather than invented. Neither has been run end to end writing real
answers, because that needs a signed-in session and no password was available.
The written shape matches the website's field for field, which is a different
thing from having watched it round-trip. Answer one of each on the reviewer
account and check the results that come out.

**Conflict Patterns is done, results and exercise.** `/api/conflict-results`
serves the four screens. The privacy rule is enforced three times: the server
builds the partner's half from an allowlist and never by deletion, the app's
type for that half has no pattern fields at all, and
`scripts/check-conflict-privacy.mjs` fails the build if anything pattern-shaped
survives. That gate was verified by planting the leak and watching it fail.

The exercise is answerable in the app too, twelve questions across six kinds,
each rendered from the kind it declares.

**A save bug worth knowing about, since it is the shape of thing that recurs.**
`saveExercise` sent every exercise the flat way. Record-shaped exercises
(conflict, intimacy) need the whole `{ answers, completedAt }` record as
`answers`, because it lands in one column. Sent flat it would have written
`conflict_data` with no `completedAt`, saved fine, and never counted as
finished. Partial saves were also missing `progress: true`, so every autosave
set the completed flag. Both fixed; the shape now comes from `/api/questions`.

**Not built yet:**
- Highlights and What Comes Next. Both need content that does not exist
  server-side, and writing it in the app would put results prose in a second
  place.
- Relationship Reflection and Physical Intimacy as answerable exercises, and
  their results sections. `/api/questions` returns a clear 501 for these, so the
  app says so rather than looking broken.
- Notes filtering, still deliberately deferred. Now that Results exists the
  anchors it would filter on are real, so this is unblocked whenever you want
  it.

**Exercises answerable in the app:** Communication, Expectations, Conflict
Patterns. The list is `ANSWERABLE_IN_APP` in `attune-app/src/app/insights.tsx`,
and `/api/questions` refuses anything not served, so the two cannot disagree
for long.

### Audit, same session

A deliberate bug hunt across the backend, the results logic and data saving.
Nine real bugs. Most were silent: plausible wrong answers rather than errors.

**Results described the wrong person for half of all couples.** Stored results
are keyed by the two user ids in sorted order, so `partners.a` is whichever id
sorts lower, not the reader. The app assumed `a` was you, which swapped names
and both marks on every scale for one partner in every couple.

**The scales drew the typing score, not the self-report.** `blended` mixes a
person's answers with their partner's view of them and exists to derive the
couple type. The mark under someone's own name was moving because of what their
partner said about them.

**An infinite fetch loop**, measured at 3,522 requests in twenty seconds, from
an effect that depended on the state it set. Worth reading the commit: a fixture
cannot catch this, because require returns the same object and React bails out.

**Concurrent refreshes spent each other's token.** Screens load several things
at once; each 401 started its own refresh; Supabase rotates refresh tokens, so
all but the first failed and reported the person signed out. This is the likely
cause of the sign-outs that kept happening.

**Every Home card did nothing.** The engine returns website routes and the app
pushed them directly. An `as never` cast is what let it compile.

**Conflict Patterns was never prompted.** The priority engine carried a
hardcoded list with four of the five exercises.

Also: progress was saved and never read back, Resources had no failure state at
all, In Practice rows looked tappable and were not, a hardcoded alignment
threshold that agreed with the server's by coincidence, and a retry button that
led to a spinner that never resolved.

**Seven new gates**, each verified by planting the bug it catches:
`check-conflict-privacy`, `check-results-viewer`, `check-refresh-single-flight`,
`check-app-routes`, `check-effect-deps`, plus `check-app-derives` and
`check-exercise-registry` extended.

**Checked and deliberately not changed:** `atob` is not polyfilled by React
Native or Expo, and both `deleteAccount` and `saveExercise` decode the token
with it. Probed in the simulator; it is present and works on Hermes/RN 0.86.
Re-check if the runtime changes, because the failure mode is total and silent.

**Known and not fixed:** answers are never range checked. A value of 99 scores
as 99 and produces a gap of 104. Nothing in either client can send that today
and there is no evidence of it happening, but results are frozen once computed,
so a bad write would be permanent.

### Round three of checks

**Conflict could be finished in a state the server calls unfinished.**
CONFLICT_REQUIRED is every question including the two free-text ones, and the
app treated those as optional. Someone could skip them, press Finish, get
completedAt written, see Done in the status table, and have results that never
opened. /api/questions sends requiredIds now and the app requires exactly those.

**Expectations asked which household you grew up in and never used it.** The
answer set the column labels for a row the app did not have, and childhood was
written as an empty object, so the website rendered its Expectations results
three columns wide instead of five. Both rows are there now.

**Tagging was half-built.** The server has had tags, note_tags and a tagIds
field on create since migration 044 and nothing used them. The app could not
tag anything, /api/notes returned notes with no tags so even a tagged note had
invisible tags, and update could not change tags at all. All three fixed: there
is a tag picker in the editor and tags show on cards.

**Shared notes are checked by `check-shared-notes.mjs`**, which lifts the couple
key function out of api/notes.js rather than copying it. A shared note reaches
the partner, a private one does not, your own shared note stays out of your own
shared-with-me list, unsharing clears the key, and nobody outside the couple can
match. partner-sync writes partner_profile_id on both rows, which matters: a
one-way link would let one partner share and the other never see it.

**Still not built in the app:** Notes filtering (deliberately, and now
unblocked), a post reader, notifications, and tab-bar badges.

### Round four of checks

**A signed-in person with no profile was told the page had moved.** Every
endpoint answers 404 for that state, and the app rendered "That page has moved
or is no longer available" under a button labelled Go back that called retry.
Reachable: it is what the reviewer accounts looked like between being created
and 054 being run. The client reads the 404 body now and the screen says the
account is not set up and opens the website.

**Eleven results sections had no label in the app.** The five expectations
conversations and six intimacy dimensions are generated server-side from the
live lists, and the app's hand-written map had neither. An annotation on any of
them would read as "Exp convo 0". `RESULTS_SECTION_LABELS` is built beside the
ids now and served with the tags; the app's map is a fallback only.

That one is worth reading the commit for. The gate that found it was circular
at first: it checked RESULTS_SECTIONS against isValidAnchor, and both read the
same array, so it could only pass. Planting a bug proved it. Rewritten to
compare the two lists that can actually drift, it failed immediately.

**Verified rather than assumed:** `couple_results_history` exists, so a retake
archives rather than silently losing the previous results, which every
annotation anchored to them depends on. `privacy_preferences` exists, so 053
has been run and the research opt-out is live. save-exercise verifies the token
and refuses a body whose userId does not match it.

**Eleven gates now**, each verified by planting the bug it catches.

*Last updated: Session 17 — September 2026*

---

## Where I stopped: social sign-in (2026-09-08)

**Done and pushed.** Google and Apple sign-in is built on both surfaces, plus
the order-claim hardening underneath it.

**Blocked on you, and nothing works until it is done:** the console setup in
`SOCIAL_SIGNIN_SETUP.md`. Four steps: run migrations 055 and 056, register a
Google OAuth client, register an Apple Services ID and key, and add the
redirect URLs to Supabase. All four are accounts only Ellie can sign in to.

Until then the buttons appear and return an error. If that is not acceptable
to have live, they can be hidden behind a flag in an afternoon.

**What was found on the way.** `profiles.beta_survey_at` has been written by
/api/submit-beta-survey since it was built and no migration ever created it.
The write is caught and logged, so nothing errored; finishing the beta survey
on a phone simply never registered on a laptop. Migration 056 adds it. Found
because the profiles-column gate now checks writes, not only selects.

**Not verified, and cannot be from here.** The provider round trip itself. It
needs the console credentials above. What is verified: both buttons render on
the app's sign-in screen (screenshot taken in the simulator), the site builds,
all 21 gates pass, and the provider-parity gate fails when either list drifts.

**Next.** Once the consoles are set up, the round trip needs walking through
once on each surface: buy, follow the setup email, press Continue with Google,
finish the profile, and check that the order is attached. Then the same with
Apple, choosing Hide My Email, which is the case the whole purchase_email
change exists for.

---

## Where I stopped: app and website at parity (2026-09-08)

**Results.** All 29 sections render in the app, from 6 when this started. The
section list, its order and its labels now come from `/api/results`, built by
`availableSections()` in `api/_lib/results-sections.js`, which the website also
calls. The app decides nothing about what results contain.

**Exercises.** All five are answerable in the app. Relationship Reflection and
Physical Intimacy were the two that were not; both now have a screen and both
are served by `/api/questions`.

**What moved out of `src/App.jsx`** so the app could reach it: the results copy
(now `api/_content/`), the reflection question set (now
`api/_anniversary-questions.js`), and which sections exist. Ownership moved out
of `api/home.js` into `api/_lib/ownership.js`.

**Bugs found on the way, both live:**
- `api/notes.js` seeded the six Physical Intimacy tags for every premium buyer.
  Premium bundles Conflict Patterns, not Intimacy. Found by the ownership gate.
- `profiles.beta_survey_at` was written by `/api/submit-beta-survey` and created
  by no migration, so finishing the survey on a phone never registered on a
  laptop. Migration 056.

**Gates added this session,** each verified by planting the bug it catches:
`check-ownership-rule`, `check-results-coverage`, `check-inapp-screens`,
`check-intimacy-privacy`, `check-oauth-providers`, plus `expectations-test`
(23 cases on the answer mirror) and an extension to `check-profile-columns` so
it checks writes and inline selects, not just `const cols` arrays.

**~~Not verified, and it matters.~~ CORRECTED 2026-09-09.** This said synthetic
taps do not register in the simulator, so nothing had been tapped through end
to end, and every screenshot was of a state forced to render. That was wrong,
and it stood for several sessions. `xcrun simctl` has no input command, which
is all that was ever really established; the Simulator is an ordinary macOS
window and can be driven. `scripts/sim.mjs` does it: tap, swipe, screenshot.
The app can now be exercised for real.
That is the first thing to do by hand.

**Still open:** Highlights and the post reader are stubs, Notes filtering is
still deliberately deferred, and notifications and tab-bar badges are not built.

---

## Design pass, seven groups (2026-09-09)

All pushed. `npm run check`, `npx vite build` and `npm run smoke` (25 of 25)
pass, and the app typechecks clean for the first time.

**Groups 1, 2 and 5, the site.** Eyebrows that repeated the heading below them
are gone. Gradient-filled headline text is solid ink on 404, how-it-works and
the QR card; the frosted-glass control bar on gift-cards is flat; the
gift-card Print button is solid orange. Hover states that faded the whole
button now darken the background, at the value wedding-registry.html already
used, so all fifteen copies of the nav agree on one colour. Nineteen coloured
glow shadows on primary buttons are gone; the lift stays. The three icon cards
on Our Purpose are seven plain ones naming actual situations.

**Group 6, the app.** The Home screen no longer runs its own indigo-to-blue
gradient. Ground is `Palette.warm`, the same cream as everywhere else. Indigo
appears once, on the wordmark; orange once, on the button. The primary card
took the hairline border it needed once the gradient went. Sign-in needed
nothing: Google and Apple were already below the form.

**Group 7, the three-across audit.** The headline number was wrong and worth
recording why. Of 56 `repeat(3, 1fr)`, about 30 are the footer's three link
columns counted two or three times per page, ten are mobile collapse rules,
and **seven grid classes were dead CSS**: defined, given responsive
overrides, never once used in markup. Those seven are why an audit counted
nine icon-heading-sentence triples that do not exist. They are deleted. What
actually renders three-across is mostly real: three steps, three
testimonials, a book list, an article list. The one filler case, "What comes
next" on how-it-works, is now two tiles.

**Group 3, spacing.** Measured, not designed. 2,280 rem values in padding,
margin and gap over 55 distinct numbers; seven clear 100 uses and form an
unbroken scale: `.5 .75 1 1.25 1.5 2 2.5`. `public/tokens.css` writes it down
and 1,607 literals across 38 pages read it. The other 48 values are untouched
on purpose: rounding `.65rem` to `.75rem` would move pixels.

Verified rather than asserted: 38 of 40 pages are **byte-identical** full-page
screenshots before and after. The two that are not, gift-cards and qr-card,
render a random one-time code and differ from themselves between runs, so
they were compared by computed padding, margin and gap on all 666 elements
instead. Identical. `scripts/spacing-dump.mjs` does that comparison and is
worth reusing.

**Group 4, dashes.** The counts we started from were wrong in both directions.
Of 723 em dashes in the repo, all but 30 are comments or the "no value" dash
in a results table. Of the 30, one was live website prose and **28 were in the
emails and the generated workbook** (check-in emails, survey nudges, the
unsubscribe page, seventeen in the workbook PDF). Those reach more customers
than the article callouts ever did. Separately, the spaced **en** dash was
doing the em dash's job in 58 more places; 34 were prose and fixed, 17 are
label separators and were left.

**Copy for Ellie.** The email and workbook rewrites are in `6a14fcf` and
`f1f3519`. Nobody has reviewed that copy yet; it was pushed on the
understanding review happens after, not before.

**New gates,** each verified by planting the bug it catches:
- `check-em-dashes.mjs` — a dash used as punctuation in customer copy. Seven
  exemptions, each stated with its reason. Its own header names the hole it
  does not close (a three-word prose clause) rather than pretending to.
- `check-spacing-tokens.mjs` — a page using `var(--s-*)` without loading
  tokens.css. An undefined custom property does not fall back, so that page
  would lose every gap at once, silently, from a change in a different file.
- `check-testimonials.mjs` — the two copies of the testimonials disagreeing.
  A generator is the better answer and is deliberately not built; the header
  says when to promote it.

**Known, not fixed:**
- The nav, the palette and the footer are copy-pasted into ~20 HTML files.
  The spacing scale is now one file; the colours are still twenty.
- `public/email-preview.html` restates the email copy in `api/cron-*.js`.
  Nothing checks that they agree.
- The `.btn-primary` background is itself an orange-to-orange gradient. Left
  alone; not flagged as a tell.
- Four `<title>`s use commas where eleven now use a middle dot.

---

## Shared chrome, and one thing left for Ellie (2026-09-09)

**Done.** The palette is in `public/tokens.css` (180 duplicated declarations
removed, eleven real disagreements kept as visible overrides and listed there).
`/how-it-works` and `/couple-types` were in the nav on 2 of 16 pages and the
footer on 2 of 13, with nothing else linking either; both are now on every nav
and footer. `check-chrome.mjs` holds one nav and one footer and has no recorded
exceptions, so anything it reports is drift.

Note: the nav labels that page "How it works" and the footer labels it
"Methodology" (`/methodology` rewrites to the same file). Both were the
existing pattern on their own surface and were kept. One page with two names
is worth a decision at some point.

### Open for Ellie: the seven footer style blocks

The `<style>` inside `<footer>` is not the footer's CSS. It also carries the
sub-page hero and the mobile nav, pasted into the footer element on each page,
and it has drifted seven ways. **None of the seven is broken** — that was
checked directly, by asking for each page whether it uses markup that only
that block styles. Every page either carries the rules or styles them itself.
So all seven differences are design or placement choices, and picking one is a
judgement call rather than a fix.

| Variant | Pages | What is different |
|---|---|---|
| v1 | couple-types, faq, how-it-works, offerings, resources, reviews | the baseline: full sub-page hero, `.page-header-inner` at **780px** |
| v2 | legal, privacy-choices | no `.page-header` rules at all; neither page uses that markup |
| v3 | purpose | identical to v1 except `.page-header-inner` is **1120px** |
| v4 | home | no sub-page hero rules; home has a hero of its own, not a `.page-header` |
| v5 | practice | v1 plus mobile-nav rules (`.mobile-menu`, `.mm-section`, `.mm-label`, `.mm-sub`) that no other page's block carries |
| v6 | contact | like v2, no `.page-header` rules; does not use that markup |
| v7 | wedding-registry | only `.site-footer` rules. It does use `.page-header`, but styles it in the page's own `<style>` instead |

The one to look at first is **purpose at 1120px against everyone else's
780px**, because that is the only case where two pages using the same markup
are deliberately laid out to different widths.

---

## Open for Ellie: two app-authored sentences on results pages (2026-09-09)

The rule is that the app carries no copy of its own on a results page: anything
a customer reads there should exist on the website too. A sweep of
`attune-app/src/components/results.tsx` found sixteen literal sentences. Most
are headings the website also uses. Three were dealt with:

- "A couple type describes how two people move together. It is not a score, and
  neither of you is the problem in it." Deleted. Invented, unreviewed.
- "Worth watching" is now "What's worth being aware of", the website's wording.

**Two are left deliberately, for a decision:**

| App text | Where | Site equivalent |
|---|---|---|
| **"Where you differ most"** | Communication glance, above the widest-gap list | none. The site has no heading over that block. |
| **"Back to it"** | What Comes Next, over the return-later group | none. |

Both are app-authored copy on a results page, which is the rule we just
enforced. They were not renamed because there is nothing on the site to copy,
and cutting them would leave two blocks with no heading at all, which may be
worse. So they may be filling a real gap the website has rather than being
inventions.

Three ways out, in order of my preference: add the equivalent heading to the
website so the app is matching something; cut them and let the blocks run on;
or keep them and accept two named exceptions. Ellie wants to see them in
context first.

The remaining app-only strings are waiting and not-yet-built states, which the
website has no equivalent of by definition:
"Not enough answers to place this one.", "This fills in from the last few
questions of the exercise, which you have not both answered yet.", and the
NotYet placeholder.

---

## Open: three broken document generators, and one missing protocol (2026-09-09)

`npm run check:docs` used to report "18 of 27 generators failed" permanently,
because nineteen hardcoded a sandbox output path. That is fixed. It now reports
**3 broken, 4 needing an external converter**. The three are real and were
hidden by the noise:

| Generator | Why |
|---|---|
| `build_specific_content_review.mjs` | `Can't find NEW_COUPLE_TYPES in App.jsx`. App.jsx imports it under that alias now rather than declaring it, so the generator's `evalConst` finds nothing. |
| `build_lmft_context_doc.mjs` | A regex over App.jsx returns null. Something it parses was renamed. |
| `build_reflection_results_review.mjs` | Same shape. |

All three read `src/App.jsx` by regex, which is why they go stale whenever that
file is refactored.

**The fix, when someone picks this up:** have them read the content modules
directly, the way `build_prose_approval_doc.mjs` now does. A generator that
regexes a 15,000-line React file for a `const` is coupled to how that file is
formatted, not to what it means, so it breaks on every refactor and tells you
nothing about whether the content changed. Importing `api/_content/v1.js` or
`api/_couple-types.js` gives the same data, breaks loudly when a name actually
goes away, and is checked by `check-approval-doc.mjs` for reachability.

The four needing an external converter want `libreoffice` for PDF export. They
produce their .docx correctly without it.

**Reassurance has no "this week" protocol.** Nine of ten communication
dimensions have one. A couple whose widest gap in a domain is Reassurance sees
nothing there. It needs a title of about five words and one instruction a
couple can carry out in a week, in the shape of the other nine. Flagged in the
approval document as section 7's missing item, and printed by
`check-protocols.mjs` on every run. Ellie to write.

---

## Open: app pages still structurally different from the site (2026-09-09)

Fixed: the Communication glance and the Physical Intimacy overview both split
a grouped list into one card per item. Both are one panel now, matching the
website.

**Still different, and not attempted:**

| Page | Difference |
|---|---|
| Physical Intimacy overview | The website puts it on a dark ground with the couple's names as a hero above the panel. The app is a cream page with a plain heading. Page-level treatment, not grouping. |
| Communication glance heading | The app calls the widest-gap block "Where you differ most" in one place and the website has no equivalent heading. Now moot on the glance, which uses the website's "Where you each land", but the phrase still appears elsewhere. |

**How to find more of these:** compare the site's section render against the
app's for *grouping*, not just content. The tell is a `.map` in the app whose
items each carry `backgroundColor: c.surface` plus a border, where the site
wraps the same list in one container. There were fifteen such maps in
`results.tsx` when this was written; two were wrong. The rest are lists of
genuinely separate things (conversations, action items, questions) where a
card each is right.

---

## Where I stopped (2026-09-09, later)

**Done.** The couple type page reads the same on both surfaces now, and the
gate can tell if that stops being true. Order is enforced for nine of the ten
sections in `api/_lib/section-blocks.js`; `reflection-overview` is out and the
file says why. Two blocks the website had all along and the app had nothing for
are built: the axis descriptions (`api/_axes.js`) and the individual type panel
(`api/_lib/individual-profile.js`). Both surfaces read those modules, so the
copy cannot fork.

**The thing worth carrying forward.** The spec was first built from what both
surfaces already drew, which is why a page could pass the gate and still read
wrong: an inventory taken from the intersection only certifies that neither
side has changed. Adopt a section by reading the *website's* render top to
bottom and listing what it draws. The failures that follow are the work. Noted
at the top of `section-blocks.js` so it survives.

**Verified live.** The axes and individual type blocks were seen on the
simulator against the deployed API: The Initiator and The Anchor, each with a
blurb and two banded bars, in the website's order.

**A deploy check that could never work.** For half an hour I reported the
deploy as stuck because production served a different bundle hash than the
local build. It cannot match: Vercel inlines the Supabase env vars and a
developer's build has none, so the bundle content differs by construction. The
deploy had been live the whole time. Check something env-independent instead,
such as a static file under public/, or a string only the new code contains.

**Not attempted, found on the way:**

- The map's bottom row reads `OPEN · WITHDRAW · GUARDED`, which puts the
  vertical axis's bottom label in the middle of the horizontal one. Correct
  positions, ambiguous to read. The website flanks its SVG instead, which the
  phone has no room for. Needs a design call, not a fix.
- A per-bar `driver` sentence ("Ellie expresses feelings readily") was computed
  on the website for every individual type bar and never rendered, on either
  surface. It is not ported: it has never been read by anyone and so has never
  been reviewed as copy. If the bars should say why, that is copy for Ellie and
  a new block in the spec.

---

## Where I stopped (2026-09-09, storycards and two lists)

**The storycard lesson, which is the one worth carrying.** An audit that checks
every field is drawn tells you nothing about whether two surfaces look alike. I
reported the storycards as needing no work on exactly that basis and Ellie
found the difference by looking, three times. Field coverage is not matching.

The values that drifted are shared data now (`api/_lib/storycard-style.js`,
read by the website directly and sent to the app on `content.storycardStyle`),
and four structural blocks are marked and gated.

**A real gap the storycard work exposed in check-section-blocks.mjs:** it read
one file per surface. The app's results are split across four components, so
every marker outside `results.tsx` was invisible and it reported four blocks
missing that the app draws. Each surface is a list of files now. **Add to that
list when the app grows a results component**, or the gate goes quietly blind
again.

**In Practice is wired.** It said "Nothing published yet" since it was built,
while six pieces existed, because the app reads the `posts` table and those six
are pages on the website. `api/_in-practice.js` is the index; `/api/posts`
serves it when the table is empty and yields to a real post the moment one
exists. Publishing to the table is still the right long-term answer.

**Open, needs a decision from Ellie:**

- Storycard download. The website has a Download button on every card and its
  copy says "Download any to share or save". The app has none: capturing a view
  as an image needs `react-native-view-shot` plus a share module, and the rule
  here is no new dependencies without asking.
- The Couple Type axis descriptions side by side. Asked for on one list, then
  reverted with the rest of that page's columns. Putting only that one back is
  small.
- In Practice `Recent` is three across at every width, as asked. On a real
  phone that is about 135 points a card. One breakpoint brings it back if it
  reads badly.
- The tab bar is a native translucent material, so over the blue home screen
  its labels are lower contrast than on the cream screens.

---

## Where I stopped (2026-09-09, results parity)

**The rule that was decided twice.** Whether two expectations answers agree was
implemented in `src/App.jsx` and again in `api/_lib/expectations.js`, and they
disagreed on 33 of the 81 possible answer pairs, all of them involving
"Doesn't apply". The app was always the optimistic one. One rule now,
`agrees()`, called by both; `check-alignment-rule.mjs` runs every pair through
two readings and fails if they part again.

**The gate that was missing, and it is the important one.** A ReferenceError in
`/api/results` reached production and took the app's results screen down.
Nothing in the build had ever *executed* the endpoint: every check reads source
or exercises a module. `check-results-endpoint.mjs` now runs the real handler
with only the network stubbed. If you add a field a screen depends on, add it
to the list there with what breaks when it is missing.

**Every results section is now on the ground the website paints it.** The app
had been cream throughout while the site is dark and tinted per section. The
colours are shared data, not copies: `comm-domains.js`, `intimacy-results.js`,
`category-intros.js`, `side-by-side.js`.

**A pattern worth knowing.** Three separate bugs this round were the same
shape: something inline in `src/App.jsx` that the app could not read, so the
app looked like it had made a different decision when it had simply never been
given the words or the numbers. Before assuming the app chose to differ, check
whether the fact has ever left the website's source.

**Still open**

- Ellie's item 4 asked for side-by-side views in *all* sections. Communication
  has one. Expectations shows aligned and misaligned in full on its category
  pages, which is that section's version. Intimacy already has per-question
  comparison on each dimension page. Reflection has "Side by Side" as its own
  page. Worth confirming with her that those count, rather than adding a
  dropdown to sections that already show the comparison inline.
- The page-by-page visual comparison she asked for is done for grounds and
  structure. It has not been done for type scale and spacing.
- Storycard download works but has never been exercised on a real device with
  a real share sheet.

---

## The scan for site-only facts (2026-09-10)

Twenty top-level data tables in `src/App.jsx` and every prose string in that
file, checked against everything under `api/`. Three real gaps, all fixed, and
four pieces of dead copy that are Ellie's call.

**How to repeat it.** For each data table in `src/App.jsx`, ask two questions:
is it rendered on a page the app also has, and can the app read it. If the
answer is yes and no, that is a gap. The prose scan is a regex for capitalised
double-quoted strings over 45 characters ending in sentence punctuation, minus
anything containing a code token, checked against the concatenated contents of
`api/`. Most hits are legitimately site-only: marketing pages, the checklist,
the budget tool, demo fixtures, auth errors.

**Dead on the website, and nobody has ever seen it.** The Communication summary
page and the `DIM_HEADLINES` table feeding it, reachable from no nav step;
`EXP_COUPLE_CONTEXT`, ten paragraphs computed into a variable nothing renders;
`INDIVIDUAL_TYPES.wired`, `.desc` and `.typeDesc`; `stressLine` on the
highlights reel. All written and reviewed. Should show or should go, and that
is a copy decision.

## The endpoint gate earns its keep

`check-results-endpoint.mjs` reads the app's own source for every
`results.content.X` it consumes and requires each to exist in the real payload.
It found `storycardStyle` on its first run: the app read it from `content`, the
handler assembles it at the top level, so the storycards had been on their
fallback since the day the field was added. **If you add a field a screen needs,
put it where the app reads it and let this check confirm it.**

---

## 2026-09-10 — Ellie's app notes, worked through

Everything in Ellie's last list is done except the text-selection notes spec,
which she deferred herself. Site and app both build; `npm run check` is green,
`npm run smoke` reports 25 of 25, `expo export` bundles.

**Four "Important" items**

1. *Partner's conflict reads Pending.* `/api/partner-sync` deletes
   `conflict_data` before responding and sends `conflictCompletedAt` and
   `conflictPartnerView` instead. Both of `src/App.jsx`'s pollers read the
   deleted name, including the one written specifically to stop this. Fixed;
   `check-stripped-fields.mjs` follows the value from fetch to `.json()` so it
   cannot recur.
2. *Results open before every exercise is done.* The rule existed three times
   and the three disagreed. `api/_lib/results-gate.js` is the only one now, and
   it requires both partners through every **owned** exercise.
   `check-results-gate.mjs` holds it statically and behaviourally.
3. *Resources flashed then asked for sign-in.* Two real defects on that path,
   both fixed: a failed keychain read was cached for the life of the process,
   and an empty access token was reported as signed-out without trying the
   refresh token. **Which one Ellie hit is not established.** The sign-in
   screen prints the reason it appeared, so a recurrence will name itself.
4. *Text selection notes and Notes tab.* Not started. Ellie's spec is in the
   conversation of 2026-09-05; she said to do it after the app fixes.

**Still Ellie's, not mine to write**

- Two strings on the site still say results need "both exercises":
  `src/App.jsx:6683` ("Complete both exercises to see your couple type.") and
  `src/App.jsx:14052` ("When {partner} finishes both exercises, you'll unlock
  your couple type"). Both were true under the old rule. They now understate it
  for any couple who owns an add-on. Three other strings already say "all
  exercises" and are now correct. The shape needed is one clause naming the
  real condition, and it has to work for a core couple who genuinely own two.
- The greeting rotates through three phrases: the time of day, "Welcome back"
  and "Nice to see you again". Ellie asked for "a few other generic phrases".
  They go in `ANYTIME` in `api/_lib/next-action.js`, one array, both surfaces.
- The research findings list is still the original three, rotating daily.

**Known limit, not a bug**

Pole labels in the side-by-side still wrap. They are whole sentences and the
row is three columns on a phone; the website has the same problem at the same
width. Reclaiming the margins bought a line or two. Short pole labels are the
real fix and those are copy.

## 2026-09-10, later — Ellie's second list

**Correctness, the important one.** The storycards were computed from BLENDED
scores, which mix each person's answers with their partner's view of them.
Blending narrows every gap, so the app's "communication styles are N% aligned"
was always the higher of the two figures and reached 100 for Ellie. The website
has always used SELF gaps and says so in a comment. Same sort also picks the
five slider dimensions, both call-outs and the closing conversation, so all
four could differ between products. `api/_lib/comm-alignment.js` is the one
rule now; `check-card-gaps.mjs` pins the behaviour.

**Done from the list.** Both site strings say "all exercises". Placeholder
greetings added. Home: greeting lower, finding higher, glow is now a real
radial falloff (a wide white shadow, not concentric circles). Reflection nav
no longer promises pages the payload cannot fill. Storycard 5's figure is no
longer clipped. Marks stagger 7 instead of 11. Side-by-side bars are back to
their old width (the row pulls into the tile's padding). Intimacy responses
are behind a dropdown on both. Conflict follows the results nav, has its page
headers and shared/private badges, and shows the c0 shared measure. Reflection
Side by Side is grouped under its four headings.

**Not changed, needs Ellie.**

- Pole labels stay as full question text, per Ellie. They wrap; that is the
  cost and it is accepted.
- Two answers are collected and displayed nowhere. `c8` in Conflict ("The
  thing you do that most often helps you reset mid-conflict") and `a_memory`
  in Reflection (the opening memory question, whose category "Getting Started"
  has never been in the Side by Side heading list). Both were being half-shown
  on the app under app-invented headings; both now match the website, which
  shows neither. Decide whether they should appear.
- `repairTitle` in the conflict prose is used by neither surface.
- Greeting placeholders in `ANYTIME` (`api/_lib/next-action.js`) need review.

**Conflict on the web: FOUND AND FIXED.** Superseded by the section below;
what follows was written before the cause was known.

**Conflict exercise on the web: not reproduced.** Driven in a real browser
against the demo it opens, begins and answers through ten of twelve questions
with no page error and no console error; the probe stops at the ranking
question, not the app. Two real defects on that path were fixed anyway (the
gated-view redirect never knew about conflict, so an unowned conflict view
rendered blank instead of returning to the dashboard; and the website computed
hasConflict/hasWorkbook as `pkgKey === 'premium'` rather than from PKG_CAPS).
Neither changes what Ellie can reach, because PKG_CAPS.premium.hasConflict is
true. **What is needed to go further: what "not working" looked like.** No
tile on the dashboard is an ownership problem; a tile that opens a blank page
or errors is a different one, and the two have opposite fixes.


## 2026-09-10, third pass — the conflict cause, and two hidden answers

**Conflict results have never opened on the website.** Ellie: "Conflict is
present but when I click says 'not open yet'." It said that for every couple,
on every conflict page, since the section shipped.

Conflict is the one section that cannot be paired on the client: half of it is
private, so `/api/partner-sync` withholds the partner's raw record by design.
`src/App.jsx` read `partnerSession.conflict.answers`, which has never been
sent, then called `summarizeConflict()` on it, which needs exactly those raw
answers. Always null, so `conflictBothDone` was always false. Nothing errored.
That is also the whole of "conflict works on the app and not the web": the app
has always read `/api/conflict-results`. The website reads it now too.

**The app has been showing the wrong snapshot answers.** A forced-A/B question
stores the letter; the app's `chipText` compared it to `0`, so every "A"
printed the "B" text. All three rows on Your Conflict Snapshot told each
partner the opposite of what they said. It survived because the type declared
`number`. Fixed, and `conflict-test.mjs` now pins the whole chain.

**Both hidden answers are displayed**, per Ellie: `c8` in the Snapshot Repair
block, `a_memory` first on Side by Side. Both use the question's own text as
the label, so no new customer copy was written.

**Still Ellie's:** the greeting placeholders in `ANYTIME`, and `repairTitle` in
the conflict prose, which neither surface uses.


## 2026-09-10, fourth pass — why the home screen had not moved

**The home changes were real in source and did nothing on screen, and that was
my fault, not a stale bundle.** The blue block was `justifyContent:
'space-between'` over two children, which pins the greeting to the top and the
finding to the bottom, as far apart as the block is tall. A `marginTop` on a
top-pinned child and a `paddingTop` on a bottom-pinned one both push against
the thing holding them. The profile control has its own line now and the
greeting and finding are one centred group: greeting down about 66pt, finding
up about 150pt on a 852pt phone.

**The glow is 26 rings at 0.9% each, not 2 or 3 at 5-30%.** A translucent
circle has a hard edge wherever its fill starts and a shadow sits outside that
edge rather than hiding it. Ellie called it twice and was right twice. What
removes banding is step size.

**Intimacy dimension pages** drew one bar of the distance between two people
where the website plots both on a track between the poles. `positions` was
already on the payload, added when the overview had the identical bug. Poles
and the "Talk about it" label are on the payload now too.

**Reflection page headers.** All three pages open with a heading and a line
saying what the page is; the app showed neither, and on the ratings page had
invented its own heading because the real one was in `src/App.jsx`.

### Still genuinely not built, and all of it deliberate

These are on CLAUDE.md's own list, not things that slipped:

- **Text selection: highlight, underline, tag, note, share.** Ellie's spec is
  in the 2026-09-05 conversation. She deferred it herself and it is the
  largest outstanding piece.
- **Notes tab reorganisation**, same message, same deferral.
- **The post reader.** Tapping an In Practice row opens the website. Deliberate
  and commented in `resources.tsx`.
- **Notifications.** `fetchNotifications` exists in `client.ts`; no screen.
- **Tab-bar badges.** `/api/home` computes `badges` and `client.ts` declares
  them; nothing renders them. The data is there whenever this is wanted.
- **Notes filtering**, deliberately not built and commented.

### Still Ellie's

- Greeting placeholders in `ANYTIME` (`api/_lib/next-action.js`).
- `repairTitle` in the conflict prose, used by neither surface.
- The research findings list is still the original three.


## 2026-09-10, fifth pass — text selection, and a migration waiting on Ellie

### RUN THIS FIRST

`supabase/migrations/057_annotation_kinds.sql` adds `kind`, `color` and
`opened_at` to `notes`. **Highlights and underlines do not work until it is
run.** Plain notes and sharing do work: the insert is attempted whole and
retried without the new fields when the schema has not caught up, so an
existing feature does not break while the migration waits. A highlight refuses
rather than saving something that is not a highlight, and says why.

### What was built

**Text selection.** React Native cannot put custom items in the system's text
selection menu; that needs a native module. So the unit of selection is a
SENTENCE: each is its own inline Text with its own long-press, flowing together
as one paragraph. Press and hold any sentence and it is chosen. What it cannot
do is mark half a sentence or a phrase spanning two. If that matters, the
native module is the honest answer and it should be Ellie's call.

The menu has Ellie's five: highlight, underline, tag, note, share. Colour
pickers preview the actual mark. Tag creation did not exist at all, server or
client, and does now.

**Notes tab**, three sections: pick up where you left off, from your partner
with unread marks, and every tag with six sorts. "Recently added to" sorts on
the tag's contents, not on the tag.

**Margin markers** for notes only. Highlights and underlines are already
visible in the text; a note is not, which is the point of it and the problem.

### Still not built

- Marking anything outside the results. In Practice posts have an anchor type
  (`post`, `post_block`) and no UI.
- A general filter bar on the notes themselves. The tag sort is built; filtering
  by source or author still cuts on things In Practice has not defined.
- The web has no marking UI at all. Everything above is app-only, and the
  anchors are shared, so a mark made in the app is readable by the site
  whenever it grows the UI.


## 2026-09-10, sixth pass — the storycards, finally

**The storycards were never in the brand typeface.** The app's type scale named
`ui-serif` and `system-ui`, which on iOS are New York and San Francisco. The
website sets Playfair Display and DM Sans. Every screen in the app has been in
a different face from the same screen on the website since the app existed.

It survived four rounds of storycard fixes because a generic family name is not
a mismatch anything can detect. `ui-serif` is a valid font. It renders. It is
simply not the one. Both families are bundled in `attune-app/assets/fonts` and
loaded before first render; no new dependency, because expo-font was already
installed. `check-fonts.mjs` reads the website's own BFONT and HFONT and holds
the app to them.

**Physical Intimacy was an entitlement bypass, not an app bug.** The website
granted it from a localStorage key, `attune_dev_intimacy`, on any host
including production. The app asks the server. The app was right. The toggle is
scoped to non-production now, so **if Ellie has that key set, Physical Intimacy
will disappear from the website too.**

**The dimension order** on the glance page differed because the website had the
domain order as a literal and the app used DIM_KEYS, the scoring order. Writing
the gate found five more hand-written dimension lists in src/App.jsx, including
two full copies of COMM_DOMAINS. All derive now.

**A refresh that could not run is no longer a sign-out.** Third instance of the
same idea. refreshSession reports three outcomes; only a 400 or 401 from the
token endpoint means signed out.

**Settings now shows what the server sees**: owned, mine, theirs, per exercise,
straight from /api/home. Every "why is this section missing" question is
answerable in five seconds now instead of by me reading code.

### Relationship Reflection: not reproduced

Ruled out: question ids match between exercise and results on both surfaces;
both store a scale answer as a number, which the summary requires; the nav
condition and the payload condition are the same expression; a remembered
section that is no longer available already falls back; the empty state is a
sentence, not a blank page. It is account state, and the Settings panel is how
to see it.

### Fragment selection: built without a native module

Word ranges, long-press the first word and tap the last. The native module
would have meant leaving Expo Go for a development build, Xcode, and
`expo run:ios` — a permanent change to how the app is run daily. It still
cannot split a word; if that matters, the module is the honest answer and that
is its cost.


## 2026-09-11 — the missing dots, and the pages nothing had rendered

**Every placement dot in the app was at 10000%.** `Marker` took a prop called
`left` and multiplied it by 100, so it wanted a fraction; all six call sites
passed a percentage. Three screens with invisible dots: reflection ratings,
reflection Side by Side, and the intimacy question rows. Nothing errored,
because 10000% is a valid style value.

That is the third unit bug here, after `chipText` comparing a stored 'A' to the
number 0, and `openings` typed as number when the data is a letter.
`check-position-units.mjs` now requires anything reaching a `%` style to be
named for a percentage or converted inline. It immediately found `SbsDot`,
correct but named `p`, one rename from the same bug.

**The four Conflict pages had never been rendered by anything**, because the
smoke test excluded them by name: the demo cannot stand up
/api/conflict-results. It reported 26 of 26 the whole time, over a set that
deliberately left out the risky part. When the website moved to that endpoint,
all four sat on "Loading. One moment." in demo mode and nobody saw it.

They are covered now, by stubbing the endpoint with a fixture built from the
question registry. **30 of 30.** The fixture is not demo data on purpose: demo
answers show in the showcase tour, two conflict questions are free text, and
that is Ellie's copy. If she wants Conflict in the showcase tour, it needs two
written answers per partner from her.

### Still open

- Whether the Settings "What the server sees" panel explains the Relationship
  Reflection pages. Everything the code can tell me is ruled out.
- Demo answers for Conflict Patterns, if the showcase tour should include it.


### Copy that reaches nobody (found in the 2026-09-11 scan, needs Ellie)

Two pieces of written, approved copy that neither product renders. Both are
decisions rather than bugs, so nothing was changed:

- **`SNAPSHOT_PROSE`** in `api/_conflict-results-prose.js`. Three paragraphs
  explaining what a PAIRING of opening styles means: "Neither style is the
  right one. This pairing means {a} may want to talk sooner than {b} is...",
  plus a both-immediate and a both-delayed variant. It is sent on the conflict
  payload and imported by `src/App.jsx`, and rendered by neither. Your Conflict
  Snapshot shows the three opening chips side by side with nothing saying what
  the combination means, which is what this was written for.

- **`repairTitle`** in the same file, "What helps each of you reset". Both
  surfaces hardcode the word "Repair" above that block instead.

A third candidate, the per-dimension `different` and `unspoken` intimacy prose,
was a false positive in my scan: both are reached through `copy[state]`, a
registry lookup a literal search cannot see. Worth recording because that is
the second time a scan of mine has been blind to exactly the indirection
CLAUDE.md warns about.

### One message, twenty phrasings (2026-09-11 sweep, needs Ellie)

The single most-read sentence in the product is "this opens when you have both
finished," and it is written out by hand at every place it appears. A scan of
`src/App.jsx` and every `.ts`/`.tsx` under `attune-app/src`, with comments
stripped, found **23 distinct phrasings**; two or three of those are false
positives (couple-type prose that happens to contain "open" and "both"), so
call it **about twenty**.

A sample, one line each:

    Results unlock when both of you finish.
    Once both of you complete your exercises, your results will unlock.
    Unlocks once both of you finish.
    Unlocks when both of you finish all exercises.
    Your results open when both of you finish all exercises.
    Results open once you have both finished.
    Results open when both of you finish everything owned.
    This opens when you have both finished Expectations.
    This opens when you have both finished the exercise.
    This opens when you have both finished writing.
    This section opens once you have finished Conflict Patterns.
    Your answers are saved. Results open once you have both finished.
    Your answers are saved. These results open once you have both finished.
    Your answers are saved. This section opens once you have both finished.
    Finish the exercise to open this
    Waiting on your partner

This is the failure this file keeps describing, in copy instead of code: one
rule kept by hand in twenty places, with nothing checking that they agree. A
couple moving between the dashboard, an exercise footer, a locked results
section and Settings is told the same thing four ways in four minutes, which
reads as four different states rather than one.

**Nothing has been changed, because unifying them means choosing the words.**
That is yours. The shape of the decision is what is needed, and it is one
question:

> Does the product say one sentence everywhere, or does each place say its own?

If one sentence: write it, and it goes in a module both products read, the way
`api/_lib/results-sections.js` already works. A gate then fails the build on
any new one typed inline.

If each place says its own: that is a real choice too, and the module holds the
set rather than the single line, keyed by situation. There are six situations,
not twenty: the dashboard before anything is done, an exercise footer after you
finish, a locked results section you own, a locked section your partner owns,
Settings, and the marketing pages before purchase.

Either way the words are yours and the wiring is mine. Say which and it gets
built.

The same shape, smaller, sits under "session ended" (three phrasings) and "that
did not save" (three). Same question, same answer needed.

### The gates were audited by planting into them (2026-09-11)

Every gate in this repo was written after a real bug, against the shape that
bug took. Five of the highest-stakes ones were planted against in one sitting
and all five had the same hole: they caught that shape and missed the shape a
refactor produces. The table is in CLAUDE.md; the short version is that
hoisting an expression out of an object literal, destructuring a body, or
looping over a list instead of naming five columns all walked past gates
written to stop exactly those things.

The worst of them, and the reason this was worth a day:

**A partner could have been sent the other's conflict patterns, past six
gates.** Twelve lines in api/home.js that read every answer column through
EXERCISE_COLUMNS and put the result in the response. No column named anywhere,
so every privacy check saw nothing. The Conflict Patterns screen promises the
customer that section stays private from their partner, always. Nothing was
shipped like that; the gate simply would not have stopped it.

Nothing found here was live. These are all "the regression could come back and
nothing would say so", not "this is broken now". Five gates are stricter,
CLAUDE.md says how to write the next one, and each fix was verified by planting
the bug and watching it fail.

One thing that came out of it and is worth knowing: three endpoints read
`req.headers.authorization` as a property rather than through `Headers.get`.
That is correct, because they declare `runtime: 'nodejs'` and Node lowercases
every incoming header name. If one of them is ever converted to the edge
runtime, the property read stops being safe. The gate now fails that
conversion rather than staying silent through it.

### The app stops handing off to the website (2026-09-12)

Ellie: "I want all of these to open in app if the user is in the app."
"Everything should run in the app. Ideally, a user purchases online then
downloads the app and only uses the app from that point."

Done, and none of it has been seen on a phone:

- **Starting Out checklist.** Its 211 lines of content were inside
  `src/App.jsx`; they are `api/_checklist.js` now and both surfaces read
  them. New endpoint `/api/tool-data`, because the website writes these
  columns straight from the browser with a Supabase session and the app has
  no Supabase client.
- **Shared Budget.** Same move. The arithmetic is the one thing repeated, in
  `attune-app/src/constants/budget.ts`, because the reveal updates as you
  type; `check-budget-mirror.mjs` runs both copies over six budgets and
  fails on any difference.
- **Workbook.** Not a screen. `/app?view=workbook` is the page that sells
  it; the workbook is a generated .docx, so the tile hands over the file.
  `check-app-does-not-sell.mjs` keeps the app out of the selling business.
- **Account setup.** `/api/create-profile` takes its id from a bearer token
  when one is present, so the app never says who it is.
- **In Practice posts.** Read in the app. Static pages still open in the
  browser because they are not rows in the posts table.

**The one real bug this nearly shipped.** A budget stores incomes as
`{ [name]: amount }`, so the name is a key. The website writes the full
profile name; `/api/home` sends the first word. Wiring the screen to what
was already on hand would have split every couple's budget in two, with
nothing thrown and both screens looking correct.

**What is genuinely left:** the order email's app line is written and gated
behind `APP_LIVE`, waiting on an App Store id, and `check-exercise-flow.mjs`
now runs on a real machine but has not been watched through a clean pass.

### Copy the app wrote for the new screens (needs Ellie)

Eleven words of it, in four places, all in states the website has no
equivalent of because a browser tab does not go offline mid-tap. Listed so
they are visible rather than buried in a file header:

    checklist.tsx   "That tick has not saved yet. It will try again on the next one."
                    "Getting your checklist"           (loading)
    budget.tsx      "That has not saved yet. It will try again when you leave the next field."
                    "Getting your budget"              (loading)
                    "What for"                         (placeholder on a savings goal)
    profile-setup   "One moment"                       (loading)
                    "No connection. Your answers are still here; try again in a moment."
                    "That did not save. Try again in a moment."
    post-reader     nothing; every word is the post's

Plus three button labels: "Done", "Continue", "Add a goal", "Remove".

The last two failure lines are copied verbatim from the app's existing
notes screen, so they are already in the product. The rest are new.

---

## 12 September 2026 — a sweep, and what it found

Ellie was away; the standing instruction was to keep sweeping. Everything
below is pushed, `npm run check` is green and `npm run smoke` passes all
three of its passes. Nothing here has been seen on a phone.

**Live bugs found and fixed**

- `/api/admin-posts` and `/api/admin-presets` answered 500 to every request,
  each since the commit that created it. Both declared the wrong Vercel
  runtime for the way they answer. Publishing an In Practice post from the
  admin had never worked. Confirmed fixed against production: both return 401
  now.
- `/app` signed out drew a blank page. So did any unknown `?view=`, and so did
  `?view=practice` and `?view=profile`, which the server hands out on Home
  cards. All confirmed live before and after.
- Twelve In Practice articles linked to `/how-it-works`, retired twice. The
  catch-all in `vercel.json` turns that into a 200 with a blank shell rather
  than a 404.
- Profile setup could spin on "One moment" forever if its copy failed to load.
  It is the first screen after buying, and it now offers a retry.
- The two scheduled emails went out with no unsubscribe link.
- Five copies of the site's address disagreed with each other; two printed QR
  templates encoded the apex, which redirects.

**Found, not fixed, waiting on you**

`DELETION.md` and `LEGAL-VS-CODE.md`, both new. Eight published promises in
`public/legal.html` that the code does not keep. The one that matters most:
when one partner deletes their account, the other loses every result,
including the parts derived from their own answers, which the policy says they
keep. That is a build, not a fix, and it is scoped in `DELETION.md`.

Questions for you are in `TASKS.md` section 1. Two need your words and one is
a choice between adding friction and amending a policy.

**New gates**, each verified by planting the bug it exists for:
`check-unsubscribe`, `check-read-failures`, `check-flags`, `check-app-views`,
`check-internal-links`, `check-site-origin`, `check-runtime-shape`,
`check-static-render`.

**`check-exercise-flow` passes for the first time.** Three things were wrong
and none of them was an exercise: it defaulted to an address the preview
server does not answer on, Communication's expected answer count had been
typed as 54 when the exercise stores 50, and the driver could not tell the
sign-in modal from the exercise. It runs in `npm run smoke` now.

---

## 12 September 2026, later — your six answers, built

All six are pushed and live. `npm run check` is green and `npm run smoke`
passes all three passes. Nothing has been seen on a phone.

**G2a, the password step.** Both surfaces ask; the server checks before it
deletes anything, and only for accounts that have a password, since Google and
Apple sign-ins have none. Wrong password answers 403 rather than 401, so the
app does not try to refresh a token to fix it.

**G2b and G2c, the two messages.** A notification row and an email to the
partner, a confirmation email to the person. The addresses are read in step 0
and the messages sent in step 7, because deleting the auth user takes the only
copy of the address and a confirmation sent before the deletion is a lie if
the deletion fails. **The wording is mine and yours to edit**, all of it in
`api/_lib/deletion-emails.js` and one case in `api/_lib/notifications.js`.

**G3a, the consent event.** Recorded at both moments that count: a purchase
and creating an account. **Migration 058 is written and not run** — until you
run it in the SQL Editor, nothing is stored and the endpoint logs one line
saying which migration is missing. The version recorded is a hash of the
Privacy Policy and Terms text rather than a date, because two of those
documents are published reading "Effective date: TODO before publishing".
That TODO is G6 in TASKS.md and only you can set those dates.

**G3b, the payment paragraph.** Amended to say what is true: Stripe holds the
transaction record, we keep an order row while the account exists, deleting
removes it, and we never store card numbers.

**G3c, the banner.** `/api/region` reads the country; the EU, the UK, the EEA
and Switzerland get Accept and Decline, everyone else the notice as before. A
decline stops Sentry, which is the only thing here that is not strictly
necessary and which records a replay when an error fires. A banner whose
Decline changes nothing would be theatre.

**Analytics.** An Engagement tab sits between Explore and Demographics. Four
of your nine measures are live. Five need collection that does not exist and
say so on the tab, one line each on what it would take; starting any of them
is a decision about customer data, so it is G8 for you rather than something I
began.

**"Data missing from most visuals"** was not a break. Every fallback array in
the admin is zeros, so a chart with no data draws axes and labels and no bars,
which looks the same as real zeros and the same as a failed load. Every tile
now says which of those it is, from one change inside `mkChart`.

Six new gates, each verified by planting the bug it exists for.

**Two migrations are waiting for you**, and they are the two that matter most:

    supabase/migrations/058_consent_events.sql
    supabase/migrations/059_results_survive_deletion.sql

059 is the one that stops a paying customer losing their results when their
partner deletes an account. Until it is run, the couple's frozen row is still
deleted with the account, which is the behaviour it exists to change. Run them
together in the SQL Editor.

---

## 13 September 2026 — your answers, and the open list

Pushed and green: `npm run check`, both builds, and all three smoke passes
(30 results sections, 13 app views, 40 static pages, every driveable
exercise). Nothing has been seen on a phone.

**G5, the 12 articles.** All twelve reach the app now, six of them as
placeholders with no excerpt, which is what you asked for. One thing to look
at on the website: `all.html` files *Why couples fight about the same things*
under `cat: 'conflict'` and labels it "Getting Started". The app shelves it by
the cat, so it lands under When It's Difficult, which is right. The label looks
like a slip.

**G4, and a correction you should read.** Do not remove those 141 strings, and
I was wrong to tell you they reached nobody. `scripts/build_workbook.py` is the
renderer behind the PDF workbook service: `Dockerfile.workbook` packages it,
`api/store-workbook-pdf.js` posts to it. My scan searched api/, src/, the app
and public/, and not the Python's own output, which is a product surface.
Nothing was removed. The real problem is that two workbook generators hold two
copies of the prose; they agree today and `check-workbook-prose.mjs` keeps them
that way.

**G8, the engagement measures.** Four of the five are built and measuring.
Every event is one row with no cookie, no device or session identifier, no
referrer and no user agent, so two measurements from one person cannot be
joined. Consent is enforced in the browser and again on the server. The
privacy policy now describes it, including the ninety days, and a nightly job
deletes past that. **Migration 060 creates the table**; until you run it
nothing is recorded and every tile says so. App downloads still needs App
Store Connect credentials.

**O6, the profile card.** Settings edits names, pronouns and the five
questions in the app now, so that card stays in the app.

**Three things are yours:** the two TODO effective dates (G6), the privacy
paragraph I wrote about measurement (G12), and migration 060 (G11).

**Where the open list stands.** Everything I can do alone is done. What is
left needs you:

- **O1** the App Store id, and `APP_LIVE = true`. Two lines in
  `api/_lib/flags.js`.
- **O5** the catch-all in `vercel.json`. I started to remove it so unmatched
  URLs get `public/404.html` instead of a blank app shell, and stopped: it
  changes routing on the live site while you are away, and every internal link
  is already explicitly routed, so the only URLs affected are ones that show a
  blank page today. Your call, and a one-line change either way.
- **O7** the canonical tags naming the apex. An SEO decision.
- **App downloads** needs App Store Connect credentials.

**Three migrations are waiting**: 058, 059 and 060. You ran 058 and 059
already; 060 is the one that creates the table the engagement measures write
to, and until it is run those four tiles say so rather than showing zero.

---

## 13 September 2026, later

**G13.** The questionnaire is back, at the end of What Comes Next, from your
words out of git. Checked in a browser.

**G10.** It was not a gap, it was a live defect. `api/generate-workbook.js`
printed "[PLACEHOLDER: ...]" into the .docx in seven places: all twenty-five
Conversation Library questions, and the entire body of every same-type moment
card, which is four of the ten couple types. All of that content existed, in
the PDF builder or in DIM_CONTENT. The prose both builders need is one module
now, and the Python reads it as generated JSON because it cannot import
JavaScript.

Two things are left of G10 and both are copy, so both are yours: **G14**, the
dimension pages and mixed-type moment cards exist as two different drafts (the
PDF's personalised, the .docx's generic), and **G15**, the same-type blocks for
XX, YY and ZZ were never written.

**Tooling.** `npm run smoke` was stalling for twenty minutes at a time. It was
not the checks: `scripts/_lib/browser.mjs` leaked a Chrome process every time a
run was interrupted, and three hundred of them saturated the machine. It reaps
on exit now, and smoke runs end to end leaving nothing behind.

**The open list is down to things only you can do**: the App Store id, the
`vercel.json` catch-all, the canonical tags, App Store Connect credentials, and
the two copy decisions above.

---

## 13 September 2026, third batch

**G14, with a correction.** I told you the dimension pages were "two entirely
different drafts". They were not: 26 of 40 fields were already identical and
14 differed. The moment cards were the ones where all 96 fields differed. Your
call took the PDF's wording for every field; the prompt lists were merged, so
forty prompts survive and none was dropped. The .docx moment card gains the
scene line it never had and now names both people.

**G15.** XX, YY and ZZ are written: eighteen moments, ninety lines, built on
what the type letters mean. Both builders pick the block for the couple's own
type, and a missing block now fails the build instead of falling back to W.
The words are mine, as R17.

**The task file.** Section 3 is your list now: 25 review items with stable ids,
in three groups, because design, copy and behaviour need different things from
you. Twenty-two of the old rows went to section 4 instead, each naming the
check that proves it. Section 1 is empty for the first time.

Say "R7 verified" and it moves to section 4. Say what is wrong with it and it
becomes an O item.

---

## 14 September 2026

Your 13 September list, all twenty-nine items, is built. Section 2 of
`TASKS.md` is empty for the first time.

**One thing needs you: migration 064.** It clears the default tags out of
accounts that already have them. It is in section 1 with the rest.

**One question needs you: Q1**, the suggestions line under "add a tag". Your
two are in and shipping. The "etc." is words a customer reads, so it is yours.

**What changed that is worth knowing about.**

*In Practice reads in the app.* All twelve pieces were pages on the website
that the app handed to the browser. Their bodies are generated from those
pages into `api/_in-practice-bodies.js` by
`scripts/build-in-practice-bodies.mjs`, so the copy is edited in one place,
the page, and the app draws what the page says.
`check-in-practice-bodies.mjs` proves every word of every article reaches
the app and that nothing else does, including the Get started panel, which
is deliberately left behind.

*The default tags are gone.* Opening Notes used to write twenty-one tags into
the account. The subtle half: those rows were also the dictionary an
annotation is read through, so deleting them without replacing that would
have quietly relabelled every existing annotation as "Dim conflict". The
names are sent as reference data now, derived from the live lists on every
request, which is better than the frozen rows were.

*Reflection matches the site.* Its at-a-glance heading and the line under it
were built inside `src/App.jsx`, which the app cannot import, so the app
opened the same page with a different heading and no line. Both surfaces read
`reflectionOverview()` now. The two detail pages were dark in the app and
light on the site, and are light.

*The tile.* You asked whether every results page should be the rounded tile.
My answer is in the commit and in TASKS: overviews yes, detail pages no,
because a tile's edges claim that what is inside is the whole of something,
and a three-screen scroll is not. One component, `glance-tile.tsx`.

**Where to pick up.** Section 3 has five new review items, R30 to R35. Nothing
is half-done and nothing is waiting on me.

---

## 14 September 2026, second batch

Your twenty-item list is built. Section 2 is empty again.

**Two things behind three of these, and they are the same thing.**

A rule written in two places, where one place changed. The Life & Values ring
read `expectations.life`, a field the summary stopped sending when Life &
Values became the sixth category, so it read 0% for everyone and
Responsibilities quietly counted the life rows in with its own. That is why
it keeps coming back: the fix was to the number, not to the arrangement that
produced it. It reads each row's own `kind` now, and
`check-expectations-rings.mjs` runs both figures against answers built so the
halves cannot come out alike.

A question asked more narrowly than it should be. `capabilitiesFor` read the
profile's own columns, while `profiles.entitlements` is the record of what
the account actually owns, computed from every order under it. The website
read the record and the app read the columns, which is why Physical Intimacy
was on one and not the other. Two more of the same shape came out of the gate
that fix needed: `/api/conflict-results` selected two columns, and the
six-month check-in email was showing a Relationship Reflection upsell to
people who had bought it.

**Two rules had a third copy each.** The storycard marks were placed by
dividing a score by 5 on the website and by 4 after subtracting 1 in the app,
so the same answer sat in two places on one card. And the six fixed page
gradients were typed on both surfaces; five pairs agreed and Communication
did not, so the app drew that section in Conflict's blue. Both are single
copies now, `api/_lib/track-marks.js` and `api/_lib/section-grounds.js`, and
both have gates that were planted against.

**/email-preview** was not broken in the page or the endpoint. The site sends
`X-Frame-Options: DENY` on every path, so the page could not frame its own
endpoint and the panel stayed empty with nothing thrown. It fills the frame
with srcdoc now. `check-framed-pages.mjs` holds the rule and watches the
header it depends on.

**Where to pick up.** Section 3 has R38 to R45. R45 is the one to check
first: if Physical Intimacy is still missing from the app after this, the
cause is in your account's data rather than in the code, and knowing that
changes what I look at next.

---

## 14 September 2026, third batch

Your notes on the last batch, fourteen items, all built. Section 2 is empty.

**The grounds are now measured rather than judged.** Every at-a-glance page
sets white type on a gradient, and four of the five ended between 3.0 and 4.5
to 1 against white, which is under what body text needs. `readable()` in
`api/_lib/section-grounds.js` takes a colour toward black until it clears the
ratio, and `check-ground-contrast.mjs` measures all 36 stops. The worst of it
was the expectations category pages: their ground was the category colour at
half opacity, which over the app's cream page composited to a pale wash.

**Three sections stopped looking alike** by getting different hues, one of
which came from the product rather than from me: Relationship Reflection's
green is what that section already carries on What Comes Next.

**Two gates were themselves the bug they check.** `check-overlapping-marks`
carried its own copy of the nudge rule, so the app's rule changed and the copy
went on passing against numbers nothing used. It lifts the function out of the
app and runs it now. And `check-card-map-size`, written in this batch, passed
a map at 95 per cent of the card because it budgeted height and never checked
width.

**One field's removal needed a decision, not a deletion.** Conversations Worth
Having is gone, and the line that page carried for a couple aligned on
everything would have gone with it. It moved to the at-a-glance page on both
surfaces: an empty action plan with no explanation is worse than the page it
replaced.

**Where to pick up.** Section 3 has R46 to R52.

---

## 14 September 2026, fourth batch

Thirteen of fourteen built. The fourteenth is a question, Q2, because I
cannot reproduce it.

**The clipped titles were two bugs wearing the same clothes.** The first was
the type: a lineHeight below the font's own line box, fixed last batch. The
second is why they were still clipped: the article reader, the budget and the
checklist are returned from their tab's component in place of the tab's
contents, and the tab's SafeAreaView was left behind with them, so each began
at the physical top of the screen with its heading under the status bar.
`ScreenFrame` is the frame they sit in now, and it carries the back arrow
too, because every one of them is somewhere you arrive from a tab and have to
leave.

**A gesture that works on one tab is worse than one that works nowhere.**
Insights had the repeat-tap reset written into the screen; it is a hook now
and every tab uses it. `check-tab-reset.mjs` reads the tab bar and requires
each tab in it to call the hook. It caught Home, which nobody had asked
about and which would have been the one tab where the gesture did nothing.

**Where a rule ends up depends on what it is about.** The intimacy action
plan became one function because both surfaces were slicing their own list;
the tag placeholder is built from the suggestions list rather than typed, so
the order of that list decides what the field says. Neither is a new idea in
this codebase, and both are cheaper than the gate that would otherwise be
needed.

**Q2 is the open one.** She sees a dot and an eyebrow on the website's How
you each rated and Side by Side. I rendered both in a browser and read what
sits above the heading: nothing. The page-eyebrow gate passes and matches the
shape as well as the words. The sidebar's own row and the narrow window's
pill bar both carry a dot and a section name; one of those is probably it.

---

## 15 September 2026

Six more built. Section 2 is empty; Q2 is the only thing waiting on Ellie.

**"Notes/highlights aren't working" was two answers.** The gesture is a long
press, not a right click, and nothing in the app said so: the only
instruction in the flow appears after a selection has started. And the place
she most likely tried it, an In Practice article, had no marking at all. Its
body was plain text, which made it the longest prose in the product and the
one reading surface you could not mark. It anchors to `post_block` now, an
anchor type the notes migration has accepted since it shipped and nothing had
ever written.

**The conflict bar had a trap in it.** c0 runs from "Really rocky" at 0 to
"We handle it well" at 4, and BAND_COLORS runs the other way, from a pattern
that never happens to one that happens often. Reading the band straight off
the answer paints the couple who handle conflict best in the colour of the
worst pattern. One function does the flip and
`check-conflict-colours.mjs` runs it rather than reading it.

**A fixed count is what makes a tie arbitrary.** The intimacy action plan has
been wrong three times; it is now the two furthest apart plus anything level
with the second, and the gate covers a tie at second, a three-way tie at the
top, and a tie below second that must change nothing.

**Where to pick up.** R61 to R65. R61 is worth doing first in the simulator:
it is the one that says whether marking works for a person rather than for a
test.

---

## 15 September 2026, second batch

Nine built, including the selection rebuild. Section 2 is empty; Q2 is still
the only thing waiting on Ellie.

**Selection is a drag now, and the reason it was not is worth keeping.**
React Native does not report per-word geometry inside a flowing Text, which
is why the first build used two taps. The way out was to stop nesting: each
word is its own View in a wrapping row, so each reports its own frame. The
half-second hold before the pan responder takes the gesture is load-bearing,
not politeness: without it the paragraph eats every scroll that starts on a
word.

**Two gates were wrong in the same way, a week apart.** check-overlapping-marks
counted `<Marker>` elements, so moving four pairs onto the shared Slider read
as a failure. check-plans-agree's first fixture sent only the field the fix
uses, so a planted branch preferring the old field fell through and passed. A
gate that only supplies the shape the current code wants cannot see a branch
on a field it never sends.

**What Comes Next was telling couples something their own section did not.**
Its Communication group came from commsProtocols; the Communication glance
page draws commsActionPlan. Both real, both from the same answers, not the
same list. The page's premise is that nothing on it is new, so the gate now
compares the two rather than trusting the note that says they agree.

**Where to pick up.** R66 to R72. R66 is the one to try first, in the
simulator: click and hold about half a second, keep the button down, drag,
release.

## 24 September 2026, written because the machine may go away

Ellie: "My computer just broke. Can we continue coding work from here for the
time being, or do you need a laptop?"

Everything is committed and pushed, the tree is clean, and the OTA update is
out on commit 0971bc9. Nothing is stranded. This note exists because the next
session may start on a different machine, or not on a Mac at all.

**What needs a Mac, and it is only two things.** The iOS simulator, which is
the only way the app gets checked by eye, and `eas build` / `eas submit`, which
need Ellie's Expo and Apple logins. Everything else runs anywhere: the gates,
the website build, the migrations as files. If you are working without a
simulator, say so in the report every time rather than handing over something
unverified and quiet about it.

**Two migrations are waiting on her**, 073 and 074, and both are run in the
Supabase SQL editor, which is a website. A phone browser is enough, so these
are not blocked by the machine. 074 drops `profiles.notes_data` and deletes
what is in it; the file carries a query at the top that counts the rows with
anything in them.

**C2 is open and was asked about.** She asked whether the turn-down question
had been fixed. It has not. Under the stem "When you turn your partner down,
you", the middle two answers still read as though the stem said "you want them
to": one says you read your own turn-down the way your partner reads it, the
other says you reassure yourself. Two short phrases are needed, each starting
with a verb in the second person. She has not said whether she wants to write
them or wants a draft.

**C3 is drafted and waiting on her eye.** Fifty words in `api/_words.js`, four
hers and forty-six mine. `WORDS-REVIEW.md` is generated from that file and
committed, so she can read it on a phone. Do not edit that document: edit the
words and run `node scripts/build-words-review.mjs`.

**One discrepancy in the approvals, unresolved.** She approved "O455", which
does not exist; the highest id is O453. O445 is the plausible typo and it was
left in section 3 rather than recorded as verified. Do not move it on a guess.

**Thirteen items in section 3 have not been reviewed**, all from the last two
rounds. Two of them say out loud what could not be verified: the save-to-journal
sheet was never seen on screen, because the simulator stopped accepting
ordinary presses four times in a row, and the shorter selection hold cannot be
judged anywhere but a real phone.

**The simulator's press-death is worth planning around.** It is already in
CLAUDE.md. What this week added: it also comes back after a restart if the
Simulator window does not have focus, so `osascript -e 'tell application
"Simulator" to activate'` before a click is part of the procedure, not a
flourish.

## 25 September 2026, before the beta

Everything Ellie sent is built and pushed. Section 2 is empty, section 1 holds
two decisions and one copy gap, and the two couples are reset and granted.

**What the sweeps found, in the order they found it.** Each round had a method,
and the method is the part worth reusing:

1. Every deployed endpoint from outside. Fifty-eight, signed out. No 5xx.
2. Hooks below an early return. Two, one of them on every results paragraph.
3. Native calls that can reject with nothing catching them. Eleven.
4. `.slice(0, 10)` on a timestamp. Two, and the second was cross-surface: the
   website filed a journal entry under the UTC day and the app under the local
   one, so the same couple writing at the same moment landed on different days.
5. What the two surfaces write differently. The beta digest counted a finished
   exercise by a flag only the app sets.
6. The path the beta actually takes, one partner per surface. The app had no
   invite step at all, which is now built.
7. Placeholder markers in shipping code. /legal carries three visible
   "TODO, needs a lawyer" boxes, one tap from a tester. D10.

**Three rounds found nothing**, and that is worth recording so nobody repeats
them from scratch: fixed widths that could overflow a 375 point phone (every
number is a maxWidth or an hscroll child), client results dropped on the floor
(request() never rejects, so fire-and-forget is safe), and console noise in a
shipped bundle (all eleven are server-side).

**A flaky check, now less flaky.** `check-static-render` failed once on
/resources.html at 97 characters, on a machine carrying two simulators and
Metro; the page served 44KB and rendered fully when asked again. Load averages
were in the twenties. It gives a short page one more go with a longer wait now
and prints SLOW rather than FAIL when the retry succeeds. A check that fails
sometimes teaches you to re-run rather than to look, which is most of the way
to a check nobody reads.

**Where to pick up.** D10 and C4 are Ellie's. The next sweep rounds I would run
are the notification round trip across surfaces (raised on one, read on the
other) and the app's behaviour on a genuinely empty account, which is what all
four testers now are.

---

## 6 October: where this session stopped

**Nothing is half-done.** TASKS.md section 2 is empty, the tree is clean and
pushed, the app update is published, 224 gates pass and the full smoke runs end
to end. A new session can start from CLAUDE.md and TASKS.md alone.

**What section 3 is waiting on.** Thirteen rows, the newest being the What Comes
Next convergence, the expectations column alignment, the Learn page gap, read
times and per-section counts, and the cross-surface sweep of names and colours.
Everything there has been built and verified; it needs her eye, not more work.

**What section 1 is waiting on her for.** The same six long-standing ones: O7,
C3, R12, O482, O1, O16. None has moved in weeks and none is blocking anything.

**The one thing I could not verify myself.** The insight share sheet on a real
phone. The code, the typecheck and check-insight-share all pass; a Simulator
with no window cannot be driven, and that reads exactly like a dead button.

**A graphic designer is coming in to look at UX.** The cross-surface sweep was
run for that: section names, section colours, category colours and the two
people's colours are each held to one source now, and the visual sweep over all
29 results sections and all 15 marketing pages at 390 and 1280 came back clean.
The thing a designer is most likely to find next is in the app, which no check
here can drive.

**The next sweeps I would run.** The notification round trip across surfaces, the
app's behaviour on a genuinely empty account, and the five admin pages, which
have no browser coverage at all.

---

## 6 October 2026, evening — where I stopped

**Done and pushed.** Working tree clean, `npm run check` exits 0 across 227
gates, `npx vite build` clean, the app typechecks, and the EAS production
channel is current (`npm run app:published` says the phone is up to date).

**The deploy question, answered first.** Ellie: "I don't think what I'm seeing
on the site is current." It was current. The newest website commit added
`readMinutes` to the article tiles: 14 occurrences in a bundle built from HEAD,
12 in one built from the commit before, and 14 in the bundle the live site
serves. Her own answers confirmed it from the other side, since L2 and L3 are
both changes from that commit. Worth repeating that method before chasing a
"my fix is not there" report: build the previous commit too, so the marker is
known to be distinctive rather than assumed to be.

**N15b, the comms action plan.** The website carried its own builder, named
`glancePlan`, with its own tie-break for which dimension leads a domain. Over
12,000 domain tiles the two rules disagree 11.1% of the time. The website calls
`commsActionPlan` now. One layer down, `api/_lib/comm-domains.js` and
`api/_lib/tags.js` both carried the three domains' ids, labels, colours and
dims; comm-domains derives them now and keeps only the prose.

Two gates. `check-plans-agree` had a hand-typed fixture asserting a `reflect`
field the product deleted months ago, so it was holding the code to something
that no longer exists; it builds its tiles with `commsActionPlan` now, over four
couples including one with tied gaps. `check-one-comms-plan` is new and proves
there is one builder.

**L1, the Learn gap, is the honest half.** I found and fixed one real defect:
`furniture` omitted the insight block's own top margin, 32 on a phone and 40 on
a laptop, so the quote was sized for room it does not have. The app's own
`INSIGHT_FURNITURE` includes that term.

**I could not reproduce her report.** `check-learn-gap` measures the rendered
gap at four window sizes with the longest and shortest insight and a quote that
fills every line it is given: the share row stops 56 above the sheet, before the
fix and after. She has reported this four times and three of my harnesses have
been wrong about the layout, so the next step is a screenshot and which surface,
not a fifth guess. It is in TASKS.md as L1 asking exactly that.

Two harness mistakes are written into that gate's header and are worth knowing:
measuring the children as the span from the first to the last telescopes to the
content box under `space-between` and measures nothing, and an empty stand-in
for a block is free to shrink in a flex column, so it absorbs every overflow the
gate exists to see.

**L2, In Practice.** The website's tiles are the app's now: grey featured tiles
with the title at the foot, white shelf cards tinted by shelf with the ARTICLE
label, a bookmark that fills and actually saves, and "5 min read · Read". The
Saved and Read pills were passed zero, typed, since the sheet shipped; the page
reads `/api/posts?action=feed`, the same call the app makes.

The shelf tints moved to `attune-app/src/lib/card-tints.js`, plain JavaScript
for the reason `insight-fit.js` is, since the website cannot import the app's
`.ts` theme. `check-card-tints` holds that list to `SectionColor` and the
website's three flat colours to the app's.

**Still unfinished, and named rather than hidden.** Reading is marked in the app
only. A piece read on the website will not say Read until the static In Practice
pages post that, and the website's shelf shows the twelve static pieces rather
than the posts-table rows the app also gets, because those have no page here.
Both are in TASKS.md for her to decide.

## 6 October 2026, late — the Learn tab, found

Ellie's screenshot of the live page is what finally found L1, after four
reports and four harnesses that were wrong about the layout. The sheet was
being painted OVER the end of the insight: the block above it had a fixed
`height`, and a ceiling does not shrink content that is too tall for it. The
children spill, the sheet starts at the block's border edge and is painted
after it. Reproduced at minus 29 points in a harness that finally includes the
dashboard's own scroller.

It is a minimum now, and the quotation is fitted to the BUDGET rather than to
the rendered block, which was a feedback loop the moment the height stopped
being fixed. And the fit no longer bails to null when the room is zero or less,
because null meant full size with no line clamp: a 1,996 point quotation in a
713 point window.

**The open question for her is L1b**, and it is a real one. On a laptop the
banner, the tool tiles, the insight's furniture, the gap and the peek come to 58
points more than the window has, with the quotation already at its floor. Four
things want one screen. The gate counts and prints every window where that
happens rather than passing over it, so the number is visible rather than
assumed away. Until she picks what gives, the sheet sits 58 points lower than
the peek wants on a laptop, which is the honest failure of the two.

check-learn-gap now drives the real page: the real AppLearnReading inside the
dashboard's shape, 36 measurements over four window sizes, three quotations and
four scroll positions, with the two budget expressions lifted out of src/App.jsx
and run rather than retyped. Six plants, four caught outright; the two that
passed were right to, and revealed that nothing was holding the peek to the foot
of the window, which it now does.

Everything else this round is small and done: one colour through each In
Practice tile with no edge across the middle, smaller tiles, reading an article
on the website marks it read, the Try lines gone from What Comes Next on both
surfaces, and the dashboard keeps its tab through a refresh.

## 6 October 2026, night — the peek, and the tile put back

**L1b, her call on what gives: "Shorter peek is fine."** The peek is 148 on a
laptop, down from 190, and the page fits: the laptop and the phone both come in
at zero over budget where they were 58 and 17 over. The saving is spread rather
than taken from one place — the sheet's lid, the pills, the heading from 2.4rem
to 1.9, the search box, the four featured tiles from 88 to 54 — plus 16 points
of dead space between the tiles and the quotation, so the heading did not have
to shrink further.

A window under roughly 700 points tall still cannot hold the banner, the tools,
the insight and the peek together. That is declared in the gate rather than
derived, and the reason is worth keeping: when it was derived, a plant that made
the peek bigger simply moved two more windows into the "too short" bucket and
the run still passed. The two ordinary sizes are marked as having to fit, so a
regression above the sheet fails the build instead of being absorbed.

**L2c, undone at her word.** "I like the way the app looks. Also, I want each
tile to have shading behind it, but I don't want shading on each row the way you
have it currently." Both halves of that are one observation: a tile tinted end
to end makes a shelf read as a band of colour, because every tile on one shelf
is the same colour and they sit in a row. The shading was on the row. The tint
is back in the picture area, the body is white, and the shading behind each tile
is the shadow it floats on.

Everything else from the round is approved and in section 4.

## 7 October 2026 — a bug scan, and what it found

Five real bugs, each fixed and gated, each measured rather than reasoned about.
`npm run check` is green across 231 gates, the smoke drives all 29 sections, 37
static pages and 5 exercises clean, and 58 endpoints answer from outside with no
500s.

**The shadow was fading; the box around it was cutting it.** `overflow-x: auto`
computes `overflow-y` to auto as well, so the shelf row clipped its cards'
shadows twenty points short. Nothing was wrong with the shadow, which is why
looking at the card twice found nothing. check-shadow-room asks the browser:
for every scrolling element, every shadowed descendant's reach against that
row's padding, on all four sides.

**Premium was taxed on a workbook it is not charged for.** Found by grepping for
functions defined twice, which is the one command that finds this codebase every
time. `itemBasePrice` and `itemAddonTotal` lived in both create-payment-intent
and calculate-tax, and only one knew premium includes the workbook. Four cart
shapes taxed a customer on $19 to $39 they never pay, with a Stripe line to
match. One pricer now, in `api/_lib/cart-pricing.js`. Verified against the live
endpoint after deploy: all six carts agree.

Three gates reacted to that move and each was right. check-server-undefined
caught a rename, check-package-prices refused because it expected two add-on
tables and found one, check-promo-totals refused because the functions it lifts
had left the file. That is what a gate noticing its own subject moved looks like.

**Couple type telemetry has recorded nothing, for every couple.** track-type
validated against 25 names the product stopped using; every real id came back
400. get-feedback then read those same 25 keys. Confirmed in production.

**Style codes were dropped the same way**, and two of the six axes were in every
code and counted nowhere. The validator wanted four characters from an alphabet
missing half the letters, and skipped rather than refused.

Both now derive from their tables. The shared style-code module was WRONG on its
first attempt, which is the part worth remembering: it differed from the
website's own reading on 7,104 of 20,000 score sets, because four axes ask
whether a score is above neutral and two ask whether it is below, so an exact 3
goes opposite ways. A sweep that avoided 3 would have shown nothing.

**Seventeen pages had a nav nothing had ever checked.** check-chrome's file walk
did not recurse, so `public/practice/` was invisible. Their nav offered
/offerings twice under two labels and the FAQ page twice, one of them as
"Reviews", and had no Wedding Registry. The mobile menu was a third piece of
chrome on two dozen pages that neither check had ever compared. All three are
compared now, across 29 pages.

**Two things are for Ellie, in section 1.** Sixteen of the seventeen In Practice
pages have no footer, so legal, privacy choices and contact cannot be reached
from them; they never had one and the seventeenth got one by accident, so it is
a decision rather than drift. And whatever is counted in the store under the 25
retired couple-type names is a different taxonomy that cannot be read as couple
types.

One process note: I destroyed my own uncommitted fix with `git checkout --`
while restoring a plant, which is the sixth time that command has done it here.
The restore pattern is `cp`, both directions, every time.

## 7 October 2026, later — five more, all one shape

The sweep kept paying, and every one of these is the same bug: one rule, two
implementations, agreeing until they did not. `npm run check` is green across
233 gates.

**The band a couple is told they are in was not the band they were counted in.**
Their average gap was banded at 0.75/1.50/2.25 on the results page and at
1.0/1.8/2.5 before being stored, so the admin counted a couple as more aligned
than they had been told across 19% of the range, always in that direction. The
surviving cut points are multiples of STRENGTH, the threshold that already
decides whether one dimension reads as a strength, so they move together.

**Then four more copies of two more bandings**, found by sweeping for the shape
rather than the instance: every place a number is banded into named strings. How
well one person reads the other, and how well the two read each other, were each
written out in the admin beside the module that already returned them.

**The expectations bars were two different colours** on the two surfaces, under
a comment in the app claiming "a percentage means the same thing wherever it
appears". It had three copies besides that one.

**Twelve CSV columns have always been empty.** The admin exported the three
couple-satisfaction scales by ids that have never existed, written out twice in
one file, the second time under "If any of those change, keep this list in
sync". That is the third comment of that kind found in two days.

**The workbook told couples they were up to 71 points less aligned than their
results did.** It counted exact matches where the results page gives partial
credit for being close. A couple one step apart on everything read 50 to 71 per
cent on the site and 0 per cent in the workbook they keep. It had looked right
for as long as anyone checked a couple who agree exactly, which is the one case
where the two methods cannot differ.

**The method that keeps working.** Three sweeps, each cheap, each finding
something: `grep` for functions defined twice; a scan for numbers banded into
named strings; and a grep for comments that admit a duplication ("mirrors",
"keep in sync", "copy of"). The third is the best value of the three, because
the comment is written at the moment someone knew it was a risk.

**One honest correction.** I believed the workbook's exact-match comparison
treated two people both claiming a task as agreement. It does not:
buildWorkbookPayload normalises both sides to absolute names first. My first
probe reported every domain at zero because it fed the wrong shape, and the
numbers above are from the corrected one. Checking the harness before believing
it is the whole lesson of this screen.

**Two more decisions are in section 1** (B6, B12): the counts already stored
under the retired couple-type names, and the gap-tier counts banded by the old
cut points. Both are historic data that cannot be read as what it claims to be.

## 7 October 2026, evening — the sweep turned on my own work

**Yesterday's Learn page fix was inert, and the duplicate-key sweep found it.**
The block's style object already carried `minHeight: 0`, left from when the
budget was a `height`, and my new line went in above it. A key written twice in
one object literal loses the first silently, so the block had no minimum at all
from the moment it shipped.

check-learn-gap passed the whole time, because its harness built the block's
styles by hand from the budget expression lifted out of src/App.jsx: it applied
a budget the page did not. That is this codebase's oldest lesson pointed at a
gate I wrote. Two things changed. `check-duplicate-keys` asks Babel for every
object expression and fails on a repeated plain key, across 8,382 object
literals; and check-learn-gap now lifts and applies the page's whole style
object, so a stray override changes what it renders. Planted with the exact bug:
it fails by 315 points now.

Its first version walked lines and counted braces and reported two false
findings, both the two branches of a ternary. `cond ? { id } : { id }` is two
objects with one key each.

**A dead twin, removed.** `typeGround` in api/_lib/storycard-style.js has never
been imported on either surface since the commit that added it, and cannot be:
the app has the live copy and an Expo project cannot import from api/. An unused
twin of a live function is where someone edits the canonical-looking copy and
nothing happens.

**And a fallback nothing held to its source.** The app reads the eight storycard
grounds off the payload and keeps literals beneath them, with a note saying the
module wins if they disagree. Nothing enforced that, and the fallback is not
hypothetical: results are frozen, so couples whose rows predate the field hit
those literals on every render. check-storycard-fields compares them by value
now.

**Most of what I checked was fine, which is worth saying.** journalStreak,
computeReveal and annotationColor are all duplicated across the app and the
server and all three are already held by gates that run both copies. The
sweeps that keep paying are: grep for functions defined twice, scan for numbers
banded into named strings, grep for comments admitting a duplication, and now
parse for a key written twice.

## 7 October 2026, night — her round, worked through

Everything she answered is done except the push build, which waits on her
approval of the list.

**The sign-out report.** Nothing was signing anyone out, and that is measured:
a browser round trip from /app to a static In Practice page and back leaves
every `sb-` and `attune_` key in place, nothing under public/ clears auth
storage, and the one sign-out path needs a missing local account AND a
successful profile read with no row, after a retry. What the tile did was leave
the dashboard for a marketing page, which drops the signed-in chrome and offers
"Sign in" in the corner. Articles open inside Learn now, from the same twelve
bodies the app has read in-app since they were generated.

**R195 is the one worth reading.** "Too dark" looked like a one-line change to
the softening the Learn tab already uses. Measured, that pairing takes the foot
of the gradient to 3.34 to 1 against white, under the 4.5 body text needs: a
page she asked to be lighter would have come back harder to read. The two stops
are not alike, 10.89 against 4.79, so only the top moves. The app's own grounds
had never been contrast checked at all, which is why nothing would have caught
it; they are in check-ground-contrast now with one declared exemption.

**B12 and B6**, clearing the legacy counters, is `scripts/clear-legacy-counters.mjs`.
It cannot run from here, because the KV values live in Vercel and should stay
there. It is a dry run by default: it reads every key it would touch, prints
what each holds, and deletes nothing until `--confirm`. It refuses to run at all
if a retired name is also a live couple type.

**B17** is `app/PUSH-NOTIFICATIONS.md`: ten events, five of which already have
copy and are raised in the app today, five that need words from her. Plus the
three things only she can provide: an Apple push key, a migration for the token
and the consent answer, and the decision about when the app asks. The ruleset in
api/_lib/notifications.js is already written and does not need to change.

**Three of her questions were about whether something was fixed.** B2, B4 and
B10 were all fixed rather than merely found. B10 in particular: the twelve empty
CSV columns now resolve and will carry data, rather than being removed.

## 7 October 2026, late — three more sweeps

**Colours written on both surfaces.** 73 hexes appear as literals in both the
app and the website. Most are already held: the storycard grounds by
check-card-tints, the annotation and conflict palettes by their own gates. Two
were not.

The budget's three headline stats took four hex values typed into each surface.
What makes that worth fixing rather than noting is the comment beside the
website's copy, which records that the LABELS for those same three numbers
drifted once already and "the two tools came to disagree about which numbers a
budget has". They are in both budget modules now and check-budget-mirror
compares them the way it compares a number.

The two people's colours on a glance ground were the other. On that dark panel
the partner is a lighter blue than on a storycard, deliberately. check-section-names
was written for exactly this failure on the base pair and was checking the base
pair only.

**Text contrast across the static site**, which nothing measured. 37 pages, 181
runs of text below the readable ratio, 35 distinct colour pairs. It is a report
rather than a gate, named report-contrast.mjs so check-gates-run does not demand
it be wired in: most of what it finds is the brand orange used as small text,
and that is a palette decision for Ellie. app/CONTRAST.md splits it into the
four that miss by two per cent, the three that are a real decision, and the
three that are white dimmed by opacity rather than a colour at all. Seven of the
ten I would take without discussion and have said so in TASKS.md as B19. None
is changed.

**One habit worth repeating.** I restored a file from a backup taken BEFORE the
fix twice today, and both times noticed only because a gate went on failing
after the "restore". A copy is a restore point only if it was made after the
thing you want to keep.

## 8 October 2026 — the overflow sweep, and a gate that was blind twice

**Five pages scrolled sideways on a phone and I caused it.** Putting the shared
nav on the In Practice pages exposed that five of them, the section indexes,
have no rule collapsing the nav to the hamburger. Measured before and after:
zero on the previous commit, eleven points after, on exactly those five.

**The gate for it was blind in a way worth remembering.** `scrollWidth -
clientWidth` is the obvious measurement and it cannot see anything on seventeen
of these pages, because they set `overflow-x: hidden` and `clip` on html and
body. That is a deliberate guard against sideways scroll, and it means content
past the edge is CUT OFF rather than scrolled to: worse, and invisible to the
obvious check. A planted 900 point element on /home passed while sitting 415
points past the edge. It measures both now.

**And it was in the wrong runner.** It reads dist/, which the smoke builds and
`npm run check` does not, so wired into check it passed only because a build was
lying around. On a fresh clone it would have refused. It is in the smoke now,
using the server the smoke already has rather than starting a second one beside
it, which is what produced a spurious "Chrome did not report a debugging port".

Both of those are the same mistake in different clothes: a check that looks like
it is measuring the thing, in a place where it cannot.

## 8 October 2026, later — the accessible-names sweep

Twenty-nine form fields whose only name was a placeholder, which disappears the
moment someone types. Two on checkout, eight on the feedback form, ten in the
sign-up, the rest on the article index and the admin. In every case the words
were already on the screen and not connected to the field, so nothing new is
written: checkout's labels get a `for`, the feedback questions get an id and the
field points at them, and the sign-up's shared `inp` helper already takes the
label as its first argument, so one line names ten fields.

Also three duplicate SVG gradient ids on /home, where `url(#id)` resolves to the
first match, so the second copy of three cards painted with the first copy's
gradient. Identical definitions today, which is the usual shape: nothing looks
wrong until one of them is changed.

**One bad edit, reverted rather than patched.** My first pass at the admin
matched `<select>` anywhere, including inside JavaScript strings that build
markup, and produced labels reading `' + container Id + ' distmode`. Restored
from HEAD and redone over markup lines only.

**Two gates now live in the smoke rather than in check**, check-no-sideways-scroll
and check-control-names, because both read dist/ which only the smoke builds,
and both use the server the smoke already has. Wiring a browser gate into `npm
run check` looked fine locally only because a build was lying around.

## 2026-10-10 — push notifications, three bugs behind them, and a design review

**Where it stopped: everything builds and every gate passes. 239 gates green.
Nothing is half-done. Three things wait on Ellie and they are in TASKS.md
section 1.**

### Push, built end to end

Her six, with her copy, in `api/_lib/notifications.js`. Migration 078 is the
storage: a token per device, a three-valued consent on the profile, and a send
log the rate limit reads. `api/_lib/push.js` hands a message to Expo; the
decision to send is still `shouldNotify`, which was written months ago and did
not change. Three of the six hang off an event (a note shared, a couple
becoming complete, a workbook finishing); the other three are
`api/cron-push.js`, daily at 17:00 UTC, because they are about something not
happening.

The app side is `attune-app/src/api/push.ts`, and every reference to
expo-notifications in it is a dynamic import inside a try. That is deliberate
and it is the thing to be careful with: a native module cannot arrive over the
air, so this release has to be INERT in the build on her phone rather than
broken. **I did not publish an EAS update this round.** The only app changes
are the push work, the sequence is her build first, and the one machine I could
have tested the inert path on runs Expo Go, which has the module in it. So the
test would have proved nothing. `app/PUSH-NOTIFICATIONS.md` has the three
commands she needs, in order.

### The three bugs that fell out of writing the gates

1. **The completion trigger used the wrong half of the capability object.**
   `resultsGate` wants the `caps` flags and was handed the whole thing, so
   every optional exercise dropped out and a couple was called complete on two
   exercises. The partner got "your results are ready" while the app's home
   screen still said they were waiting.
2. **The website's completion never reached the server.** It writes answers
   itself, so nothing that happens at that moment happened: no alert, no
   workbook. One module both paths reach now, plus
   `/api/exercise-completed`. Two browser-side workbook builders removed; one
   sent a payload with no expectations data in it.
3. **`supabaseStore` was defined and never called.** Every footer reaction and
   every experience questionnaire went to a dead KV store. They reach the admin
   now, and the questionnaire has a tile drawn from the questions themselves.

### And one in my own tools

`launch({ width: 320 })` was giving a 500 point viewport, on every browser
check in this repo, because macOS has a minimum window width. The gate I wrote
eight days ago printed "37 pages at 2 phone widths" and both were 500. Fixed in
`scripts/_lib/browser.mjs`; the first honest run at 320 found the packages
page's add-on tiles and three admin charts drawn past the right edge. Both
fixed. The TASKS.md row she had already approved carries the correction.

Also: a headless page's animation clock never advances, so anything that fades
in photographs as blank. `scripts/shot.mjs` turns animations off now.

### The design review

`DESIGN-REVIEW.md`, sixteen findings and a ranked eleven. It is a list to
choose from; none of it is built. Two items need a sentence from her and are
named as such. The captures it is based on are in the session scratchpad, not
the repo.

### What is waiting on her

- **B17b** the Apple key into Expo, migration 078, a new build, and which
  moment the app asks for permission. All four in `app/PUSH-NOTIFICATIONS.md`.
- **B19** the contrast table, fifteen examples, thirteen I would just take.
- **B23** delete KV_REST_API_URL and KV_REST_API_TOKEN from Vercel. The store is
  gone: the host does not resolve, and one variable covers all three
  environments. This is also the answer to B12, which has nothing left to clear.
- **B3** the style code is anonymous telemetry into that dead store and no
  screen draws it. Say remove and it goes.
- **D15** the review.

## 2026-10-10, later — the thirteen contrast fixes, and 32 documents down to 18

**Two instructions, both about how she is spoken to rather than about the
product, and both now in CLAUDE.md.** Every command she is given has to be one
paste including the `cd`, absolute, no "from the project folder". And TASKS.md
has to be the only document she opens: instructions and context go in a section
under the row they belong to, not in a file she has to find.

### B19, taken

Thirteen of the fifteen. 187 runs of unreadable text down to 53, and all 53 are
the brand orange used as small print, which is B19's remaining decision and
hers. The clay moved in `public/tokens.css`, which is where it actually lives;
the pages read it through the variable, and replacing it in twenty files first
was wasted motion that `report-contrast` caught by still showing 4.37.

Two things worth knowing for next time. `#10B981` is the Reflection exercise
colour as well as a label on /resources, so it was changed at the one failing
use rather than globally. `#6C7FFF` is a person colour on the storycards as
well as an admin chart colour, so only admin.html moved. A blanket replace
would have repainted an exercise.

The admin slate landed at exactly 4.4996 and the report rounds, so it read as a
fail at "4.5:1 (needs 4.5)". One notch darker settled it. Aim past the floor,
not at it.

### The documents

Deleted: AUDIT, PHASE_5_AUDIT, PHASE_5b_HANDOFF, LMFT_SETUP, ENV_SETUP,
ENCRYPTION_SETUP, SOCIAL_SIGNIN_SETUP, SUPABASE_EMAIL_TEMPLATES, DELETION,
DESIGN-REVIEW, scripts/PDF_BUILDER_STEPS, app/CONTRAST, app/PUSH-NOTIFICATIONS,
app/APP_STORE_PRIVACY. Merged: APP_STORE_PRIVACY into app/TESTFLIGHT.md,
DELETION into LEGAL-VS-CODE.md, PDF_BUILDER_STEPS into
scripts/SERVICE_INTEGRATION.md. The design review and the push instructions
became sections of TASKS.md.

**Nothing was deleted on a guess.** Two of them were self-labelled retired.
SOCIAL_SIGNIN_SETUP was a list of four steps to turn on Google and Apple
sign-in, and both providers answer a real 302 to a real client id, so the steps
are done. ENV_SETUP was a hand-kept copy of the environment variables, which
`api/_lib/env-inventory.js` now generates. ENCRYPTION_SETUP had one live
obligation in it, which is B29 in TASKS.md with the email to send. AUDIT.md's
only open items were three methodology questions for the LMFT and two
deliberately punted features; they are recorded here:

- 5.2 threshold values (`stdDev < 0.3`, `Math.abs(score - 3) < 0.3`) are
  placeholder defaults and want a methodologist's eye.
- 5.2 has no surface text for a low-confidence result.
- 3.7 `closeness` rests on one question (cl2).
- Punted: a multi-item cart shows only the first item; an Ex01 retake does not
  regenerate the workbook, which is moot until a retake UI exists.

Three comments in gates named deleted files and were repointed, which is the
rule about a comment describing a dead path, applied to my own tidying.

### Where it stopped

Clean, pushed, 239 gates green. Section 1 of TASKS.md holds eleven asks and
sixteen design decisions. Section 2 holds three faults I do not need an answer
on and will take next.

## 2026-10-11 — B3 taken, and the KV layer with it

She deleted the two Vercel variables (B23), confirmed the AES-256 claim with
Supabase (B29), and answered B3 with "Remove". Those three together make every
Vercel KV path in the repo dead by construction, so they all went:

- `api/track-type.js`, `api/_lib/style-codes.js`, their two gates and the
  script written to clear their counters. Five files, plus the effect in
  src/App.jsx that computed two style codes on every results session.
- `api/get-feedback.js`, which was GET-only, admin-authed, read by nothing, and
  reading a store that no longer resolves.
- The KV sidecar in `api/send-feedback.js`. Supabase was already doing the
  work.

**One thing B23 broke, and I had not predicted it.** "Feedback responses" in
the admin's export menu went to `api/admin-csv.js`, which read the beta survey
out of KV and answers `KV not configured` without the variables. The rows are
in Supabase and always were; both readers in that file point there now. Worth
remembering as a shape: deleting a credential does not only stop writes, it
turns a read path into an error page, and the error is in a menu nobody opens
until they want the data.

Eight comments across the server, the website and the app named one of the
deleted endpoints. All repointed, because a comment describing a dead path is
the thing that costs the next session an hour.

**And my own instruction, broken the same day I wrote it down.** TASKS.md told
her to run `npx eas credentials`. The package is `eas-cli`; `npx eas` cannot
resolve a binary and says "could not determine executable to run". The app's
own npm scripts have said `npx eas-cli` all along, which is where the right
answer was. It now reads `npx eas-cli credentials -p ios`, and the two values
the prompt asks for are written out in TASKS.md so she can paste them: the
push key she made is `/Users/Ellie/Downloads/AuthKey_59776926QU.p8` and the
Key ID is in the filename, `59776926QU`. Checked against the file dates: the
other two .p8 files in Downloads are from 8 September and are App Store
Connect keys.

## 2026-10-11, evening — the review answered, and a regression of mine that she found first

**In Practice would not load in her app, and it was my fault from that
morning.** Pulling the published-posts filter into one module, I named it
`published` in the handler scope, and the feed branch below it declares its own
`published` for the rows. Same block, so the closure that builds the query hit
the one declared later: "Cannot access 'published' before initialization", a
500, and an empty library.

The part worth keeping: **check-body-parsing only ever sent POSTs**, so the GET
half of all 55 endpoints had never been run by anything. /api/posts answers its
feed on a GET with no parameters. It sends a bare GET to every endpoint now, a
500 to that is a failure, and planting the shadowed name back makes it fail.

Her decisions on the design review, all sixteen: seven built, seven turned
down, one with the designers, one question back to me.

Built: the experience survey now waits for What Comes Next instead of opening
over the first screen of the results; Notes clears the tab bar; one primary
button (the nav's Get started is orange on all 24 pages, one add-to-cart style
on /offerings); Get started stays in the bar on a phone above 360 points.

**D26 she rewrote into something better than my finding.** The four home tiles
now have four states: "Your exercises" into the status table before you finish,
"Action plans" dimmed with a padlock while your partner is still answering, and
both live once results open. The rule is `attune-app/src/lib/quick-tiles.js`,
plain JavaScript for the usual reason, and check-quick-tiles runs it over every
state. I widened one thing and said so: highlights is locked until results are
READY rather than only until you begin, because there are no highlights until
both have finished.

**D29 I had wrong and she caught it.** I wrote that three of the five exercise
icons were hearts and we should draw three more. The five distinct icons exist
and the app has drawn them for months; the website's exercise list was drawing
its own older set. It uses NAV_ICONS now.

**D27 made two assumptions that are not true yet**, and the copy says what is
true instead: checkout only ever collects one email, and the app is not in the
store. The App Store sentence is written and held behind APP_BANNER_ENABLED.

Her note on the review itself: "not sure why there are times listed, they seem
way longer than what they should take you to execute these." Estimates are out
of TASKS.md and should not come back.

## 2026-10-12 — the open queue cleared, and one finding of mine that was not real

**The clipboard step crossed two windows and she pasted it into the wrong one.**
"ERROR: 42601: syntax error at or near cat". The migration is inline in
TASKS.md now, generated from the file so the two cannot drift, and every block
in that document says which window it goes in. Planted both directions of the
drift.

**D33, two of three.** The checkout's "Or pay with card" rule hides itself when
the wallet button above it mounted with no height, which is what an empty gap
and an orphan "or" looked like in a capture. The homepage's three statistics
are three aligned rows on a phone rather than a pair and a stray.

**The third was not a bug and I should not have reported it as one.** I wrote
that the results sidebar indents Physical Intimacy under Relationship
Reflection, "measured off the capture at 1280 points: its bullet sits 28 points
right". Measured in the page instead, every row is at x=197 with its label at
x=207, including that one. What I read as an indent was the second line of a
label that wraps. A pixel read off a screenshot is not a measurement, and the
review said so about other people's numbers while making this one.

**D34 was bigger than it looked.** The dashboard's Resources page drew its own
list of twelve rows linking out to the static marketing pages, which is exactly
the behaviour S20 fixed on Home. It draws AppLearnReading now, the same
component with the same handlers, so an article opens inside the dashboard.
`view=practice` is an alias for that page, and that is the deep link every card
and every notification about an article uses.

**Her two answers:** push asks after the first exercise (B), recorded in the
constant that acts on it; and the brand orange as small print stays, so B19 is
closed at thirteen of fifteen.

Section 2 is empty. Everything decided is built; what is left is waiting on her.

## 2026-10-13 — the day was turning over at 5pm

**Ellie: "Why am I seeing different insight of the day and different word +
definition on my app on my phone vs on my simulator on the same day?"**

Because it was not the same day to us. Both were picked with
`Math.floor(now.getTime() / 86400000)`, which counts days from the epoch in
UTC and turns over at 00:00Z. That is 5pm in California and 8pm in New York, so
everyone in the United States got a new word and a new insight in the late
afternoon, and two devices opened either side of that hour disagreed.

The arithmetic is timezone-independent, so it made no difference that one call
happens in a browser and the other on the server: both rolled at 5pm.

`api/_lib/day-number.js` now owns what a day is. A Date is read by its LOCAL
parts, which is the reader's own day in a browser; `/api/home` works the
reader's day out from the `tzOffset` their device has been sending since the
greeting needed it, so no app release was required. Both rotations wrap in
either direction, because a day read from a local calendar can be negative at
the very start of the epoch and `-1 % n` is -1.

**Two plants passed and both were the gate's fault**, which is worth recording
because it is the second time this week. The first plant was arithmetically
identical to the code it replaced when called with a number, so it changed
nothing; the gate only ever passed numbers, so the Date path the website uses
was never exercised. The second froze one of the two rotations, and the gate
compared the word and the insight as one joined string, so the other one
covered for it. Both halves are tested separately now and the Date path has
its own case.

**And `git checkout --` took an uncommitted fix again**, the seventh time in
this repo's history. I used it as a restore after a plant on a file I had not
backed up. The fix was ten minutes to redo; the rule stays: copy first.

Other work: D28 (click on the website, tap in the app, both words in the module
the cards come from, and the card itself carries only the app's because
check-storycard-fields refuses a payload field the app never reads); D36, the
In Practice card gets the hairline the card convention calls for, because a
white card on a white sheet loses its lower half to a 10 per cent shadow.

B33 in section 1 is the survey proposal she asked for: eight questions, three
conditional, with what we lose by cutting the other eighteen.

---

## 2026-10-13, the survey

B33 is built and pushed, and an EAS update is published (commit 00b33d11, the
bundle Expo serves is dated 2026-10-13T05:30Z). **Nothing it collects can be
stored until Ellie runs migration 079**, which is inline in TASKS.md section 1
as B38. Until then `/api/survey` answers its questions and refuses to store,
saying "Survey storage is not set up yet (migration 079)", which is what a
curl against the live site returns right now.

**The questions live in `api/_lib/survey.js` and nowhere else.** Three surfaces
draw them: `ResultsSurvey` in `src/App.jsx` at the end of What Comes Next,
`attune-app/src/components/survey.tsx` opened from the app's version of that
page, and `public/feedback.html`, which was the 26-question beta survey and is
now a renderer of whatever the endpoint sends.

**Which questions show is data, not code.** A conditional is `showWhen` on the
question (`{ field, startsWith }` or `{ field, atLeast, atMost }`). The website
imports `shouldShow`; the app and the static page cannot import from `api/`, so
each runs a six-line matcher, and `check-survey` lifts both out of their files,
runs them, and compares with the server's over 20 sets of answers either side
of every line. A new conditional question needs no surface change.

**What I took out, which is the part worth checking behind me.** Three admin
pages read rows migration 079 deletes, and two of them carried their own copy
of the 26 questions: Beta Feedback, Survey Explorer and Testimonials are gone.
The Survey page replaces all three, and the question explorer that was on the
Beta page is on it. The Feedback Overview, the NPS trend, the rating
distribution and Couple type x outcomes read the new answers; the two tiles
that measured retired questions are relabelled to the two they measure now
(the star rating, and how accurate the results felt). `/api/submit-beta-survey`
is deleted and `check-open-writes` points at `/api/survey` instead.

**The survey is never joined to an email.** It says above its first question
that the answers are anonymous, so `loadFeedbackByEmail` is gone from
`api/admin-csv.js` and the combined export no longer carries a column per
question beside the order. The survey exports on its own, with no email, name
or profile id.

**Publishing a quote.** A star on any written answer in the admin writes
`featured_question` and `featured_at`, and `/api/featured-testimonials` reads
nothing else. No name is published and none is stored: that is what replaced
the old consent question, at Ellie's ask, and the fine print under every
written answer is the thing that covers it. R12 now carries a question about
that sentence for the lawyer.

**What is not verified.** The app's survey screen typechecks and is published,
and the simulator has no window, so taps cannot be driven and I have not seen
it render. Everything else is: the rewritten /feedback was driven in a browser
(seven questions, the conditional appearing on the right answer, each answer
posting as it is given, no sideways scroll at 390 points), all 240 gates pass,
and the live endpoints were swept with curl.

**Five sentences in the survey are mine**, listed in TASKS.md as B39 for Ellie
to replace: the intro, the fine print, the button, and the two lines of the
thank-you. The nine questions are hers.

## 2026-10-13, the survey's words and the two admin pages

**B39, her copy, is in.** Every sentence around the questions is Ellie's now.
One decision she should look at and can reverse in a line: her first line reads
as a heading rather than as a line under one, so it IS the heading and the
intro I had written is gone rather than sitting on top of hers. `SURVEY_COPY`
has no `intro` field any more. Two words are still mine and are named in
TASKS.md: the button while it sends, and the line that says an answer is saved.
The 0 to 10 question now carries `ends`, and check-survey fails if any surface
stops drawing both of them.

The gate holds the fine print to its PROMISE rather than to its sentence: it
has to say the answers are anonymous and that they may be used publicly,
because those two together are what replaced the consent question. Matching her
exact words would fail the build every time she rewrites a line that is hers.

**B41, the admin, is two pages.** Feedback is the numbers and Testimonials is
the words. The old Survey page and the old Feedback Overview are both gone into
Feedback; with them went renderOverviewKPIs, three satisfaction charts and
loadRealAnalytics, all of which painted elements that no longer exist.

Feedback: a period slicer over the page, four metrics (average rating, NPS, the
share who say it prompted a conversation, the aspect ranked first most often),
then two tiles to a row built from the question set, each with its own segment
slicer. A written question gets a themes chart plus **View full list**, which
opens category and volume with every answer under it, and says how many answers
nobody has read yet. Testimonials: every written answer, sorted, filtered by
demographic checkboxes and a timeframe, searched across the words AND the
themes, with the star that publishes one to the homepage.

**Two things worth knowing if you pick this up.**

The first splice of the markup put the new pages inside page-types, because the
boundary search matched only two-space indentation and five of the fourteen
page divs start at column 0. The symptom was a page that looked right in a
screenshot and had a broken tree. Restoring from the copy and replaying the
three edits was far cheaper than unpicking it, which is what CLAUDE.md already
says about src/App.jsx and is just as true here. The fixed script asserts the
block it is about to replace holds exactly one `id="page-`.

And a fullPage screenshot of the admin shows tiles from pages that are
`display:none`, measured at zero by zero in the same run. The camera, not the
page: trust `getComputedStyle` over the picture.

**Not verified:** nobody has answered the survey yet, so every number on the
Feedback page was checked against 40 made-up responses driven through a
browser, not against real rows. The tiles, the slicers, the period, the themes
dialog, the search and the star were all exercised that way; what has not been
exercised is a real answer arriving from a real couple.

## 2026-10-13, the admin's formatting, and what the markup was doing

**Fifty-nine start tags in public/admin.html never closed.** They looked like
`<select … aria-label="Slz tout"<option value="">`: an accessibility pass had
inserted the aria-label just before the `>` and taken the bracket with it. The
browser reads everything after that as more attributes until it finds a `>`
somewhere later, so the rest of the page is nested wherever that lands. On Type
Analytics the whole page measured zero by zero with eleven tiles inside it,
which is what Ellie was seeing as "the type analytics tiles are going all the
way to the sides of the window". Sixteen In Practice pages carried a truncated
`<scr` from a footer-insertion script in 5c707bab, which ate their `</body>`
and `</html>`.

`check-tag-closure.mjs` walks every start tag in every page under public/ to
its `>`, respecting quotes, and fails on a `<` found first. Script and style
blocks are blanked, because `'<option value="'+x+'"'` in JavaScript is the same
shape and is not a bug. Planted both ways: a bracket removed is caught, and the
same example written inside an HTML comment is not.

**A CSS cap was quietly winning over every tall tile.** `.chart-body canvas
{max-height:220px}` meant the ranking tile grew to 582 points and its chart
stayed at 220: eleven labels crushed into a third of the space with white
underneath, and no error anywhere. A tile that sets its own height now opts out
through `.chart-body[style*="height"] canvas{max-height:none}`. I found it only
by measuring canvas height against container height in a browser; reading the
file three times did not.

**What else changed.** Page gutters are `clamp()` so they scale with the
window, grid columns are `minmax(0,1fr)` so one long label cannot push a column
past the edge, tiles no longer stretch to their neighbour's height, and the
empty-state note inside a tile is padded instead of sitting flush against the
card's left edge. Long answers draw as rows with wrapped labels; numbers stay
as columns.

**No invented data anywhere.** `generateOrders()` was 173 lines inventing sixty
orders with names, addresses and gift messages on every page load, cleared only
once Supabase answered; four beta codes carried invented usage whenever their
real usage was zero. Both are gone, the banner says what is actually true, and
a probe over all fourteen pages with every endpoint answering empty finds no
non-zero figure anywhere.

**What I did not delete, and why.** "Delete everything between the footer
feedback and the formula diagnostics" covers the question explorer, which is
gone. It also covered the experience questionnaire's two tiles, and deleting
those leaves "How was your experience?" collecting answers nothing can read:
check-feedback-reachable fails the build on exactly that, which is how it was
caught after I had deleted them. They are back, and TASKS.md B45 asks her the
one-word question, with a recommendation to retire the questionnaire itself.

**And the brace walk bit again.** Removing renderExperienceFeedback by walking
brace depth ran past the end of the function and took forty-one kilobytes and
thirty-odd functions with it, silently. Restoring and replaying the whole set
of edits as one script was the fix, and that script now asserts the function
count changes by exactly the number of functions it means to change.

## 2026-10-13, the sweep, and the gender that was never asked

**Nothing in Attune asks anybody their gender.** The signup form has five
demographic questions and gender is not one of them, so `profiles.gender` is
null for everybody. Both the server cube and the admin filled the gap by
reading PRONOUNS and relabelling them: she/her became "woman", he/him became
"man", and they/them became "non-binary". Ellie: "I think some of the data is
wrong, none of our beta testers are non binary." She was right, and the error
was the kind that matters more than a number.

The dimension is Pronouns now, end to end: `api/admin-explore.js`,
`api/admin-typing.js`, `api/admin-data.js`, `api/admin-engagement.js`,
`api/admin-csv.js` (three exports that had been printing an always-empty
column) and every reader in the admin. Two seeded Explore presets still say
`gender` in the database; `applyPreset` translates that one key on read rather
than asking her to run a migration for two buttons.

**The feedback card could never stop asking.** `feedback_given_at` has existed
since migration 050 and nothing has ever written it, so the two home cards
gated on it would have asked for ever. `/api/survey` stamps it when somebody
reaches the end.

**The experience questionnaire is retired**, at her word. Screen, endpoint,
copy module, client functions, admin tiles, and the card target all gone; the
card opens the survey instead. The footer reaction strip's counters went too:
nothing has posted to that strip since it left the site, so they were reporting
on an instrument that did not exist. `cron-feedback-synthesis` read the same
dead table every Monday and now reads the survey's written answers.
`check-feedback-reachable` was 268 lines about the questionnaire; it is
repointed at the rule rather than deleted, and now fails on any retired source
being read by the admin or by `api/`.

**Formatting.** No tile writes "No data yet" any more ("If n=0 that speaks for
itself") and `markEmptyTile` went with the sentence, because the class it set
was read by no stylesheet, check or probe. Axis labels are flat everywhere:
the rule lives in `mkChart`, which is the one place every chart in the admin is
built, so a new tile cannot opt out. Verified by asking all 23 charts their
`labelRotation` after they drew, rather than by reading the source.

**Still unverified:** the Engagement page's Learning table (five rows, one line,
hover) and the new exercise pills under Detailed results. Both render only when
there is engagement data, and there is none, so they typecheck and pass the
gates but nobody has seen them draw.

## 2026-10-13, columns, equal tiles, and gender back

**Columns everywhere.** `svBarChart` no longer turns anything on its side: a
long answer wraps onto up to three lines under its bar, which `flatTicks` does
for every chart in the admin. The y axis is gone from the bar tiles at her ask
and the value is drawn on top of each bar by a small plugin, so nothing is lost
by dropping the scale. The trend tiles keep their axis: a line without a scale
says nothing. One other tile in the admin (`mode:'hbar'`, the signup-source
distribution) had always drawn sideways and is upright now.

**Every tile in a row is the same height, by construction.** Title clamped to
exactly two lines with the full question in its tooltip, one body height for
every chart, and a footer of fixed height on every tile whether or not it has a
"View full list" button. Measured: all eleven tiles report a card height of 348.
The grey "How people answered" line is gone; what sits under the title is the n.

**Gender is back**, at her word, converted from pronouns in one table in
`public/admin.html` with the stored value still the pronoun. Every converted
tile carries a tooltip saying where the word came from. The Explore field is
labelled Gender too. TASKS.md B56 carries the SELECT that answers "which users
said they/them", because the admin anonymises and cannot.

**Still unverified:** the Engagement page's Learning table and the exercise
pills. Both need engagement data to render and there is none.

## 2026-10-13, the hamburger, the gift code, and the flow

**CONGRATSMYA** is migration 080: one free Starting Out package (`newlywed`),
`max_uses` 1, no workbook. Nothing is live until she runs it. Verified by
running `create-payment-intent` with the row stubbed in: Starting Out comes
back `free: true` with an order number and Stripe is never called, any other
package is refused by name, a second use is refused, and the promo field
accepts it in lower case.

**The hamburger was missing on every phone**, two faults deep. The button was
shown only below 361 points while the inline links are hidden from 640 to 900,
so the whole phone range had neither. And seventeen pages had a button that
opened nothing: twelve carried the menu markup and its styles with no
`toggleMenu` behind it, five had the button alone, one had the styles alone.

`check-mobile-menu.mjs` drives it now: at 390, 430 and 820 points it finds the
button, clicks it, and counts the links that appear. check-chrome compares the
same markup across pages as text, which is why identical menus that nothing
could open passed it for months. Nine pages are exempt by name, each with its
reason (checkout, the app shell, print targets).

**The flow runs end to end.** `npm run smoke`: 29 of 29 results sections, 12 of
13 app views (home cannot render signed out, which is documented), 37 static
pages including checkout, nothing scrolling sideways at 320 or 360, every
control named, and all five exercises driven to their completion screens with
their answers stored. It found one real fault: `/feedback`'s Send button is
filled in by the fetch, so a slow or failed endpoint left a button with no
words in it. It is hidden until the questions arrive now.

**What the smoke does not cover**, for the demo: a real Stripe payment, and the
partner invite handshake between two accounts. The arithmetic either side of
both is gated (check-checkout-pricing, check-promo-totals, the entitlement
matrix, check-invite-path), but nobody has driven a card through it.

## 2026-10-13, who the non-binary figure was

Ellie ran the query: "Alex and Sam were demos, not sure why lanae and spencer
didn't have pronouns, but lanae is she/her and spencer is he/him."

So the figure was not a bug in the conversion. It was two demo accounts
choosing they/them and two real people with the field blank, which is no slice
at all rather than a wrong one. Migration 081 fills the two gaps, matching on
the first name, only where the field is empty, and reporting every row it
matched so a second Lanae could not be filled in silently.

**The demo accounts are the live finding.** Alex and Sam are rows in `profiles`
like anybody else, so they are counted in every figure the admin draws: couple
types, demographics, engagement, the funnel. With four or five real couples
that is a large share of every number on the page, and it is the same complaint
she has now made twice about data that is not real. There is no marker on them.
TASKS.md B61 asks for one word: an `is_demo` column set on the accounts she
names, filtered out by the four admin endpoints.

Everything from B43 to B59 is approved and filed in section 4.

## 2026-10-13, the package tiles go back

Ellie: "Why do marketing sites look different than they did? I especially don't
like the way the 4 package overview tiles look at the top of the packages page.
Can we revert to whatever it was before?"

It was D19, "one primary button: the packages page has one add-to-cart style",
which she approved. I applied it to the four overview tiles as well as to the
real add-to-cart controls further down, and that was the over-reach: four quiet
clay links became four solid orange blocks, the Starting Out tile carries two
of them so its row sat a line higher than its neighbours, and the second one
was orange text on an orange button. "Add to registry" was unreadable on the
live site for six days and no gate saw it: check-ground-contrast covers the
results grounds and the app, not a link's own inline colour.

The tiles are back to the text links. The buttons on the exercises and the
resources rows keep the one style, which is where D19's point actually bites:
those are the controls that put something in a cart.

Screenshots of before, after and reverted are in the scratch directory for this
session; the reverted shot and the pre-D19 shot are the same layout.

The rest of what changed on those pages is listed in TASKS.md under B62: the
orange Get started, Get started staying in the bar on a phone, the In Practice
hairline, and thirteen contrast fixes that only darkened pale text. All of it
is hers to reverse the same way.

## 2026-10-13, one description of the packages

The checkout tiles and the overview tiles on /offerings described the same four
packages differently: /start listed what was in each one, /offerings wrote a
sentence about it, and Premium's first line said "Everything in the Assessment"
where the other three said "Attune Assessment". Ellie asked for the second to
match the first, and for Premium's line to match its neighbours.

Both done, with her words from /start. `check-package-tiles.mjs` holds the two
pages to the same name, the same price from the catalogue, and the same list in
the same order, reading both lists out of the files rather than keeping a third
copy in the gate. Five plants: the old Premium wording, a changed line, a price
off the catalogue, a reordered list, and the overview tile reverting to prose.

The gift-box line on the new tiles carries `gift-feat`, and /offerings' flag
block now hides it while physical is off, which is what /start has always done.
That was missing from the flag block and would have promised a box nobody can
send.

**The hero banners have not changed.** She asked; I measured rather than
answering from memory. Purpose, FAQ, Contact, In Practice and Legal, built from
the commit before this round and from the tree as it stands, come back
identical: same height, background, typeface, size, weight, colour. The last
hero change was 9 September. What sits directly above every hero and did change
is the nav, which is in TASKS.md under B62.

## 2026-10-14, Alex and Sam stop being people

Every figure the admin draws was counting two demo accounts and anything called
test. They are rows in `profiles` like anybody else, so they were in the couple
types, the demographics, the engagement, the funnel, the survey segments and
all five CSV exports. The symptom was a demographic breakdown that described us.

`api/_lib/demo-accounts.js` is the one place that knows the column and the
filter. Eleven reads across six endpoints go through `selectProfiles`,
`fetchProfiles` or `demoIds`, so the table is named nowhere else in the admin.
Migration 082 marks the rows and is in TASKS.md for Ellie to run; it matches the
whole name, not a prefix, because `alex%` catches Alexandra.

**Not done until she runs it.** The code is deployed and every admin page now
carries an amber line saying demos are still being counted, which is what the
`demoFilterApplied: false` fallback is for: asking PostgREST for a column that
does not exist is a 400, and that would have taken every admin page down
between the deploy and the SQL.

One lesson worth keeping, now in CLAUDE.md. The gate written in the same sitting
grepped for `from('profiles')` and reported ONE read across the admin with
eleven in front of it, because the fix had moved the table name inside the
module. A gate can be blinded by the abstraction it was written to protect, on
the same afternoon. `check-demo-excluded.mjs` counts calls to the module instead
and keeps the literal only as a thing to forbid, drives three handlers against a
stubbed PostgREST, and holds the page to reading the flag. Nine plants, all
caught.

## 2026-10-14, the half of B61 that was not done

B61 filtered every read of `profiles`, so the couple types, the demographics
and the funnel stopped counting demos. Everything measured from a DIFFERENT
table went on counting them: notes, tags, article reads, page time, orders,
invited partners, survey answers. Found by driving the engagement endpoint
against a stub rather than by reading it, which answered two article readers
where one of the two was Alex.

The rule now lives beside the other one in `api/_lib/demo-accounts.js`: a row
belongs in a figure only if its owner is in the list the figures are about.
`ownedBy` for the owner_id tables, `withoutDemoOrders` for orders, which are
the one table that names a buyer twice (by account and by email alone).

Two things to know if this comes up again. An ownerless `page_events` row is an
anonymous visit and must stay counted, so "what to do with no owner" is an
argument rather than a default. And the engagement page's count line said
"Read 5 people, 3 notes" with the people filtered and the notes not; it says
Counting now, and both halves mean the same thing.

**The gate lesson, which is in CLAUDE.md.** A check about something being
excluded has to assert on a total. The old one looked for the demo's id in the
answer and nothing identifying appears in an aggregate, so it passed while the
numbers were wrong. The fixture gives the demo one row in every table beside
each real person's, so the right answer is 1 and the wrong answer is 2.

B68 is in TASKS.md section 3 rather than section 4: it lowers an order count
and a revenue figure, and she should see that before trusting a number she
wrote down. Still nothing changes on the live admin until she runs migration
082, and every page says so in amber until she does.

## 2026-10-14, eighteen items and two lists of a hundred

Ellie sent one long message: her edited word list, a request for 100 of each
list, and eighteen numbered fixes. All of it is done except what is waiting on
her, which is one migration and one sentence of copy.

**Two things are blocked on her.** Migration 083, in TASKS.md section 1, which
is what makes the daily notification rows appear in Settings. And the packages
page, where the hero and the foot both land on "real understanding" and the
line under each is the same sentence: nothing changed there, it has been that
way since the commit that wrote it, and it needs one new sentence from her.

**Two lists of 100.** The words are 49 of hers, verbatim, with Consent deleted,
plus 51 written to the four moves her edits make. The insights are 100
verified quotations: 69 from pages, all 69 checked word for word today, and 31
from books checked when added. The book half cannot be rechecked here because
GOOGLE_BOOKS_KEY is in Vercel and not on this machine, which is why every new
one came from a page that can be opened.

None of the insight text was typed. A script fetched each page, split it and
took sentences by index, so the stored body is the page's bytes. Two rules in
that script are worth keeping: a sentence opening "This means" or "Recognizing
them" is a fragment on a card that shows nothing before it, and a splitter
breaks after "Dr." and leaves the next sentence starting mid-name.

**Four gates added**, each planted against: check-hero-band (7 plants),
check-daily-push (13), check-waterfalls (7, then widened to every endpoint), and check-mark-artwork widened
to every lockup (5). Three of them were wrong first in ways recorded in their
own headers, and all three mistakes were mine measuring the machine instead of
the code, or reading a comment as code.

**One latent bug worth knowing about.** build-tasks-sql.mjs pasted a migration
into TASKS.md with String.replace and a string replacement. Migration 083 has
`[0-5][0-9]$'` in a CHECK constraint, and `$'` means "everything after the
match", so the document came back carrying the whole of itself three times.
Right for eighteen migrations. It uses a replacer function now and CLAUDE.md
says so.

**The app needs an update published** for any of B69, B70, B72 or B73 to reach
her phone. Nothing in this round needed a rebuild: no native module was added,
which is why the notification time picker is a list of half hours rather than
a clock.

## 2026-10-14, the second pass on her six

She ran migration 083, sent the packages page copy, approved two, and sent back
three faults on the word storycard plus "can we make it faster?" again.

**The word card was wrong because I built it from her sentence rather than from
the screen her sentence named.** All three faults were one mistake. There is a
`WordEntry` component now, rendered by the Notes tab and by the card, and a
card can ask for a page's own wash component instead of approximating it with a
three-stop gradient. The foot takes ink on a light card; it was white on white,
which is why she could not see the link.

**How to look at an Expo screen without the Simulator.** No browser gate here
renders app components, which is how the first version passed everything. The
app has a web build: `cd attune-app && npx expo start --web --port 8099`, then
swap a probe in for `<AppTabs />` in `src/app/_layout.tsx` for the screenshot
and swap it back. Ten minutes. Two traps: every URL renders the tabs because
the layout has no router slot, so a route file alone is never reached; and
`adjustsFontSizeToFit` is iOS-only, so text that shrinks on a phone truncates
there. Measure the width rather than reading the truncation as a bug.

**The performance round went wider.** The first pass measured /api/home alone,
which found a real thing and missed two worse ones. The tools tab was seven
round trips deep, worse than home had been, and nothing had looked at it. It is
three now; Notes is four, from five.

Making Notes faster put a read in front of every save, because the promise
started before the action was known. `check-waterfalls` counts calls on the
write paths for exactly that reason.

**Still waiting on her: nothing.** Section 2 is empty and section 1 holds only
the long-standing items. The app update is published and current.

## 2026-10-15, eight sweeps

Ellie, after the round-trip work: "can we run more sweeps like this throughout
our products? As many as you can please."

A sweep is one property measured over every instance of its thing. Eight so
far: payload size per endpoint, unbounded queries, page weight, fonts, every
dollar amount, every link followed, every endpoint's error path, every tap
target, every piece of text's contrast. Six found something real.

**The biggest was the type.** Thirty-five places where text was drawn in a face
the page never loaded, so the browser faked bold or italic, on ten and thirteen
pages respectively. The admin's bold monospace cannot be fixed by asking harder
because DM Mono has no bold. And three weights of Syne were downloaded for text
that does not exist. The site had eight different font requests; it has one,
in the range form, and check-web-fonts drives every page.

**Then the nav.** The Get started button was brown-on-orange at 1.65 on two
pages and had no orange at all on five more, because `.nav-right a` is more
specific than `.btn-nav`. The hamburger was 32 by 26 everywhere and a four
pixel nub on five In Practice pages, where its rule sat inside a phone-width
media query. Both fixed on all 29, both gated in check-mobile-menu.

**What to carry forward.** Five of the eight sweeps were wrong before they were
right, and every one was the harness rather than the product: a column headed
"weight" that hid the word italic, a sweep reading rewrites and not redirects,
a nodejs handler given one argument, a background walk that started at the
parent, a wait that raced a stylesheet. The first hypothesis for a surprising
result is the measurement.

And the one that matters most: the contrast sweep silently skipped text on
gradients, so darkening three pills to clear the threshold made the fourth
worse, in exactly the place the sweep was blind. It reports what it cannot
measure now.

**Nothing is waiting on her.** Section 2 is empty, section 1 holds only the
long-standing items, and the sweep findings are in section 3 under S26 with the
numbers for the ones I did not fix: 459 tap targets under 44 (mostly footer
links), 110 pieces of text between 3.0 and 3.5 contrast (muted grey on cream),
and the 1.4MB app-shell bundle. All three are design calls, not bugs.

---

## 2026-10-15, the round after the sweeps

Four things landed: B88, B89, C6 and B90. The tree is clean and pushed, the
site is deployed and verified by a marker, and the app update is published and
confirmed against `u.expo.dev` rather than assumed.

**What to carry forward, in order of how much it would cost to learn again.**

**Her review of the hundred insights was written into a generated document, and
`npm run check` erased it.** INSIGHTS-REVIEW.md is built from
`api/_insights.js` by a script that runs in the check chain, so her 74 kept
quotations and 14 edits were overwritten the next time the checks ran. They
were recovered from the session transcript. Nothing in the repo had them.

The gate cannot see this either: `check-insights-review` runs AFTER the builder
in the same chain, so it compares a file the builder has just written. A
committed document that disagrees with the module passes every time. Any answer
she gives has to go into the module the moment it arrives.

**A gate that cannot read an ellipsis forces a choice between her editing and a
passing build.** Three of her edits were an elision, a bracketed clarification
and a dropped opening clause with the next word capitalised, all ordinary
practice, and check-quotes-verbatim called all three a misquotation. It splits
on those marks now and compares the pieces exactly, in order. The loosening
kept the thing worth catching: the same review dropped one word from the middle
of a sentence with nothing marking it, and that is the one finding that
survived.

**Specificity beats order, and the check found it rather than the reading.**
B88 hides the nav pill at the width each page collapses its nav. Written as
`.nav-right .btn-nav{display:none}` it lost to the base rule
`.nav-right a.btn-nav`, which names an element, so the pill stayed in the bar
on all 29 pages while the file looked right.

**The app opened every tab's requests at once.** The tab bar is the UIKit one,
so all four screens mount at launch, and each called its loader from a mount
effect: about ten requests, several of them cold functions, on one phone's
connection. Every screen already reloads on focus and a focus effect fires on
mount for the focused screen, so the mount effect did one useful thing and
three wasteful ones. That, not the volume of data, is why her Notes tab was
slow with no marks in it.

**A rotation keyed on the wrong field strands the biggest pile.** Dealing the
insights so no two days share a writer or subject was easy; adding the
publication was not, because ordering candidates by the writer's pile split the
Gottman Institute into thirteen small piles and left nothing but Gottman at the
end. Ordering by how many of a PUBLICATION remain fixed it: 0 repeats in 100.

**What is waiting on her.** One word in Q12 of the insights, and her list of
100 words, which has now failed to paste twice. Both are at the top of
TASKS.md. Section 2 is empty.

**What I did not do.** Book quotations. Verifying one needs GOOGLE_BOOKS_KEY,
which is in Vercel and not on this machine, and the Vercel build command does
not run that check, so a book quotation added now is unverified by anything
until somebody runs the check by hand with the key. The 27 already in the list
are counted as unchecked on every local run rather than passed. All 73 web ones
are verified on every run.

### The round after that, same day

Four answers from Ellie, all applied.

**Q12 carries an ellipsis.** She was asked whether the word she cut should come
back or the cut should be marked: "Use an ellipsis please." So the body reads
"a dynamic that keeps... negative thoughts", which the quote check splits on and
matches in two pieces against the book's own sentence.

**My answers to her five S26 questions were in the wrong place, and she told me
so.** She had answered each one; I wrote the replies under section 3 of TASKS.md
while the long account of the sweeps, which she had already read, stayed under
section 2. She went to the S26 she knew and found nothing new. There is one S26
section now, under the row that points at it, her questions first.

The general shape, worth more than the fix: a document with two sections about
one id is a document that answers in a place nobody looks. Put the new thing
under the row that names it.

**She offered a Google Books key so books can be cited.**
`check-quotes-verbatim` reads `GOOGLE_BOOKS_KEY` from the environment or, if
that is unset, from the login keychain under `attune-google-books`, so the key
never touches the repo, a shell history or a transcript. TASKS.md has the one
command, which takes the value off her clipboard. Verified by planting a fake
key in the keychain: the gate picked it up, Google answered 400, and the gate
reported the entries as unchecked rather than as misquotations, which is the
right failure for a bad credential.

**The next batch of insights should come from books**, at her ask, and that is
blocked on nothing but the key. Verify each against the scan before it goes in.

**Her word list has now failed to arrive twice**, as an attachment that reaches
me as a placeholder. TASKS.md gives her `pbpaste > ellie-paste.txt`, which is
gitignored, and the file is read, applied and deleted.

### The books round

**Her key is stored and the insight list is 150.** `check-quotes-verbatim`
reads `GOOGLE_BOOKS_KEY` or, failing that, the login keychain under
`attune-google-books`. Before it, 27 book quotations were unverifiable on this
machine; now 73 are checked against the page they cite and 75 against Google's
scan of the volume, with 2 reported unchecked on the run that added them
because Google answered 503. Both verify on a retry.

**The 50 she asked for came from 20 books the list had never used:** bell
hooks, Fromm, Perel, Lerner, Brown, Tatkin, Rosenberg, Chapman, Peck, de
Botton, Thich Nhat Hanh, Rollo May, Gibran, Rilke, Waldinger and Schulz,
Goleman, Gottlieb, Patterson, and two more Gottman works.

**The rate is the thing to remember.** 139 candidates, 63 found in the book
they claimed. Ones I remembered and typed verified at about 45 per cent; ones
lifted off a page that quotes the book at length verified at 75. Several
failures were sentences that circulate everywhere under an author's name and
are nobody's actual words, which is exactly what the scan is for.

**An existing gate caught my data, not my code.** check-insight-provenance
found six works cited under more than one edition, because the verifier records
whichever edition Google surfaced for that phrase and that differs between
calls. One edition per work now, the one most of its quotations matched.

**Her words carry seven edits** and nothing else changed; the other 93 she left
alone. They arrived through `pbpaste > ellie-paste.txt` after two attempts that
reached me as an empty attachment, and that recipe is in CLAUDE.md now.

**What she still has to do:** nothing. Section 2 is empty. Section 3 has the
150 insights to read, the three sweep findings I left alone, and the lawyer's
two documents.

### The sweep she asked for while away

"Can't engage rn, sweep for bugs and breaks." Nothing is broken. What the
sweep actually produced was one verification I had been missing and three
sentences that described code which does not exist.

**The verification worth keeping.** The Notes screen can be driven with data
behind it, through react-native-web, and that is the only way to check a figure
that moved from being counted on the phone to being read off the payload. All
four draw from the payload, and the request pattern is exactly what she asked
for: three on arrival, ten on opening the list, a tag's rows on opening the
tag. `scripts/probe-notes-screen.mjs`, with both traps written into its header.

It also settles the lazy-tab question. Signed out, the screen reaches sign-in
rather than sitting on a spinner, which proves the focus effect fires for the
tab you are looking at. That was the one change this week that could have
bricked the app on launch and only a driven check could answer it.

**Three dead sentences, fixed:** a `valenceUnknown` flag in src/App.jsx that
nothing sets, a `seenHighlights` name in results.tsx for a flag really called
`cameFromHighlights` with a different rule, and next-action.js still describing
the retired questionnaire when the code opens the survey.
`scripts/probe-dead-comments.mjs` finds the shape; it cannot read tense or a
parenthetical denial, so read its output rather than its count.

**CLAUDE.md named a gate that does not exist.** check-style-codes and
track-type.js went in b2dd2312 with the style code. The lesson stands and now
says so.

**The one app commit newer than the published bundle is comments only**, proved
by stripping comments from both versions and comparing: identical. No EAS
update published, because a comment is not a fix and an update costs every
reader a download.

**The residual risk, named rather than papered over.** The new Notes queries
execute against Supabase and nothing local can run them. The foreign key the
tag-stats embed needs is in migration 044 and the syntax is right, but the
first real proof is Ellie opening the Notes tab on her phone. If it is wrong,
the symptom is an empty Notes tab with an error card, not silent bad data.

**And the machine.** 6GB into swap, where the browser gates crawl, so the full
suite was not run as one chain; the gates covering every changed file were run
individually instead. `sysctl vm.swapusage` before trusting any timing here.

### Buttoning up the demo path

Ellie: "My designer should be demoing soon, please ensure all
purchase/checkout/accountsetup/exercise completion/results generation is
entirely buttoned up."

**It is, and here is what was actually run rather than read.** The smoke drove
all five exercises to their completion screens with the answers stored, all 29
results sections rendered, and 37 static pages rendered at three widths with no
sideways scroll. 38 gates over her five areas passed. A new probe drove the
whole journey end to end against a stubbed outside: buy, create profile, home,
save, complete, results, tools, notes, fourteen steps, every one answering.

**The beta codes are the demo's purchase path and they work.** All five take
the free path with zero Stripe calls, write an order and issue a number. A paid
add-on beside a code charges for the add-on alone.

**One real gap, found by planting and now closed.** public/checkout.html keeps
its own copy of every price because a static page cannot import from `api/`,
and two of those copies are customer-facing: the order summary and the line
items that become the confirmation email's breakdown. Planting $25 against the
$40 Conflict Patterns costs was passed by SEVEN existing gates.
check-checkout-page-prices.mjs holds all 23 to the catalogue now, planted five
ways. S30 in TASKS.md is the real fix: let the page read prices the way it
already reads package rules, through a generated file.

**Three probes now live in scripts/,** named probe- so check-gates-run leaves
them alone: probe-notes-screen (the app screen with data behind it),
probe-demo-journey (the whole purchase-to-results sequence) and
probe-beta-codes. None asserts anything it cannot see, and each carries the
harness mistakes it made first.

**The harness was wrong before the product, four times in this round**, which
is the running ratio in this file: a surname taken from the wrong end of "John
Gottman and Nan Silver", an injected regex whose backslashes collapsed into a
line comment, three request shapes guessed instead of read, and an assertion
about who sends the confirmation email that was looking at the endpoint when
the client sends it.

---

## 2026-10-16, her sixteen: the couple map answers a tap

Everything in section 2 is done and section 2 says so. The website is live at
7c668152 and an EAS update went to the production branch from the same commit,
so the app needs two launches on her phone rather than a build.

**B91 and B92 moved two blocks of the couple type page onto the map itself.**
Each dot opens that person's paragraph beside it; a grey question mark beside
Open and beside Withdraw opens that axis's sentence; both used to be printed
under the chart. The pole names were typed into the website's SVG and again
into the app's map, so they are `poles` and `helpAt` in api/_axes.js now and
the payload carries them. The axis bars went with the panel at her word, which
left `axisRows` and the payload's `rows` with no consumer: both deleted rather
than left as a producer nothing reads.

**B105 rebuilt What Comes Next as three buckets behind four tiles,** the
grouping decided once in api/_lib/what-comes-next.js so neither surface can
disagree about which bucket conflict belongs in. The survey is a coloured
button at the foot of both; the website had no button at all, because
dismissing its dialog wrote a flag nothing could undo.

**check-map-controls.mjs drives the website half** at 390 and 1280 in the
smoke: no description printed on the page, two marks opening their own axis,
two dots opening their own paragraph, a click elsewhere and a tap on the map
both closing it. Eleven plants, eleven failures. The app half was driven in the
simulator with scripts/sim.mjs.

**Four things cost an hour each and are in CLAUDE.md:**

- `const BRAND_GRADIENT = BRAND_GRADIENT;` built clean and served a blank page.
  A script extracted a repeated literal into a constant, then replaced every
  occurrence of the literal including the one in the declaration it had just
  written. check-server-undefined fails on a self-initialised declarator now,
  seven forms planted.
- A dispatched click with no coordinates is a click at x=0, which is inside the
  results column's page-back zone. Every dismissal assertion passed because the
  page had navigated away.
- Measuring a popup by geometry was wrong twice before a `data-map-panel`
  attribute ended it.
- The app's tile numbers were clipped: `Type.display` at 22 points keeps the
  line height it carries for its usual size, so 9 drew as 0. Found by looking
  at a simulator screenshot, not by reading the style.

**What is left for her**, all in section 3: the sixteen to look at, C11's 150
insights, C12's sixty paragraphs, S30's checkout-price refactor, and S27's
three measured non-fixes.

---

## 2026-10-17, the sweep round

She could not engage and asked for sweeps. Eight properties, each measured over
every instance of its thing. The tree is clean, everything is pushed, and the
EAS update went out on the production channel.

**Three real findings, all fixed and all verified.**

- The results shell was a component declared inside `UnifiedResults`, so a page
  change replaced the page rather than its contents. Hoisted to `ResultsLayout`
  at module scope. Measured with a MutationObserver before and after:
  `pageReplaced: true` to `pageReplaced: false, topLevelAdds: 0`. Two gates
  caught regressions from the hoist in the same minute, which is the argument
  for them.
- The admin's Gender tile converted pronouns to gender words in two places. The
  second had no fourth row, so anybody off the list was in the total and in no
  bar: four people, three bars, 75 per cent. Driven in a browser both ways.
  `api/_lib/pronouns.js` is the rule now and `check-pronoun-conversion.mjs`
  holds it.
- Both admin CSV exports asked a `workbooks` table whether a couple's workbook
  had been made, and the column read N for everybody since it shipped. The
  table exists and nothing has ever written a row to it; what records that a
  workbook was made is the order. It reads the order now, and
  `check-selected-columns.mjs` is the sweep that found it, kept as a gate.
  (A later probe with the public key corrected the reason: an earlier note
  here said the table did not exist, which a comment in delete-account.js had
  said and nothing had checked.)

**And B131, the survey button.** It draws only for somebody who has not
answered, which is her rule, so it cannot be drawn until /api/survey answers.
The memo for that answer lived in the page that reads it, so the first visit of
an app's life had no button: "Still nothing". It lives in `client.ts` now, home
and Insights both warm it, and a cold start of her simulator shows the button.

**Three new gates, all planted against:** check-pronoun-conversion (7),
check-selected-columns (6), and a seventh section in check-survey (7).
check-one-cart-price gained a rule about a subtotal rebuilt out of its parts
(4 plants, and its first version excused a function for being named
itemSubtotal, because the body it tested began at the declaration).

**Where it stopped.** Nothing half-done. The open sweeps worth running next,
if nobody has a better idea: fields the payload carries that no surface draws,
and the app's error paths driven rather than read.

---

## 2026-10-17, later: the chain from setup to results

Her ask: make sure everything from account setup wires into the exercises, and
that exercise results populate. Four sweeps. The exercises and the results came
back clean; the money on the way in did not.

**Three live bugs, all fixed and all measured.**

- Conflict Patterns was quoted at $40 and billed at $0, because
  `normalizeItem` had no `addonConflict` field. That flag is what reaches the
  Stripe metadata and therefore the order row, so the exercise was never
  granted either. It has never been in that object; `git log -S` says so.
- The same function named premium three times to zero the add-ons premium
  includes. It reads PKG_CAPS now, which is the one place that decides.
- checkout.html had a second price table with premium at the old 295, so a
  promo on a premium cart drew "−$295" under a $198 package.

`check-cart-quote.mjs` prices all 24 package-and-add-on carts off the real page
against the real server and asserts the order grants what was paid for. It is
in the smoke, not the check, because it needs a browser and a server.

**Two new instruments worth knowing about.** `check-question-ids.mjs` holds
every name shaped like a question id to resolving against a real question.
`scripts/probe-exercise-chain.mjs` takes the answers check-exercise-flow stores
when run with `EXERCISE_FLOW_DUMP=<file>` and feeds them to /api/results and
/api/conflict-results:

    npx vite preview --port 4173
    EXERCISE_FLOW_DUMP=/tmp/ex.json BASE=http://localhost:4173 node scripts/check-exercise-flow.mjs
    node scripts/probe-exercise-chain.mjs /tmp/ex.json

**One thing waiting on Ellie**, in TASKS.md under S32: whether Premium is meant
to include Physical Intimacy. The offerings page and PKG_CAPS both say it is
not, and the code now agrees with them.

**A note on running the gates here.** `npm run check` stalled for 25 minutes on
check-web-fonts with the machine at load 10 and 7GB of swap in use. Killing it,
reaping Chrome and running that one gate alone took three minutes and passed.
That is the swap paragraph in CLAUDE.md, met again.

---

## 2026-10-17, evening: is anything in the design tester's way

No, once Ellie runs the migration in TASKS.md T1. `probe-tester-journey.mjs`
drives the whole path against the real handlers with only the network stubbed:
a full-bundle code redeems and writes a free order, the account lands on
Premium, all five exercises open, an answer stores in the right column, and
the results open with every chapter once both partners have finished.

Two things wait on her, both in section 1: run T1 for a fresh tester code
(every existing code is single-use), and check T2, whether anyone bought
Conflict Patterns before today's fix.

**More money found on the way in.** Widening check-entitlement-flow from
src/App.jsx to api/ found three more hand-written add-on lists with a member
missing. The one that mattered: api/calculate-tax.js kept its own cart-item
mapping without intimacy or conflict, so its own tax lines for those two could
never fire and Stripe was asked to tax a base up to $40 short. normalizeItem
now lives in api/_lib/cart-pricing.js and both endpoints import it.

**Two sweeps came back clean and are now figures.** Every image on every page:
there are none, so nothing can arrive broken. And the editorial sweep, 3,632
sentences, which left exactly one word for Ellie (C16).

**Four of the journey probe's findings were the probe**, which is the usual
ratio: a missing STRIPE_SECRET_KEY in the test environment, the Relationship
Reflection capability being called hasAnniversary, /api/home answering with
`primary` rather than `cards`, and `exercises` being keyed rather than a list.

---

## 2026-10-17, night: the thorough round

Ten sweeps. Four real findings, all fixed, and two corrections to things this
file and CLAUDE.md had said.

**Found and fixed.** The dashboard's Completion rate counted rows in a table
nothing writes, so it read 0% for every couple. The results payload carried a
per-person reading accuracy block, nine fields, that the app's own type says is
never shown and neither surface draws: it reached every phone and the offline
cache, and now stops at the response. The app's share sheet sent every In
Practice article to `/in-practice/<id>` when the pages are at
`/practice/<slug>`, so every share was a 404. And a Pressable behind the
results menu was announcing the whole menu as one unnamed button.

**Came back clean, with figures.** 540 malformed calls across 60 endpoints, no
crash and no leak. 28 tables asked with the public key, no rows for a stranger.
13 emails rendered from their own samples, 33 links whole. 7 scheduled jobs,
all refusing an unauthenticated call. 172 app controls, three without words
(C17, hers to write). 39 pages with no images at all.

**Two corrections.** The `workbooks` table does exist; nothing writes to it,
which is a different fact and the one that mattered. And api/send-email.js
builds four emails now rather than ten, so the "five have no trigger" sentence
in three places was history rather than fact.

**New gates:** check-live-tables (a table something reads is a table something
writes), and two widenings rather than new files: check-entitlement-flow now
reads api/ as well as src/App.jsx, and check-internal-links now follows the
addresses the app sends somebody to.

**Still true about this machine:** `npm run check` stalls on check-mobile-menu
inside the chain, twice today, for 20 to 35 minutes with the machine in swap.
Standalone it takes 46 seconds. Kill it, reap Chrome, run that gate alone and
the rest in batches.

---

## 2026-10-17, late: UX and data storage

Six sweeps. Four findings, all fixed, and one of them was in a document rather
than the code.

**Deletion leaves nothing behind**, measured: 17 tables hold a row belonging
to a person and every one cascades or loses the link. The first run called
four of them leaks because it only counted `on delete cascade` and ignored
`on delete set null`, which is the better answer and what three of them do.

**What it did find was the lawyer's document.** LEGAL-VS-CODE.md listed nine
problems and all nine have been built or settled since. It now opens with
where each stands.

**Five log lines carried a customer's email and two their first name.** Logs
live ninety days. api/_lib/log-redact.js gives a log the domain and the fault;
check-log-privacy holds all 148 console lines under api/.

**Deletion nulled a column that does not exist** on feedback_submissions, so
it failed quietly and left an address behind. check-selected-columns reads the
write side now.

**Signing out left two things in memory**, one of which decides whether
somebody is asked for feedback. forgetSession clears them; check-cache-privacy
watches for the next one.

**The bin in the marking toolbar deleted a note with one tap.** It asks now,
for a note and not for a highlight, in the words that were already in the note
sheet, which now have one home.

New gates: check-log-privacy, check-destructive-confirm. Widened:
check-selected-columns (writes), check-cache-privacy (memory),
check-email-preview (one exemption).

---

## 2026-10-19 — her twenty-seven, the degrees of alignment, and a methodology doc

**Where it stopped.** Nothing is half-done. The tree is clean, the chain is
green, and TASKS.md section 2 holds one row.

**The big one was W63/W70/W71, the degrees of alignment.** How close two
expectations answers are had been decided in five places and they disagreed:
a boolean over three positions on the server, a similarity over three ranks
for the headline, that similarity averaged for the website's bars, two display
strings compared in the website's second row builder, and a count of exact
matches divided by a total on the phone. The same category's bar was one
number on the site and a different number on the phone.

`api/_lib/alignment.js` owns the judgement now: given a distance normalised to
0 and 1, what percentage is that and which of three bands. Each exercise still
measures its own distance, because the instruments genuinely differ. Two gates:
check-alignment-rule runs the rule, check-alignment-source proves nothing goes
round it. Sixteen plants between them.

**The measurement changed, not only where it lives.** The exercise asks a
follow-up every time somebody answers "Both of us", it is required before the
item counts as answered, and nothing that scored had ever read it. Her example,
"Both of us, usually Ellie" against "Ellie", read as a flat miss and now reads
75 per cent close. `agrees()` is deleted.

**Two things fell out of the sweep.** A name against "Primarily my partner's"
was scored as a total mismatch when both name the same person; that spelling is
no longer served, so it can only affect rows stored before it changed. And the
childhood follow-up, `childhoodBothDetail`, was written by both exercise
surfaces and read by nothing, which is why the Experienced column said "Both"
where Expects said "usually". That was W62.

**Communication is deliberately out of all of it.** Its line is
CARD_ALIGNED_GAP, one point on a five-point scale, which normalises to 0.25
rather than the 0.2 the bands use. Moving it changes a figure every existing
customer has read, so it is in TASKS.md as her decision and the gate says in
writing that it is not covered.

**METHODOLOGY.md is new** and is generated from the modules the product reads,
by scripts/build-methodology.mjs. check-methodology compares the committed file
against a fresh build and rewrites it in place when it has fallen behind. The
generator is deliberately NOT in the check chain: this file already records
twice what happens when a document is regenerated before it is checked.

**What is waiting on Ellie**, all in TASKS.md section 1: migration 087 marking
three test accounts as demos; the couple map trade-off in W57, which has three
options and a measurement; and three couple-type bullets in W59 that cannot
take "You are" without being rewritten.

**Not done and not started:** nothing from her list. W57 and W59 are decisions
rather than work.

---

## 2026-10-19, later — her four tweaks, and six bug sweeps

**Where it stopped.** Tree clean, chain green, app update published. TASKS.md
section 2 holds one row and it is waiting on her.

**W57 is the one worth knowing.** The couple map was `height * 0.26`, tuned on
an iPhone 17. Ellie, on a Pro Max: "227 looks right on the simulator of a 17
but on my pro max it looks small." A share is the wrong shape and her report is
the argument: everything below the map is a fixed number of points, so a taller
phone has MORE spare height and a fraction hands the map a smaller share of it.
It is `height - ROOM_BELOW` now, with the reserve derived from the one
measurement she approved, so an iPhone 17 still draws exactly 227.

check-card-map-size was widened rather than a second gate written: one
property, is the map the right size for the room it is in, over both instances.
Two of its five plants passed blind and both were the gate reading its floor
and its cap out of the file it was checking. That is the third time in one day
and it is now the first thing to check when writing a threshold into a gate.

**Six sweeps, written up in TASKS.md.** Two real findings, one latent hazard
now gated, three clean. They live in `scripts/_sweeps/` with a README that
records how two of them were wrong before they were right, which is the usual
ratio.

The two real ones: three exported functions called by nothing, two of them
sitting in modules whose whole job is to be the single source of truth; and two
colours typed on both surfaces with nothing holding them, which is this
codebase's signature bug found by sweeping every constant declared twice.

**One thing waiting on Ellie that is not new.** The workbook's own scorer reads
the relative answers backwards, which SECURITY.md has carried for a while. The
sweep confirmed it reproduces and bounded it: it only fires on the "Primarily
mine" phrasing, which the exercise no longer serves, so it reaches couples
whose answers predate that change and nobody else. SECURITY.md now points at
`respDistance` rather than at a function that no longer exists.

**What was NOT verified on screen.** The italic in the snapshot table and the
two type sizes on the horseman tiles. The Simulator lost its window part way
through the round, which stops synthetic taps while screenshots keep working,
and it does not come back from a script. The snapshot table, the horseman tile
structure, the new icon and the Expectations bars on real data were all seen.

---

## 2026-10-19, the sweeps

Eight, in `scripts/_sweeps/` with a README that records how three of them were
wrong before they were right. They are not gates; nothing runs them.

**Four real findings.** Three exported functions called by nothing, two of them
in modules whose whole job is to be the single source of truth. Two colours
typed on both surfaces with nothing holding them. A React component holding
state declared inside another component, which reset a customer's pronoun
choice on the profile form. And a cron that reported success after a failed
read, in a function that already handles a different failed read correctly ten
lines above.

**One latent hazard, now gated.** The two role-token resolvers agree on every
reachable input and disagree about what to do when a token cannot resolve. The
reason nothing reaches that was a property nobody was checking.

**Three clean**, and one of those only counts because the harness was fixed
first: the payload-field sweep matched `name:` only, so it could not see
`return { groups, buckets }`, which is how most of this codebase builds an
object. Every one of its seven "findings" was that blindness.

**New gates:** check-nested-components. Widened: check-role-tokens (each couple
type only uses tokens for an axis its two people differ on), check-card-tints
(TILE_GREY has no second value to compare any more, so it checks that neither
surface has gone back to its own).

**The ratio held.** Three of eight sweeps were measuring something other than
what they claimed, and finding that out was most of the work. When one reports
something surprising, print one case end to end before believing the column.

---

## 2026-10-20 — her list of thirteen, finished

Tree clean, pushed, EAS update published to production from b25c4168.
Nothing half-done.

**The thing worth knowing.** A tapped checkbox had never once saved, on either
surface, and two separate bugs were in the way. `api/convos.js` handed
`userForRequest` a Request when that function destructures
`{ token, supabaseUrl, anonKey }`, so the token was undefined and the answer was
401 to everybody. Behind it, the same file read the body off `jsonBody`'s
wrapper, which answers `{ body }` or `{ error }`, so the key was undefined and
the answer was 400. Both are the same family as `resultsGate` being handed the
whole capabilities object rather than its `caps` half, recorded in CLAUDE.md:
a return value with the right name and the wrong keys.

Neither was findable from outside. 401 is the right answer to a request with no
token and 400 is the right answer to a bad key, so a sweep of the deployed
surface reads as working. Both surfaces put a tick back when a save is refused,
which is correct, so the symptom read as a design decision. What found it was
putting the server's own reply on the screen in the simulator and tapping.

New gates: `check-auth-shape.mjs`, and `check-body-parsing.mjs` widened to read
its callers rather than only drive them. `check-more-exercises.mjs` for the new
section, ten plants. `check-tag-closure` widened to walk every `id="page-*"`.

**And the camera lied, twice, which cost more than the bugs did.** Every
screenshot this repo takes was captured with Chrome's beyond-the-viewport flag
on, which resizes the page mid-capture so a responsive chart gets painted at
two sizes at once. I read one of those pictures as gridlines still on the type
pies after they had been fixed, and another as the conflict chart's columns
huddled against its axis. Both charts were correct and their own models said so.
`scripts/_lib/browser.mjs` takes an honest viewport shot now, and
`scripts/probe-admin.mjs` reports each chart's type, scales, gridlines, legend
and bar positions, so a claim about a chart is a number rather than a picture.

Also worth knowing: a stale `admin-types.png` sitting in the scratchpad from an
earlier session was read as this session's output for twenty minutes. The probe
writes to `OUT`, which defaults to the working directory, not to `SHOT_DIR`.

**Open for Ellie:** W113, whether the locked tiles on Learn should get the lock
icon the exercises tiles now have (Learn only dims). W114, tick one discussion
on her phone and confirm it stays.

## 2026-10-20, later — six sweeps, run because she could not engage

Tree clean, pushed at b85e7ffd, EAS update published, `npm run check` and
`npm run smoke` both exit 0.

**One real break.** `profiles.results_last_opened_at`, added in migration 050
with a comment saying it "drives results ready and never opened", written by
nothing. Three home prompts read it, so "Your results are ready" and "Revisit
X" were both permanently on and the beta feedback prompt could never appear.
`/api/results` stamps it now, once an hour per reader, which covers both
surfaces because both open results through that endpoint.

The lesson under it is the one about fixtures. `next-action-test.mjs` exercises
all three rules and passes either way, because it supplies
`resultsLastOpenedAt` itself. A test that invents a field proves the rule and
says nothing about whether the product ever sets it. `check-prompt-state-written`
closes that: it reads the mapping out of home.js, the readers out of
next-action.js, and fails on a column no writing file names.

**And a page nothing had ever looked at.** check-render calls a results page
empty under 600 characters. What Comes Next is three collapsed tiles and comes
to 591 with everything on it, so it reported "no demo data" on every run since
it shipped. Judged by what it must carry now. 29 of 29 sections.

**Four side effects inside React state updaters**, two of them mine from the
same morning. Held by `check-updater-purity`.

**The ratio was five in six.** Five of the six sweeps were measuring something
other than what they claimed before they were fixed, and the detail is in
`scripts/_sweeps/README.md`. Every one of the five was the same mistake wearing
a different hat: a scanner looking for a literal name where this codebase uses
an indirection. An admin rule reached through `checkAdminAuth`. A column list
built as an array. A column written through `updates[\`${x}_completed_at\`]`.
A column assigned with `patch.col = `. `setTimeout` matching /^set[A-Z]/.

**Still open for Ellie:** W113, the lock on Learn's locked resources. W114,
one tap on her phone to confirm a ticked discussion stays ticked.

## 2026-10-21 — In Practice into Drive, and the Learn list that looked empty

Tree clean, pushed at f0b289c1, EAS update published, `npm run check` green.

**Twelve In Practice drafts into her Drive**, then eleven after she dropped the
Bridge article, plus two new ones. Product / Active / In Practice, four folders
by section. Each doc is the rewrite, a note on what changed, and the current
live words underneath. Nothing customer-facing shipped; the builder runs her
own voice rules over MY prose before upload and failed twice on my own hedges.

**The Learn list.** /api/posts answers with `posts` and `categories`. The
screen seeded `posts` from the cache and left `categories` empty, and the list
is `categories.map(...)`, so it drew the filter pills and then nothing until a
cold function answered. Everything it needed was already on the phone, one
field along in the same cached payload. `check-cache-seeds.mjs` holds it.

That gate was wrong twice before it was right, both worth knowing. It held one
endpoint's fields against another endpoint's cache, which is what happens when
a scan attributes assignments by file rather than by the request they came
from. Then it treated `!recall('posts')` as "uses the whole payload" and
exempted the one file it existed for, reporting "all 0 fields" and exiting 0.
A presence test is not a payload read.

**Two naming systems collapsed into one.** `post-categories.js` holds the names
Ellie chose; `_in-practice.js` had a second map with its own strings, and they
disagreed on two of four. The site said Methodology everywhere visible while
the payload said Couple Types, which is what the app prints on a card. The
label is now the shelf, derived. check-in-practice holds each article's own
label to its shelf, which is what it did not cover: planting a literal back
walked straight through every other check in that file.

**Open for Ellie:** the twelve rewrites, and whether to publish the two new
Methodology drafts. Nothing is blocked on me.

---

## 2026-10-26: the admin round, and six stub faults

**Where it stopped:** every item on Ellie's list is built and pushed. Three
things are hers: A71 (run migration 097, the block is in TASKS.md), C34 (two
slider labels for Reassurance), P9 (the admin banner overclaims about emails).

**The one that mattered.** Seven "missing data" reports were a single bug.
`api/admin-data.js` builds seven measures inside `buildResponseAggregates`, so
it sends them under `responses`, and seven renderers in `public/admin.html`
read them off the top level. Every tile drew its empty state. `respOf()` and
`respSegOf()` are the two accessors now, and `check-admin-payload-keys`
resolves each read to its binding so an aliased copy cannot slip past.

**The survey has never saved an answer.** Migration 079 created the upsert's
arbiter as a PARTIAL unique index, and PostgreSQL will not infer one without
the statement repeating its predicate, which supabase-js does not emit. Every
save raised 42P10 and the endpoint answered 500. 097 makes it plain.
`check-upsert-arbiters` holds all three `onConflict` arbiters in `api/`.

**What to be careful of next session.** Six probe-stub faults cost more than
every product bug in this round. One reported seven broken tiles as working;
five reported working features as broken and each sent me hunting a bug that
was not there. CLAUDE.md now carries the rule: build a stub from the server's
own return statement, and where the server imports a module to shape a value,
import the same module and call it. The probe does that for
`withEffectivePromoCodes`, `genericLabel` and `DIM_META` now.

**Also worth knowing.** Type Analytics had three filter dropdowns that the
code read and the markup never contained, so every figure on that page had
always been the whole population. `api/_lib/dimensions.js` is now the one home
for the ten dimensions; there were four maps, disagreeing about the words and
the set. `api/_lib/convo-copy.js` holds nine sentences that were typed out
twice. And `check-workbook-image` caught the dimensions move the moment it
landed, which is what it exists for.

## 2026-10-26, later: the picker, the privacy strip, and the payment path

Section 2 is empty. Everything Ellie sent is built; section 3 holds what needs
her eye and section 1 holds only things genuinely waiting on her or on launch.

**Three findings worth knowing.**

`api/admin-data.js` was sending buyer name, email, both partner names and the
full shipping address into the browser on every load, under a banner promising
none of it was there. Nothing drew them: the Fulfilment page went in 92b3e2fb
and every reader went with it in all but name. `api/_lib/admin-order-privacy.js`
strips them on the way out; `check-admin-order-privacy` fills one order with
every identifying column and searches the answer for those VALUES.

The Explore field pickers are a control of our own now. A `<select>` popup is
drawn by the operating system and ignores the page, which is why Ellie could
never see the section colours. The select is still there, hidden, and the
picker renders it, so the field list stays in one place. `check-field-picker`
drives it and reads computed colours.

The payment path had never been executed. `check-payment-writes-order` signs a
Stripe event, runs the real handler against a stubbed fetch, and asserts one
order row out of a signed event and none out of a forged or stale one.

**What to watch.** TASKS.md grew eleven pointer rows this round, each written
when work moved on and left behind once its successor was done. Ellie read
section 3 and found everything twice. `check-tasks-doc` now fails on a review
row that hands its work to a row already closed; the distinction it draws is
the id in the final position, which is a pointer, against an id mid-sentence,
which is a citation and fine.

## 2026-10-27: five sweeps, five bugs, and Explore still undiagnosed

Ellie: "I can't engage, scan for bugs."

**Found and fixed.** The promo code Status toggle wrote its change and then
refreshed a page deleted in 92b3e2fb, so the row kept its old status until a
reload: she approved that toggle as A26 the same week. The Explore page's
"could not read" banner anchored to three ids that are not on that page, so it
had never once drawn. Fourteen dead functions, two of them minting admin
tokens with `Math.random`. Five pages built with class names nothing styles.
Two byte-identical copies of a constant-time password comparison.

**Three sweeps are in `scripts/_sweeps/`**: missing ids, dead admin functions,
undefined classes. Two more found nothing and say so, including why the styles
one is a small figure. Re-running any of them is cheap.

**Still open: A81.** Ellie reported "Explore page isn't loading" after the
field picker shipped. I could not reproduce it and still cannot. Removed every
difference I control: the live admin.html is byte-identical to local once
credentials are substituted, all three admin endpoints answer 401 from outside
rather than 500, and driving the page with the REAL 175-field catalogue (built
by appending one export to a copy of admin-explore.js) renders 7 bands, 176
options and no errors.

What shipped instead is a fallback: the mount cannot take the page down any
more, and if it fails it restores the plain dropdown and draws one grey line
saying "the coloured picker could not start." So the next datum is one glance
from her: coloured banners means it was a stale file; that grey line means it
is throwing and the cause follows from it. The question is in TASKS.md A81.

## 2026-10-27, later: the pricing page

Seven sweeps now in `scripts/_sweeps/`. The one that mattered this round was
`sweep-missing-ids` pointed at the static pages rather than the admin.

**public/offerings.html had a sticky bar naming the wrong package.** It follows
whichever package you have scrolled to, by `getElementById` on four ids that
are not on the page: the long package sections were replaced by four tiles and
both features that used them kept looking for the old markup. A reader at
Attune Premium saw "$89 - The Attune Assessment" and the button added the
Assessment. Fixed by giving the tiles their ids AND changing the rule, because
the tiles are one row and the old rule then pinned it to Premium everywhere.
The rule now is: the tile nearest the viewport centre, out of those in view,
and the entry package when none is.

**Three dead features' code removed** from home.html and offerings.html. One
threw on every page load into a catch that explained it away, which is why
`sweep-page-console` saw nothing: that sweep is honest about this limit in its
own header.

**Worth knowing for next time.** `check-package-tiles` matched a tile's class
and onclick as adjacent, so adding an attribute between them reported all four
packages missing. If a markup edit makes a gate report something implausible,
suspect the matcher before the markup.

**Still open: A81**, unchanged. Ellie has not yet been able to look at Explore,
and the fallback means it works either way. The question in TASKS.md A81 is one
glance: coloured banners, or a grey line saying the picker could not start.

## 2026-10-27, third round: the Explore labels and a dead writer

**Ellie's three Explore items are done.** The "read error" rows now say what
they measure; "(as read by partner)" was backwards and is "Their guess about
their partner"; and Expectations has a High level block for the first time,
six rows, built on `api/_lib/resp-agreement.js` which both admin endpoints now
share. That extraction was checked against the old inline code over 400
generated couples before switching.

**Watch for this shape.** Renaming a field's `group` moved ten fields into
Demographic, silently, because the group string is the key into GROUP_MAP.
Nothing failed; the picker listed them under the wrong heading. There is a
gate now, `check-explore-groups-mapped`, and its own first version was blind
to all four plants: it asked each field for a `mapped` flag that `placeAll`
does not copy onto it, and its other half read a constant that was not
exported, so it skipped in silence.

**A dead writer closed a loop.** `completeProfileSetup` in src/App.jsx had no
caller and was the only thing that ever wrote `profile_setup_complete`.
Removing it made `check-prompt-state-written` fail, correctly. The
profileComplete rule is now the field test alone, which is S80.
**Behaviour change worth watching:** anyone who passed the old setup modal and
still has a blank demographic field will now be prompted to finish it.

**Nine sweeps in `scripts/_sweeps/`.** Three found nothing and say why,
including one whose first scope reported six false positives.

**Still open: A92**, and it is a question for Ellie, not work. Clicking a
package tile on Browse now centres it, because the detailed section it used to
jump to no longer exists. She may want it to add to cart, or do nothing.

## 2026-10-27, fourth round: site and app parity

Asked to confirm the site and the app match. They do, and the evidence is in
TASKS.md V1 with the gap named in V3.

**Both surfaces are current.** Production's app bundle was published
2026-10-27T01:44:59Z, after the last commit touching attune-app/src, with
nothing since. The live website bundle is HEAD, verified with a string the
newest commit removed plus a control string it left alone.

**Content parity is held by eighteen gates and the smoke run.** Scoring
identical over 400 answer sets; 29 of 29 sections render on the site and all
29 have an app screen; every results sentence reachable by the app with four
chrome exemptions; plans, budget, nav names, colours and links each gated.

**The gap, if anyone wants to close it:** nothing renders the same couple on
both surfaces and diffs the output. Every check compares a rule or a list.
Doing it needs the app served through its web build, which probe-notes-screen
already demonstrates the shape of.

**Two sweeps this round were the harness, not the product**, which is worth
repeating because it is now the usual ratio. Matching sections by literal id
missed that both surfaces handle covers and conversations by pattern. And
`understanding.asymmetry` looked website-only until the matches turned out to
be a comment and a line of copy. The `understanding` block itself was already
stripped before sending, by the same audit, recorded in api/results.js.
