# Tasks

Every ask, one row each, extracted from all 135 messages in the session
transcript. **219 discrete asks**, not the ~50 an earlier summary claimed.
Ids are `message.item`, so any row traces back to the words she wrote.

**A status is a claim and needs evidence.** Section 4 names the check.
Section 3 is everything shipped whose evidence is the commit that closed it
rather than a check re-run today. Most of it she reviewed at the time and
moved past; it is listed so nothing is taken on trust.

---

## 1. Needs your guidance

| # | Question |
|--|--|
| G1 | `/app?diag=1`, wait for it to say 10s or more, then screenshot. The 1s capture was startup. |
| G2 | Budget / Checklist / Workbook in the app: which run *in* the app vs open the site cleanly? Full in-app builds are large. |
| G3 | `check-exercise-flow.mjs`: migrating it, as instructed. Flagging only that it is a day of work, not an hour. |

## 2. Open

| # | Task |
|--|--|
| O1 | **Dashboard still blinking.** Three reproductions here were silent, each for a reason unrelated to her. |
| 94.7 | If no pick up where you left off, maybe ‘explore something new’ with a link to the most recent in practice post? |
| 97.1 | Make the download option functional. |
| 132.5 | I clicked the ‘start shared budgeting’ and it took me to the website but a blank page. We need to make sure t... |
| 135.1 | Life and values on the site brings me to the storycard highlight page. On the app, it works, but on the resul... |
| O5 | Account setup in the app, so users are pointed there rather than the website |
| O6 | Order confirmation email: download the app, set up there |
| O7 | Budget tool runs in the app |
| O8 | Checklist runs in the app |
| O9 | Workbook runs in the app |
| O10 | Migrate `check-exercise-flow.mjs` off its hardcoded sandbox path |
| O11 | Expectations at a glance: colour every "conversations to have" tile, both surfaces |

## 3. Done, not verified

181 asks. Grouped by the message they came in.

**msg 8**

| # | Task |
|--|--|
| 8.1 | Write a real privacy policy at public/privacy.html: what we collect, that partners see each other’s exercise ... |
| 8.2 | Write terms of service at public/terms.html: purchase terms, refunds, and explicitly that Attune is not thera... |
| 8.3 | Build a “Your privacy choices” page with opt-out controls, and honor the Global Privacy Control browser signa... |
| 8.4 | Add a cookie consent banner. US law is opt-out, not opt-in, so build it as notice plus a preferences control ... |
| 8.5 | Link all three from the site footer. |

**msg 13 · Notes tab**

| # | Task |
|--|--|
| 13.1 | Signed in as reviewer, but sign in seemed messed up. When I selected my username to click backspace, the page... |

**msg 15 · Notes tab**

| # | Task |
|--|--|
| 15.1 | Still seeing all 5 exercises in the reveiw dashboard even though I reran 054 |
| 15.2 | Dashboard banner says 'Alex and Your Partner' but should read 'Alex and Sam' , right? |

**msg 20 · Legal pages**

| # | Task |
|--|--|
| 20.1 | sign in page went blank again, URL: https://www.attune-relationships.com/app?signin=1 |
| 20.2 | Dashboard fixed! |
| 20.3 | Ran that orders querey: Success. No rows returned |

**msg 27 · Reviewer account**

| # | Task |
|--|--|
| 27.1 | Opened the app simulator and did not see sign in with gmail, apple, etc. options |
| 27.2 | When typing my username, the bottom half of the text is cut off. Once I exit the username box the text appear... |
| 27.3 | Once I signed in, I was brought straight to notes, but I want sign-in to bring users to the home page every t... |
| 27.4 | What is best practice here - when a user closes out of the app but doesn't clear the app, I think their posit... |
| 27.5 | Once I signed in, each time I tried to switch tabs, I was asked to sign in again. That should not happen. |
| 27.6 | Does the app remember the user? I don't want them to have to sign in every time they open the app |

**msg 47 · App insights, first look**

| # | Task |
|--|--|
| 47.1 | I cannot scroll down on the insights pages to see the content in the simulator |
| 47.2 | My dashboard says finish setting up your profile, but my profile should be fully set up already |
| 47.3 | I can already tell from the landing page on the insights tab, highlights, that this content is different from... |

