# Tasks

Four sections, and they hand work back and forth.

**1. Needs your guidance** is my questions for you: decisions I cannot make,
and copy I should not write.

**2. Open** is my list. Things to build or fix.

**3. For you to review** is your list. Things that are built and working that
I cannot confirm on my own, because they need an eye or a phone. Ids are
stable: tell me "R7 verified" and it moves to section 4, or tell me what is
wrong with it and it moves to section 2.

**4. Done and verified** is the record, with the evidence for each line.

As you work through section 3 you will send me things for section 2. As I
finish section 2 I will either ask you something in section 1 or put it in
section 3 for you to confirm.

**A status is a claim and needs evidence.** Section 4 names the check, the
browser run or your own word. Nothing sits in section 3 that a check could
have proved instead.

---

## 1. Needs your guidance

| # | Question |
|--|--|
| G18 | **Five emails exist that nothing sends.** `workbook_ready`, `beta_survey` and `partner_joined_notification` were retired at their triggers in August; `checkin_1yr` is sent by the cron from a different template; `welcome_account` appears never to have had a trigger. The templates are all still there. /email-preview now shows each one and says nothing sends it. Bring the trigger back, or take the template out? |
| G19 | **There are two different six-month check-in emails.** One is sent from the browser when an account turns six months old, subject "Six months with Attune. Worth a look." The other is sent by the cron, subject "How are you and [partner] doing?" Different words, same moment, and a couple could get both. Which one do you want? |
| G17 | **Have any gift cards been printed?** Four card templates said "visit attune.com", front and back, and attune.com is a live site belonging to someone else. It is corrected in the code now, but the fix only reaches cards printed from here on. If a batch went to a printer, they point the recipient at a stranger. The same address was on a published In Practice article as a contact email, so anyone who wrote to hello@attune.com reached nobody. |
| G16 | **"Unique visitors" cannot be answered by what is collected, on purpose.** An engagement event carries no cookie, no device id and no session id, so two visits by one person cannot be told from one visit by two. That is what the privacy policy says and what makes the collection defensible without a consent gate in the US. Counting unique visitors means storing something that follows a person between page loads, which changes the paragraph in the policy and what the EU banner has to cover. Three options: leave it as visits and label it that way, add a per-day rotating identifier that cannot link across days, or add a durable one. My preference is the first, then the second. |

## 2. Open

| # | Task |
|--|--|
| O16 | **App downloads.** Needs an App Store Connect key, an issuer id and a private key, and the app is not in the store yet. The Engagement page has a headline tile and a line series waiting on it, both of which say so on the page. |
| O1 | **App Store launch.** Two lines in `api/_lib/flags.js`: `APP_LIVE = true` and the real `APP_STORE_URL`. |
| O5 | **The catch-all in `vercel.json`.** Any unmatched URL answers 200 with a blank app shell, and `public/404.html` cannot be reached. One line either way; it changes routing on the live site, so it is your call. |
| O7 | **The canonical tags name the apex**, which redirects to www, so search engines are being pointed at a URL that 307s. Thirty-odd tags. An SEO decision. |

## 3. For you to review

Things that are built, shipped and working, that I cannot confirm on my own.
Design and copy need your eye; the rest needs a phone.

Nothing that a check can prove is in here. Those live in section 4 with the
name of the check that proves them.

**Ids are stable.** Tell me "R7 verified" or "R7, no, the glow is still too
subtle" and I move it to section 4 or open it in section 2. They are not in
any order; work through them however suits.

### Design, and whether it looks right

