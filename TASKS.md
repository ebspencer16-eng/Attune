# Task ledger

Every request Ellie has made, with its status and how that status was
checked. It exists because statuses were being reported from memory, and
on 2026-09-12 she found two things reported done that were not.

**The rule: a status is a claim, and a claim needs evidence.** "Done" here
always says how it was checked. Anything checked only by reading code that
looks right is marked *unverified*, because that is what it is.

Status vocabulary:

| | |
|---|---|
| **DONE** | Verified. The check is named. |
| **DONE (unverified)** | Changed, but nothing has confirmed the result on screen. |
| **OPEN** | Not done. |
| **PARTIAL** | Done in one place, not another. The gap is named. |
| **ELLIE** | Waiting on a decision or on copy. |
| **CANNOT REPRODUCE** | Reported broken, not reproducible here. What is needed is named. |

---

## Open right now

| # | Ask | Status | Notes |
|---|---|---|---|
| 1 | No page eyebrows anywhere in results, site and app | **DONE** | Four more removed from the site: "How You Communicate" on the comms glance, "Physical Intimacy", "Conflict patterns", and an empty eyebrow row still holding its margin on the Expectations detail pages. The app had none. `check-page-eyebrows.mjs` now fails the build on any uppercase label matching a section name from the server's own nav; verified by planting one on each surface, and by confirming a block label that is not a section name stays quiet. |
| 2 | Life & Values detailed page not working | **CANNOT REPRODUCE** | Registry fixed in d5e2669: the nav offers `exp-convo-5` and the section exists. In demo the page renders 1991 characters, more than its neighbour. Clicking through from the glance did not move `activeResult` in my harness, which may be my harness or may be the bug. **Need: is it blank, wrong content, or does the link go nowhere? Site or app?** |
| 3 | "Both exercises" prose → "all exercises" | **DONE** | Two left, not one: "Both exercises complete" and "Both exercises complete." with a full stop, which the first search missed. Both changed. |
| 4 | Expectations glance: colour every "conversations to have" tile, not just Life & Values. App mirrors. | **OPEN** | New 2026-09-12. |
| 5 | Home: title the insight of the day section; title above left, citation below right | **OPEN** | New 2026-09-12. The title text is copy, so it is Ellie's unless an existing server label fits. |
| 6 | Home: make the glow more visible | **OPEN** | New 2026-09-12. |
| 7 | Home: greeting says "good evening" at noon | **DONE** | `/api/home` runs on the edge, where the clock is UTC, and `getHours()` read it. Noon Mountain is 18:00 UTC. The device now sends its offset and the server does the arithmetic. `check-greeting-clock.mjs` checks all three parts and six times of day in two zones; verified by planting each part of the fix being undone. |
| 8 | "Start shared budgeting" opens a blank page; build the resources into the app | **OPEN** | New 2026-09-12. Two things: the broken link, and the larger question of the tools living in the app at all. |
| 9 | The twenty phrasings of "this opens when you have both finished" | **ELLIE** | List pulled for review 2026-09-12. One sentence everywhere, or six keyed by situation. |
| 10 | Placeholder greeting phrases | **ELLIE** | Generated, in `ANYTIME` in `api/_lib/next-action.js`. Never reviewed. |
| 11 | `check-exercise-flow.mjs` cannot run | **ELLIE** | Has a sandbox path hardcoded in it. Real coverage nothing else has. Migrate to the Chrome driver, or delete. |
| 12 | Demo answers for Conflict Patterns | **ELLIE** | Needed if Conflict should appear in the showcase tour. Two written answers per partner, her copy. |

---

## Closed

### Results and content

