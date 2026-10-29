
Everything you need is in this file. Commands are written to be copied whole,
including the part that moves to the right folder, so you never have to know
where you are. The context you need is in the row, not in a paragraph under it.

Every code block says which window it goes in, above the block.

## 1. Needs you

| # | What I need from you |
|--|--|
| A195 | **Please run migration 101. It gives Rebecca and Abram the Physical Intimacy exercise.** It turns the add-on on for both of them: the flag the app reads and the record the website reads. It finds them by first name, as their linked couple. If that matches anything other than exactly the two of them, it changes nothing and tells you so. Once it has run, Physical Intimacy appears for both the next time they open the app or the site. |
| A187 | **Going through the vague-language table: https://claude.ai/artifact/29R5dSt9ebDwqj5iUZcEUC (Vague language tab).** Your ask: "As I go through and click use this once I'm done with the edit, please remove that tile from my view and apply that change to the live site and app." Edit the box if you want to, then press Use this, or Keep current. The tile leaves your list, and about every 20 minutes while this session is open I put your decisions live on the site and in the app. They then show "· live" under All. Text you are partway through is kept as a draft until you press a button. One thing to know: a highlight someone made on a sentence you change loses its marker. The note itself stays in their Notes. **So far: 464 sentences live, none failed. 89 left for you, redrafted again from your latest edits (A199).** One to look at again: the WZ behavior you approved reads "say it before while I'm thinking about it", which looks like two edits overlapping. Look first at the couple type sentences that name the wrong person (The translators description, The orbit's third tip). |
| A198 | **Why the reflection insight rows show nowhere: the Action Plan page they belonged to was removed from the website and the app on 14 September, at your ask.** The words are still computed and nothing draws them, so 35 rows on the review page are copy no customer sees. Say "drop them" and I take them off the review page so they stop costing you time. |
| W147 | **Before launch: freeze the Physical Intimacy figures.** Your words: "once we launch I want to make sure results #s don't change for users who already completed." Fine in beta because we are all beta users. Needs a stored row and a migration, the same shape the couple type already has. Nothing to do until a launch date exists; this row is the reminder. |
| W17 | **The share banner's words, once the app is live.** `Download Attune Relationships in the App Store: [link]`. Approved as a placeholder and parked here so it is not lost. |
| R12 | **Privacy and Terms: still the lawyer, and the document is ready.** Nothing waiting on me. |
| O7 | SEO: pages name the apex as canonical while the site runs on www. Harmless. Your call. |
| O482 | Partner invite email mentions the app. Fix when it is live. |
| O1 | App Store launch: tell me when it is live and I flip two flags. |
| O16 | Download numbers need an App Store Connect key. After launch. |
| D27 | **The post-checkout message is approved. The EMAIL it points at still says what it always said.** |
| D32 | **Illustration, with the designers you have reached out to.** Nothing needed from you; here so it is not lost. |

### One thing to run, for A195

**Paste this into Terminal.** It copies migration 101 and prints `copied`.

```bash
cd /Users/Ellie/Projects/unison && cat supabase/migrations/101_grant_intimacy_rebecca_abram.sql | pbcopy && echo copied
```

**Then paste that into the Supabase SQL Editor**, not Terminal, and run it. It should say "Success. No rows returned." If it says "Expected Rebecca and Abram as one linked couple", nothing changed: paste me the message.

<!-- SQL 101_grant_intimacy_rebecca_abram.sql: written by scripts/build-tasks-sql.mjs. Do not edit. -->
```sql
-- ============================================================================
-- 101: give Rebecca and Abram the Physical Intimacy exercise (A195).
--
-- Ellie: "Please also grant rebecca and abram the physical intimacy exercise."
--
-- A grant is the add-on flag on both profiles. Two places read it, and both
-- are set so neither surface can disagree with the other:
--   profiles.addon_intimacy       what the app's ownership check reads
--   profiles.entitlements         the stored union the website reads,
--     .addonIntimacy              recomputed grant-only, so it never removes
--                                 this again
--
-- ── FOUND AS A COUPLE, AND ONLY IF IT IS EXACTLY ONE COUPLE ─────────────────
-- By first name, linked to each other both ways, as migration 093 found
-- Rebecca. No address is written here: this file is in a public repository.
-- If anything other than exactly two profiles match, nothing changes and the
-- message says how many were found.
--
-- Safe to run again: setting a flag that is already on changes nothing.
-- ============================================================================

do $$
declare
  n int;
begin
  create temporary table _pair on commit drop as
  select r.id
  from public.profiles r
  join public.profiles a on a.id = r.partner_profile_id and a.partner_profile_id = r.id
  where (lower(coalesce(r.name, '')) like 'rebecca%' and lower(coalesce(a.name, '')) like 'abram%')
     or (lower(coalesce(r.name, '')) like 'abram%'   and lower(coalesce(a.name, '')) like 'rebecca%');

  select count(*) into n from _pair;
  if n <> 2 then
    raise exception 'Expected Rebecca and Abram as one linked couple (2 profiles), found %. Nothing was changed.', n;
  end if;

  update public.profiles p
     set addon_intimacy = true,
         entitlements = jsonb_set(coalesce(p.entitlements, '{}'::jsonb), '{addonIntimacy}', 'true'::jsonb, true)
   where p.id in (select id from _pair);

  raise notice 'Physical Intimacy granted to both.';
end
$$;
```
<!-- /SQL -->

## 2. Open

| # | What I am doing |
|--|--|


## 3. For you to review

Context lives in the row. Ellie, 22 October: "I don't need the paragraphs under
section 3 explaining things, just include the context I need in section 3."

| # | Built, needs your eye |
|--|--|
| A199 | **Your ask: "Please adjust the remaining prose options again based on my changes." The 89 rows left are redrafted.** Your latest edits kept cutting "you have slightly different views" and turning "usually" into "may", so the ten drafts that still said either now follow you. Nothing else changed. |
| A196 | **The 281 rows you haven't reached are rebuilt from your decisions, and one is approved for you.** You took about three in four of my proposals as written. Your edits mostly cut the "When it comes to …, one of you is relatively neutral" clause where it explained a point instead of describing where you sit, and cut lines like "This is a noteworthy gap." The new drafts follow both. Where the workbook says the same thing as a results sentence you approved, it now uses your wording. Only one row fully repeated something you'd approved: the workbook's listening line. It is approved with your Communication wording and goes live with the next pickup. Four more shared a single sentence with an approved row; their drafts reuse your words for it and still wait for you. |
| A194 | **Every proposal you haven't decided yet on the review page is rewritten to sound like your ten edits.** What I took from them: name the thing instead of "it" ("reassurance", "feelings", "needs"). Cut the clipped one-liners. Use plain words for jargon ("small ruptures" became "small, unresolved feelings"). Make the action an invitation ("Try to…", "It is completely fine to…"). Say why it matters to your partner. Join short sentences into flowing ones. Say "your partner" rather than "the other". Middle-of-the-scale sentences now read the way you asked: "When it comes to being open or guarded, you both are relatively neutral." 483 of 533 changed; the rest were short labels that already fit. Anything you had half-typed in a box is kept as you left it. Worth a glance: a few rows add a short "why" the old copy didn't say (for example "…and hearing it can help you both feel closer"); cut those if you'd rather not add claims. |
| A193 | **Bug scan done. Two real bugs found and fixed; everything else came back clean.** (1) An invited partner who joined in the app with their invite code was told "Could not create your profile". The app tried to save the buyer's code on the partner's profile too, and the database allows each code only once. Today's fix made that the only way in for an invited partner on the app, so it mattered. Fixed: the partner's profile no longer stores the code, as the website already did, and a check now fails if it ever does again. (2) The website had its own copy of the rule that fills in "Preston" or "Ellie" for "the more guarded partner" and similar. It left raw placeholders like {RCH} where the app said "the partner who reaches first". The website now uses the app's version, and a sentence that opens with that phrase gets a capital letter. What came back clean: all 62 endpoints from outside, every page and results section in a real browser, all five exercises driven to the end, 24 checkout carts, and a review of today's code. One rare case is left: an invited partner whose link to the buyer never completed sees the "no package" screen with no box to re-enter the code. Say if you want that built. |
| A188 | **The pole labels on the app's Communication overview now sit just under each end of the bar.** You asked for them closer, so the gap under each bar is a quarter of what it was and the rows are a little tighter. Checked on the simulator. |
| A189 | **Checked: Side by Side is pulling correctly, and nothing in the data changed. Only the words did.** I traced it four ways. The server and the website build the dots from the same stored answers with the same one reversed question ("When you're going through a hard stretch", under Conflict Style). Every partner-view question lists its two answers in the same order as its self-question, so no guess lands on the wrong side. The app and the website give the same dot the same colour. And no commit this month touched how those answers are stored or read. What might look flipped: a guess dot is coloured for the person it is about, not the person who answered. So "What Preston thought Ellie would say" is Ellie's colour, sitting near Ellie's own dot, even though Preston answered it. That has always been the rule, and the old wording ("How Preston views Ellie") hid it. Want each guess dot in the colour of the person who made the guess instead? If something else looks flipped, tell me which question and I'll trace that row. |
| A172 | **The website's Experienced column now shows the full answer, like the app ("Usually Mum, sometimes Dad" rather than "Both").** Both now use the same server function, and a check fails if the website goes back to the plain word. |
| A173 | **Explore has 12 recommended views, in your three groups: Keep an eye on, Could change our approach, Already surfacing.** Hover a button for why it's there. Honest caveat: I'm not allowed to read your live data, so I picked these from what the product measures, not from current results. Use Already surfacing to tell me which ones show something, and I'll reshuffle. The six old presets are hidden, not deleted. Views you've saved still show, under Saved. |
| A174 | **Life & Values is now horizontal bars, so every label reads in full.** It and Responsibilities beside it are both taller (340), to fit all twelve rows. |
| A175 | **Both tiles now show alignment (% of couples who answered the same), sorted most to least aligned.** Titles: "Responsibilities Alignment" and "Life & Values Alignment". Life & Values used to show the % who differed. |
| A176 | **Both inheritance charts now show percentages: each colour (category) adds to 100%.** Hover shows the count behind each bar. |
| A176b | **Explore's chart has a Count / % toggle.** % means each colour's share of its own answers. While building it I found the "% of column" chart was dividing by the overall total, so the chart and table disagreed. Fixed. |
| A177 | **Both inheritance charts have slicers.** |
| A178 | **"Other change" is gone from Expectations modeled on experience.** Its count is listed in the subtitle under "Left out" with the unclassified answers, so nothing disappears silently. |
| A179 | **Gender roles over generations is now three clusters: Keeps, Abandons, Assumes the other gender's role.** The old fourth bucket, leaving the other gender's role to your partner, is the same pattern repeating, so it now counts under Keeps. |
| A180 | **Retitled "What recent memories evoke joy".** One thing to know: that tile's dropdown still switches to the other seven written questions (proudest moment, a challenge, and so on), and the title stays the same when you pick them. Want the dropdown removed, or the title to follow the question? |
| A181 | **The five "Shows [horseman]" rows are out of Conflict All questions.** They can still be used to slice data in Explore. |
| A182 | **Every two-answer question in All questions is now a bar between its two answers.** The first answer is on the left and fills from the left, the second fills from the right, and anyone who answered neither shows grey in the middle. That covers both disagreement questions and every other two-choice row. |
| A183 | **Marketing time per page now always shows H, OP, BP, WR, IP and FAQ, in that order, with the full name on hover.** It used to make one column per page anyone had visited, under its web address, so pages nobody had timed were missing and checkout or sign-in showed up instead. Articles count under IP. |
| A184 | **Hovering an article name in In Practice reads shows the full name straight away.** |
| A185 | **NPS over time now sits after "What is behind that?"** |
| A186 | **The simulator wasn't frozen. The app had crashed on start ("Cannot find native module 'ExpoAsset'") after the dev server ran for nine days.** I restarted it with a clean cache and the app opens on Home again. If it happens again, closing Expo Go and reopening it fixes it. |
| R10 | Privacy policy. |
| R11 | Terms of service. |

