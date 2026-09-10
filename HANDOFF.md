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
