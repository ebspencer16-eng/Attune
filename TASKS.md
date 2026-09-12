# Tasks

Every request, one line each. Built from all 135 messages in the transcript,
not from memory. Updated when a list arrives, and again when the work lands.

**A status is a claim and needs evidence.** "Verified" names the check.
Anything only a person holding a phone can confirm stays in section 3.

---

## 1. Needs your guidance

| # | Question |
|--|--|
| G1 | Account setup in the app? You asked: should the order email say download the app, then set up there? Today setup is website-only (`screen-states.tsx:44`). It is a real build, not a copy change. |
| G2 | Insight of the day needs a title. The words are yours. Layout is built and waiting on them. |
| G3 | "Resources built in the app": which of Budget / Checklist / Workbook run *in* the app, vs open the site cleanly? Full in-app builds are large. |
| G4 | Waiting copy group 5: your line is generic. The site currently names the section ("...finished Expectations") and the partner ("Preston has not completed it yet"). Drop both for your one line? |
| G5 | `check-exercise-flow.mjs` has a sandbox path baked in and runs nowhere. Real coverage nothing else has. Migrate or delete? |
| G6 | Conflict Patterns has no demo answers, so it is absent from the showcase tour. Needs two written answers per partner, your copy. |
| G7 | Greeting rotation phrases ("welcome back" etc.) were generated as placeholders and never reviewed. In `ANYTIME`, `api/_lib/next-action.js`. |

---

## 2. Open

| # | Task |
|--|--|
| O1 | Site: Life & Values lands on the storycard highlights page instead of its own |
| O2 | App: two Life & Values dropdowns on Expectations at a glance |
| O3 | Waiting copy: your 6 lines into one shared module, both surfaces, plus a gate |
| O4 | Home: title above the insight, left-aligned |
| O5 | Home: citation below, right-aligned (currently centred) |
| O6 | Home: glow more visible |
| O7 | "Start shared budgeting" opens a blank website page |
| O8 | Expectations at a glance: coloured left border on every "conversations to have" tile, not just Life & Values |
| O9 | Same, mirrored in the app |

---

## 3. Done, not verified

Changed and building clean. Nobody has looked at it on a phone or in a browser.

| # | Task |
|--|--|
| U1 | Conflict results app matches site: one dark ground, cards, privacy line, repair columns |
| U2 | Splash overlay was the Expo logo on every launch; now `splash-icon.png` |
| U3 | Marking extended from 9 to 34 prose sites |
| U4 | Storycards in the brand typeface (cause of four rounds of "still different") |
| U5 | Expectations detail: progress bar removed (app) |
| U6 | Approach paragraph heading orange, from the couple type colour |
| U7 | Approach paragraphs: first sentence removed, all 50 |
| U8 | Comms glance: bars shortened, labels stop wrapping, evenly spaced |
| U9 | "Giving and Receiving Feedback" renamed "Feedback" |
| U10 | Storycard 5 "80%" no longer clipped |
| U11 | Placement dots tightened when they offset |
| U12 | Side-by-side bars widened back toward the tile edge |
| U13 | Couple map: dot glow, axis labels, legend removed, small print restored |
| U14 | Couple type: coloured tile, axes descriptions trimmed |
| U15 | Intimacy side-by-side moved into dropdowns |
| U16 | Rel Reflection, Intimacy, Conflict rebuilt to the site's pages |
| U17 | Resources: circular icons, top line removed, In Practice wired in |
| U18 | In Practice: narrow collections tile with arrows, Recent 2x3 |
| U19 | Couple type action items: eyebrow, left border, nested shaded phrase |
| U20 | Comms detail pages carry the site's intro paragraphs |

---

## 4. Done and verified

Newest first. Evidence named.

