# Tasks

Four sections, and they hand work back and forth.

**1. Needs you** is everything blocked on you: a migration to run, a credential
to supply, a decision to make, a question to answer. Nothing here moves until
you touch it, so it goes first.

**2. Open** is my list. Things to build or fix, none of them waiting on you.

**3. For you to review** is the softer half of your list: things built and
working that I cannot confirm on my own, because they need an eye or a phone.
Looking at them is the whole job.

**4. Done and verified** is the record, with the evidence for each line.

The difference between 1 and 3 is whether anything is blocked. A migration that
has not run means a column is missing and a chart is empty; an unreviewed
design means nothing at all until you dislike it. Section 1 used to hold only
my questions, which is why three migrations sat in section 3 where they read
as optional. They were not.

**A status is a claim and needs evidence.** Section 4 names the check, the
browser run or your own word. Nothing sits in section 3 that a check could
have proved instead.

---

## 1. Needs you

Everything here is blocked on something only you can do. A migration I am
not allowed to run, a credential I do not have, a decision that is yours.
Nothing in here is waiting on me.

Ids never change, so R28 stays R28 wherever it sits. Tell me "R28 run" or
"O5 leave it" and I move it on.

### Run these in the SQL editor

**Nothing waiting.** 061 to 065 are all run.

I deliver migrations and you run them. That is deliberate and it is in
CLAUDE.md, so anything new sits here until you do.

| # | Migration |
|--|--|

### Decide these

| # | Decision |
|--|--|
| O7 | **Nothing to do unless you want to change it. Answer when you have a view.** Every page has a hidden tag telling Google which address is the real one, and all thirty-odd of them say `attune-relationships.com` while the site actually serves from `www.attune-relationships.com`. Google follows the redirect, so nothing is broken today. Changing them is a small SEO risk either way, which is why I have not done it on my own: search rankings attach to one address, and moving the tags moves which one. My recommendation is to leave it until closer to launch and then change them all at once. |
| O1 | **No action needed until the app is in the App Store.** When it is, tell me and I change two lines: `APP_LIVE = true` and the store link. That turns on the download buttons and the app mentions across the site, all of which read from those two lines. |
| O16 | **No action needed until the app is in the App Store.** Right, as you say. When it is live, download numbers need an App Store Connect API key, an issuer id and a private key from your Apple developer account, and I will tell you exactly where to click. Two things on the Engagement page are waiting on it and both say so on the page. |

### Answer these

| # | Question |
|--|--|
| Q2 | **Where is the dot and eyebrow you can see on How you each rated and Side by Side?** I cannot find it. I rendered both pages in a browser and read what sits above the heading: nothing does, on either. The gate that forbids a page eyebrow passes, and it matches the shape as well as the words. Two things in the top left of the results view do carry a dot and a section name, and either could be what you mean: the sidebar's own row, which reads a dot then Relationship Reflection, and on a narrow window the pill bar above the page. Tell me which, or send a screenshot, and it goes. |

## 2. Open

My list. Things to build or fix, none of them waiting on you.

When you send me a list, or when a sweep turns something up, it appears here.