## 4. Done and verified

<!-- One line per row: what the task was, in enough words to recognise it.
     Ellie: "row should list what the task was, concisely but with the context
     necessary to understand what it was. All rows should be 1 line." -->

| Verified by you | What it was |
|--|--|
| A197 | **Workbook rows: all 121 approved as drafted and live in the workbook.** One trimmed by 27 characters (the reassurance line) so its page still fits. |
| A190 | **Behavior to try: your ten tiles are live on the couple type page above Phrases to try, in the app and on the website, and first under Things to consider in What Comes Next.** |
| A191 | **The app no longer lets anyone in without a purchase (Google and Apple sign-in used to make a free account). Mya's stray app account removed by migration 100; she buys, then signs in with the same address.** |
| A192 | **Migration 099 closed the last open database rule (partner_sync); the open-rules check now comes back empty.** |
| A171 | **Migration 098 ran and closed the promo codes and the other open rules. Its check found one more, partner_sync, which is A192.** |
| A170 | **Five sweep rounds, A170a to A170m: failed reads no longer shown as facts about people, sends claimed before sending, every big read paged, open database rules found (A171).** |
| A170a | **Saving an edit to a live In Practice article could unpublish it when the read failed. Now refuses.** |
| A170b | **Eight places showed a failed read as a statement about a person; two also wrote over real data. All now say they could not check.** |
| A170c | **Feedback respondents and two phone notifications looked everyone up in one request with a length limit. Now 100 at a time.** |
| A170d | **One renderer for the detailed time-per-page chart; a test tool's false alarm on admin scoring fixed.** |
| A170e | **Gates for all of it: 22 planted bugs, 22 caught.** |
| A170g | **Check-in emails, survey nudges and phone notifications record "sent" before sending, so a failure cannot repeat a message.** |
| A170h | **Engagement's paged reads name their order, so no row is counted twice or missed.** |
| A170j | **Two website saves were switched off by an unsupported error handler: the order link at sign-in, and the retired gift form (removed).** |
| A170k | **The Notes list reads every note, not the newest 1,000.** |
| A170l | **Workbook links last an hour everywhere, and an expired one is refreshed rather than rebuilt.** |
| A170m | **No views, privileged functions or grants open the database outside its rules. Checked and clean.** |
| A169 | **Results sweep: all 5 exercises driven through to results for 4 couples, 29 sections, 38 pages, 62 live routes.** |
| A169a | **Expectations stored "[object Object]" for 22 to 28 October. Fixed; those answers show "Both"; your call: no re-ask.** |
| A169b | **Every whole-table admin read pages past the 1,000-row limit.** |
| A169c | **A featured quote reaches the homepage within 30 seconds, not ten minutes.** |
| A169d | **The exercise check reads what it stores and fails on "[object Object]", "undefined", "NaN" or an unfilled {name}.** |
| A148 | **Avg dimension results: where the average answer sits between each dimension's poles, two groups as two dots on one track.** |
| A154 | **Swap button between Rows and Columns in Explore.** |
| A168 | **Admin slicer lists reach their last option on short tiles. Gated on every admin page.** |
| A167 | **Partner rows say "Not loaded yet" until the site has heard about the partner; a failed read keeps saying it.** |
| A163f | **App exercise covers fit SE to 16 Pro Max with Start above the tab bar. Gated in the smoke run.** |
| A145 | **Unclassified answers stay off both inheritance charts, counted in the subtitle. Your call: nothing to change.** |
| A166 | **Rebecca saw her own answers as her partner's: an invitee's routing marker was read as partner data. Answers count as the partner's only with the partner's id.** |
| A166b | **Abram was refused for ever: the "did anybody pay" test asked only about the buyer's order. Plus a one-way couple link and a failed request taking an invitee's exercises away.** |
| A164 | **An invited partner of a core purchase could never open results. The server now sends the buyer's grant and the website reads it.** |
| A164b | **supabase/schema.sql could not be run at all and said it could. Fixed and gated. The diagnostic query for a couple who cannot see results is kept.** |
| A163 | **Bug scan: 314 gates, the app typecheck and all 62 routes from outside. Five real bugs, all fixed.** |
| A163a | **Saving progress could overwrite a finished exercise when a read failed. It now saves nothing and says so.** |
| A163b | **An invited partner could inherit fewer orders than were paid for when the email lookup failed silently.** |
| A163c | **The couple's identifying string had five implementations. One now, gated over every producer.** |
| A163d | **Your conflict miscount, four plan items against one: the fix was never gated. It is now.** |
| A163e | **Five dashboard tiles wired twice. One function now, and a dead read of the email preference removed.** |
| A162 | **Every admin slicer offers every cut, 115 to 150 each. The cut is sent to the server instead of picked from a list.** |
| A162b | **A cut names people by a one-way hash, never an id.** |
| A162c | **Engagement tiles answered a derived cut with zero. Both ends now refuse a cut that matched nobody.** |
| A162d | **Three dead copies deleted: the admin's own banding, the Feedback tree builder, the Engagement field lookup.** |
| A162e | **A cut with people but no couples draws a dash and says so instead of snapping back to Everyone.** |
| A161 | **Seven slicers threw clicks away. Now a gate drives all 68 the way you do.** |
| V3 | **No render diff between app and website: the app works nothing out, so there is nothing for one to catch.** |
| A142 | **The add-on chart had two renderers on one canvas. One now, with your order and colours.** |
| A141 | **The "undefined" legend on the package mix doughnut, from the colour fix.** |
| A143 | **Expectations modeled on experience: outcome on the x axis, one colour per category.** |
| A144 | **Gender roles over generations: the two confusing rows renamed into keep/swap pairs.** |
| A146 | **Responsibilities after each part-two header.** |
| A147 | **The (0), (1) removed from the relationship feel labels.** |
| A149 | **Pie legends removed.** |
| A150 | **All three forced-choice tiles are pies.** |
| A151 | **Renamed the two conflict "what goes well" tiles.** |
| A152 | **Two new code frames for the conflict questions.** |
| A153 | **Explore opens empty, with a line saying what to do.** |
| A155 | **Marketing columns H, OP, BP, WR, IP, FAQ with full names on hover.** |
| A156 | **A hover over blank space says nothing.** |
| A157 | **Cover pages out of the detailed results list.** |
| A158 | **A pill rebuilds one chart, not five.** |
| A159 | **Slicers reset to Everyone when a page opens.** |
| A160 | **The "add a theme" box removed; themes read from the words, with a By category view on Testimonials.** |
| A140 | **Misaligned is under half aligned in two or more categories, and both tiles show the count.** |
| A135 | **Every top-level banner takes white type. White reads 4.1 to 4.7 on the four darker bands, 3.5 on Relationship Reflection, 2.9 on Conflict Patterns and 1.9 on Engagement.** |
| A136 | **Engage/Withdraw and Open/Guarded moved into Communication Styles, Typing, beside the two types they are the axes of.** |
| A137 | **The catch-all section became Engagement, with depth by time in the portal, read an article, left a survey response, and NPS. No recorded time means no band rather than the bottom one.** |
| A139 | **The legends lost their colour twice over: a dash is painted in the line colour, which a bar has not got, and a bar's line width is zero. Every bar and pie legend was affected.** |
| A138 | **A pole label that trails off gives the whole thing on hover, in all three views of All questions, through the page's own tooltip.** |
| A107 | **Package split over time and revenue contribution sit side by side, four lines each, instead of one stack that hid how any single package was doing.** |
| S81 | **Twenty kilobytes of unreachable admin code removed. One piece was the promo toggle's dead twin, which had taken a repair meant for the live one; another drew a buyer's name and address.** |
| S85 | **The Testimonials page printed stored values, she/her and none and friend, where every other page says Woman, None, Friend/family. The test data had hidden it by inventing pretty values.** |
| S85b | **165 admin controls had no name a screen reader could say. The rule existed for the 38 public pages and had never been applied to the admin.** |
| S85c | **A failed read of the journal table would have reported that nobody journals. The error was never tested and the comment excusing it named a migration that adds no column.** |
| S82 | **Every slicer on every admin page audited leaf by leaf: no cut that matches nobody, none that matches everybody, no empty branch, no computed cut whose rule was never registered.** |
| S81b | **Four holes in the test data, each hiding a page: no survey stub, no surveys array, no dataQuality, and conflict answers that existed only for half the people on the same parity as the option index.** |
| A121 | **Line chart legends became a dash rather than an outlined box.** The colour it lost on bar and pie charts came back as A139. |
| A133 | **The slicer taxonomy, six sections deep, as a drill-down with coloured banners and a back arrow, on every tile slicer, both Explore pickers and the Feedback tiles. Computed cuts for the rows no column stores.** |
| A133b | **Three inferences the taxonomy needed and nothing stored: same-gender guardians, raised by someone other than a parent, and whether somebody kept, swapped or widened the roles they grew up with.** |
| A116 | **A third view on All questions, Count: five cells per row shaded by share, with the question's own poles either side. A column is where an answer sits between them, so Both lands in the middle.** |
| A113 | **Both inheritance charts became a cluster per expectations category. One bar per outcome over every item said whether arrangements changed and not where.** |
| A104 | **The orders table got the promo table's white head, titled All orders, with the filters in it. Its search stopped offering to match a buyer's name, which this payload no longer carries.** |
| A114 | **Expectations All questions: one eyebrow heading per category, no section title in the row. The mean renderer had never split it off, which is why it survived the first fix.** |
| A132 | **Every slicer offers only what its own tile has. The up-front fill had locked the list, and each question explorer counted people who had never done that exercise.** |
| A131 | **Order the aspects became rows at full width so all eleven labels fit, which reverses “I want column charts” for that one question.** |
| A130 | **The Feedback charts got their x axis line back, as the category axis's own border. The value axis stays gone.** |
| A129 | **UX Views lists all five exercises. It was four cards typed into the page while the registry has had five since Conflict Patterns shipped.** |
| A117 | **All questions was wrong because five conflict sliders sent an option number where a fraction was expected, pinning all of them to the far right, which reads as Often.** |
| A120 | **The two empty conflict tiles were three forced-choice questions stored three ways: A and B on the site, 0 and 1 in the app, a and b in the reader.** |
| A112 | **The two figures were different measures rather than a disagreement: the dashboard's aligned is communication, the Expectations tiles split by expectations distance. Both say which now.** |
| A111 | **The two Expectations tiles take your wording: avg gap among misaligned couples, and avg gap among aligned couples.** |
| A119 | **Every chart lost its value axis and its gridlines, as one rule in the chart builder rather than a dozen per-tile copies.** |
| A122 | **The three time-per-page charts scale to their own data. One shared ceiling had been flattening them.** |
| A125 | **A pill on a detailed results page changes only its own tile. Same shared ceiling as A122.** |
| A123 | **Marketing pages are named rather than pathed: Home, Our Purpose, Packages, Registry, In Practice, FAQs.** |
| A124 | **Exercise and results labels abbreviate, derived from the product's own names. What Comes Next initials to WCN where you wrote WN.** |
| A126 | **Notes by section uses the same abbreviations, taken from the groups the results chart already builds.** |
| A101 | **Sorting by date sorted by weekday name. A Date is an object, so the comparator fell past its numeric branch and compared “Fri Oct 02” against “Mon Sep 28”.** |
| A105 | **Add-on order is yours, and two add-ons were missing from that chart entirely, Conflict Patterns and the Merging Lives Checklist, from a dead second copy of the list.** |
| A106 | **The three exercises in add-on attachment are blues and indigos; the three resources are other colours.** |
| A110 | **Expectations at-a-glance has its timeframe slicer, and each couple carries the later of the two completion dates so the control can actually cut.** |
| A109 | **Self v partner view gap has a slicer. That tile builds its own head rather than using the shared one, which is why it never had one.** |
| A108 | **Responses opens on Communication again rather than wherever you last were.** |
| A99 | **The paired dashboard tiles are one height. The canvases already matched; the cards did not, because the right-hand heads wrap to a second line.** |
| A118 | **The two coded conflict charts are full width and stacked so their column labels can be read.** |
| A115 | **Relationship Reflection: what people wrote about and qualities most admired are swapped.** |
| A127 | **The slicers on notes by section and notes by page are stacked so the titles are not squeezed.** |
| A128 | **“Not measured” has a buffer under it instead of sitting flush against the tile edge.** |
| A100 | **The denominator line is gone from the understanding tile.** |
| A103 | **The promo table's Uses column is Max uses.** |
| A102 | **The Waiting on a partner tile stays. The app can accept an invite code and has never been able to send one, so the path that made Rebecca's case is still open.** |
| A134 | **The survey's completion screen has a Back to dashboard button, with the words in the copy module so an edit of yours reaches them.** |
| V1 | **Site and app confirmed to match: both current, scoring identical over 400 answer sets, all 29 sections on both surfaces, every results sentence reachable by the app.** |
| V2 | **Four sentences are on the site and deliberately not in the app. Each describes a mechanism the app does a different way.** |
| A95 | **The read-error field was backwards: it is a person's own guess about their partner, not anyone's read of them. Relabelled. You noted the row itself had gone stale.** |
| A85 | **Migration 097 ran, so the survey saves. The response count under the Feedback title is the proof.** |
| A72 | **Engagement: Refresh was an unstyled browser button, the Exercises chart drew three of five names, and the downloads caveat sat outside its tile.** The funnel and acquisition lines are your R9 spec and stayed. |
| A92 | **The package tiles stay as they are.** Your call: clicking one centres it, and the Add to cart button is unchanged. |
| A96 | **Expectations has a High level block**: alignment across categories, then one per category. The agreement rule now lives in one module both admin endpoints call. |
| A94 | **The "read error" rows say what they measure.** How far a person's guess about their partner was from what the partner said, nought being a perfect read. |
| A98 | **Seven dead functions removed from the website renderer.** One was a second copy of the Physical Intimacy prose rule that ignored the skip case the server handles. |
| A97 | **"Profile complete" half-trusted a column nothing writes.** The modal that set it went and its writer stayed. The rule is the field test alone now, S80, so anyone who passed that modal with a blank field gets asked. |
| P10 | **The admin was sending names, emails and shipping addresses to the browser that nothing drew.** Stripped, and a gate proves no identifying value survives. |
| A90 | **One constant-time password comparison, not two byte-identical copies.** They agreed, which is why nobody had looked. |
| A89 | **Five pages were built with class names nothing styled**, so their buttons and tables were bare browser defaults. One KPI card asked for a colour that is not one of the five. |
| A88 | **Fourteen dead admin functions removed**, including two that mint admin tokens with Math.random and the two CSV exports that carried names and addresses. |
| A87 | **The Explore page had a warning it could never show**, anchored to three ids that are not on it. A page missing half its numbers looked like a page whose numbers were zero. |
| A86 | **The promo Status toggle refreshed a page deleted months ago**, so the row kept its old status until a reload. It redraws its own table now. |
| A93 | **Dead code removed from the home and pricing pages**: three features whose markup went and whose JavaScript stayed. One threw on every pricing-page load into a catch that explained it away. |
| A91 | **The sticky bar on the pricing page named the wrong package all the way down.** It tracked four ids that are not on that page, so a reader at Premium saw "$89 - The Attune Assessment" and the button added that. |
| P9 | **No physical box, so nothing needs a name or an address.** The admin was sending them to your browser anyway, for readers deleted months ago. Stripped, and the banner is true as written. |
| S59 | **The payment path writes a row, and something proves it every build.** A signed Stripe event goes through the real handler; an unsigned one, one with the wrong secret and one six minutes old each write nothing. |
| A70 | **Seven pages of missing figures were one key read one level too high.** The server builds those measures in a helper and sends them under `responses`; the page read them off the top. Every tile drew its empty state. |
| A73 | **The promo table showed two answers to one question**, a counter column and the real order count. One figure now, from the orders, checkable against the table on the same page. |
| A74 | **A couple buys once, so the partner who did not pay takes their code.** On test data that resolves 24 of 48 orders, and the tile says how many came that way. |
| A75 | **Type Analytics had no filters and said it did.** Three dropdowns read by the code and in no markup, so every figure was the whole population. In the top tile now; E:W moves 2:3 to 6:7. Feedback's period moved too. |
| A76 | **The dimension tile: slicer, poles in line, no scrollbar, Reassurance capitalised.** Ten rows went from 289 points in a 255 point box to 209. |
| A77 | **Slicers on the three at-a-glance tiles.** Cutting Physical Intimacy to Married moves alignment 78 to 75. |
| A78 | **Physical Intimacy All questions shows the question and nothing before it.** The topic is still a field you can group by. |
| A79 | **"Criticism", not the paragraph.** Both the tile and the chart asked for the one-word name and both fell back, because it was glued into the label and never sent on its own. |
| A80 | **Explore: title is the two fields, default is a clustered column, dropdown names the chart.** The measure moved to the line underneath. |
| A82 | **All questions rows restructured on every page.** Question right-aligned left, poles and bar to its right, one line. Three renderers share one row shape. |
| A83 | **Who-does-what is a 5x4 grid of tiles**, responsibility small, percentage large below, centred, least aligned first. |
| A84 | **Nine conversation prompts were typed out twice**, server and website, under a comment saying they matched. One copy now, and the gate that owns that rule covers it. |
| C34 | **Reassurance keeps "Voiced / Assumed."** Your word. It is the pair the results pages already use, so the admin and the results now say the same thing. |
| A24 | **Order Details replaced Orders and Promo Analytics.** The promo table question became A73. |
| A28 | **Discount Unknown rows.** Closed by A74: an order with no code takes its partner's. |
| A29 | **Every page with top tiles is in the shaded shell.** The last piece, Type and Feedback, became A75. |
| A31 | **Avg individual dimension results replaced couple type distribution.** The four changes you asked for became A76. |
| A38 | **Expectations at a glance.** Its figures were A70 and its slicer was A77. |
| A44 | **Physical Intimacy at a glance.** Its figures were A70 and its slicer was A77. |
| A47 | **Physical Intimacy uses the married wording.** The category prefix became A78. |
| A49 | **Conflict at a glance.** The one-word horseman became A79, the missing figure was A70. |
| A51 | **"When a disagreement starts" as a pie.** Its data was A70, its one-word labels A79. |
| A62 | **A chart above the count, typed from the shape of the cut.** Your three changes became A80. |
| A25 | **The + button creates a live code**: name, discount, package, free add-ons, max uses. The admin could already write the row and nothing called it, and it could not write four of the five add-on columns. |
| A26 | **Status column with an on/off toggle** on every code, including ones never redeemed. A compiled code reads "Always on" rather than drawing a switch that cannot do anything. |
| A27 | **The funnel counted orders at the first bar and couples at the rest**, so a couple who bought twice stood taller than a couple who had started. Couples all the way across now. |
| S78 | **Abram’s invite is sent.** You pressed it on the new "Waiting on a partner" tile, which lists codes only, never names or addresses. |
| S74 | **Rebecca did finish her setup and her first exercise. My SQL said otherwise and was wrong.** 50 answers IS all of Communication: 25 about herself, 25 about Abram. The only thing missing was Abram’s invite. |
| A30 | **Data labels gone, everywhere.** There were two renderers and I had turned off one; svBarChart had its own. Hover is the readout now. |
| A32 | **Pole labels wrap in full** instead of stopping at sixteen characters, and the comparison dot is the right way round everywhere. |
| A39 | **Every overview tile shows the uncut figure** under the stat when a slicer is on. Dashboard, Order Details and Package Mix. |
| S79 | **The back door was "Prefer not to say" stored as empty, and pre-selected.** It has a value of its own now, nothing is pre-selected, and declining is still one click. |
| S80 | **Profile complete now means both names, pronouns and the five questions.** The columns were not even being selected, so adding the rule without that would have told every account its profile was unfinished. |
| C33 | **Belonging** reads your line, and WORDS-REVIEW.md is regenerated from the module. |
| A36 | **Five rows of real data behind `display:none`.** The tab switcher hid every element whose id starts with `resp-`, and the chart is called `resp-agree-bars`. |
| A34 | **Communication at a glance**: alignment, understanding, and the two you agreed to. |
| A37 | **Responsibilities read Myself to My partner with a mean dot**, and the life questions are sliders with their own first and last options as poles. "N/A" is off the axis. |
| A40 | **Qualities most admired is a column chart above All questions**, and reflection rows no longer carry the section name: four of five said "How We’re Doing". |
| A43 | **Ten themes, one frame across all eight written questions, with a picker.** Yours to move: `api/_lib/reflection-codes.js`. Every chart draws the no-theme share in grey. |
| A54 | **Eight slicer rows: shows each horseman, and partner shows each.** Derived at the line the chart draws, so the two cannot drift. Unanswered stays blank rather than becoming No. |
| A56 | **Conflict All questions has poles**, taken from each option’s own value so a question written best-first does not show its ends backwards. The two forced choices stay as bars. |
| A67 | **Every conflict field was being defined 14 times.** The conflict loop sat inside the intimacy loop: 126 fields where there should be 9. Every dropdown carried each entry fourteen times. |
| A57 | **Type Analytics tiles: E:W, O:G, top individual type, top couple type.** Whole numbers with the real counts underneath, because a ratio with no denominator has no size. |
| A58 | **Individual and couple distributions swapped**, individual first. |
| A59 | **Both pies are smaller and the tiles are shorter.** They were locked to a square. |
| A68 | **Type Analytics threw on every load and nothing said so.** The probe stub sent a config shape the real endpoint does not use. Pre-existing; found because the probe now reports silent rejections. |
| A61 | **Explore resets when you come back to it.** The cut, filters and measure used to survive leaving, so a filter set twenty minutes ago was still on. |
| A69 | **Explore defaulted to nothing if one group were renamed.** It looked for a group starting "Ex1" and opened on "— none —" when there was none. Falls back to the first field now. |
| A66 | **Engagement is in the shaded shell**, the last page loose on the background; its heading and slicer moved into the shell head. |
| A65 | **The screen-time fix is published.** It was committed after the last update, so your phone had the old clock. |
| W103 | **Every column keeps its name**, at any width. All ten draw at 1500, 1280 and 1100. Chart.js drops ticks it thinks would collide and says nothing, so that is switched off. |
| A46 | **What it is for as a column chart**, with a subtitle saying the bars add up to more than the people who answered, because it is select-up-to-two. Its missing figures were the payload bug in A70. |
| A48 | **Not-yet against regularly-intimate, per aspect**, grouped by the wording each person answered under, plus an Intimacy stage slicer. Its missing figures were the payload bug in A70. |
| A42 | **Expected against experienced, both halves, on the Expectations tab.** Both measures were being sent and neither was reaching the page: that was the payload bug in A70, now fixed. |
| A53 | **What lands best from a partner, and what people do to reset.** The ranking bars are flipped so taller means better and the hover carries the real average place. Its missing figures were the payload bug in A70. |
| A55 | **Both written conflict answers coded**, through the same frame as the reflection ones, with the uncoded share drawn. Its missing figures were the payload bug in A70. |
| A52 | **"In the middle of a disagreement" and "when it touches something old"**, side by side. Their missing figures were the payload bug in A70. |
| A50 | **The four horsemen as a column chart**, counting people who said sometimes or often. |
| A33 | **Bottom sections are called All questions**, and the comparison mark is in: small grey for everyone, large coloured for your cut. |
| A35 | **Responsibilities and Life & Values are a matched pair at half width**, both column charts. Responsibilities had been a radar. |
| S75 | **094 ran: everybody who can invite a partner now has a code.** The server mints one for any surface now, so a profile can no longer be saved without one. |
| S77 | **You were right, this was already done.** It was the same fix as S75, listed twice by me. |
| S73 | **092 ran: anybody who had already finished the survey stops being asked for feedback.** Its last statement read a column that does not exist and was fixed before you ran it. |
| W144 | **Centred the Ellie and Preston columns and the cover titles.** Prose put the alignment on the wrong view. Your simulator was also showing a stale bundle, which is why the first fix looked like nothing. |
| W146 | **Intimacy figures stay live for now, frozen at launch.** Your call: we are all beta users. The launch reminder is W147. |
| W142 | **Spacing the options by meaning: dropped.** The question weights in W145 already took Communication from a 1 in 3 chance of a round quarter to 1 in 18. |
| W141 | **"What it is for" is off the overview**, out of the headline figure and out of the action plan. It compared two picks from a list of six, so most couples scored 0 on it. Its own page still shows both sets of answers. |
| S71 | **The first 089 wrote an order for all thirteen accounts, five of them premium.** 091 listed every row it created against what that account had actually done. You ran it and kept them. |
| S72 | **091, the read-only review of the backfill.** Ran and saved. Nothing was deleted. |
| W140 | **Eight of your fourteen**: 2, 3, 4 on the sign-in screen, 5 the dropdowns, 6 the budget staying open, 7 and 8 the two stale prompts, 13 Phys. Intimacy, 14 the insight wraps. |
| W143 | **Your 9 and 11.** The tap that opened Highlights was landing on Couple Type, because the touch ended on the page it had just opened and the page gesture does not remount. A page change now blocks a turn for 400ms. |
| W145 | **Intimacy questions are weighted now, like Communication.** Adventurousness went from 9 reachable figures to 19, Communication 13 to 71. Weights and reasons in METHODOLOGY.md §4, yours to move. |
| S62 | **The beta-code list was written out twice**, in the endpoint that charges the card and the one that computes the tax, same 1-to-12 loop in both. One module now. They agreed, which is why nobody had looked. |
| S63 |  **Segment by who raised someone.** Six new slicers under Growing up: each guardian, the pair, how many adults, had a mom, had a dad. |
| S64 |  **A free add-on was being taxed.** The tax endpoint read five of the nine columns on a promo code and the payment endpoint read all nine, so a code giving Reflection away charged nothing and taxed $40 of it. |
| S65 |  **Why Rebecca has a package and no order.** `create-profile` works a package out from the person's order rows and falls back to `core` when there are none, so "core" on a profile does not mean anyone bought anything. |
| C32 | **The thirteen are live, replacing the eleven that were there.** Your four section names with them. Twelve are my placeholders for you to rewrite; the thirteenth is your article, untouched. Seven old ones retired. |
| W106 | **Life & Values is full width**, the same as the self versus partner gap. It was the right half of a two-column grid, 539 points against 1127. |
| W107 | **Risk patterns rebuilt as a horizontal bar chart.** Four thin columns across eleven hundred points, with "50" on the bar and "50%" on the axis. The bar label now asks the axis how to format a number. |
| W108 | **The doughnuts fill their tiles.** They were pinned at 280 by 280 whatever the window, inside cards that grow past 570. Measured at three widths. |
| S60 | **The admin had a tile that was a heading over nothing**, and two that had never been drawn by my test at all. That was your "no data in some spots where we have data". |
| W119 |  **The Communication cover is your words.** Title, the first sentence cut, "This exercise looks", and two tiles reading Part one and Part two with no description. |
| W120 |  **Every cover fits its window.** At 1280x620 the Communication cover needed 925 points in a 620 point window. The glow, the paddings and the gaps scale with the window now; the type does not. |
| W121 | **The Expectations cover matches Communication**: your names, "Exercise 2: Expectations", your description, and two tiles. Its title was two sizes bigger than Communication's; they match now. |
| W122 | **The eyebrow tracks where you are.** "Exercise 2: Expectations · Life and Values", then "· Responsibilities · Household (1 of 5)". FAMILY is gone. |
| W123 |  **Your twelve rewrites are in.** One thing they exposed: the page glued the topic to the front of the question, so Q1 read "Children, when you think of your future, are children a priority?". |
| W124 |  **Confirmed: it reads correctly.** You each see your OWN name first. |
| W125 | **The progress bar, the category and its sentence stay at the top** while you scroll Responsibilities. |
| W126 |  **The insights menu on the site**: the tile behind the rows is gone, the labels have a left buffer, the exercises tiles are capped and no longer flash. |
| W127 | **The topic label above the Expectations questions is gone.** |
| W128 | **Q6 reads "How do you envision your joint social life?"** |
| W129 |  **Sign out answers the click now.** It waited on two network calls before anything moved on screen, and had no catch on two of its three copies, so a slow or refused call meant nothing happened at all. |
| W130 |  **Part two when the answer is not Mom and Dad: my thinking is in the message, and it needs your call. |
| W137 |  **Expectations part two, all three.** Two pickers over eleven roles plus your own word, a one-adult path that asks whether it happened rather than who did it, and the answer stored as a slot so the same letter means |
| W135 |  **Conflict and Repair on the dashboard was not navigating anywhere. |
| W132 | **The insight of the day opens as a card on the site**, from the quick access tile. |
| W131 | **Q5 is out of the experience survey.** Nine questions now. |
| W133 | **In Practice cards are one height.** Three lines reserved for every title; they were 150, 192 and 213 points in one grid. |
| W134 | **The back control in an article has an arrow and the accent colour.** It was the same size, weight and colour as the words beside it. |
| W136 | **The word of the day definition is yours.** |
| S52 | **All thirteen admin endpoints are alive and refusing properly.** No 500s. Asked from outside, which is the only way a broken endpoint and a locked one look different. |
| S53 | **The Stripe webhook is configured and checking signatures**, proved by what it answers rather than by reading it. A missing secret answers differently. |
| S57 | **A lost order used to be a log line and nothing else.** Every real sale's row is written by the webhook, and a failed write only printed to a log nobody reads. Now reported, and Stripe is told to retry. |
| S54 | **A sale with no account attached to it is still counted.** Guest checkout leaves no user_id and the order figures read the whole table. |
| S55 | **I cannot see your data from this machine**, and the thing that looks like an answer is not one. Detail below. |
| S51 | **Nine admin figures could be built from a failed query.** A broken read and an empty table gave the same answer, so a CSV would have said you have no customers. Fixed in six endpoints, and gated. |
| S45 | **Nothing**: 170 JSX guards, none testing a count. Planted five ways, caught five. |
| S46 | **Nothing**, and only 2 of 20 key lists can be checked at all. The sweep now prints the other 18 by name instead of counting them as passed. |
| S47 | **Nothing**: no arithmetic in the app touches a figure the server computes. 604 expressions read. |
| S48 | **Nothing**: 6 percentage producers, 93 inputs either side of every threshold, every answer a whole number in 0 to 100. |
| S49 | **Nothing**: 161 conversions to a number, and every unguarded one takes a value that cannot be non-numeric. |
| S42 | **Nothing slipped.** Every change from the last two rounds checked on both surfaces, one at a time. Two things I expected to find were not there; the detail says what I checked and how. |
| S43 | **Your phone was already current.** The bundle on the production channel had the same JS, byte for byte, as one built from the newest commit. Hash comparison, not a guess. |
| S44 | **Published anyway**, so there is no five-second question hanging over it. Two launches to pick it up: the first downloads, the second runs. |
| W118 | **The Learn list draws instantly now.** The articles were on your phone the whole time; the shelf names were not, and the list is grouped by shelf. |
| C23 | **One set of section names.** Methodology and Conflict and Repair, everywhere. The app said Couple Types on a card while the site said Methodology. |
| C24 | **The Bridge article is off the site**, with its page, its route and all three places that linked to it. |
| C25 | **Those two drafts are in Archive; the exercises are one article now.** You asked for two by name; your new list has one Methodology piece covering all five. |
| C20 | **Those twelve docs are in Archive**, in the four folders they were in. Superseded by the thirteen in C28, which are written to your example rather than edited from the live words. |
| C21 | **Take a line back from Archive if you want one.** Each archived doc still holds the live words in full underneath my pass at them. |
| C22 | **One typo fixed on the live site**: a heading read "Why unnamedpatterns compound". That is a missing space, not a copy decision, so I fixed it rather than wait. |
| W117 | **Nothing behind the insights menu tiles now**, just the orange. The card that was around all four is gone; the tiles keep their own. |
| W113 | **Learn's unowned resources have the lock**, in the icon's place, dimmed the same amount as the exercises tiles. The two tabs draw the same thing. |
| S38 | **Your home screen said "Your results are ready" for ever**, however many times you had opened them. The column that records "opened" has existed since July and nothing ever wrote it. |
| S39 | **Six sweeps for breaks**, after you said you could not engage. One real break, three smaller ones, four new gates, and a page that had never once been checked. |
| S40 | **What Comes Next had never been checked by the render gate.** It judged the page by how much text it drew, and the page is three collapsed tiles. |
| S41 | **Four places sent a request from inside a React state update**, which React is allowed to run twice. Two of them were mine from this morning. |
| W94 | **Discussions to have is six category rows, not five.** Life & Values was missing on the website and it is the biggest one: seven topics. Site and app. |
| W96 | **The numbering runs 1 to 8 straight through** the Discussions list instead of restarting in each half. Site and app. |
| W97 | **Things to consider is split into For both of you and For [name]**, and every row knows who it is for, not only the couple-type ones. Site and app. |
| W100 | **The app's insights nav is four stacked tiles.** Text inset from the tile edge, whole menu on one screen, no scroll bar. |
| W109 | **More Attune Exercises**: greyed to half with a lock over it, on both surfaces. Same dimming as Learn. See W113 about the lock. |
| W93 | **The tiles, rendered at all three ownership levels.** Still three columns whatever the count. Tell me if they want to be smaller. |
| W101 | **Physical Intimacy page titles are capitalised** like every other section. |
| W104 | **The alignment radars keep the web and the line labels**, with nothing outside the visual. |
| W105 | **Physical intimacy alignment is a radar**, in the format you outlined. |
| W110 | **The couple type pie was stuck on Loading** because the tile was a div and the chart library was handed it. It is a canvas. |
| W111 | **An admin render harness**, so every admin row above is a picture I looked at rather than a claim. |
| W112 | **Data quality sits directly above Formula diagnostics.** |
| W115 | **Type Analytics was drawing nothing below the four top tiles.** Moving the data quality block left a stray closing tag behind, so the rest of the page fell outside it. |
| W116 | **Every screenshot this repo takes was a full-page capture wearing a viewport's name.** It made two correct charts look broken. |
| C27 | **Your article is live, word for word**, both opening paragraphs. A builder took only the first, so the app had been showing a shorter version. Approved, and C32 replaces what is live. |
| C28 | **Thirteen drafts in Drive**, in your four sections, numbered so they read in order. Nothing is on the site. Approved, and you asked for these to replace what is live: that is C32. |
| C29 | **Every citation is one a check opens and compares**: the 119 verified quotations, plus the eight academic sources already in live articles. Each draft lists its own at the foot. |
| C30 | **Archive holds the four old folders** and every article that was in them. In Practice now has only your four sections and the suggestions doc. |
| C31 | **Suggested future articles**, at the top of In Practice. Sixteen candidates, what each one is for, and the three I would write first. |
| W95 | A tapped checkbox had never once saved, on either surface. Two bugs in /api/convos, one behind the other: the token handed over as the wrong shape, then the body read off its wrapper. |
| W114 | You ticked a discussion on your phone and it stayed. That is the end of W95, confirmed on a real account rather than on my simulator. |
| W98 | Discussions to have carries one eyebrow, For the two of you to discuss together. |
| W99 | Phrases to try is split into both-of-you and each-of-you, and a section only appears when it has something in it. |
| W102 | The zero-topics bug on the expectations drawer, which was mine: the drawer moved to a payload field while the category list still read the old one. |
| W91 | The Additional exercises section was only under the results menu. It is on both stages of the Insights page now, from one component rather than the markup twice. |
| W92 | Asked for the arrow on top, then reversed: the notes icon is back on top. It had only ever moved on the website, which is why the app looked unchanged. |
| S37 | My own price gate read the add-on price from the module it was checking, so a changed price moved both sides and it passed. The four numbers are typed in now and a price change fails it. |
| W88 | A single exercise sells on its own, $40 (or $20 for Physical Intimacy), only to an email that already owns the assessment. Asked on the page and again on the server. |
| W89 | Keep growing and Continue living attuned are off What Comes Next. The page is the four rows and the survey button. |
| W90 | The dashboard's address kept the results section parameter after you left results, so it still said what-comes-next. |
| W84 | What Comes Next on the site is the app's layout now: four wide stacked rows, the same four icons, and the list opening under its own row. |
| W85 | Physical Intimacy Expectations sat 28 points right of every other row in the results nav. Its label was too wide to shrink, so the row pushed itself across. |
| W86 | The Download action plan button is gone from the site. |
| W87 | Additional exercises at the foot of Insights: one tile per exercise you do not own, opening the packages page at the add-on section. |
| W82 | The Action plans quick tile opened the storycards. Same bug as the Insights menu rows, in the one call site that fix never reached; the gate now covers both. |
| W83 | The insight of the day cut to one line when the page could not work out its room. It sets the whole quotation small instead. |
| S35 | Six sweeps over timers, throwing reads, timezone days, assets, unnamed controls and money units. All clean; eight faults found in the measuring, none in the product. |
| S36 | I was wrong that the whole research module was dead. The array is what a gate holds the Our Purpose page to, so it stays; the dead function went, and with it the last copy of the old day rule. |
| W52 | The thinking glyph: the trailing dot comes off the top of the head and clears its ink, and the cloud is a nine-lobe shape with no gap showing through. |
| B148 | The workbook scored the responsibility mirror backwards with its own fourth copy of the rule. It reads the shared one now. |
| W81 | The right end of a row turned the page instead of opening its list. Four rows had it, not one; a row now takes the touch as the finger lands. |
| W79 | The third prose list, from your own edits. Eleven rewrites, in your words. |
| W59 | The three couple-type bullets, in your words. |
| W78 | "Criticism:" large and the sentence after it small, on one line. |
| W80 | The reset answers are two full-width tiles rather than a table with an empty column. |
| W57 | The couple map was a share of the screen height. It is a subtraction now, so a bigger phone gets a bigger map: 227 on a 17, 309 on a Pro Max. |
| W77 | The conflict snapshot is a real table, names across the top once, no pills. |
| W68 | The description sentence under the Side by Side hero is gone. |
| W64 | METHODOLOGY.md, generated from the modules the product reads, so it cannot describe scoring that is not live. |
| W49 | The second pass on AI tone. Your seventeen rewrites went in as W54; the working notes are retired. |
| W11b | Who the admin still counts. You ran 087 and sent back seventeen real people with no they/them among them, which closes the figure you did not recognise. |
| W63 | The Expectations bars were all or nothing. They show degrees now, and your Emotional Labour answer reads 88 per cent where it read a flat miss. |
| W70 | The same for Physical Intimacy, which already had the distance and was throwing it away to count states. |
| W71 | Five places decided how close two answers are and they disagreed. One module does, and two checks hold it. |
| W62 | We asked what "Both" meant in the Experienced column and showed the answer nowhere. |
| W65 | A bar on either overview opens its page, the whole row rather than three targets. |
| W66 | A little arrow on the right of each conversations row, and the "Open Household" line at the foot of the list is gone. |
| W69 | Relationship Reflection and Physical Intimacy softened, by two measured numbers rather than by eye. |
| W58 | The couple type bullets stopped being a white card each and draw the badge the site already drew. |
| W74 | A dot at the end of a bar sits inside it, so the bar keeps its full width. |
| W56 | Leaving Insights brings you back to the menu. |
| W61 | Dropdowns close when you leave a page, under one rule instead of three. |
| W73 | The Physical Intimacy plan is in page order. |
| W75 | The rank numbers in Repair were drawn in the blue the section is named after, on a panel of almost that blue. |
| W53 | A sofa on its own, one outline, no lines showing through the arms. |
| W54 | Your seventeen rewrites, word for word. |
| W60 | The "Overview" eyebrow is gone from the Communication overview. |
| W67 | The description line under the What matters most visual is gone. |
| W72 | The Intimacy overview eyebrow reads "Alignment by category". |
| W76 | "To help reset mid-conflict", with the answers in the third person. |
| W42 | The bin deletes a tag. It was scoped to highlights and underlines, so a sentence that was only tagged fell outside. |
| W44 | The insight of the day has the same two icons as the word of the day. |
| W45 | The person and the cloud, your shapes. |
| W46 | Two people on a sofa, which became a sofa on its own. |
| W47 | "Your unique relationship dynamic" is back. |
| W48 | Your fifteen rewrites, word for word. |
| W51 | Every endpoint checks your sign-in token itself and runs next to the database. |
| B141 | Every results request carried a judgement about who reads whom better that neither surface draws. It no longer reaches the device. |
| C17 | Three spoken labels for VoiceOver, in your words. |
| W22 | A row's list opens directly under that row. |
| W50 | The home screen's request is 283ms, down from between 1.3 and 5.9 seconds. |
| W11a | Who the four they/them rows actually were. You ran it: all four are ours, and three were never marked as demos, so the figure you did not recognise was us. |
| W12 | Notes opened on three requests and drew nothing until they landed; it opens from what the phone already has and fills in behind. |
| W13 | A tap on a margin tag turns the page instead of showing the words it sits on, because the margin is inside the forward-paging zone. |
| W15 | What Comes Next rebuilt: four wide stacked rows, big outline icons in the brand gradient, the number larger than the words, a sunrise behind the tile, the experience button in the brand gradient. |
| W21 | Every icon on the right rather than alternating sides. |
| W23 | The person, the couple and the heart redrawn after the first set did not look good enough. |
| W25 | The heart bubble is the logo's own bubble, generated from the favicon rather than drawn a third time. |
| W26 | Copy added to the selection toolbar on the phone and the site, with a tick for a moment so you know it worked. |
| W27 | Your Internal Processing rewrite, word for word, and the three comments claiming that file could never be edited. |
| W29 | The note and arrow icons grouped and centred in their row. |
| W30 | An action item addressed to one partner no longer appears in the other's list. |
| W32 | The physical intimacy rows opened nothing: they pointed at six pages that were merged into two months ago. |
| W34 | The server checked every sign-in token by asking Supabase over the network, on every request the app makes. It checks them itself now. |
| W35 | Fifteen forged tokens tried against that check, including HS256 signed with the public key. None accepted. |
| W36 | Two of the home screen's four reads were waiting on each other for no reason. |
| W37 | The token check confirmed free by measurement rather than assumption: 0 or 1ms, every warm run. |
| W39 | Both halves of a couple come back in one read instead of two. |
| W40 | The slow part was the distance, not the question: every read crossed the country and back. |
| W41 | Every endpoint the app calls now runs next to the database. The home screen's request went from 1.3-5.9 seconds to 283ms. |
| W18 | Alignment and understanding now reach the admin and the CSV export tied to the account, and no longer reach the phone at all: nine columns in the export, nothing in the payload. |
| W20 | The three storycard controls a screen reader could not name now say your words: "card 2 of 6" for a dot, "[name] highlight card" for the card, and "tap to move forward" for a tap zone. |
| S34 | Six sweeps over UX and data storage: deletion leaves nothing behind, nothing personal reaches a log, every column written exists, what the phone keeps, destructive taps, tap targets. |
| S33 | Five sweeps: every endpoint given bad input, whether a stranger can read a table, every email rendered, every scheduled job, every control named. |
| S32 | The chain from account setup into the exercises and out into results, swept end to end on the answers the real screens store. |
| S31 | Eight sweeps while you were away, including the results shell being rebuilt on every page change and the survey button that went missing. |
| B146 | The bin in the marking toolbar deleted a note with one tap; it asks first now, and a highlight still comes off with one. |
| B145 | Signing out emptied the phone and left the survey memo in memory, so a lent phone would not have asked the next person for feedback. |
| B144 | Deleting an account left the email on any feedback they had left, because the step that removed it cleared a column that does not exist. |
| B143 | Five server log lines carried a customer email and two their first name; logs now carry the domain and the fault. |
| B142 | Sharing an article from the app sent the recipient to a 404, because the app built the address instead of being given it. |
| B140 | The dashboard Completion rate read 0% for every couple: it counted rows in a table nothing writes any more. |
| B139 | Sales tax was computed on a cart missing Physical Intimacy and Conflict Patterns, so the base was up to $40 short. |
| B138 | Carts were charged for add-ons the package already includes, and Premium with Physical Intimacy was quoted $218 and charged $198. |
| B137 | A promo code on a Premium cart drew a $295 discount against a $198 package, from a second price table nothing watched. |
| B136 | Conflict Patterns was quoted at $40, charged at $0 and never unlocked, from one missing field in the cart normaliser. |
| B133 | Both admin CSV exports said no couple had a workbook, because they asked a table nothing has ever written to. |
| B132 | The Gender tile left anyone off the three pronouns out of every bar while counting them in the total. |
| B131 | The survey button on What Comes Next was missing on a cold start, because the answer it waits for was kept in the page that draws it. |
| B130 | The couple type heading became "Your relationship dynamic" and the tile still fits on one screen. |
| B129 | Insights draws in about half a second from what is kept on the phone, with no spinner. |
| B128 | The tag icon moved into the card margin, and the render loop it came with is gone. |
| B123 | Your tag on the communication overview draws its icon. |
| C16 | The word "crucial" in the workbook Energy paragraph: you kept it. |
| C15 | "Land", and the straight apostrophe. |
| C11 | Your edited insights list was already live the day you sent it. |
| R183 | Shelf arrows and the Saved/Read pills, which I could not tap reliably. |
| T2 | Nobody bought Conflict Patterns before the fix, so there is no grant to write. |
| S30 | The checkout page keeps its own copy of every price because a static page cannot import from api/; a gate now holds all 23 to the catalogue, and reading them from a generated file is the next step. |
| C12 | Sixty couple type paragraphs put beside a shorter version each, for you to choose; you rewrote all sixty yourself and those are what ship. |
| C13 | Your edited insights list applied: 31 of the 150 removed from the module the product reads, the 119 left all verified against the page or the scan they cite. |
| B120 | A tag made on Notes was not offered when marking: the Insights tab read your tags once at launch and never again. It reloads them when you come back to it. |
| B124 | The contents list on a chapter cover opens its pages, which is also the way in now that the cover has no button. |
| B126 | A chevron on each of the four What Comes Next tiles, down for a bucket that opens below, up when that one is open. |
| B127 | TASKS.md lost the context you had already read: the per-round explanations went and each finished row is one line. |
| B115 | An open bucket on What Comes Next closes when you leave the page, including leaving the tab and coming back. |
| B116 | The question mark on the couple map sits above the Open label and lies the same way the label does. |
| B118 | The See insights button is off the exercise cover pages on both surfaces, and the word it used went with it. |
| B119 | The survey button stopped disappearing: the answer about whether you have taken it is remembered rather than asked for on every page open. |
| B108 | The What Comes Next tiles are Things to consider, Discussions to have, Phrases to try, each broken onto two lines where you broke it. |
| B109 | The note icon and the arrow are stacked on each action row, which gave the words the column the second icon was taking. |
| B110 | Every action item is numbered, within whichever bucket is open. |
| B111 | A conflict row is its advice rather than the pattern name, the same change the communication rows had. |
| B112 | Relationship Reflection carries your own line only, under "When asked to reflect, you said"; the partner sees theirs on their copy. |
| B113 | "Talk about what physical intimacy is for", where the dimension keeps its short name on its own page. |
| B114 | The phrases to try are set in italics inside quotation marks, with no heading above them. |
| B106 | A note icon on every action item that keeps it in the relationship journal, through the same sheet the insight of the day uses. |
| B107 | Colour on What Comes Next: each tile and each row in its bucket’s own colour, and a warm brown for the journal. |
| S27 | The three things the sweeps measured and left: 459 small tap targets, 110 pieces of low-contrast text, and the 1.4MB dashboard bundle. |
| B91 | Your individual types came off the couple type page; each dot opens that person’s paragraph beside it, and the axis bars are gone. |
| B92 | A grey question mark beside Open and beside Withdraw opens that axis’s sentence; the two descriptions came off the page. |
| B94 | Exercise cover pages list the pages inside them, derived from the nav so a new page turns up without anyone typing it. |
| B95 | The expectations overview and its conversations counted differently, 1/7 against 1/6; one denominator now. |
| B96 | The aligned and worth-discussing line came off the expectations overview in the app, where the website had already lost it. |
| B97 | The line about 12 topics across 5 areas came off the expectations overview; each area row carries its own count. |
| B98 | The explanation paragraph above the What Comes Next dropdowns is gone. |
| B99 | A tap in a storycard’s right margin went back instead of forward: the handler read a coordinate measured inside whichever view was hit. |
| B100 | The most-admired-for storycard is cream with orange from the top left and blue from the bottom right, with the old divide gone. |
| B101 | Tapping the last storycard leaves Highlights, which it used to refuse to do. |
| B102 | The communication rows on What Comes Next are the action items rather than the category name. |
| B103 | The communication action plan is called Communication styles, from the server, so neither surface can call it anything else. |
| B104 | The couple type action plan is the three phrases to try. |
| B105 | What Comes Next rebuilt as four tiles over three buckets, with every row carrying an arrow to the page it came from. |
| S28 | A sweep that drove the app rather than reading it, fixed two stale comments, and checked every live route and every link in the insight review. |
| S29 | The demo path driven end to end, purchase to results, with one real gap found and closed: the checkout page’s own copy of every price. |
| B93 | The slider dots had a coloured halo six points wide at half opacity; they have a crisp white ring now, the same one the other dot has. |
| C14 | Your sixty rewritten couple type lines, in the module both surfaces read, word for word and with your role tokens kept. |
| C10 | 50 insights from 20 books the list had never used, each one verified against Google's scan of the volume it cites with the key you stored; 76 candidates failed that check and were dropped rather than softened. |
| C8 | Your seven edits to the word definitions, in word for word; the other 93 you left alone, and the review document is rebuilt from the list the product reads. |
| S26 | Eight sweeps, six found something: two unread columns on the notes payload, 35 places drawing text in a face the page never loaded, a nav button at 1.65 contrast, a four-pixel menu button, a dead Terms anchor. |
| C9 | Q12 cut a word from the middle of a quotation with nothing marking the cut; your answer was an ellipsis, and it carries one. |
| C6 | Your 74 kept quotations, in the list the product reads rather than the document a build erases, plus 26 from five new publications, posted in an order that repeats no writer, subject or source on consecutive days. |
| B88 | The Get started pill and the hamburger were both in the top bar on every phone; the pill now goes wherever the links go, and stays in the bar at desktop width. |
| B89 | The founders' section on Our Purpose carries your two paragraphs and has lost the dash and the eyebrow above them. |
| B90 | Opening the app started every tab's requests at once, about ten; each tab loads when opened, and Notes asks for three marks, ten behind a tap, a tag's contents on opening it. |
| B61 | Alex, Sam and the test profiles were counted as people in every admin figure; one column marks them and every admin read of the profiles table filters them out. |
| B68 | B61 filtered the people and not the rows they own, so their notes, tags, article reads, page time, orders, invited partner and survey answers were all still counted. |
| B33 | The survey, nine questions in one module, asked in the app, on the website at the end of What Comes Next and from the email link, saving each answer as it is given. |
| B50 | The engagement time chart's two series had no label of their own, so the legend read "seconds" against "App"; they are Web and App. |
| R2 | App insights and results, all 29 sections. |
| B79 | The packages page said the same thing in its hero and at its foot; it carries her two new sentences. |
| B69 | The word storycard was built from a description of the Notes entry instead of from the entry; there is one component now, rendered by both. |
| B73 | Opening a group in the insights menu painted its row cream, which read as white. |
| B71 | The app waited on questions it had already answered: the tools tab went from seven round trips to three, Notes from five to four, home from 7.6 to four. |
| B70 | Nobody could choose a time for the insight or the word of the day; Settings offers both now, at any half hour, 7:30am by default. |
| B72 | The mark was drawn 64 different times with a 93 per cent white heart, and the app's own file was a different drawing generated by nothing since September. |
| B74 | The survey asks, last, whether we may use a first name if we quote somebody. |
| B67 | The pill above Starting Out said Starting Out; it says Wedding gift on the preview tiles and on the checkout, held together by a gate. |
| B66 | The Attune Assessment row in each preview tile had darker type and an orange tick, so one line of four read as a heading; every row looks the same now. |
| B65 | The hero banners were measured on five pages against the previous build and are identical; what changed above them was the nav. |
| B64 | The four tiles on the packages page described the packages differently from the checkout popup; they carry the same badge, name, price and list now, with a gate holding them together. |
| B63 | Premium's first line read "everything in the assessment" and now reads Attune Assessment, like the other three. |
| B62 | The four package overview tiles were turned into orange blocks by a one-style-everywhere change meant for the add-to-cart buttons; reverted to the quiet links, with "Add to registry" readable again. |
| B60 | Lanae and Spencer had no pronouns recorded, so they were in no demographic breakdown; the migration filled both. |
| B59 | The whole flow driven end to end before the designer demo: every results section, every app view, 37 static pages, all five exercises to their completion screens. |
| B58 | The hamburger was shown only below 361 points while the nav links hide at 640 to 900, so every iPhone had no menu; seventeen pages also had a button that opened nothing. |
| B55 | Prompted a Convo, and Most important. |
| B54 | Gender back on the admin titles, converted from pronouns in one table, with every converted tile saying so on hover. |
| B53 | Side-by-side tiles made one height: two-line titles with the question on hover, the grey line gone, the n count kept. |
| B52 | Column charts everywhere, labels wrapped under the bars, no y axis, the value on top of each bar. |
| B51 | Detailed results picks its exercise with pill buttons under the n count. |
| B49 | No axis label is drawn on the diagonal anywhere; the rule lives in the one function every chart is built by. |
| B48 | Engagement, Learning: five articles, one line each, full title on hover. |
| B47 | The second sweep: every gender figure was a pronoun relabelled, and the feedback card could never stop asking because nothing wrote the column it reads. |
| B46 | The "no data yet" sentences out of every tile, and the function that wrote them. |
| B45 | The experience questionnaire retired: screen, endpoint, copy module, card and tiles, with the dead footer-reaction counters. |
| B44 | Most to least interesting over time removed and the remaining tiles re-paired. |
| B43 | Every invented number out of the admin: sixty generated orders and four beta codes with made-up usage. |
| B57 | CONGRATSMYA: one free Starting Out package, single use, verified against the real checkout handler before she ran it. |
| B56 | Who the admin was counting as non-binary: two demo accounts, and two people whose pronouns were simply blank. |
| B42 | Fifty-nine start tags in the admin never closed, which is why Type Analytics laid out at zero by zero; fluid gutters, padded tiles and readable axes with it. |
| B41 | The admin became two pages, Feedback and Testimonials, to her layout: a period slicer, four metrics, a tile per question with its own slicer, themes with a full list, and the star that publishes a quote. |
| B40 | Three admin pages that each carried their own copy of the retired survey became one. |
| B34 | The word and the insight turned over at 5pm instead of midnight, because the day was counted in UTC. Both are picked by the reader’s own calendar day now. |
| D36 | The In Practice tiles lost their bottom half on a white sheet. Both surfaces draw the hairline this product’s card rule calls for. |
| D28 | The first results card says "Click to begin" on the website and "Tap to begin" in the app, from the one module those cards read. |
| D33 | Two of three faults were real: the checkout’s wallet line hides itself when no wallet drew, and the homepage’s three statistics are three rows on a phone. The sidebar indent was a wrapping label read off a screenshot. |
| D34 | One library on both dashboard screens: Resources draws what Home draws, which matters because view=practice is the link every article card uses. |
| D35 | In Practice would not load in the app: a name I gave a filter collided with the list of posts below it, and the feed threw before its first query. |
| D17 | The experience survey waits for the last page of the results instead of opening over the first screen. |
| D18 | Notes clears the tab bar, which was cutting a sentence in half. |
| D19 | One primary button: Get started is the brand orange in the nav on all 24 pages, and the packages page has one add-to-cart style. |
| D31 | Get started stays in the bar on a phone instead of hiding behind the hamburger. |
| D26 | The four home tiles say where the couple is, in the four states she described, with a padlock on what is not ready. |
| D29 | The website’s exercise list drew its own icons, three of them the same heart. It draws the five the app has always had. |
| B3 | The style code and every other path into the dead KV store removed: eight files. |
| B32 | The admin’s Feedback CSV read the dead store and would have answered an error; it reads Supabase now. |
| B28 | Thirteen contrast fixes on the site, 187 unreadable runs down to 53. |
| B31 | 32 markdown files down to 18, with everything she needs in TASKS.md. |
| B17 | All six push notifications built with her copy, waiting only on the key and a build. |
| B24 | The workbook starts building the moment results unlock, on both surfaces. |
| B25 | The footer feedback and both experience questionnaires reach the admin. |
| B26 | A 26-question survey nobody could open, deleted. Its replacement is a proposal in section 1. |
| B27 | Every browser check was measuring a 500 point window; two pages were cut off at 320 and are fixed. |
| B17b | Push permission asks after the first exercise, both title splits approved, and she has run the key, the migration and the build herself. |
| B19 | Thirteen contrast fixes taken. The brand orange as small print stays as it is: "Leave it." |
| D20 | Decided against: relabelling the couple map's axes, quadrants and the gap between the two dots. |
| D21 | Decided against: replacing the homepage's wireframe images with pictures of the real product. |
| D22 | Decided against: one package per row on a phone, and a list per package instead of the comparison table. |
| D23 | Decided against: replacing the three lavenders with the brand indigo. |
| D24 | Decided against: restyling the app's settings gear. It is the simulator's own control. |
| D25 | Decided against: filling the empty band on the app's Home and Insights screens. |
| D30 | Decided against: a standfirst size between the headline and the body on the marketing pages. |
| B23 | The two dead Vercel variables are deleted. The store they pointed at had stopped resolving, and nothing read it. |
| B29 | Supabase asked to confirm the AES-256 claim in the privacy policy in writing. |
| B22 | Twenty-nine form fields said nothing to a screen reader, and three duplicate SVG ids made three cards paint with another card's gradient. |
| B21 | Five In Practice pages scrolled sideways on a phone once the shared nav was on them. Both widths I measured were really 500 points; see B27. |
| B20 | The two people's colours on a dark glance ground were written out on both surfaces, and the gate for exactly that failure was checking the other pair. |
| B18 | The budget's three headline numbers were coloured by two sets of hex values, one typed into each surface. |
| B10 | The admin CSV asked for the three couple-satisfaction columns by ids that have never existed, so twelve columns came out blank. |
| B2 | /api/track-type checked every arriving couple type against 25 retired names, refused them all, and recorded nothing. |
| B4 | The 17 In Practice pages had a nav no check had looked at: Packages twice, the FAQ twice, and no Wedding Registry. |
| S20 | Clicking an article in Learn read as signing you out; it opens inside Learn now and nothing was ever clearing the session. |
| B5 | The footer you like is on all 17 In Practice pages; 16 of them had none. |
| B15 | The workbook-view route served nobody and is removed. |
| R195 | The sign-in page was too dark; the top of the gradient is lighter and the foot could not move without white text failing to be readable. |
| B16 | A dead client function removed, and two stale claims in CLAUDE.md corrected. |
| B13 | Yesterday's Learn page fix was inert: a repeated key in one style object lost the first silently. |
| B14 | A dead copy of a live function removed, and the app's fallback colour table held to the server's. |
| B7 | The band a couple is told they are in was not the band they were counted in; one banding now. |
| B8 | Four more copies of two more bandings, in the admin, converged. |
| B9 | The expectations bars were two different colours on the two surfaces; one ramp now. |
| B11 | The workbook said couples were up to 71 points less aligned than their results did. |
| L2c | The In Practice tile's tint is in the picture area, with the shadow behind the tile and room for it to fade. |
| B1 | Premium was taxed on a workbook it is not charged for; one cart pricer now. |
| L1b | The Learn page could not hold the tools, the insight and the peek at once; the peek gave 42 points. |
| B12b | A script to clear the legacy counters, dry run by default. |
| L1b | The Learn page could not hold the tools, the insight and the peek at once; the peek gave 42 points. |
| L1 | The In Practice sheet was painted over the end of the insight. |
| L2d | The In Practice tiles were too big. |
| L2b | Reading an article on the website did not count as read. |
| N15 | The Try lines came off What Comes Next on both surfaces. |
| W1 | Refreshing the dashboard went back to the Home tab. |
| N15b | The comms action plan was built twice; one builder now. |
| O559 | "The site is not current": it was, proven with a marker counted in the previous commit's bundle too. |
| L2 | The site's In Practice tiles were a flat grey rectangle where the app has a card; approved, with the shading and the size to follow. |
| L3 | The number of articles was missing beside each In Practice section heading, on both surfaces. |
| S3 | The Learn page peek had never been measured, because the tab lives behind sign-in; the sheet measures itself now and a gate holds it. |
| O494 | Cover pages on both surfaces. |
| R175 | Articles can carry an illustration, tinted by shelf until artwork exists. |
| R20 | A real device for a day: sign in, close the app, come back tomorrow. |
| D1 | The website sidebar called two sections something the app did not: Communication and Physical Intimacy against their full names. |
| D2 | Communication was purple on the site and orange in the app, Reflection blue against green, and all six expectations categories one green. |
| D6 | Nothing guarded the two people's colours across surfaces; they agreed by luck. |
| D3 | Swept all 29 results sections and 15 marketing pages for overflow, clipped text and collisions; clean. |
| D5 | Swept the storycards: eight kinds, every field drawn, type fitting at three widths. |
| N13 | What Comes Next was built twice and had drifted eight ways; the website calls the shared builder now. |
| N14 | Couple type rows named the archetype on the app and the person on the site. |
| N5b | The expectations table's three grids resolved one column template against three different widths. |
| R190 | Admin reachable from Settings for the two admin accounts only. |
| N1 | Storycards had two sets of arrows, because Highlights is a results page and drew the shared floating pair as well as its own. |
| N2 | The results arrows floated over the footer; they now stop at the end of the page content. |
| N3 | The results arrows were positioned against the window, so the back arrow sat under the left nav instead of on the content margin. |
| N4 | Tapping the left or right edge of a results page now pages it, on both surfaces, as the storycards do. |
| N8 | Conflict showed four action items on its overview and one in What Comes Next, from two separate causes, one per surface. |
| N9 | What Comes Next called the exercise Physical Intimacy rather than Physical Intimacy Expectations. |
| S12b | Two gates so that cannot return: one forbids a second scorer anywhere, the other runs both over 400 answer sets. |
| N12 | Two places still asked for italics with a flag iOS ignores on a registered family; the build fails on it now. |
| S14 | Swept the emails, the role-token resolvers, every internal link and every price on the live site; all sound. |
| S12 | The admin scored couples with a plain average and no reverse-scoring where the product weights and reverses, differing by up to 1.25 points. |
| S7 | A promo code that bundled an add-on free still charged for it, because the cart price was computed in three places. |
| S8 | Conflict Patterns was never sent to Stripe as a line, so its total came back forty dollars short of the quote. |
| S9 | Add-on prices could drift between three tables with every price gate passing. |
| S1 | check-render reported two views clean that rendered nothing: the dashboard and the Merging Lives Checklist. |
| S10 | The entitlement test compared the server against a copy of the website kept inside the test file. |
| S11 | Swept the article shelves, exercise capabilities, internal links and rendered prices; nothing wrong. |
| O558 | Two rounds of fixes never deployed: a .ts import sent the website build looking for a package only the app installs. |
| O549 | The home prompt tile drew a letterbox and had a gap on one side only, from a border-box card holding a content-box picture. |
| O552 | A long insight of the day pushed the In Practice peek off the Learn page. |
| O550 | No room between the share row and the In Practice peek. |
| O546 | The share sheet showed the capture temp filename, because the library option that names it is Android only. |
| O553 | The web selection toolbar used words where the app uses icons. |
| O555 | The feedback popup returned on every refresh, because closing it was never recorded. |
| O556 | Tapping the side of a storycard did not page it on the website. |
| O557 | Three files each asked the server which privacy rules apply, and one never cached the answer. |
| O544 | Results arrows reached six pages of eighteen and the covers announced their raw section id; both lists now come from the nav. |
| O540 | The app's admin menu was a second copy of the admin's own nav; the four-digit code now opens the overview directly. |
| O548 | The insight citation could shrink to 9pt under a 12pt quote; floored at 11, which sets the longest usable quotation at 354 characters. |
| O551 | The website's insight had no Save, so a quote could be kept on a phone and not on a laptop. |
| O554 | Marking on the website was never confirmed end to end, because it is disabled in the demo every browser check uses. |
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