| Ask | Status | Checked by |
|---|---|---|
| Conflict results in the app don't look like the site | DONE (unverified) | Four pages compared block by block against `src/App.jsx`; the glance ground, the privacy line, the written-answer cards and the repair columns changed. Not seen on a phone. |
| Remove "One thing to try" from conflict Results at a glance, both surfaces | DONE | `grep` confirms it now appears only on the Patterns detail page and the comms domain pages. |
| Delete `SNAPSHOT_PROSE` and `repairTitle` | DONE | No references remain anywhere, including the payload, the app's types, the fixture, the copy test and the approval doc. |
| Display both answers that were never shown, app and site | DONE | `check-unshown-answers.mjs`: 6 shared conflict fields drawn by both, 8 written Reflection questions have headings. |
| Conflict says "not open yet" when it is present | DONE | `check-conflict-source.mjs` passes; both surfaces read `/api/conflict-results`. |
| Conflict exercises work on app but not web | DONE | 580fc21. The site read a deliberately stripped field. `check-stripped-fields.mjs` gates it. |
| Dashboard showed Exercise 1 incomplete | DONE | `check-results-gate.mjs`: 3 deciders, one rule, 6 readiness cases. |
| Reflection placement dots missing | DONE | Six `Marker pct=` sites; `check-position-units.mjs` gates the unit. |
| Rel Reflection pages had no data | DONE | Renders in the smoke test; `check-results-coverage.mjs` covers all 29 sections. |
| Physical Intimacy missing from the app nav | DONE | 20 references in `results.tsx`; nav comes from the server. |
| Storycards look different from the site | DONE (unverified) | Cause was the app never being in the brand typeface (fd29adb). `check-fonts.mjs` and `check-storycard-fields.mjs` gate it. Not seen on a phone since. |
| Comms dimensions in the wrong order | DONE | `check-dimension-order.mjs`; one `DIMENSION_DISPLAY_ORDER`. |
| Rename "Giving and Receiving Feedback" to "Feedback" | DONE | The label is gone; the only remaining match is prose about feedback. |
| Remove the progress bar from Expectations detail in the app | DONE | Removed; the note at `results.tsx:812` records it. |
| Approach paragraphs hard to read, should be orange | DONE | `introColor` passed from the couple type. |
| Remove the first sentence of the 50 approach paragraphs | DONE | All 50 rewritten in `expectation-starters.js`. |
| Leave the pole labels as full question text | DONE | Honoured; nothing changed them. |
| Six removals: "Tap any dimension below", "What you expect", "Physical intimacy expectations", "Conflict patterns" eyebrow and dot, conflict detail eyebrows, "what you both wrote" → "what you each wrote" | DONE | 84e8df4. Superseded by open item 1, which is wider. |
| Text selection down to a fragment of a sentence | DONE | Confirmed by Ellie: "Word range selection is fine." |
| Notes tab reorganisation | DONE | Three sections, unread marks, sorted tag list (e32792b). |
| Marking reached only 9 of 43 paragraphs | DONE | Now 34; `check-markable-prose.mjs` gates it. |
| Two exercises could drop an answer silently | DONE | `check-save-feedback.mjs`: all five report. |

### Repo and infrastructure

| Ask | Status | Checked by |
|---|---|---|
| Remove unreferenced files and code | DONE | 3,574 tracked files → 463. A fresh clone checks out 10MB instead of ~66MB. |
| Delete the QR printouts | DONE | Five deleted; `qr-card-v5` (routed) and `qr-cards-print` (generated, linked from admin) kept. |
| Delete the root-level SQL files | DONE | Two deleted. `supabase-password-reset-email.html` kept: an email template, not SQL. |
| Delete review artifacts that are not current | DONE | Five, all last touched 2026-04-07, none current. |

---

## What went wrong with tracking, and what changes

Requests arrived in batches of eight and nine. Each batch was worked
through in order, and the ones that were genuinely done were reported
accurately. What was missing was any record that survived the batch, so
nothing ever went back and asked whether a removal had been applied
everywhere it should have been. "Remove the eyebrows" was done on five
pages and not on the glance pages, and there was nothing to catch that
because there was no list.

Three things change:

1. This file. Every ask gets a row before work starts, not after.
2. A status says how it was checked. "DONE (unverified)" is a real status
   and is used for anything only a person looking at a phone can confirm.
3. A removal asked for in general terms gets a search across both surfaces
   and, where it is a rule worth keeping, a gate. Six named removals became
   six edits when the ask was really "no page eyebrows anywhere".