**msg 49 · App insights + nav**

| # | Task |
|--|--|
| 49.1 | I have a nav suggestion for insights: top nav that shows Highlights, Comms, Expectations, Rel. Relf, Intimacy... |

**msg 57 · Security findings**

| # | Task |
|--|--|
| 57.1 | Fix /api/create-profile today. This is not a decision, it is a hole. pkg must never come from the request bod... |
| 57.2 | Partner-sync leaking conflict and intimacy: fix the endpoint, do not wait on the product decision. The produc... |
| 57.3 | generate-card failing open when CARD_SECRET is unset: fix now. Fail closed. You noted this codebase has been ... |
| 57.4 | Sign-in enumeration: fix. Collapse "no account found", "wrong password" and "not confirmed yet" into one mess... |
| 57.5 | SheetJS: leave it. Write-only path, admin-only, fails closed. Note the reasoning in SECURITY.md so nobody re-... |
| 57.6 | The smoke test now says 25 of 25. It has been 26 of 26 for weeks. Before I trust it as a safety net, tell me ... |

**msg 59 · Intimacy privacy**

| # | Task |
|--|--|
| 59.1 | Intimacy. You closed conflict and left intimacy untouched, correctly, since I only decided the conflict case.... |
| 59.2 | Detection. Understood on the limit, and agreed there is no silent downgrade. I will run the diagnostic and br... |
| 59.3 | On the two-halves-of-one-rule note. That instinct was right and worth keeping. If you catch yourself building... |

**msg 67 · Site design**

| # | Task |
|--|--|
| 67.1 | THE CORE INSTRUCTION: the app's results pages must mirror the website's results pages. |
| 67.2 | Couple type page (app): missing the map. Part of item 1, called out because it is the most obvious gap. |
| 67.3 | Reduce vertical scrolling on results pages. They are too long. Where the site fits something in a tighter lay... |
| 67.4 | Scrolling is broken on results pages. Couple type, communication and others cannot be scrolled up and down. T... |
| 67.5 | Results navigation: both nav rows must scroll horizontally. The top nav does not let me scroll left and right... |
| 67.6 | Prev/Next buttons: remove the page titles. Small arrow-only buttons. No "Next: Your Conflict Snapshot", just ... |
| 67.7 | Highlights storycards: add front and back arrows, bottom left and bottom right. |
| 67.8 | Insights tab fails on return. Leave the tab, come back, and it shows "Your results are ready. They could not ... |
| 67.9 | Resources page: the "Included with your package" section is listing exercises. Conflict Patterns and Relation... |
| 67.10 | Website privacy notice copy. Replace with exactly: |

**msg 69 · Results field audit**

| # | Task |
|--|--|
| 69.1 | The invented closing paragraph goes first. "A couple type describes how two people move together" is copy the... |
| 69.2 | The "Worth watching" heading. Use the site's wording. Same reason. |
| 69.3 | Add strengths, stickingPoints and tips to the coupleType object in api/results.js. |
| 69.4 | Draw what already arrives. The map, the full storycards, the protocols, the admired block including the "you ... |
| 69.5 | Use coupleType.color and shade. Painting every type in generic orange loses the visual identity the site give... |
| 69.6 | Fix the state reset on tab switch. You are right that it undoes item 5. Preserve the active section across re... |

**msg 76 · App home + insights**

| # | Task |
|--|--|
| 76.1 | App landing page needs color |
| 76.2 | On insights page, I do not like the buttons on the bottom to go to previous and next pages. Remove them entirely |

**msg 77 · Comms pages**

| # | Task |
|--|--|
| 77.1 | Comms results pages still feel different on the app than the site - for example, overview section should be o... |

**msg 78 · Marketing site**

| # | Task |
|--|--|
| 78.1 | Remove all orange italics from hero text, just have it match the rest of the hero’s format. |
| 78.2 | Remove subpage titles from the page banners ( — our purpose — ) |
| 78.3 | Feels like we have too much vertical space between sections on every page. |
| 78.4 | Delete the entire section starting with ‘not a rescue tool’ |
| 78.5 | Redesign the from the founders message section, the orange bar on the left feels AI |
| 78.7 | We need to remove the thick colored edge from any tile that features one accent side. Feels AI. |
| 78.8 | I feel like the in practice page looks very AI, how can we redesign? |
| 78.9 | On FAQ page, remove the left dash before each of the section text (ie. getting started) |
| 78.10 | Packages page, remove the giving as a gift tile |
| 78.11 | Packages page, remove the foundation, starting out gift, anniversary gift, most complete gift pill buttons fr... |
| 78.12 | on packages page table, rename foundation to Base |