| # | Task | Verified by |
|--|--|--|
| V1 | Greeting said "good evening" at noon | `check-greeting-clock.mjs`, 6 times of day in 2 zones; 3 plants |
| V2 | No page eyebrows anywhere in results | `check-page-eyebrows.mjs` vs the server's nav; 3 plants |
| V3 | "Both exercises" → "all exercises" | Two survivors found and fixed; grep clean |
| V4 | QR printouts, root SQL, stale reviews deleted | 12 files; build + gates clean |
| V5 | `node_modules` untracked: 3,083 files, 56MB | Tracked files 3,574 → 463 |
| V6 | 16 Expo bootstrap leftovers deleted | App bundles; no references |
| V7 | "One thing to try" off conflict at-a-glance, both surfaces | grep: only on detail pages now |
| V8 | `SNAPSHOT_PROSE` and `repairTitle` deleted | No references anywhere |
| V9 | Every website view renders, not just results | smoke: 30 sections + 13 views; plant |
| V10 | Partner could be served the other's conflict patterns via the registry | `check-partner-privacy`, 5 plants |
| V11 | Entitlements takeable from the request 4 ways | `check-entitlement-inputs`, 4 plants |
| V12 | Ownership copied via lookup and list | `check-ownership-rule`, 5 plants |
| V13 | Client-side grant hoisted one line escaped the gate | `check-entitlement-bypass`, 5 plants |
| V14 | Auth header gate blind to property reads and `api/_lib` | `check-auth-headers`, 6 plants |
| V15 | Annotation fallback colour never checked against the palette | `check-annotation-palette`, isolated plant |
| V16 | 2 of 5 exercises dropped answers silently | `check-save-feedback`, 2 plants |
| V17 | Reflection placement dots rendered at 10000% | `check-position-units` |
| V18 | Four Conflict pages had never been rendered by anything | smoke 30/30 with a fixture |
| V19 | Text selection down to a sentence fragment | Ellie: "Word range selection is fine" |
| V20 | Notes tab: three sections, unread marks, sorted tags | Built to the spec in msg 105 |
| V21 | Rel Reflection pages had no data | Renders in smoke; `check-results-coverage` |
| V22 | Physical Intimacy missing from app nav | Nav comes from the server; 20 refs |
| V23 | Comms dimensions in the wrong order | `check-dimension-order`, one list |
| V24 | Both hidden answers now shown, app and site | `check-unshown-answers` |
| V25 | Conflict said "not open yet" when present | `check-conflict-source` |
| V26 | Conflict exercises worked on app, not web | Site read a stripped field; `check-stripped-fields` |
| V27 | Dashboard showed Exercise 1 incomplete | `check-results-gate`, 6 cases |
| V28 | Results opened before every owned exercise was done | Same gate |
| V29 | Physical Intimacy unlockable free on production | `check-entitlement-bypass` |
| V30 | Six named removals (dimension prose, 4 eyebrows, "what you each wrote") | Superseded by V2, wider |
| V31 | Side-by-side dropdowns on every detail page | Ellie: "Side by side looks great" |
| V32 | App results calculations matched the site | `check-scoring-mirror`, `check-alignment-rule` |
| V33 | "The bigger questions" → "Life & Values" | grep: only a comment remains |
| V34 | "Your next moves", "This week", "You two are" removed | grep clean |
| V35 | App-invented prose removed from results pages | `check-results-copy-reach` |
| V36 | Life & Values had no page on either product | Registry from one list; renders in smoke |
| V37 | App home redesign: blue ground, cream tile, insight of the day | Ellie: "Glow looks great" |
| V38 | Resources: exercises delisted, Explore more hidden when owned | Built per msg 81 |
| V39 | Marketing site: 12 items (hero italics, banners, spacing, sections) | Ellie reviewed |
| V40 | Portal: 8 items (banner line, eyebrows, pill, glance lines) | Ellie reviewed |
| V41 | Em dashes out of all customer copy | `check-em-dashes` |
| V42 | `/how-it-works` and `/couple-types` deleted, links removed | Files gone |
| V43 | Security audit: 14 findings, CORS, headers, error leakage | SECURITY.md; gates |
| V44 | `/api/create-profile` took `pkg` from the body | `check-entitlement-inputs` |
| V45 | partner-sync leaked conflict and intimacy | `check-partner-privacy`, `check-intimacy-privacy` |
| V46 | Sign-in enumeration | One message for all failures |
| V47 | Legal page, deletion flow, privacy choices, cookie notice | Ellie reviewed |
| V48 | Settings screen with in-app account deletion | Guideline 5.1.1(v) |
| V49 | Social sign-in, Google and Apple, both surfaces | `check-oauth-providers` |
| V50 | Reviewer test account | Ellie: "Dashboard fixed!" |
| V51 | Exercises answerable in the app, all five | `check-exercise-registry` |
| V52 | Results experience in the app, all 29 sections | `check-results-coverage` |
| V53 | Notes tab built against `/api/notes` | Ellie reviewed screenshots |
| V54 | Three hardcoded app-side lists deleted | `check-app-derives` |

---

## How this is kept

1. A list arrives. This file is updated first, before any work.
2. Work happens.
3. This file is updated again, then handed back for review.
4. A general ask ("remove all X") gets a search across both surfaces and a
   gate, not the edits the message happened to name. That miss is what put
   "How You Communicate" back in front of you after five eyebrows went.
5. Every content change to one surface is mirrored on the other. Standing
   instruction, msg 79.