| # | Review |
|--|--|
| R27 | **The nineteen emails on /email-preview.** Every one is now rendered by the code that sends it, so what you read there is what goes out. Five are marked as sent from nowhere; those are G18 and not worth reading for copy until you decide. |
| R1 | **App home page.** The blue ground, the cream tile, the welcome-back line, the insight of the day and its glow, the pick-up row. Built to the Oura-adjacent direction you gave. |
| R2 | **App insights and results.** Every section the website has, drawn the same way: couple type and its map, the storycards, comms, expectations, reflection, intimacy, conflict. 30 sections. |
| R3 | **App notes tab.** Pick up where you left off, shared notes, unread markers, the tag list with its A-Z default and the sort dropdown. |
| R4 | **App resources tab.** The narrower collections tile with arrows, the circular "yours to explore" shapes, the In Practice grid, and the tiles for budget, workbook and checklist. |
| R5 | **Website marketing pages.** The hero without orange italics, no subpage titles in banners, tighter vertical spacing, the founders note redesign, the FAQ and packages changes, In Practice. |
| R6 | **Website results pages.** Eyebrows and pills removed, the comms summary page gone, the couple type action items in their new shape, the expectations dividing line. |
| R7 | **Highlight storycards**, both surfaces: the front and back arrows, and that nothing is clipped at the top. |
| R8 | **The couple map**, both surfaces: the two marks, the small print, and that the shading reads as the couple type's colour rather than generic orange. |
| R9 | **The Engagement tab** in the admin, rebuilt to your layout: four headline tiles, the funnel and acquisition lines, five time charts to one height, two Learning tables over two notes charts. Worth looking at once migration 061 has been running long enough to have numbers in it. |
| R26 | **Run migration `061_page_events_surface.sql`** in the SQL editor. Until it runs, the app column and the site column on every clustered chart stay empty, because nothing is telling the two apart yet. Events already filed keep counting, they just sit in neither column. |

### Copy, and whether the words are yours

| # | Review |
|--|--|
| R10 | **Privacy policy.** Everything in it, including the paragraph I wrote about the engagement measurements. |
| R11 | **Terms of service.** |
| R12 | **The effective dates on both**, which still read "TODO before publishing". Only you can set them. |
| R13 | **The deletion emails**: the confirmation to the person, and the notice to their partner. My words, in `api/_lib/deletion-emails.js`. |
| R17 | **The workbook's same-type moment blocks for XX, YY and ZZ.** Eighteen moments, ninety lines, mine, written to match the WW set. In `api/_workbook-prose.js` as `MOMENTS_SHARED_X/Y/Z`. |
| R25 | **The workbook's dimension pages and moment cards now use the personalised wording**, the one that names both people. Your call on G14. Worth reading one dimension and one moment card to see it land. |

### Behaviour, which needs a real device

| # | Review |
|--|--|
| R20 | **Sign-in holds.** Switch tabs, close the app, come back tomorrow. It should not ask again. |
| R22 | **Select text, then highlight, underline, tag, note or share.** The whole annotation path. |
| R23 | **The five exercises end to end in the app**, including Physical Intimacy, whose multi-select screens the automated driver cannot work. |
| R24 | **The workbook**, opened as a file from the app, and the PDF if you have `WORKBOOK_SERVICE_URL` set. |


## 4. Done and verified

| Verified by you | What |
|--|--|
| R14 | The partner-deleted notification line |
| R15 | The EU consent banner sentence |
| R16 | The delete-account password prompt |
| R18 | The waiting copy, in situ on both surfaces |
| R19 | The founders note, as it reads on the page |
| R21 | Scrolling on insights and results, on a device |


### Verified in code rather than by eye

Everything below was in the old "done, not verified" list and is provable
without you looking at anything. The check that proves each one runs on every
build.