| # | Task |
|--|--|
| O131 | **Sweep for bugs.** From outside with curl, and through the code for the shape that keeps recurring: one rule kept by hand in two places. |

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
| R78 | **Couples who own Conflict Patterns were never offered the reminder.** The home screen decides whether to show "Send them a reminder" from a list of exercises, and that list was written out by hand with four of the five. Conflict Patterns was missing, so if you had finished it and your partner had not, the card never appeared, and your results were waiting on the one exercise the screen would not mention. The same bug was in the block six lines above it, was found, and was fixed there only. It reads the registry now. The gate that exists to catch this had been skipping the file, because the file imports the registry somewhere else in it, and it no longer does. Nothing for you to do. |
| R77 | **Anyone could make the site send order confirmation emails.** Found by sweeping every endpoint from outside with curl, which is the habit CLAUDE.md asks for and which has now turned something up twice. `/api/send-order-email` checked who was calling only when the request came from a browser. Anything that is not a browser, which is any script anywhere, skipped the check entirely and could hand us a name, an email address, a total and an order number and have us send that person a branded Attune order confirmation for a purchase that never happened. The same endpoint also accepted any domain that merely ended with ours, and any Vercel preview in the world. `/api/send-email` had exactly this hole, was fixed, and this file kept the old version: one rule, two copies, and nobody looked at the weaker one again. Both now read one guard, and `check-mail-origin.mjs` runs both endpoints against six ways of asking and fails the build if a refusal stops being a refusal. Nothing for you to do. It is here because you should know it existed. |
| R73 | **Alerts reach you now.** Six kinds of alert have had copy since the notifications table went in, one was ever raised, and no screen in the app has ever read one. So the notice that a partner deleted their account, which the retention policy promises in writing, reached nobody. Four are raised now: your partner finished, your partner shared a note, your partner is waiting on you, and the account deletion. They arrive as rows at the top of the tile on Home, above what is next. Tapping one takes you to it and clears it. To see one: finish an exercise on one account when the other has finished theirs, or share a note from Notes. |
| R74 | **The words in those alerts are mine, and they are yours to change.** Six short lines, two to ten words each, in `api/_lib/notifications.js`. They were written when the table was built and nothing has ever shown them to anyone, so nobody has read them yet. Tell me what you want them to say. |
| R75 | **"Send them a reminder" now sends a reminder.** That card has been on the home screen since the card engine was written, pointing at the screen it was already on: it said it would send something and sent nothing. There is a cooldown of three days, and after you send one the card comes back as "Waiting on them", greyed out, which is the confirmation. No email goes with it. One person asking another to finish something should not arrive as a message from Attune, but say if you disagree. |
| R76 | **Two alerts are deliberately switched off.** New in In Practice, and your own results being ready. In both cases the home screen already carries a card saying exactly that, and an alert directly above it is one prompt printed twice. I built the results one first and a screenshot of the home screen settled it: the same sentence, in two rows, touching. Your partner still hears that you finished, which is the half of it they could not have known. Both are recorded as unraised rather than left looking like an oversight. Say the word and either turns on. |
| R66 | **Selecting text, the way you asked for it.** Press and hold a word, keep holding, drag across what you want, let go. The toolbar appears just above the selection with highlight, underline, tag, note and share, and choosing one opens straight on that step. In the simulator: click and hold for about half a second, keep the button down, drag, then release. The mouse is the finger. |
| R67 | **The reflection action plan tiles are on the ground now**, not white, matching the other at a glance pages and the site. |
| R68 | **The checklist opens with everything closed**, six headers and their counts. |
| R69 | **Intimacy detail pages: the side by side rows are the communication rows**, poles either side and wrapped, and the legend only appears when your initials match. |
| R70 | **Conflict at a glance says *private to you**, in red, level with Your action plan and out at the right margin. Both surfaces. |
| R71 | **The tip tile's label is white** on every expectations detail page, and the pole labels on How you each rated wrap instead of clipping. |
| R72 | **What Comes Next carries each section's own action plan.** Communication was built from a different list than the one its at a glance page draws, so the same couple was told two different things depending on which page they were on. |
| R2 | **App insights and results.** Every section the website has, drawn the same way: couple type and its map, the storycards, comms, expectations, reflection, intimacy, conflict. 28 sections now: the reflection action plan and Conversations Worth Having were both removed from both surfaces. |

### Copy, and whether the words are yours

| # | Review |
|--|--|
| R10 | **Privacy policy.** Everything in it, including the paragraph I wrote about the engagement measurements. |
| R11 | **Terms of service.** |
| R12 | **The effective dates on both**, which still read "TODO before publishing". Only you can set them. |
| R13 | **The deletion emails**: the confirmation to the person, and the notice to their partner. My words, in `api/_lib/deletion-emails.js`. |
| R17 | **The workbook's same-type moment blocks for XX, YY and ZZ.** Eighteen moments, ninety lines, mine, written to match the WW set. In `api/_workbook-prose.js` as `MOMENTS_SHARED_X/Y/Z`. |
| R25 | **The workbook's dimension pages and moment cards now use the personalised wording**, the one that names both people. Your call on G14. Worth reading one dimension and one moment card to see it land. |

### Behaviour, which has to be used rather than looked at

You asked whether these have to wait for the App Store. Almost none of them
do. Each one now opens with what it needs, so you can tell at a glance
whether it is something you can do this afternoon in the simulator.

