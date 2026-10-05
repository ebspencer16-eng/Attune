# Tasks

## 1. Needs you

| # | What I need from you |
|--|--|
| O7 | SEO: pages name the apex as canonical while the site runs on www. Harmless. Your call. |
| C3 | 50 words written, waiting on you. `WORDS-REVIEW.md`. |
| R12 | Privacy and Terms: waiting on the lawyer. |
| O482 | Partner invite email mentions the app. Fix when it is live. |
| O1 | App Store launch: tell me when live, I flip two flags. |
| O16 | Download numbers need an App Store Connect key. After launch. |

## 2. Open

| # | Mine to build |
|--|--|
| O544 | **The arrows land on Highlights instead of the page they name.** Same shape as O537, which was the menu rows doing it, so the storycards are drawing over whatever section was asked for. Find what `go()` does not set that the menu's open now does, and make one path rather than two. |
| O540 | **Drop the admin menu in the app.** After the four digits, straight to the dashboard overview; the hamburger on the site's mobile view is the nav from there. Delete the section list and the `adminSections` payload if nothing else reads it. |
| O549 | **The desktop prompt tile is still wrong and I have not seen the real one.** My proof was a standalone harness, not her page: the demo home needs a session and I never got past it. Get the signed-in dashboard in front of a browser, measure the actual cell, then fix what is actually wrong. |
| O548 | **Floor the citation and cap the quote.** The citation has a floor of 9 and nothing stops the quote reaching it. Set the smallest readable citation, work back through the arithmetic to the longest quotation that fits above it, and fail the build on an insight longer than that. |
| O546 | **The share message is wrong.** The title is the picture's temp filename. She wants "Attune Relationships: Insight of the Day" as the bold line before the image, and nothing else: no quote, no citation, no link, because the picture carries all three. |
| O550 | **Learn on the web: the share button sits against the In Practice peek.** Space between them. |
| O551 | **Learn on the web has no Save on the insight.** The app saves it to a journal entry; the website does not offer it at all. Same payload, same journal. |
| O552 | **Learn on the web: the peek is cut off and In Practice is not organised like the app's.** The app groups by category and the website does not. Read the app's shelf and match it. |
| O553 | **The web selection toolbar uses words where the app uses icons.** Switch to the app's icon toolbar. |
| O554 | **Confirm marking works on the website.** Select, highlight, underline, note, and the margin markers on a results page and an article. The app's half of this was broken for months with nothing failing, so measure rather than read. |

## 3. For you to review

| # | Built, needs your eye |
|--|--|
| O494 | Cover pages on both surfaces. |
| R195 | Sign in on the blue with the lockup. Built, not seen by me. |
| R190 | Admin from Settings, for ADMIN_EMAILS only. |
| R183 | Shelf arrows and the Saved/Read pills. I could not tap them reliably. |
| R175 | Articles can carry an illustration. Tinted by shelf until artwork exists. |
| R2 | App insights and results. All 29 sections. |
| R10 | Privacy policy. |
| R11 | Terms of service. |
| R20 | A real device, and a day. Sign in, close it, come back tomorrow. |

## 4. Done and verified

<!-- One line per row: what the task was, in enough words to recognise it.
     Ellie: "row should list what the task was, concisely but with the context
     necessary to understand what it was. All rows should be 1 line." -->