| Verified | By |
|--|--|
| Every email the product sends is rendered by the code that sends it, on one page | `check-email-preview.mjs`, 19 emails, planted four ways |
| The preview page holds no email copy of its own | same gate: an object with a subject and a body in that file fails the build |
| The record of which emails are actually triggered is current | `build-email-triggers.mjs` generates it, `check-email-triggers.mjs` fails if it drifts |
| Every scheduled email carries an unsubscribe link with the recipient's own id | `check-unsubscribe.mjs`, now rendered end to end from a profile row rather than read statically |
| The ten endpoint emails and the four order cases are unchanged by the refactor | snapshotted before and after, byte for byte identical |
| Every route in vercel.json lands on a file that exists | `check-route-targets.mjs`, 80 routes, planted four ways |
| /lmft-booking and /api/lmft-request no longer answer 200 with an empty shell | both pointed at files deleted in 97cacb6; the routes are gone |
| Clicking Reviews lands on the reviews, not the top of the FAQ | faq.html scrolls to the section it already had an id for |
| Nothing in the tree names a domain that is not ours | `check-site-origin.mjs`, 383 files, planted four ways |
| The cart can price a workbook add-on again | in a browser: threw ReferenceError before, returns 108 after, which is the 89 package plus the 19 digital workbook |
| The combined CSV export can build a row | `s` was an undeclared name in four lines of it; `check-server-undefined.mjs` |
| An order arriving without line items still sends its receipt and setup link | three add-on flags were read and never passed; `check-server-undefined.mjs` |
| A login with a partner email in the form completes | it built the invite URL from an undeclared name and threw before the spinner stopped; `check-server-undefined.mjs` |
| No file under api/, public/ or src/ reads a name nothing declares | `check-server-undefined.mjs`, 139 files, planted six ways |
| Neither open write endpoint stores a row for an empty POST | `check-open-writes.mjs`, 14 bodies, and it counts outbound calls so a guard below the write is caught |
| The Engagement page is the layout you asked for: headline tiles, funnel and acquisition, five time charts, two Learning tables, two notes charts | rendered in Chrome: 9 canvases, 2 tables, 5 slicers, no console errors |
| Every view on the page reads one slicer, the same one the rest of the admin uses | the slice is applied server-side in `api/admin-engagement.js` before anything aggregates |
| No tile on the page draws a chart without first checking the measure was collected, and every gap says why | `check-engagement-honesty.mjs`, planted against three ways and caught all three |
| App time and site time can be told apart | `surface` on every event, sent by `public/_track.js` as `site` and by the app client as `app` |
| Results time is filed per section on both surfaces | `app:results:<section>` from the website, `useScreenTime(results:<id>)` from the app |
| Privacy policy, terms, data policy and EULA exist and are linked from every footer | `check-internal-links.mjs`, 908 links |
| "Your privacy choices" exists and Global Privacy Control is read server-side | `Sec-GPC` in `api/privacy-choices.js`; `check-consent-gate.mjs` |
| The privacy notice reaches every customer-facing page | `check-notice-reach.mjs`, 34 pages |
| Sign-in survives a tab switch, a locked keychain and an empty token | `check-session-recovery.mjs` |
| A link to something you own opens the sign-in form rather than a blank page | `check-gated-views.mjs`, 6 views |
| No results page repeats its own name as an eyebrow | `check-page-eyebrows.mjs`, 15 names |
| Expectations detail pages draw a dividing line, not a progress bar | `check-no-progress-bars.mjs` |
| Every results nav link resolves, including Life & Values | `check-nav-targets.mjs`, 30 links |
| All 30 results sections have a screen in the app | `check-results-coverage.mjs` |
| Every storycard field the server sends is drawn by the app | `check-storycard-fields.mjs`, 9 cards |
| Both surfaces score from the same questions with the same flips | `check-scoring-mirror.mjs`, 10 dimensions |
| Conflict and Reflection answers are drawn by both surfaces | `check-unshown-answers.mjs` |
| The waiting copy is one source and both surfaces mirror it | `check-waiting-copy.mjs`, 5 sentences |
| `pkg` cannot come from a request body | `check-entitlement-inputs.mjs`, `api/create-profile.js` |
| Conflict and intimacy answers never reach a partner's payload | `check-partner-privacy.mjs`, `check-intimacy-privacy.mjs` |
| `generate-card` fails closed without `CARD_SECRET` | 4 references in `api/generate-card.js` |
| Sign-in does not tell an attacker which half was wrong | `api/account-signup.js`, single message |
| Every exercise is answerable in the app and stores under the right key | `check-exercise-flow.mjs` in `npm run smoke` |
| Every package's add-ons are one rule | `check-pkg-rules.mjs`, generated from `PKG_CAPS` |
| The checklist and budget run in the app against one copy of their content | `check-tool-content.mjs`, `check-budget-mirror.mjs` |
| In Practice: all 12 articles reach the app | `check-in-practice.mjs` |
| The app does not sell | `check-app-does-not-sell.mjs` |