**msg 80 · Action item labels**

| # | Task |
|--|--|
| 80.1 | You misunderstand, I want the 'one thing to try' or 'one thing to keep in mind' headers to remain on the acti... |
| 80.2 | Here's a rewrite for the note from the founders: “Understanding takes intention. We built Attune to give coup... |
| 80.3 | Regarding item 8, sorry to not have more direction here, maybe refer to the natural cycles site as I mentione... |

**msg 81 · Portal + app**

| # | Task |
|--|--|
| 81.1 | Remove the line from the dashboard banner ‘Your results are ready. Take it one step at a time.’ |
| 81.2 | Remove the eyebrow from the couple type results page that says Ellie & Preston |
| 81.3 | Remove the pill from the top right of every at a glance page that says results at a glance |
| 81.4 | Remove the ‘9 of 10 dimensions closely matched. 1 worth a closer look.’ line from each of the results at a gl... |
| 81.5 | Remove the dot and the eyebrow that says the exercise name from the top left of each of the detailed results ... |
| 81.6 | Remove the ‘what comes next’ eyebrow from the what comes next page |
| 81.7 | Remove the ‘your action items’ eyebrow from the what comes next page |
| 81.8 | Fix the keep growing section on the what comes next page, it’s recommending the checklist and budgeting activ... |
| 81.10 | Resource page is still listing the exercises as included with my package, and didn’t we rename that section? ... |
| 81.11 | Explore more resources section on resources page should only list resources the user doesn’t already own. If ... |
| 81.12 | Home page looks AI and boring. Can you give me a redesign (think natural cycles blended with credible researc... |

**msg 82 · Section spec**

| # | Task |
|--|--|
| 82.1 | Build the shared section spec, thank you. |
| 82.2 | App 2 - did anything else drop? |
| 82.3 | I am seeing the checklist in my explore more section even though I own that |
| 82.4 | Build the shared section spec then continue with portal 5, portal 8, app 1, and app 4. |

**msg 83 · Section spec**

| # | Task |
|--|--|
| 83.2 | You're right - thank you. Premium should not include the checklist |
| 83.3 | Thank you for building. Build app to match web then add markers to complete all specs. |

**msg 94 · App home redesign**

| # | Task |
|--|--|
| 94.1 | Are you able to see the Oura app at all? I like that their home page feels like a destination, what we have n... |
| 94.2 | Whole page is Attune blue with the monochrome gradient like we had before |
| 94.3 | One cream tile in the bottom third or half of the page that has a few rows: |
| 94.4 | Next for you (this should pull from the prioritized list we’ve talked about) |
| 94.5 | Also waiting (reference one other action item) |
| 94.6 | Pick up where you left off (sneak peek and quick link to your most recent note/highlight/citation) |
| 94.8 | Above the tile, sitting on the bg, the focus of the page is a ‘welcome back’ message at the top then a Resear... |
| 94.9 | We can build a huge list of these to pull from and rotate through |
| 94.10 | I don’t want a hero/header, just the body text and citation |

**msg 96 · In Practice + Resources**

| # | Task |
|--|--|
| 96.1 | I asked for a redesign here, you delivered, and I never sent more feedback: |
| 96.2 | collections: |
| 96.3 | This list is too wide and too spaced out. Please make one, narrower tile with these rows. |
| 96.4 | Also, add an arrow by each collection title so that the user knows they can access the full list of articles ... |
| 96.5 | Should be 2 rows of 3 tiles, regardless of size. My desktop window is narrow right now and I’m seeing 3 rows ... |
| 96.6 | I’d like for the ‘yours to explore’ resources to be circular shapes with an icon and one word title |
| 96.7 | Budget should look like a spreadsheet |
| 96.8 | Workbook should look like a spiral bound notebook |
| 96.9 | Checklist should look like a to do list |
| 96.10 | Explore more resources tiles need to lose the line at the top of the tile |

**msg 97 · Couple type action items**

| # | Task |
|--|--|
| 97.2 | Add back the adjusted axes labels |
| 97.3 | mobile view for in practice can be 2 columns only |
| 97.4 | Adjustment to the couple type action items. Located at the bottom of the couple type results page. App and we... |
| 97.5 | Section title eyebrow text: ‘Phrases to try’ |
| 97.6 | White tiles with thicker, colored left border |
| 97.7 | Bold title (ex. ‘Name which mode you’re in’) |
| 97.8 | Phrase to try text, italicized and in quotation marks |
| 97.9 | Phrase to try text is in a nested tile, lightly shaded to match the colored left edge of the outer tile. As i... |
| 97.10 | Couple type action items will be adjusted per instructions above |
| 97.11 | Comms results at a glance page has a section that I’ve never seen before, called this week? I don’t know why ... |
| 97.12 | Comms results at a glance - remove ‘you two are’ eyebrow |
| 97.13 | I’m frustrated about this one - I asked for eyebrows with the exercise names to be removed from the detailed ... |
| 97.14 | Sliding bars need to match the visuals of the site, we were specific about the logic of dot placement and off... |
| 97.15 | Alright. Stopping my review because you have issues you need to correct before I spend more time here. The ap... |

**msg 98 · App mirrors web**

| # | Task |
|--|--|
| 98.1 | I want the app to mirror the website, even if that means adding in missing prose so that they match. Add the ... |
| 98.2 | App couple type results what comes next looks better, but I specified that for both the site and the app I on... |
| 98.3 | 'Your next moves' isn't language I've ever seen or approved. That tile should be gone completely from app and... |
| 98.4 | Remove the 'emotional expression' label in the top right of the 'one thing to try' on the internal processing... |
| 98.5 | App is missing the side by side dropdown view. This is VERY important to me on all detailed results pages. Pl... |
| 98.6 | Same general commentary as I just clicked on the expectations at a glance page - this doesn't match the site.... |
| 98.7 | I haven't gone through everything else yet, but I also noticed that the what comes next page on the app is va... |

**msg 99 · Alignment checks**

| # | Task |
|--|--|
| 99.1 | App calls expectations 'life and values' 'the bigger questions'. Not sure why this was changed, but it needs ... |
| 99.3 | Not seeing the side by side dropdowns that I asked for on the results detailed pages. |
| 99.4 | Side by side views should be present in all sections, dropdowns in some, but expectations should show misalig... |

**msg 103 · Dead copy**

| # | Task |
|--|--|
| 103.1 | Delete comms summary page |
| 103.2 | Are these the paragraphs that pipe in at the top of each expectations detailed page? Are they not currently d... |
| 103.3 | We restructured these a few weeks ago to be more dynamic and have each peice of the paragraph change - is thi... |
| 103.4 | Delete this one |

**msg 105 · App home, insights, text selection**

| # | Task |
|--|--|
| 105.1 | The ‘good morning’ message should be higher up on the page and should be dynamic to say ‘welcome back’ or ‘go... |
| 105.2 | I’d like to spotlight the insight of the day (research backed) more. I think we could introduce a circular gl... |
| 105.3 | Does the app have a link to profile anywhere? Is that a pill button that says settings in the top right? It’s... |
| 105.5 | ‘Where you each sit on this map is calculated from your responses. Scores for Conflict, Repair, and Stress de... |
| 105.6 | On the couple type page on web and app, remove the second half of the axes descriptions, with the arrows and ... |
| 105.7 | Couple type page - couple type section on web view has a colored tile, the app doesn’t. Once again, go throug... |
| 105.8 | On side by side response drop downs in the app (in comms and intimacy sections) can we shrink the margins for... |
| 105.9 | Intimacy results on web shows side by side responses on the detailed pages automatically, but I want them in ... |
| 105.12 | I clicked to open resources and saw it for a second then was prompted to sign in again. That shouldn’t happen |
| 105.13 | How can I select text then add a note? Not seeing that functionality on the simulator. We can do this after i... |
| 105.15 | If a user clicks highlight, they see a popup with the color options. |
| 105.16 | If they click underline, same thing. |
| 105.17 | If they click tag, they see a list of their tags (which should be the default list unless they’ve edited in t... |
| 105.18 | If they click note, they should have a little text box to write a note. |
| 105.19 | If they click share, they should get a popup include commentary? message with a textbox, then they should be ... |
| 105.21 | I’d like for the top tile to be ‘pick up where you left off’ with 3 rows each with a sneak peek of recent not... |
| 105.22 | Next, a section for shared notes that’s the same setup as the above, 2 or 3 most recent show, but then there’... |
| 105.23 | Would like something designating which of these are unread or unopened. |
| 105.24 | Then the bottom section should be a list of all tags, organized in rows |
| 105.25 | Rows should default to sorting by A-Z, but there should be a dropdown filter button to select A-Z, Z-A, most ... |
| 105.26 | I would like for the pages to designate in the margins when there are tags / notes so that it’s easy to see w... |
| 105.27 | I think this makes things easy to find but also validates the product and encourages more use. |

**msg 108 · App home + insights**

| # | Task |
|--|--|
| 108.1 | Move the good evening line down a bit |
| 108.2 | Move the research highlight up slightly |
| 108.3 | I don’t like the concentric circles behind the text, I’d like a glow like what we do on the site’s couple map... |
| 108.5 | Our scorecard 4 says our comms styles are 100% aligned. That’s incorrect, right? |
| 108.6 | Storycard 5 ’80%’ text is cut off on top |
| 108.8 | Side by side margin change made the sliding bars narrower. I should’ve specified, but I don’t want the bars a... |
| 108.9 | Intimacy results missing from app insights tab |
| 108.10 | Conflict pages on app need to match site and currently don’t |
| 108.11 | Looks like rel relf, intimacy, and conflict need rebuilds in the app. Don’t make more work for yourself than ... |

**msg 113 · Eyebrow removals**

| # | Task |
|--|--|
| 113.2 | Expectations life and values page link is broken. Left nav tap and bottom right nav button on previous page j... |
| 113.3 | Remove ‘Tap any dimension below to read the full picture.’ prose on comms at a glance result page |

**msg 116 · App home + insights**

| # | Task |
|--|--|
| 116.1 | Glow looks great, move the insight of the day section (and associated glow) further down to be centered betwe... |
| 116.2 | Insights tab |
| 116.3 | When I first clicked into this, I was prompted to sign in again. I clicked out then back in and it went away,... |
| 116.5 | Comms results at a glance - can we shorten the sliding bars so that none of the row labels wrap (giving and r... |
| 116.7 | Expectations detailed pages - remove the progress bar up top in the app view |
| 116.8 | Expectations detailed pages - ‘How ellie and preston should approach these conversations’ text is very hard t... |
| 116.9 | Larger prose change, implement to both site and app: The prose for the ‘how you two should approach these con... |
| 116.10 | Rel Relf - still no data on these pages. |

**msg 132 · App home**

| # | Task |
|--|--|
| 132.1 | Please title the insight of the day section. |
| 132.2 | Maybe title is above and left-aligned, and citation is below and right-aligned (currently citation is centered) |
| 132.3 | Can we make the glow a little more visible? Currently it’s slightly too subtle. |

**msg 134 · App home + site**

| # | Task |
|--|--|
| 134.1 | Noticed the ‘how you communicate’ and ‘what you expect’ eyebrows on the results at a glance pages on the site... |
| 134.2 | On expectations results at a glance, Life and values is the only tile in ‘conversations to have’ that has a c... |
| 134.3 | Life and values detailed page still not working. I asked about this before and assumed you fixed it. Please e... |

**msg 135 · Life & Values, waiting copy**

| # | Task |
|--|--|
| 135.2 | waiting copy: |
| 135.3 | Create your account to get started. Results unlock when both of you complete exercises. |
| 135.4 | Results unlock once both of you complete your exercises. |
| 135.5 | Your answers are saved, results will open once you both complete all exercises. |
| 135.6 | Finish your exercises to open this. |
| 135.7 | This section will unlock once your partner completes their exercises. |
| 135.8 | This can just be group 2. |

## 4. Done and verified

| # | Task | Verified by |
|--|--|--|
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