| Verified by you | What it was |
|--|--|
| O547 | The glow behind the insights cover icon was too faint to see on cream; raised from 13% of the accent to 31%. |
| O545 | The insights menu carets were positioned against the whole group, so Communication's sat above its row instead of beside it. |
| O543 | Insights cover pages on the site drew a dot instead of the section icon, because the code read a field those rows have never carried. |
| O542 | A long insight of the day pushed the In Practice peek off the bottom of the Learn tab; the quote now sets to whatever size fits the room the peek leaves. |
| O541 | In Practice said "nothing published yet" before the posts request had answered, so the shelf looked empty and then filled on a refresh. |
| O539 | Section 4 rewritten to 489 one-line rows saying what each task was, recovered from the file's own 241 revisions. |
| O527 | The cta field removed from every home card, and `priority` with it, so every field a card carries is read by a surface. |
| O537 | Insights menu rows opened Highlights instead of their own page, because the storycards drew over whichever section was asked for. |
| O536 | The web prompt cards got the hairline under the title and the mark in the image box, from the app's card. |
| O535 | The slow home page: measured at 240ms to first paint with nothing hidden, could not be reproduced, closed at her word. |
| O512 | The app was serving the Word file, and I can show you the screenshot. Two bugs behind one tap. |
| O517 | Mark is 68 across, the size the app uses. |
| O520 | Orange comes from the top left. The direction was written inside the shared tab component, so turning Insights would have turned Learn too. |
| O525 | The Word file is gone. Both builders deleted, with their routes. The last thing calling one was the admin button, which ran against invented orders, so it had never built any real couple a workbook. |
| O528 | Both prompt cards on the site were the same colour. The site read a tint off the payload and nothing has ever put one there, so both fell to one fallback while the app alternates warm and cool. |
| O529 | Swept and found nothing else. All 56 endpoints answer correctly from outside with no 500s. All 40 pages serve real content. |
| O530 | A one-line way to answer "is this on my phone". `npm run app:published` asks Expo when the running bundle went out and lists the app commits since. |
| O531 | The survey nudge could email people it was told to leave alone. It builds two lists before sending, who has already answered and who is a beta tester, and both were built inside a swallowed error. |
| O532 | The Explore page got quietly smaller when a query failed. |
| O533 | Two documents were describing features we removed. The LMFT booking setup guide and a workbook audit that opens "there are TWO endpoints that generate a workbook". |
| O534 | The press feedback was dimming whole sheets. |
| O526 | Run migration 077 in the Supabase SQL Editor. `supabase/migrations/077_clear_docx_workbook_links.sql`. |
| O497 | Home and Learn are the app's screens now, confirmed against screenshots of both. Insights I could not confirm, and I am saying so rather than counting it. |
| O524 | A press now looks like a press , on the app and across the whole site. The app had no pressed state at all: one control out of ninety reacted. |
| O523 | The app's budget shows the website's three numbers : Monthly income, Left to allocate, Savings rate. |
| O521 | Insights menu was missing Relationship Reflection. It read a flag that does not exist, so it was always false. |
| O522 | The key warning was the budget tool, not Insights. It shows on whatever tab you are on because all four load at once. |
| O488 | Fifth fix, and this one is a removal. Then the exact commands, as asked. The fourth fix told the block above the tile to claim 42 per cent of the screen. |
| O514 | Home lost the partner-joined and welcome-back notices. You said Home is four tiles and two prompts, and those were neither. |
| O510 | A fifth section exists on the website and not in the app. Which do you want? Found while renaming the sections you chose. |
| O518 | Four cards on the home screen went nowhere and now do. |
| O519 | The post-results survey was unreachable and I broke it. Removing it from Home removed its only trigger, so five of the admin's feedback charts had stopped collecting. |
| O516 | Two alert sentences need your eye. Partner joined now says "Preston joined Attune" / "You can both start your exercises now". |
| O508 | The workbook page's "expectations gaps" section is mostly blank, and I found why. Not reported by you; found by sweeping for hand-typed lists after three of them turned out to be wrong today. |
| O507 | Both names are in, and one article was on the wrong shelf. |
| O511 | The Merging Lives checklist has no name of its own on the home screen, so it says "Start a new exercise". |
| O509 | Your two lists for the social and graphics guy: `SOCIAL-LISTS.md` in the repo root. |
| O502 | The app's home is now composed as fractions of the screen and `check-proportional-layout.mjs` holds it there, planted three ways including the exact shape of the old bug. |
| O505 | The insight of the day citation gets the full width, with save and share below it. |
| O493 | "I want every insight to be quotes, I want to retire all AI-generated sentences." Fifty-three quotations now, thirty-five of them from eleven books, and all forty-nine of our sentences retired. |
| R173 | The workbook opens as the PDF the website prints. |
| O506 | Two tables delivered in chat for the social and graphics work. |
| O503 | Restrict the Books key, and do not paste a secret into chat again. The key you sent works and I have used it, and it is now in a chat transcript, which is a place secrets should not be. |
| O504 | Put the Books key on Vercel so the check runs in CI. The verification needs `GOOGLE_BOOKS_KEY` in the environment. |
| O491 | One word, and it was dropped from this list rather than settled. The app ends every exercise on a button reading **"Back to insights"**. |
| D12 | Is there any budget or appetite for imagery, of any kind? Every reference you sent has something made by a person in it: illustration, photography, even a drawn magnifying glass. |
| D13 | What is the Notes tab for, in a sentence? You called it boring and you are right: every other tab has a subject and Notes has storage. |
| D14 | Which direction for the app's colour? Three alternatives, not a list to pick all of. A. |
| O457 | Found it. There are three workbook builders and the app had never used the right one. |
| O486 | Built, and not on your phone yet; see O498. |
| O485 | The failure now says which failure it was. Workbook download failed. |
| O496 | The workbook does not load anywhere, and that is the first thing I am fixing. Two failures in one. |
| O492 | Two fields on every results payload that nothing draws. Delete them? `content.dimensions[].shift` and `.aligned`, one sentence per dimension. |
| O489 | The insight is centred between the tiles and the peek, and re-centres itself each day. All the leftover height was going into the gap below it, so it hung under the tiles with the spare space beneath. |
| O487 | The error on Learn is white now. Every error on every screen used the ink colours, which are right on cream and unreadable on a painted ground, and Learn is painted edge to edge in the insight's blue. |
| O450 | Save the insight of the day to your journal. A control on the insight's own page and one beside Share on the Learn banner. |
| O447 | The hold before a selection starts is shorter , 450 to 320. |
| O460 | The fifty insights, rebuilt from real quotations. 'Three questions sit under most of it' makes NO sense. |
| O480 | The website assembles the results and the app reads them assembled, and nothing compares the two assemblies. |
| O483 | Found it, and nothing is different about that exercise's code. You were right to ask. |
| O495 | Two real copy bugs, found by the gate written while chasing O483. The completion screen is one module, `api/_lib/exercise-complete.js`, and the app renders it whole. |
| O484 | Communication showed as incomplete on the website, then complete after a refresh. |
| M076 | Run `supabase/migrations/076_couple_tools.sql`. It creates one row per couple to hold the Shared Budget and the Merging Lives Checklist, which were one each. |
| O477 | Two sentences on the website still describe a two or three exercise product. Found next to the "Exercise 05" bug and left alone because they are words rather than digits. |
| D11 | The Shared Budget and the Merging Lives Checklist are one each, not one between you. Both are stored on the profile of whoever is editing, and nothing anywhere reads a partner's copy. |
| O430 | The journal's lock, and what the simulator was actually telling you. Two findings. |
| O479 | The smoke drives four of five exercises, and Conflict Patterns is the one it cannot. |
| O478 | Results copy can be typed into a computation module and no gate notices. |
| O473 | Cross-device resume only works one way. Start an exercise in the app, open the website, and it begins again at question one. |
| O474 | Only Communication results are frozen. A couple's stored row holds the Communication scoring and is served back exactly as written, which is the promise. |
| O481 | The Explore page's slicers, everywhere in admin. |
| O476 | The website leaves a stale progress blob behind. Finishing an exercise on the website writes the answers and does not clear `ex{N}_progress`; the app clears it. |
| O475 | A column written by one surface and read by nothing. The website records `ex3_version` on every Reflection completion; `/api/save-exercise`, which is what the app completes through, does not. |
| D10 | Your beta testers will read three yellow "TODO, needs a lawyer" boxes. Found by sweeping for placeholder markers in shipping code. |
| O471 | The journal's per-day headings are gone. Each tile carries its own correct line and that is the only date on the screen now. |
| O468 | The peek is the same on every phone now. You were right that it was a dimensions problem, and the number to fix turned out not to be where the sheet starts. |
| O469 | "Action plans", on two lines. |
| O470 | The journal's day headings disagreed with the entries under them. Found while checking the rail: a heading reading TUESDAY, SEPTEMBER 22 with four entries stamped September 21 beneath it. |
| O467 | A little more space below the four featured articles , which you asked for when approving O443. |
| O459 | White space above the bottom nav on Learn. |
| O462 | A day streak on the journal button , drawn at nought as well, because a counter that only appears once you are already doing it cannot be what gets you started. |
| O461 | The rail shows with one day, not two. You reported it three times and each time the answer was that your journal held a single day, which is not an answer you can act on. |
| O463 | The empty gift tile is gone. |
| O464 | It is the Merging Lives Checklist in all twenty-four places it was named , including the checkout tags, both add-on prompts, the cart, the receipt email and the Stripe line items. |
| O435 | The Snapchat rail. Yes, I know the one. It is built and it is on the journal already: a column down the right edge, dragged with a finger, scrolling to a day. |
| O472 | The invite step is in the app. |
| O458 | The error banner. Two separate causes, both fixed and both gated. |
| O465 | Both couples reset, and the migration is M075 in section 1. |
| O466 | Three sweeps so far, each with a method rather than a look. Every deployed endpoint from outside: fifty-eight of them, no 5xx, everything answering 200, 400, 401 or 405. |
| O446 | A tap anywhere clears a selection, and the ✕ is gone. |
| O448 | Text on the results pages is selectable. |
| O451 | Swipe down to leave. The insight card and the highlights reel. A drag that has moved sideways at all is a card change and never a dismissal, so this does not fight the reel's own swipe. |
| O449 | Two fewer round trips before a page draws. Measured rather than guessed. |
| O440 | Tapping Learn brings you back to Learn. It did nothing from inside a shelf page, because the hook that does this had been told about the article reader and the tools and never about the shelf. |
| O442 | The scan, and what it turned up. Four things, and only two of them were bugs. |
| O431 | Notes on the website, and the way in. Three things were wrong and all three are fixed. |
| O425 | The journal slicer, on the Explore page. Two new fields under Engagement: "Journal use", with your three buckets, and "Journal entries (all time)", banded. |
| O456 | The turn-down question becomes an A/B scale. Two poles and five steps has one by construction. |
| C4 | Thirteen strings on the new surfaces. |
| C5 | The three controls at the foot of the Luxury screen. From O370. That reference ends with a dark pill carrying an icon and a word, and two circular buttons beside it. |
| D8 | Eight components in the app and the site are defined and never drawn. |
| O445 | The prompt is off the overview, on both surfaces. |
| O453 | Life & Values opens the Expectations flow , on both surfaces, followed by Household, Financial, Career & Work, Emotional Labor and Extended Family. |
| O443 | The caret under the four featured articles is gone. Two hints about one gesture is a page saying the same thing in two voices, and the second one was at the bottom of the block it described. |
| O444 | The home tile's blue fades out of nothing. |
| O452 | No white outline on the mark on Learn. It stays on the Insights orange, where you asked for it and where the bubble's own orange dissolves into the page. |
| O433 | A grab line over the In Practice peek. An orange bar at the top of the sheet saying it pulls up. |
| O436 | The four top-level labels move left on the Insights menu. Highlights, Couple Type, Exercise results and What Comes Next. |
| O437 | Reorder the Learn tools: personalized workbook, build a budget, then the checklist, which she has named "Merging lives checklist" if it fits the tile. |
| O438 | The shelf page, four changes. White hero. The articles in a table with rows like the Insights nav. |
| O439 | Filter and sort under the four featured articles , for the rest of the content in that tile, and not on the peek. |
| O441 | A softer Learn blue. BlueGround lightened a fifth of the way to white, computed from it rather than typed, so "the same blue, softer" survives the blue being retuned. |
| O434 | Journal entries are italic. On both surfaces, and italic is a family here rather than a flag: iOS draws the upright face for `fontStyle: 'italic'` on a named family and reports no error. |
| O427 | No arrows on the left of the Insights menu. Read as "take them out", the way "No blue up top on the home page" meant take the blue out. |
| O428 | Less air on Notes, in both places you named. The gap under the word-in-use tile and the gap above the tags table are both halved. |
| O429 | The Insights menu is shaded, not outlined. The accent moved off the edge and into the fill: ten per cent of the brand orange over white, light enough that the section names keep their contrast. |
| O432 | The Learn ground is the insight's own blue, full page. So the insight of the day is written on the page rather than sitting in a band of stronger colour on a page of weaker colour. |
| O422 | More air at the top of Learn , and the two tabs actually line up now. |
| O423 | A warmer grey on the home icons. Same lightness, three times the distance between the red and the blue, so it sits with the cream rather than on it. |
| O426 | The menu arrows are visible. They were a text character at fifteen points in a column of sixteen-to-nineteen-point icons, which is why they read as a smudge. |
| O413 | Cream at the top of home. The middle stop of that gradient was a third of the way to indigo at 45 per cent of the page, which put blue behind the greeting. |
| O414 | The word-in-use tile runs cleanly behind the word tile. |
| O415 | The Learn tools row and the Notes word tile start on the same line , from one shared number. |
| O416 | The search sits on the foot of the lower two tiles. The column is as tall as the grid and the search is pushed to its bottom, so the two edges are the same line whatever the titles do. |
| O417 | The Insights menu is outlined in orange. |
| O418 | Orange into cream, top right to bottom left. No blue. |
| O419 | Arrows, not bullets. A dot says "one of a list"; an arrow says "this goes somewhere", which is what every row there does. |
| O420 | The signpost, version two. The first was two outlined bars, which at thirty points read as two bars. |
| O421 | Insight of the day is a banner across Learn , edge to edge, no radius. |
| O398 | The quote is not italic. "Italicized playfair display is hard to read." |
| O399 | The sheet cuts off after the four featured articles , with more air above it. |
| O400 | All three tools, for everyone, with your names. |
| O401 | More space at the top, under the lockup. |
| O402 | A more saturated ground , twice as far from white as the first attempt. |
| O403 | The plus button at the top right comes out. |
| O404 | Recent and Shared side by side again , two rows of peek each, with an arrow to the full list. Under them a button to write a journal entry, and under that the tags table with its filters as it was. |
| O405 | Less white space in the noun box. |
| O406 | The corners are loud. |
| O407 | The ground behind the tile is the brand's indigo , and the tile is cream with the blue coming up through it and fading as it rises. |
| O408 | The four icons' outlines are grey. |
| O409 | The card pictures are the In Practice placeholder : a tinted square with the mark in the corner. |
| O410 | The Insights menu sits lower , which is also what lets the colour above it be seen. |
| O411 | Brighter on Insights too , and the second colour is the indigo rather than the clay: clay against orange is one colour twice. |
| O412 | The four featured tiles are one grey. The shelves' colours are on the full cards below, where they mean which shelf; four of them in a grid was a palette rather than a signal. |
| O384 | The lockup is back at the top in its usual place , and the welcome message is the page's hero again, with no rule under it. |
| O385 | Action plan is a signpost , a post with a plate pointing each way. |
| O386 | The bottom of the tile is defined. A hairline along the curve as well as the shadow: a shadow is the space beside an edge and not the edge, which is why more shadow alone was not doing it. |
| O387 | A piggy bank with coins dropping in. |
| O388 | The insight card is the blue gradient with the glow behind the quote. Both are carried on the card rather than decided inside the renderer, so nothing in that file has to know which card is which. |
| O389 | The sheet moved up and the page fades at the foot , under the tab bar, with the caret above it. |
| O390 | A bookmark on each of the four featured publications , the same control the full cards carry, in the same corner. |
| O391 | Shading on the sheet. |
| O392 | The ground is the brand's blue, lightened. It was a lavender, which is a colour this product does not have. |
| O393 | Featured publications is smaller and in the body face. |
| O394 | Deeper shading behind the word-in-use tile , so the card above reads as sitting on top of it rather than beside it. |
| O395 | Recent, Shared, Journal and Tags are pills with an edge. Four words in a row look like a heading. |
| O396 | Insights is cream with the brand coming off the top corners , the same ground the other three tabs have. |
| O397 | No page heroes on Learn, Insights or Notes. The tab bar names the tab and the lockup names the product; a third label was the page naming itself twice. |
| O371 | The lockup is centred and on one line , at twenty-six rather than thirty-eight, which is what "Attune Relationships" with the mark beside it needs to hold one line on the narrowest phone. |
| O372 | The welcome message is left-aligned , and the hairline under it is short and left-aligned. |
| O373 | The four squares' icons are larger, centred, and sit in the middle of the space above the label. |
| O374 | The four labels are two lines, centred, and slightly up. Her names for them: Insight of the day, Action plan, **Results highlights**, **Relationship journal**. |
| O375 | A brain and a stoplight. SF Symbols has the brain; it has no traffic light, so that one is drawn at the same stroke weight with the section colours as its lamps. |
| O376 | The two picture tiles take the Luxury template exactly: a white box holding a rounded SQUARE image with the text under it. |
| O377 | The big tile has a rounded bottom that ends above the tab bar, with the shading, and the blue spills upward through its lower half. |
| O378 | The insight opens as a full storycard , from home and from the tile on Learn. It is built in the file that already knows what a card is, so there is no second storycard renderer. |
| O379 | Take the grey section row under the insight tile out. I added it last round to match the books screen; she does not want it. |
| O380 | In Practice is not hidden. The sheet comes up to sit under the insight tile rather than a screen below it. |
| O381 | "Connection" is not Playfair. Large bold body. This was her instruction last round and I applied it to the definition instead, so the definition also reverts to what it was. |
| O382 | Recent, Shared, Journal and Tags are the body face. |
| O383 | Their counts sit in a circle , as the counts on the books screen do. |
| O364 | Learn has the counted filter row on the colour , between the insight tile and the panel, which the books screen has and ours did not. |
| O365 | No grab handle on the panel. The reference has none, and a handle on something that cannot be dragged is a control that lies. |
| O366 | The Notes ground settles to a neutral grey. |
| O367 | The meaning is grey. The label above it is the dark half. It was near-black, which made that card two emphatic lines rather than a label and a meaning. |
| O368 | The home card's picture fills the top of the card , edge to edge, with the padding moved onto the text under it. |
| O369 | The circular arrow at the right of the greeting row. |
| O370 | The control row is still out, and this time it is a question rather than an omission: C5 in section 1. |
| O347 | Cream at the top, blue along the foot. |
| O348 | One tile, edge to edge, that vanishes upward. Its fill is a gradient that is nothing at the top and the page's own cream by ninety points down, which is what "vanishes as it goes up" is. |
| O349 | Four squares, barely there. Three per cent of the ink, two points apart, eight from each edge, and each holds its own name at its foot. |
| O350 | Each prompt in its own white tile. |
| O351 | The lockup and the greeting are right-aligned. |
| O352 | Insight of the day is an eyebrow inside its own tile again. |
| O353 | The sheet peeks the way the reference's panel does , its top edge about two thirds of the way down. |
| O354 | The sheet's left column, part for part. Saved and Read as counted pills, In Practice, Featured publications, the search with your placeholder, and a caret under it. |
| O355 | The four previews are the four most-read, and they fit their titles. |
| O356 | Brighter, crisper corners. Stronger hues, and white rather than warm cream under them: a bright colour over a warm ground is a muted colour, which was half of why they read soft. |
| O357 | The definition is large bold DM Sans , not the display face. |
| O358 | The usage tile drops out from behind the entry , with its own shadow, which is what makes the overlap read as depth rather than as a mistake. |
| O359 | A plain grey arrow on the journal row. |
| O360 | Four counted links, each to its own page. Recent, Shared, Journal, Tags. |
| O361 | Past entries, under the day they were written. Today and Yesterday by name, everything else by its date. |
| O362 | Search your entries. A plain case-insensitive match over what you wrote: this is one person's diary, and the thing they are looking for is a phrase they wrote. |
| O363 | A rail down the right edge. One tick per day; drag it and a label follows your finger saying which day it has landed on, and the page goes there. |
| O344 | Home is the Luxury page's ground and its panel. |
| O345 | The dictionary tiles are the reference's format. The entry has the part of speech small and grey at the left with a round control opposite it, then the word large with air beneath. |
| O346 | Learn is the books screen. |
| O341 | Home, block for block. The blocks were already right; the spacing was what made it read as a different screen. |
| O342 | Notes, block for block. Three things were wrong against the template. |
| O343 | Less air above In Practice. |
| O332 | Learn is the books layout. Both wash colours come from the top, so the ground is a sky rather than two stains at opposite ends, and the resources and the insight sit on it. |
| O333 | The Notes gradient comes from both top corners , orange on the left and indigo on the right, meeting across the top and gone by halfway down. |
| O334 | A word of the day, as a dictionary entry. |
| O335 | Jump back in and Shared with me, side by side, then the tags. Your two names. A peek rather than a list: the two most recent of each, one line apiece, with a count of what is behind them. |
| O336 | Home is the Luxury layout. |
| O337 | Four quick links: Insight of the day, Action plan, Highlights, Journal. |
| O338 | Always two prompts , cut from the priority engine's own order in one place rather than by three conditionals that could each independently be true. |
| O339 | The relationship journal. It needs migration 073 before an entry will save: see section 1. |
| O340 | It opens with the phone's passcode , and that is verified rather than assumed: the prompt came up in the simulator. |
| O321 | The mark on the loading screens is too small. "when we show loading pages we include the mark logo, I like that, but it needs to be larger." |
| O322 | A dropdown shuts when you leave the page. I was on one insights page and clicked to the next one and the side by side dropdown was already opened. |
| O323 | Swipe left and right between pages. It reads the same two destinations the arrows use, so the gesture and the arrows cannot disagree. |
| O324 | "When you turn your partner down" is rewritten, including for people who have already answered. |
| O325 | "When your partner suggests something new" takes new poles. Her copy: "Need assurance first" and "Are eager". |
| O326 | "Your appetite for trying new things" takes new poles. Her copy: "Is minimal, I prefer what I know works" and "Is strong, I want a lot of novelty". |
| O327 | "How do novelty and routine balance for you now" comes out. |
| O328 | The site's intimacy pages. The dropdown was three bordered cards with three headings inside one control that had already named the section; it is one list now, as the app draws it. |
| O329 | Soften the home screen's blue , the way the Insights orange was softened. |
| O331 | Delete her test note. Her answer to C1: so my example note referenced text that had been deleted? |
| O330 | Redesign four screens: home, the Insights landing and its menu, Learn, and Notes. "I want clean, engaging, branded interfaces", with five reference images. |
| O317 | A glow behind the home tile's icons. The cover pages' trick at this scale: rings of the same orange, each too faint for its own edge to be findable. |
| O318 | The final three are italic. PlayfairDisplay-BoldItalic is bundled now, which is all those three needed: they are set in the display face, and the file was the only thing missing. |
| O319 | The left bubble is outlined in white. On the dark variant of the mark only, which is the one the orange landing and the home screen draw. |
| O320 | A page can account for every mark anchored to it, and now says so when it cannot. |
| O300 | Home icons orange, not white. |
| R210 | The Insights nav, rebuilt. A landing page of coloured bands, one per section, in the website's own colours. |
| O313 | The home icons are brighter. The brand orange is made for cream; inside a ghost tile on the navy it lost most of its contrast. |
| O316 | Every italic in the app was upright, and now none of them are. Not something you asked for; found while doing O303. |
| O303 | The menu, four changes. No hairlines. |
| O304 | A softer orange. #C2410C was a burnt orange and read as the loudest ground in the app; both stops are a shade lighter and a shade less saturated. |
| O305 | Storycard 1 fits. Both her lines sit on one row each. |
| O306 | Card 6 is even. Any straight line through a rectangle's centre halves it, so the split is the centre point and nothing else. |
| O307 | Card 4. "Your communication styles are", on one line. Your two labels, word for word. |
| O308 | The cover icon and glow. Larger and lighter: `weight` is a separate control from `size`, and asking for a bigger symbol alone would have made the strokes heavier. |
| O309 | The ratings page takes the Comms treatment. |
| O310 | Conflict and Repair are legible. Those two eyebrows were the muted clay the cream pages use, on a ghost panel over the section's blue. |
| O311 | Talk about it is white. That page runs navy to green, so no single accent is right on all of it. |
| O312 | What Comes Next italicises the words. The sentence is two fields now, who and what they wrote, because a renderer cannot find the join in one string without restating the rule that put it there. |
| O314 | The mark is its old size. It was not a size change. |
| O315 | Card 3 is your four, in your order. Emotional Expression, Communicating Needs, Conflict Style, Feedback. |
| O271 | "Exercise results" sits with Highlights, and its contents sit inside it. |
| O274 | The Insights landing is the Attune orange. |
| O276 | The storycard type is up about a tenth , every role, from the shared scale both surfaces read. |
| O279 | Card 6, rebuilt. Diagonal divide from bottom left to top right of the screen, top left is the attune orange gradient and bottom right is the attune navy gradient. |
| O281 | Card 4, redesigned. I'd like the page to be attune blue gradient, and have a 'sunrise' effect with a circular, attune-orange glow from the bottom middle of the page. |
| O287 | The covers again. Maybe a large icon not in a circle but with a colored glow behind it? |
| O289 | The hero is level with the count. The count used to be a full-width row above the hero, so it pushed every hero down and could never be beside it. |
| O290 | The overall tile and the How you feel right now tile. "Change the overall tile and the how you feel right now tile to be ghost tiles like comms pages rather than white bg tiles." |
| O291 | Your Conflict Snapshot is ghost, with the spacing tightened. The two names above the pills were still the pill colours, which on that ground were barely colours; they are light now. |
| O294 | Flip which layer is opaque. can we flip which sections are more opaque and which are more transluscent? |
| O296 | What Comes Next quotes them. |
| O272 | The icons lose their dots. "I also don't know why the icons are now in dots, I don't want that." Coloured icon, no disc behind it. |
| O273 | The whole menu fits one screen with the dropdowns shut. "there is way too much vertical space right now." |
| O275 | The unfinished state. |
| O277 | Card 2's axis labels. Large and white now, and the four individual type names came off the map, which is what was crowding them. |
| O278 | Card 3's poles move beside the rows. "I want pole labels on the left and right of the rows on storycard 3, not below like they currently are." |
| O280 | Tap the left to go back. "On storycards, if I tap the left hand side of the page I want it to go back a page." |
| O282 | The Physical Intimacy storycard is gone. |
| O283 | Remove the "as you explore your results" paragraph from card 8. |
| O284 | The last card. "full page should be the attune gradient orange to blue, large button in the middle that says explore your full results." |
| O285 | Highlights is not in the menu the first time. |
| O286 | The page arrows on a white tile. "the previous and next arrows are hard to see. Can we make those circles have the glass effect with some shading?" |
| O288 | Every page that is not a cover has a count. "Comms overview page doesn't have a page count in the top right - please ensure every page that's not a cover page has this." |
| O292 | Your Patterns. "Please make tiles on your patterns page ghost tiles not white tiles. Text on your patterns page tiles is currently invisible." |
| O293 | And the type follows the tile. |
| O295 | And take the Conflict page's layout. I'd rather the side by side for rel relf pages design matches the what you each wrote from conflict design. |
| O297 | The greeting on one line. I like the look of the home page much more when the welcome line fits in one line. |
| O298 | Insight of the day as a hero on Learn. "Add insight of the day as a hero and remove the eyebrow from the insight tile on the learn tab." |
| O299 | The home icons are out of their circles. |
| O301 | The mark on home is inverse. "the bubble on the right should have a white bg not ghost." |
| O302 | The mark everywhere else is ghost , the left heart cut out so the page shows through it rather than painted white. |
| O239 | Vercel has the whole site behind a security challenge, and only you can lift it. |
| R212 | Home. The tile is a pane of glass rather than a cream box, with white type and each icon in its own disc. |
| R211 | Results are ready now opens the storycards , and the landing page is where they end. The Insights tab on its own still opens the menu. |
| R200 | Notes has a ground of its own. Warm at the top through the orange, settling into the indigo at the bottom, so the tiles and the tag rows sit on something rather than on flat cream. |
| R203 | The home tile is a ghost bubble. iOS 26's own glass, so it takes its light from the blue behind it rather than being a white rectangle at twelve per cent. |
| R202 | Sharing says Attune Relationships , and the little picture is the mark with the name under it. |
| R198 | "Yours to explore" is now "Resources". |
| R199 | The third row capitalises like the other two. The first two rows of that tile start from a note's title, which is already capitalised. |
| R213 | Type is darker throughout. It is measurable rather than a matter of taste: the quiet brown was 3.9 to 1 against the cream and the readable floor is 4.5. |
| R201 | The percentage on the storycards has its top back. |
| R207 | Your lost note, and why it was lost. There was no icon because there was no mark. |
| R208 | A mark opens. |
| R209 | A deleted tag goes into a closed Archive at the foot of the list, in grey, with a count. |
| R204 | The third row of the home tile capitalises. |
| O249 | Indent the exercises further. |
| O250 | The dropdown does not list the cover. Dropdown for each exercise should not list the cover page. |
| O251 | Six dimension pages become two. Her grouping: **How it happens** — Frequency, Initiating, Adventurousness. |
| O252 | Built like the Communication detail pages. |
| O253 | What makes it work leads with the choices, not a bar. |
| O254 | Two questions change, on both surfaces. Remove 'what does intimacy most mean in your marriage now' question from exercise and results. |
| O255 | Old anchors have to keep resolving. Not her instruction, mine: regrouping changes section ids, and a note is found by its page's id. |
| O256 | Louder and more branded. Cover pages need to be redone, they need to be louder and more branded. |
| O257 | And a way forward off them. "Cover pages should have a 'get started' or 'see insights' button that brings you to the overview page for that section - just to make the nav super clear." |
| O258 | Too much air in two tiles. "Too much vertical space between rows on conflict snapshot conflict tile and in the repair tile between sections 1 and 2." |
| O259 | Two pills come off. "Remove shared pill from conflict snapshot page and just for you pill on your patterns page." |
| O260 | Text is invisible in the conflict patterns tile. |
| O261 | The page count is missing on the conflict pages. "Add 1/3 page count on conflict pages just like other sections." |
| O262 | What You Each Wrote has no tile and unreadable type. What you each wrote white text is invisible. |
| O263 | What Comes Next shows eleven things and should show two. |
| O264 | Two labels are hard to read on the overview. "'How do you feel right now' eyebrow is hard to see on rel relf overview - adjust that and the pole labels in the same tile." |
| O265 | And two on the detail page. "'Ellie admires' and 'preston admires' is hard to read on rel relf detailed page." |
| O266 | Condense the How you feel right now tile. "Too much blank space." |
| O267 | Remove the "what this looks like in your relationship" tile , app and site. |
| O268 | Hero height and page count, the same everywhere. There's too much space above the page headers on expectations detailed pages. |
| O269 | No "explore more resources" arrow when there is nothing more to explore. "I shouldn't have an explore more resources arrow if I own all the resources." |
| O270 | The three plain tabs. "Insights landing menu, learn tab, and notes tab all feel very plain. Please add a lot more color and visual appeal to those pages." |
| O240 | Group the exercises under a heading of their own. In TOC-type menu, maybe there's a section called exercise results and the exercises are indented and italicised? |
| O241 | The menu wears Attune's colours, not the sections'. |
| O242 | The dropdown arrows again. "Dropdown arrows on the menu should be larger." They were enlarged once and are still too small. |
| O243 | The caption moves and changes weight. |
| O244 | No individual type labels on the map. "No ind type labels in the couple map on storycards or couple type page." The four quadrant names come off both surfaces' maps. |
| O245 | The section line follows you. "Top line nav should move as you move through the insights, current tab should always be centered." |
| O246 | A cover page per exercise. |
| O247 | The overview pages change with them. |
| O248 | Ghost tiles, and legible type. "Rel Relf detailed pages need to be adjusted, I want ghost tiles instead of white and I need the text to be visible against the bg." |
| O213 | The landing is a table of contents now. |
| O214 | The landing is not hero type. Playfair still, a shade above body size. |
| O215 | Nothing trails off. Physical Intimacy Expectations is the longest label the product has and it sits on one line on the narrowest phone. |
| O216 | Only the exercises carry an icon , in the exercise's own colour. |
| O217 | The step count is top right , on every detail page in every section. |
| O218 | The section line is above the tile. Grey, bullet separated, the one you are on in orange, and tapping one opens that section's overview. |
| O219 | The dropdown arrows are larger. |
| O220 | The hamburger menu is cream , with hairline dividers and the section colours in the icons. Same component as the landing, so the two cannot drift. |
| O221 | It is narrow and hangs off the hamburger , measured from the button rather than pinned to the screen. |
| O222 | "At a glance" is "Overview" everywhere , and the overview pages are titled "Expectations Overview", "Communication Styles Overview" and so on. |
| O223 | What comes next. Your hero, both surfaces. |
| O224 | "Unique" is out of the couple type hero , both surfaces. |
| O225 | One line under the couple map , yours, both surfaces. It is derived on the way out rather than stored, so it reaches couples who finished last year as well as new ones. |
| O226 | Your three Communication paragraphs , in the module both surfaces read. |
| O227 | Communication Styles is capitalised. |
| O228 | Sharing the insight says "Insight of the day". Everything else still shares as Attune Relationships. |
| O229 | The margin icon costs the text nothing. No reserved width, no disc, just the icon, sitting in the padding the tile already has. |
| O230 | Relationship Reflection and Conflict Patterns detail pages are on their section's ground , the same gradient their overview page uses, with the type flipped to read on it. |
| O231 | Communication counts only what it asks for. A tile exists for all three domains whether or not there is anything to do in one, so your page said three and showed two blank rows. |
| O232 | Relationship Reflection carries its own action plan. It was taking one written answer and making two rows of it. |
| O233 | Conflict Patterns carries yours. It was one hardcoded sentence, on the argument that the patterns are private so nothing about them should repeat. |
| O234 | The intimacy question, and what was actually wrong. Your missing answer was a copy edit. |
| O235 | Notes on the website. The page that was there kept a notebook in localStorage under a line that said "Saved to this device only". |
| O236 | Questions about Notes and colour , at the foot of this document rather than in a reply, so they survive the session. |
| O237 | Three directions for the app's colour , same place, with what each one costs. |
| R220 | The Insights nav, your nine. The arrows are two chevrons in glass, fixed at the bottom corners and on the page rather than in a bar. |
| R221 | The step counts are back, on every detailed page. Only the expectations conversations had one, counted inside that page from its own list, which is why no other section could have one. |
| R222 | The mark sheet, your five. Quote first, then the label and the date, then the note in italics. |
| R223 | The "what it's for" question was never shown, on either surface. You were right to ask. |
| R224 | The dashboard should be there the moment you open the app. |
| R225 | Every results page pinches to zoom , up to three times. Past that a line is wider than the screen and reading becomes a sideways scroll. |
| R226 | The website's type is darker too. 188 places across 29 files, both hues, the same values the app now uses. |
| R197 | The background runs the length of the page. |
| R194 | Each exercise has its own wash , in its own colour: Communication orange, Expectations blue, Reflection green, Intimacy rose, Conflict blue. |
| R196 | A cold-start crash, found by accident and fixed. |
| R191 | The lockup is in one place on every screen. |
| R192 | The wash is behind the results too. Glance tiles and storycards paint their own grounds; what sat behind them was flat cream, so a coloured card floated on nothing. |
| R193 | The mark is on every waiting screen , above the spinner. A spinner on cream is the spinner every app has. |
| R184 | The lockup is larger and in the website's face , Playfair rather than body text, with the mark scaled up to match. |
| R185 | Cards are the same height. The standfirst is gone from the tile, and the title has room for two lines whether it needs them or not, which is the other half of making them uniform. |
| R186 | Share on the insight of the day and on the storycards , both through Apple's own sheet. A storycard sends its own words, in the order the card shows them, and the address. |
| R187 | The cream pages have a ground. |
| R188 | The search field no longer clips its own text. It was using a paragraph's line height on a single line. |
| R189 | Search reads the articles, not just the titles. Every word of every piece is indexed now, with the filler words dropped, so "show love" finds the piece that says it. |
| R180 | The Learn tab, rebuilt to your order. |
| R181 | The lockup is on every tab , in ink on the cream pages and light on the blue one. |
| R182 | Colour. Learn: the blue insight tile, and each shelf's cards tinted by shelf. Notes: a rule of colour down the left of the tiles and each tag's own colour behind its icon. |
| R179 | Today's work is on your phone already. The app on TestFlight picked up an update over the air: the Learn tab, the saves, the search, the share sheet, the lightbulb and the home mark. |
| R174 | The Learn tab. Renamed everywhere, including the two server lines that pointed at "your resources tab". |
| R176 | Search. It matches the title, the standfirst, the shelf, the dimension tags and any keywords added in the admin, and two words narrow rather than widen. |
| R177 | Share, through the phone's own sheet. Top right of an article: Messages, Mail, copy, whatever you have. |
| R178 | The Insights tab is a lightbulb , and the home screen has the white glow back with the mark under the greeting. |
| R170 | The margin icon sits on the mark's own line and shows a tag for a tag. |
| R171 | That warning is gone. The scroll-to-a-mark measurement used an API the new React Native architecture warns about on every call. |
| R172 | Updates reach an installed build without rebuilding. expo-updates is in, the channels are configured, and app/TESTFLIGHT.md has a section answering exactly this. |
| R130 | Both intimacy framings, listed below. Eleven of the eighteen questions are worded differently for a couple who are not yet physically intimate. |
| R131 | Every exercise's opening page, listed below, in your words, on both surfaces. The footnote is gone from all five. |
| R132 | Every loading line, listed below, with where it appears. Insights says "Generating your insights" and every exercise says "Fetching your exercise", both in your words. |
| R140 | Expectations asks the page the site asks. |
| R141 | Continue Expectations opens the exercise. It landed you on the Insights tab and left you to find the row and tap the count beside your own name. |
| R137 | The opening page appears for Expectations. |
| R138 | An exercise in progress is counted properly. Same root: the count read the top level of the saved answers, which for Expectations is always five whatever you have answered, so the status never moved. |
| R139 | The household page has the same arrows as everything else. It was the one screen left with the old buttons. |
| R123 | Every exercise opens with a page that says what it is , the same page on both surfaces. |
| R167 | A note is private or shared on the note itself , with the partner named under the switch. Private by default. |
| R168 | Physical Intimacy asks the couple, not the profile. One framing question, answered by whoever gets there first, carried over for both, which is what the website has always done and what you described. |
| R163 | Expects or Experienced, by a switch above the table rather than four columns. Each answer gets twice the room, and the comparison stays between the two of you. |
| R164 | The finding and the mark are centred in the gap , whatever the tile below is holding. They were centred in that space already but carried a bottom padding, which pushed them up by half of it. |
| R113 | The table's columns line up. |
| R114 | The sign-in screen no longer flashes on a tab you have not visited. All four tabs load when the app starts, so a tab that loaded while signed out was holding a sign-in screen. |
| R115 | The exercises: A and B side by side, Back at the left and Next at the right, both with arrows, and the controls in the same place on every question. |
| R106 | The note screen is gone. Adding a note is a popup: the box, the share toggle, and a way to add a tag. |
| R107 | The selection is one block , straight above and below, not a rounded box per word. |
| R108 | The top of an In Practice article can be marked : the title, the standfirst and every heading. |
| R109 | The workbook builds when you ask for it. Building it when results unlock does nothing for a couple whose results opened months ago, which is every couple that exists today. |
| R159 | "Both of us" is gone from the results. Where the exercise asked what Both meant, that answer is the value now: "Genuinely 50/50", or "Usually Ellie, sometimes Preston". |
| R160 | The opener's second line fits. The measure went from 260 to 300 on both surfaces. |
| M71 | 071_test_couple_ex2_repair.sql. Your test partner's Expectations answers were seeded in a vocabulary the product does not use, which is why your results table said "shared" instead of "Both of us". |
| R156 | An exercise asked for by name opens, even once results are ready. The Insights tab drew results and swallowed the request. |
| R148 | The part two screen says just "Part two: Responsibilities". The rest of the sentence you wrote for it is not anywhere now. |
| R151 | Every page of the responsibilities starts at the top. Next from the bottom of one category was landing at the bottom of the next. |
| R152 | A completion page for every exercise, on both surfaces. |
| R154 | "shared", "me" and "partner" were the test data, not the product. |
| R142 | Part one says which part it is. The counter reads "Life & Values 5/12" rather than "Question 5 of 12", from the label the results already use for those questions. |
| R145 | The progress circle sweeps round rather than filling from the bottom. Two windows and a rotation, no drawing library. |
| R147 | Start, on all ten opening pages , and the not-therapy line back as its own paragraph under yours. |
| R128 | The status table shows the count and a filled circle , so the middle state is no wider than the other two, and it calls ex1 Communication styles. |
| M70 | `070_test_couple_status.sql`. This is why the intimacy questions read strangely. |
| R133 | The line under every intimacy question is gone , and so is "Choose as many as are true". The exercise's opening page says the first once, which is where it belongs. |
| R134 | "(select all that are true)" is now an italic "Select all that apply" on its own line, on any question that ends with a phrase like it. |
| R135 | Every progress bar is its exercise's colour. |
| R136 | Conflict's ranking works like Reflection's : a tapped option moves into the ordered list and takes the exercise's colour. |
| R124 | One eyebrow and one set of arrows across all five exercises. The eyebrow is the exercise's full name in its own colour. |
| R125 | "Question 6 of 50" on both surfaces , counting position rather than answers, so going back to question three says three. |
| R126 | Your part two screen , on both surfaces, with no eyebrow and no paragraph under it. |
| R127 | Reflection loses the two lines under its button , and its selected answers are green rather than black. |
| R129 | Expectations runs in the website's order : life and values, then the household question, then responsibilities. |
| R117 | The home prompt for one in progress reads "Continue Communication" and "You've completed 6/50 questions". |
| R118 | The answer choices carry the weight now and the A and B tiles step back. You were right that it pointed at the two things you cannot tap. |
| R119 | The eyebrow says Communication styles , and the completion screen says "Communication styles exercise complete" on both surfaces. |
| R120 | Part two italicises "your partner" , the same split the website makes. |
| R121 | The Next arrow was dead while an answer saved. |
| R122 | One formatting drift found and closed while checking for them: the five scale labels were typed into the website and exported from the server for the app. |
| R110 | All eleven home lines are yours , plus the third row of the tile, which now says what the new publication card says rather than having a second name for the same event. |
| R111 | Both deletion emails are your prose. The greeting line above them is gone, because your version opens with it and the email said it twice. |
| M68 | `068_test_couple_signin_repair.sql`. This is why the tester could not sign in. 067 made both accounts correctly and left eight columns on them null. |
| M69 | `069_deleted_partner_account.sql`. The login you asked for in Q4: **tester-alone@attune-relationships.com**, same password. |
| R103 | The alert copy is yours now. Two kinds deleted, three rewritten in your words. |
| R104 | Every prose list is generated from now on , which is your standing rule. |
| R17 | The workbook's same-type moment blocks for XX, YY and ZZ. Eighteen moments, ninety lines, mine, written to match the WW set. |
| R25 | The workbook's dimension pages and moment cards now use the personalised wording , the one that names both people. |
| R74 | The alert copy, listed just below this table. Six short lines, mine, in `api/_lib/notifications.js`. |
| M67 | `067_test_couple.sql`. The account you asked for. After you run it, sign in on the simulator as **tester@attune-relationships.com** with the password **AttuneTest2026**. |
| R101 | Nothing promises an email any more. Two places did. The app's line now reads Building your workbook. |
| R93 | A new mark was invisible until you left the page and came back. That is what "underline isn't working" was: it saved, it just did not draw. |
| R96 | "All" stops at the last ten. |
| R97 | Less space between the Explore arrow and In Practice. |
| R99 | A tag has two deaths. Open a tag and there is Delete tag at the bottom left, with an are-you-sure that says it moves to the bottom of your list. |
| R88 | Notes: Pick up where you left off is one tile , the home screen's shape, rows divided by hairlines. |
| R92 | Resources is one section. All your tools in Yours to Explore, nothing for what you do not own, and a grey "Explore more resources" arrow bottom right that opens the website in Safari. |
| R34 | Simulator. Tap Insights while you are already on Insights. It should go back to Highlights from wherever you were. |
| R55 | Simulator. Same gesture on Resources, Notes and Home: Resources should close an article or a tool, Notes should close the editor, Home should scroll to the top. |
| R85 | The colours are Red, Orange, Yellow, Green, Blue, Purple and Pink. |
| R86 | The toolbar is cream with a hairline round it and the icons in ink. |
| R87 | A bin at the end of the toolbar , grey until the selection is sitting on a mark. Selecting any part of a highlight reaches it, so you do not have to reproduce the exact words you marked. |
| R89 | Tags: a tag icon in its own colour, a count on every row, and an arrow that opens everything under that tag. |
| R91 | The line under the share toggle is gone. |
| R82 | The dashboard telling you an exercise was unfinished. You saw it, refreshed, and it was gone. |
| R83 | The names on the reflection action plan tiles are white. The coloured left edge still says whose is whose. |
| R80 | The toolbar never appeared because nothing was ever selected. You could see words highlight under your finger on the results pages, so the gesture looked half-built. |
| R81 | The spacing you spotted was the same component, and it was everywhere. |
| R66 | Selecting text, the way you asked for it. Press and hold a word, keep holding, drag across what you want, let go. |
| Q2 | Where is the dot and eyebrow you can see on How you each rated and Side by Side? I cannot find it. |
| R79 | The sweep itself, and what it did not find. All 57 endpoints hit from outside with no credentials: no 500s, and every one that should refuse refused. |
| R78 | Couples who own Conflict Patterns were never offered the reminder. |
| R77 | Anyone could make the site send order confirmation emails. Found by sweeping every endpoint from outside with curl, which is the habit CLAUDE.md asks for and which has now turned something up twice. |
| R73 | Alerts reach you now. Six kinds of alert have had copy since the notifications table went in, one was ever raised, and no screen in the app has ever read one. |
| R75 | "Send them a reminder" now sends a reminder. |
| R76 | Two alerts are deliberately switched off. New in In Practice, and your own results being ready. |
| R68 | The checklist opens with everything closed , six headers and their counts. |
| R69 | Intimacy detail pages: the side by side rows are the communication rows , poles either side and wrapped, and the legend only appears when your initials match. |
| R70 | Conflict at a glance says *private to you , in red, level with Your action plan and out at the right margin. |
| R71 | The tip tile's label is white on every expectations detail page, and the pole labels on How you each rated wrap instead of clipping. |
| R72 | What Comes Next carries each section's own action plan. |
| R67 | The reflection action plan tiles are on the ground now , not white, matching the other at a glance pages and the site. |
| R57 | Physical Intimacy at a glance as percentages. One bar per aspect with a figure beside it, rather than two dots. |
| R58 | An article, the budget and the checklist all open under a back arrow now. |
| R59 | The add a tag field carries its examples. The pills under it are gone. |
| R60 | The orange rule under the expectations page titles is gone , on both surfaces. |
| R63 | Conflict at a glance, with colour in it. |
| R64 | The Physical Intimacy action plan is the top two, plus anything level with the second. So a tie is never cut in half by a fixed count. |
| R65 | The pole labels sit on the bar's centre line on How you each rated, both surfaces. |
| R52 | The Notes empty states, in their tiles. Your line for the tags one, mine for the other two. The suggestion pills only appear with the add field now. |
| R3 | App notes tab. Pick up where you left off, shared notes, unread markers, the tag list with its A-Z default and the sort dropdown. |
| R5 | Website marketing pages. The hero without orange italics, no subpage titles in banners, tighter vertical spacing, the founders note redesign, the FAQ and packages changes, In Practice. |
| R35 | Explore more resources, swiped to the end. The fade on the right should be there while there is more to see and gone when there is not. |
| R36 | The five tag suggestions. Yours are communicating needs and love. |
| R8 | The couple map , both surfaces: the two marks, the small print, and that the shading reads as the couple type's colour rather than generic orange. |
| R47 | The connecting lines, curved. Same control points as the site's, drawn as twelve segments. Every line is the same weight now. |
| R48 | The couple map at 72% of the card. The ceiling is 75%: past that it is wider than the column it sits in on the narrowest phone. |
| R49 | The Conflict Snapshot as a table. |
| R51 | Two answers at the same point on How you each rated. They sit evenly either side of the bar now rather than both above it. |
| R37 | Communication at a glance, in the app. It is purple into orange now, which is what the site has always drawn. |
| R31 | The tile, on every at a glance page. Comms, Expectations, Relationship Reflection, Physical Intimacy and Conflict all sit in the rounded tile you liked. |
| R9 | The Engagement tab in the admin, rebuilt to your layout: four headline tiles, the funnel and acquisition lines, five time charts to one height, two Learning tables over two notes charts. |
| R4 | App resources tab. The narrower collections tile with arrows, the circular "yours to explore" shapes, the In Practice grid, and the tiles for budget, workbook and checklist. |
| R6 | Website results pages. Eyebrows and pills removed, the comms summary page gone, the couple type action items in their new shape, the expectations dividing line. |
| R38 | The storycards, cards 2 to 5. The map is larger and the same size on both surfaces. |
| R42 | Your Patterns, in the site's shape. |
| R43 | Sort by, on In Practice. Featured is most read first, unread first among equals. Also newest to oldest, shortest to longest, longest to shortest. |
| R45 | Physical Intimacy in the app. The rule the app asks now reads the same record the website reads, so an add-on bought at checkout is visible to both. |
| M64 | Run `supabase/migrations/064_drop_seeded_tags.sql`. It clears the default tags out of accounts that already have them. |
| M65 | Run `supabase/migrations/065_website_article_reads.sql`. It lets an In Practice article be marked read. |
| R28 | Run migration `062_drop_qr_card_columns.sql`. It drops the three qr columns and `card_url`, which nothing writes any more. |
| R29 | Run migration `063_admin_presets_rls.sql`. |
| R26 | Run migration `061_page_events_surface.sql` in the SQL editor. Until it runs, the app column and the site column on every clustered chart stay empty, because nothing is telling the two apart yet. |
| R14 | The partner-deleted notification line , in `api/_lib/notifications.js`. Mine. |
| R15 | The EU consent banner sentence. Mine. The US notice is unchanged and yours. |
| R16 | The delete-account password prompt : "Enter your password, then type DELETE to confirm." Mine. |
| R18 | The waiting copy , six lines, in place on both surfaces. Yours already; worth seeing in situ. |
| R19 | The founders note rewrite you sent, as it reads on the page. |
| R21 | Scrolling on the insights and results pages, top to bottom, on a phone rather than a simulator window. |