The simulator is a real copy of the app: taps, drags, text selection and the
keyboard all work, with the mouse standing in for a finger. What it cannot do
is be a phone that has been closed for a day, or have a real Apple ID, or
receive a notification from Apple's servers.

| # | Review |
|--|--|
| R34 | **Simulator.** Tap Insights while you are already on Insights. It should go back to Highlights from wherever you were. Coming to Insights from another tab should land where you left off, as it does now. |
| R55 | **Simulator.** Same gesture on Resources, Notes and Home: Resources should close an article or a tool, Notes should close the editor, Home should scroll to the top. |
| R22 | **Simulator.** Press and hold a word in your results, drag to select a phrase, then highlight, underline, tag, note or share it. The long press is a click and hold; the drag is a drag. Nothing here needs a real device. |
| R23 | **Simulator.** The five exercises end to end, including Physical Intimacy, whose multi-select screens the automated driver cannot work but a person can. |
| R24 | **Simulator for the file, a real device to read it.** The workbook opens as a .docx from the app; the simulator can download it and hand it to whatever opens .docx files on your Mac. The PDF needs `WORKBOOK_SERVICE_URL` set, which is a server setting rather than a phone one. |
| R20 | **A real device, and time.** Sign in, close the app, come back tomorrow. The simulator can do the first two; the point of this one is the third, and a simulator that has been asleep is not a phone that has been in a bag overnight. |


## 4. Done and verified