| # | Task | Verified by |
|--|--|--|
| — | `/api/admin-posts` and `/api/admin-presets` had never answered: 500 on every request since the day each shipped | Live, 401 now; `check-runtime-shape.mjs`, 2 plants |
| — | Nothing drew the 40 static pages, checkout included | `check-static-render.mjs` in `npm run smoke`, 2 plants |
| — | `save-exercise` kept its own list of exercises | Reads `api/_exercises.js`; every write verified against the old branching |
| — | Five copies of the site's address, disagreeing; the apex in two printed QR templates | `check-site-origin.mjs`, 3 plants, 347 files |
| — | Twelve In Practice articles linked to a page retired twice | `check-internal-links.mjs`, 2 plants; 908 links checked |
| — | `/app` signed out, and any unknown `?view=`, rendered a blank page | Confirmed live at 28 and 0 chars; now the sign-in form. `check-app-views.mjs`, 4 plants |
| — | In Practice, profile and feedback cards opened blank pages | Same gate; verified in a browser before and after |
| — | `check-exercise-flow` had never passed | Passes 3 of 3 driveable exercises; wired into `npm run smoke` |
| — | The browser checks leaked Chrome until the machine stalled | `scripts/_lib/browser.mjs` reaps on exit; verified both ways, and `npm run smoke` now runs end to end leaking nothing |
| — | The .docx printed "[PLACEHOLDER: ...]" in 7 places, including all 25 Conversation Library questions | `check-workbook-prose.mjs`, 3 plants; every key verified to resolve |
| — | The questionnaire is back on the website, at the end of What Comes Next | Rendered in a browser: four rating buttons, all seven questions, submit and the privacy line |
| — | Nothing in the product asked for feedback; three surfaces reported on it | `check-feedback-reachable.mjs`, 3 plants; the app asks now |
| — | The app can edit a profile | `check-profile-editable.mjs`, 4 plants; `check-profile-columns.mjs` widened to see columns named through a map |
| — | Four of the five engagement measures are collected and drawn | `check-tracking-consent.mjs` (5 plants), `check-engagement-honesty.mjs` (3 plants), aggregation tested over a sample |
| — | All 12 In Practice articles reach the app, six as placeholders | `check-in-practice.mjs`, 3 plants; excerpt now optional |
| — | 22 customer-facing pages showed no privacy notice, including the portal and every In Practice article | `check-notice-reach.mjs`, 2 plants; one notice on the portal, no duplicate app bar, checked in a browser |
| — | The surviving partner's results survive, anonymised | `check-results-survive-deletion.mjs`, 4 plants, run over a real payload. **Needs migration 059.** |
| — | Engagement tab, between Explore and Demographics | Renders in a browser; 4 of your 9 measures are live, 5 say what collecting them would take. `check-engagement-honesty.mjs`, 3 plants |
| — | Analytics tiles drew empty charts instead of saying they were empty | One change in `mkChart`, so it covers every chart on every tab |
| — | The EU/UK consent banner was a US notice with no Accept | `check-consent-gate.mjs`, 3 plants; a decline now stops Sentry |
| — | Deleting an account asked for no password | `check-delete-reauth.mjs`, 3 plants |
| — | Deletion told neither the person nor their partner | `check-deletion-notices.mjs`, 3 plants |
| — | Nothing recorded a consent event | `check-consent-record.mjs`, 2 plants. **Needs migration 058 run.** |
| — | The payment-records paragraph described retention we do not do | Amended; `check-em-dashes` and `check-copy-tokens` clean |
| — | The app's profile setup asked none of the five demographic questions | `check-demographics-capture.mjs`, 3 plants |
| — | Launch flags lived in four places by hand | `check-flags.mjs`, 4 plants |
| — | Profile setup could spin forever on a failed read | `check-read-failures.mjs`, 3 plants |
| — | Scheduled email carried no unsubscribe link | `check-unsubscribe.mjs`, 4 plants (2 of which it missed until fixed) |
| — | Dashboard reloading itself | Ellie's screenshot: 75s, 0 renders and 0 fetches in the last 5s |
| — | "Start shared budgeting" opened a 28-character blank page | `check-gated-views.mjs`; 1214 chars where there were 28 |
| — | Five of six category tiles had no colour | `check-category-colors.mjs`, 2 plants |
| — | Starting Out checklist runs in the app | `check-tool-content.mjs`, 3 plants |
| — | Shared Budget runs in the app | `check-budget-mirror.mjs` (4 plants), `check-budget-names.mjs` |
| — | Workbook opens as a file; the app cannot sell | `check-app-does-not-sell.mjs`, 1 plant |
| — | Account setup happens in the app | Endpoint derives the id from a token |
| — | In Practice posts read in the app | First renderer of post blocks on either surface |
| — | Life & Values on the site | Ellie: "L&V working" (it was the reload loop) |
| — | Expectations progress bar becomes a dividing line, site | `check-no-progress-bars.mjs`, 1 plant |
| — | "Explore something new" row | Already built in `api/_lib/pick-up.js`; I had reported it missing in error |
| 78.6 | For whatever reason the site just brought back the how it works and couple types pages, those were deleted lo... | the files are deleted |
| 81.9 | Couple type page is STILL showing different content from what we do on the site. I’m frustrated by this at th... | check-results-copy-reach |
| 96.11 | I’ve asked for this already, but please wire in the in-practice content so that I can see how this is built. | fetchPosts wired |
| 99.2 | A concern - my results on the site look different from my results in the app (looking at expectations, we wer... | check-scoring-mirror |
| 105.4 | Scorecard 2 is very different on the app than it is on the website. Do a thorough scan of code and renderings... | check-storycard-fields |
| 105.10 | Now our dashboard says Preston’s conflict exercise is pending. He’s completed it. Make sure this bug is fixed | check-results-gate |
| 105.11 | Even though his conflict is missing, we can access our results, only conflict results are gated. That’s an is... | check-results-gate |
| 105.14 | I want to be able to select text and have a small popup menu that has icons for highlight, underline, tag, no... | Ellie: "word range selection is fine" |
| 105.20 | Notes tab organization: | built to the spec in this message |
| 108.4 | No info filled in on our app’s relationship reflection pages | check-results-coverage |
| 108.7 | On the detailed pages’ sliding bars, when the dots offset they’re slightly too far apart. Can we bring them t... | check-position-units |
| 108.12 | Conflict exercises working on app but not on web | check-stripped-fields |
| 113.1 | My dashboard, again, showed that ex1 was incomplete. I signed out then signed back in and it fixed itself, bu... | check-results-gate |
| 113.4 | Remove ‘what you expect’ eyebrow from expectations results at a glance page | check-page-eyebrows |
| 113.5 | Remove ‘Physical intimacy expectations’ eyebrow from intimacy results at a glance page | check-page-eyebrows |
| 113.6 | Remove ‘conflict patterns’ eyebrow and dot from top left of conflict results at a glance page | check-page-eyebrows |
| 113.7 | Remove eyebrow text in top left of each conflict detailed page | check-page-eyebrows |
| 113.8 | Left nav calls it ‘what you both wrote’ and page hero is ‘what you each wrote’ . I assume the app uses the sa... | one title in nav and hero, grep clean |
| 116.4 | Storycards still look different than the ones online. Killing me. Check font, coloring, all visuals, etc. Am ... | check-fonts |
| 116.6 | Issue that I just noticed - the dimensions on the comms results at a glance page are in the wrong order. Make... | check-dimension-order |
| 116.11 | Physical Intimacy is still missing from the top nav. Am I viewing an old version of the simulator? | nav comes from the server |
| 132.4 | We need to make sure the app pipes in the welcome back, good morning, etc. messages appropriately - it’s noon... | check-greeting-clock |

---

## How this is kept

1. A list arrives. This file is updated first, before any work.
2. Work happens.
3. This file is updated again, then handed back for review.
4. A general ask ("remove all X") gets a search across both surfaces and a
   gate, not the edits the message happened to name.
5. Every content change to one surface is mirrored on the other (msg 79).

---

## The old section 3

Every individual ask from the first 135 messages, 184 of them, lived here as
its own row. They are all either verified above, folded into a review item, or
long since shipped and superseded. The full list is in git:

    git show 75e002c:TASKS.md

Nothing was thrown away. It was too long to read, which made it useless as a
list of what to do next, which is the only thing a task file is for.