| Verified by you | What |
|--|--|
| R57 | Physical Intimacy at a glance, as percentages |
| R58 | The back arrow, and the headings clear of the status bar |
| R59 | The add a tag field, with its examples in it |
| R60 | No orange rule under the expectations page titles |
| R63 | Conflict at a glance, with colour in it |
| R64 | The intimacy action plan: top two plus ties |
| R65 | The pole labels on the bar centre line |
| R52 | The Notes empty states, in their tiles |
| R3 | The app notes tab |
| R5 | The website marketing pages |
| R35 | The fade at the edge of a scrolling row |
| R36 | Closed: no longer applicable |
| R8 | The couple map, both surfaces |
| R47 | The connecting lines, curved and even |
| R48 | The couple map at 72% of the storycard |
| R49 | The Conflict Snapshot as a table |
| R51 | Two answers at the same point, evenly either side of the bar |
| R37 | Communication at a glance in its own purple into orange |
| R31 | The tile on every at a glance page |
| R9 | The Engagement tab, as it stands |
| R4 | The app resources tab |
| R6 | The website results pages |
| R38 | The storycards: the marks carry initials and step apart, the two clipped figures are whole, and the Life & Values ring is right. The map is still too small, which is O83 |
| R42 | Your Patterns matches the site. The Conflict Snapshot does not, which is O87 |
| R43 | Sort by, and what it offers. Its menu is too heavy, which is O88 |
| R45 | Physical Intimacy is in the app |
| M64 | Migration 064: the default tags, cleared out of accounts that already had them |
| M65 | Migration 065: so an In Practice article read in the app can be marked read |
| R28 | Migration 062: the qr columns and the policy that let anyone read order rows |
| R29 | Migration 063: row level security on admin_presets |
| R26 | Migration 061: the surface column, so app and site can be told apart |
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
| What Comes Next collects the same six sections on both surfaces | the server had five and not the same five: Conflict but no Communication, while the website had Communication and no Conflict. `check-what-comes-next.mjs`, planted |
| The payload carries nothing either surface leaves undrawn | protocols and widest were the last two; both are consumed where they are used now, and `check-app-draws-payload.mjs` has an empty exemption list |
| The six values neither surface drew are no longer computed or sent | gone from the payload, the app's types and the one test that asserted on one |
| A storycard is the same size on a laptop, a phone and in the download | the text sizes against the card rather than the browser window; 16 of 135 nodes moved, all of them to the size the app already used |
| The app draws the action plan note the site shows | `tile.reflect` arrived on the payload and nothing drew it; `check-app-draws-payload.mjs` now fails on any results field the app never names, planted three ways |
| Both people's placement dots are visible when they gave the same rating | the app drew them at the same point at the same size, so the second covered the first; `check-overlapping-marks.mjs`, planted twice |
| The phone's pill nav offers every section the sidebar does | it had five of eight and no Conflict Patterns at all; rendered at 420px it now shows Type & Map, Comms, Expectations, Refl., Intimacy, Conflict, What's Next. `check-mobile-nav.mjs` |
| Phrases to try is three shaded tiles with a phrase in each, on both | rendered on the site: the section heading then three quoted phrases, no outer tiles, no mode labels, no eyebrows |
| The reflection action plan page is gone from both surfaces | one removal in api/_lib/results-sections.js took it out of the nav on both; 29 sections render clean |
| The site's at-a-glance action plan is what each of you wrote | it was a derived list; it is now the answer to "one thing I want to work on", the same question the app uses |
| The expectations tip tiles read "A tip for [name] and [name]" on both | one string in `PAGE_COPY`, sent on the payload and passed into the page |
| No results page anywhere carries a page dot and eyebrow | the last two were reflection pages; `check-page-eyebrows.mjs` was blind to them because the name came through a constant, and now matches the shape as well. Planted both ways |
| The four at-a-glance titles you named are the same on both surfaces | `PAGE_TITLES` in api/_lib/results-sections.js, sent on the results payload; neither surface writes a page heading of its own for these four |
| "Where you each land" is "Communication style overview" on both | `PAGE_COPY.commPlacements`, read by both |
| The reflection ratings page is "How you each view the relationship" | one string in api/_lib/reflection-results.js, which both surfaces already read |
| The storycard rule is the same orange-to-indigo gradient on both | it was solid orange in the app; the gradient and its size come from the payload now |
| The mark sits beside the wordmark on both | the app had the word alone; it uses the PNG the rest of the app already ships |
| Both surfaces draw each person in the same colour | the partner dot was a lighter blue in the app; `PERSON_COLORS` is shared and both read it |
| No endpoint answers 500 to a body it should refuse | `check-body-parsing.mjs`, 343 calls across 53 endpoints, planted three ways |
| Unmatched URLs answer a real 404 on the live site | checked from outside: /gift-cards, /lmft-booking and a nonsense path all 404, the real pages still 200 |
| The 404 page renders and offers six ways back | loaded it in a browser on the live site |
| Every one of the nine storycards is sized from the shared scale on both surfaces | `check-storycard-type.mjs`: 30 roles, no type written anywhere in the website's card region, and no role either surface leaves undrawn |
| Converting the website changed nothing on screen | 135 text nodes captured from all ten cards in a browser before and after, identical three times |
| The couple type page is titled "[name] and [name]'s unique relationship dynamic" | your wording, in `PAGE_COPY.coupleTypeTitle`, read by both surfaces |
| The placement dots on the overview pages are bigger | 10px to 13px in the app, which is the size the site draws |
| The dividing line is back under the expectations page heading in the app | it stayed on the site throughout |
| The expectations intro tile has room above it | a full step of spacing between the page title and the tile |
| Tapping Insights while already on Insights returns to Highlights | iOS reports a repeat tap as an ordinary tab selection, so what separates the two is whether the screen was focused when the press arrived |
| The reading time reads "6 min read", in orange | in the article row and at the top of the article |
| The "Swipe >" label is gone and the fade carries it | `EdgeFadedRow` draws each fade only when there is something past that edge, which covers the results nav too |
| In Practice articles are read in the app | all twelve were pages on the website that the app handed to the browser. Their bodies are generated from those pages into `api/_in-practice-bodies.js`; `check-in-practice-bodies.mjs` proves every word of every article reaches the app and nothing else does, planted three ways |
| The tag list starts empty, with an add field and five suggestions | opening Notes used to write twenty-one tags into the account. It writes nothing now, and the names an annotation is read through are sent as reference data instead, derived from the live lists on every request. `check-no-seeded-tags.mjs` runs the endpoint and proves all three, planted three ways |
| Every results page is the same colour on both surfaces | it was not: the website paints Communication purple into the brand orange and the app painted it in Conflict's blue, because six page gradients were typed on both surfaces and five pairs happened to agree. One copy now, in `api/_lib/section-grounds.js`; `check-section-grounds.mjs`, planted four ways |
| Physical Intimacy's Conversations page is cream, as it is on the site | it was in the section's dark gradient, which the site keeps for at a glance and the dimension pages |
| A repeat tap on Insights cannot silently stop working | the handle it goes through is cleared only by the screen that set it; two screens overlapping for a moment would have left it null for the rest of the session |
| Every results at a glance page is a rounded tile, detail pages are full width | your call, and my view is that it is the right one: a tile has edges, and edges claim that what is inside is the whole of something, which is true of an overview and false of a three-screen scroll. One component, `glance-tile.tsx`, so the five cannot drift |
| Relationship Reflection looks like the site, page for page | the at-a-glance heading and its line were built inside src/App.jsx and are now built once for both; the two detail pages were dark in the app and light on the site, and are light; What you each admire moved to the page the site puts it on; the ranking shows every item |
| Conflict's at a glance page is in the same tile | the detail pages already matched, bar a white card wrapped round two cream quote cards |
| Unmatched URLs answer 404 rather than 200 with an empty shell | the catch-all is gone from `vercel.json`; `check-route-targets.mjs` fails if it or anything as wide comes back, planted twice |
| The app and the website size a storycard from the same numbers | `check-storycard-type.mjs`, 17 roles, planted seven ways |
| The app home tile draws its icons in orange | one line, and a disabled row keeps the muted brown |
| The workbook download link is never handed over expired | `check-workbook-link.mjs`, 9 link shapes, planted four ways; the stored link was signed for 7 days and served forever |
| Every table in the schema has row level security | `check-rls-policies.mjs`, both halves, planted six ways in total |
| One six-month check-in email, the cron one | the browser-triggered copy is gone from the sender, the app and the trigger record; `check-email-preview.mjs` shows 13 emails, all triggered |
| No surviving RLS policy lets a stranger read personal data | `check-rls-policies.mjs`, replayed in migration order, planted four ways |
| Both workbook variants render, same type and different types | `check-workbook-renders.mjs`, planted three ways; the same-type one had been broken since this morning |
| All 27 review-document generators build | `check-doc-generators.mjs`, now part of `npm run check`; seven were reading constants out of src/App.jsx that had moved into modules |
| The reflection review shows its keyword lists, and says when one is gone | the names are read from the module rather than typed, so a missing list prints as missing instead of empty |
| The five emails nothing sends are gone | `check-email-preview.mjs`: 14 emails, every one with a trigger |
| The gift cards are retired | the designer, both card templates, the print sheet, the generator, the card endpoint, the claim endpoint and the claim path through signup. All five signup screens render character for character as before |
| A rejected database query is reported rather than drawn as a zero | `check-query-failures.mjs`, planted four ways; this is why the Engagement page read empty |
| Every tile on the Engagement page has its own slicer | 12 of them, rendered in a browser; payloads cached per cut |
| The visit numbers say they are visits, not unique visitors | on the headline tile and on the chart beside it |
| One set of package prices everywhere | `check-package-prices.mjs`, 9 tables, planted four ways; the tax endpoint was quoting premium at $295 against a $198 charge |
| The admin no longer prices anniversary at 159 or premium at 299 | corrected to the catalogue, and the gate above holds it there |
| Every email the product sends is rendered by the code that sends it, on one page | `check-email-preview.mjs`, 19 emails, planted four ways |
| The preview page holds no email copy of its own | same gate: an object with a subject and a body in that file fails the build |
| The record of which emails are actually triggered is current | `build-email-triggers.mjs` generates it, `check-email-triggers.mjs` fails if it drifts |
| Every scheduled email carries an unsubscribe link with the recipient's own id | `check-unsubscribe.mjs`, now rendered end to end from a profile row rather than read statically |
| The ten endpoint emails and the four order cases are unchanged by the refactor | snapshotted before and after, byte for byte identical |
| Every route in vercel.json lands on a file that exists | `check-route-targets.mjs`, 80 routes, planted four ways |
| Two routes pointing at files deleted in 97cacb6 are gone from vercel.json | `check-route-targets.mjs`; note /lmft-booking still answers 200 with the app shell, because the catch-all takes anything left, which is O5 and yours |
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
6. Anything blocked on Ellie goes in section 1, whatever kind of thing it is.
   A migration is not a review item: until it runs, a column is missing and a
   chart is empty. Three of them sat in section 3 reading as optional.

---

## The old section 3

Every individual ask from the first 135 messages, 184 of them, lived here as
its own row. They are all either verified above, folded into a review item, or
long since shipped and superseded. The full list is in git:

    git show 75e002c:TASKS.md

Nothing was thrown away. It was too long to read, which made it useless as a
list of what to do next, which is the only thing a task file is for.
