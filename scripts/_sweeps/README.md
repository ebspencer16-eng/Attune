# Sweeps

A sweep is one property measured over every instance of its thing. These are
the throwaway ones from the round of 19 October, kept because re-running a
sweep is cheap and because the next person should see how each one was wrong
before it was right.

They are NOT gates. Nothing runs them in `npm run check` and none of them fails
a build. When a sweep turns up a rule worth holding, the rule goes into a
`check-*.mjs` and the sweep stays here as the thing that found it.

| Sweep | What it measures | What it found |
|--|--|--|
| sweep-unwritten-columns | every column api/ selects, against every column anything writes | Nothing, on its second scope. Its first looked for writes in api/ alone and reported six, all false: one is written by the website, one by Ellie in the SQL editor, and two through EXERCISE_COLUMNS, which is the registry blindness CLAUDE.md names |
| sweep-fetch-routes | every literal /api path a surface calls, against the endpoints and the rewrites | Nothing. 126 paths across 134 files, all resolving, and the only wildcard rewrite does not touch /api |
| sweep-page-console | every static page loaded in a browser, with a canary page that throws on purpose | One, and it is a deliberate noindex redirect shell. Its real value was pointing the id sweep at the pages that then gave up the sticky-bar bug |
| sweep-silent-read-failures | every catch round a database or network read outside the admin | Nothing. 56 such catches, 10 with an empty body, and 9 of those 10 carry a written reason for being empty |
| sweep-missing-styles | every `styles.x` the app reads, against the keys its StyleSheet defines | Nothing, and the figure is small for a reason: this app styles with 1400 inline objects and uses StyleSheet.create in four files |
| sweep-missing-ids | every element id the admin reaches for, against every id that exists | 22. The Explore page's "could not read" banner anchored to three ids that are not on it, so it had never drawn; the rest were two deleted pages' leftovers |
| sweep-dead-admin-functions | every function in admin.html, against everything that could call it | 14, all real. Two mint admin tokens with Math.random, two export names and addresses. One known false positive: `$`, because `\b` has no boundary beside a dollar sign |
| sweep-undefined-classes | every class used on an element, against every class styled | 9. Five pages built with names nothing styled, and one KPI card asking for a colour that is not one of the five, so it alone had no coloured bar |
| `sweep-endpoints.sh` | every endpoint answered from outside with no sign-in | nothing: 60 proper refusals, no 500s |
| `sweep-scorers.mjs` | the three `calcDimScores` over 400 answer sets | nothing: 4,000 scores, all agreeing |
| `sweep-role-tokens.mjs` | both `resolveRoleTokens` over every couple-type string | a hazard, now held by check-role-tokens |
| `sweep-payload-fields.mjs` | a field the app reads that the server never sets | nothing, after the harness learned shorthand |
| `sweep-dead-exports.mjs` | exported names nothing imports | three genuinely dead, two in rule-defining files |
| `sweep-twin-constants.mjs` | a constant declared on more than one surface | two colours typed twice, now in one place |
| `sweep-her-edits.mjs` | prose shapes Ellie has already rewritten once | eleven, in TASKS.md under W79 |
| `sweep-nested-components.mjs` | a React component declared inside another | one holding state, fixed and now gated |
| `sweep-swallowed-errors.mjs` | a catch that discards the error and says nothing | one cron reporting success after a failed read |
| `sweep-two-renderers.mjs` | every canvas in the admin, against how many places draw it | one: two functions drew the add-on chart, and the edit Ellie approved went into the loser. Wrong twice first: counting the `<canvas>` markup as a renderer reported 38 of 48, and treating an indented `const x = (` as a function split one renderer into three |
| `sweep-app-numbers.mjs` | every expression the app's results screens draw inside a Text, against whether it is read from the payload or worked out | the answer to V3: 140 of 143 are a read or a format, and the nine flagged are positions, clamps and list indexes. No second scorer, so a render diff between the surfaces would measure something that cannot differ. Wrong once first: counting only the expression drawn missed a number worked out a line above and drawn by name |
| `sweep-alignment-change.mjs` | both alignment rules over every real couple's stored answers | 19 rows the old rule called aligned that are not; every score that fell had been a 100 |
| `sweep-alignment-floor.mjs` | whether the new measure can still score low, over every pair of answers two people can give | floor reachable: opposite couples read 0 everywhere; the one generous branch fires on no real row |
| `sweep-uncleared-timers.mjs` | every timer and listener started in an effect | nothing, after it learned that an effect's implicit return IS the cleanup |
| `sweep-throwing-reads.mjs` | a method that throws on undefined, on a chain that crossed a boundary | nothing, after three narrowings: 68 of 99 was the normal case, not a fault |
| `sweep-timezone-days.mjs` | every place a stored timestamp becomes a calendar day | nothing live; the two display calls are correctly local and the crons are UTC-consistent |
| `sweep-missing-assets.mjs` | every referenced image, icon and font | nothing, after it learned the `@/` path alias |
| `sweep-unlabelled-controls.mjs` | every control with an onPress and no name a screen reader can read | nothing, after it learned `accessible={false}` is a deliberate exemption |
| `sweep-cents-and-dollars.mjs` | a cents value printed as dollars, or a dollars value sent to a processor | nothing, after it learned the conversion sits on the definition, not the use |
| `sweep-valid-requests.mjs` | every endpoint given a token the stub vouches for | nothing, after it learned that seven admin endpoints reach the rule through `checkAdminAuth` and never name ADMIN_SECRET |
| `sweep-argument-shape.mjs` | every function that unpacks its argument, against every call site | nothing live, after it stopped treating `ctx` as a request; it does catch both of the day's bugs when they are planted back |
| `sweep-updater-effects.mjs` | a request or a second setter started inside a React state updater | four sites, all fixed and now held by check-updater-purity |
| `sweep-unwritten-columns.mjs` | a column the code reads that nothing ever writes | `results_last_opened_at`, read by three home prompts and written by nothing since migration 050 |
| `sweep-number-guards.mjs` | a JSX `&&` guard whose left side is a number | nothing: 170 guards, none testing a count. Planted five ways and caught all five |
| `sweep-key-lists.mjs` | every key in a hand-typed list, against the list it indexes | nothing, and only 2 of 20 lists are measurable at all; the other 18 are named rather than skipped |
| `sweep-app-arithmetic.mjs` | arithmetic the app does on a figure the server computed | nothing, after `value` and `total` stopped matching a Reanimated transform and a progress bar |
| `sweep-percentage-range.mjs` | every percentage the product computes, over its whole input space | nothing: 6 producers, 93 inputs either side of every band edge, all whole and within 0..100 |
| `sweep-nan-reach.mjs` | a NaN that reaches a person | nothing, after the scope learned to follow the binding rather than a line window |
| `sweep-masquerading-defaults.mjs` | a default that stands in for a failed read | seven admin reads where a broken query and an empty table were the same figure; now `check-admin-read-errors` |
| `sweep-inflight-caches.mjs` | a cache filled when the answer arrives, asked before it has | two in the admin: the cube (nine requests for one visit) and the survey; both share the request in flight now |
| `sweep-uncalled-endpoints.mjs` | every deployed endpoint, against everything that could call it | two left behind by deliberate removals, `/api/generate-pdf` and `/api/orders`; removed at Ellie's yes, A201b |
| `sweep-unchecked-json.mjs` | a response body used as data with nothing asking whether the request worked | one: checkout showed a parser error ("Unexpected token '<'") on a platform error page; it reads as the connection message now |
| `sweep-discarded-writes.mjs` | a write request whose answer nobody reads | the contact form, which had never delivered a message since 7 April and said "Message sent" every time; the website's exercise-done signal, sent once with no retry; two results-ready emails marked sent before sending; rerun 30 October: the workbook discount request marked sent on the device before asking and never given back, so one failure meant that device never asked again |
| `sweep-load-order.mjs` | a page script reading a let, const or class before the line that creates it, while the page loads | the `_showMissing` that stopped checkout in the A211 branch, and `EMAIL_OK` waiting to do the same the day a name is pre-filled. One false lead first (a function stored on `window` counted as running). Now `check-load-order` |
| `sweep-floating-promises.mjs` | a promise on the server started and never awaited, which an edge function cuts off when it returns | eight Sentry error reports, all on edge error paths, so the reports for the worst moments were the ones most likely lost; awaited now with a 1.5s cap, and held by check-server-awaits |
| (by hand, A202) stored promises | a promise assigned to a name on the server and never awaited, the form check-server-awaits cannot see | nothing: one such declaration in api/, and it is used |
| (by hand, A202) emails in database URLs | every email value put into a REST filter, for encoding and for case | two. The workbook promo check sent addresses unencoded, so a `+` read as a space; and every buyer email was STORED as typed while every lookup lower-cased, so a capital at checkout made an order nothing could find by address. Writes lower-case now, migration 102 enforces it, check-buyer-email-case holds the code half |
| (by hand, A202) typed codes | promo, invite and order codes, normalised at both ends | one: create-profile handed the purchase gate an invite code without upper-casing it; the app did, the server now does too |
| (by hand, A202) cron auth | every scheduled endpoint, for a missing or unset secret | nothing: all seven refuse to run without CRON_SECRET, which matters because `Bearer ${undefined}` is a header anyone can send |
| (by hand, A202) whole-object saves | a save that replaces stored state, sent again before the last one answered | the survey, on the website and the app: an older save landing last put an older answer set back. Both queue their saves now, held by check-survey |
| (by hand, A202) `.single()` | a read that errors on zero rows where zero rows is normal | nothing harmful: the one on sign-in reads "no profile" as "could not read", which keeps local answers, the careful direction |
| (by hand, A202) retried webhooks | the Stripe webhook given the same event twice | nothing: the order number is unique and a 409 sends no second email |
| (by hand, A202) read-then-write counters | a number read, incremented, written back | the promo use count: two redemptions at once both passed single-use, and a failed lookup skipped every guard on the code. Claimed by compare and swap now, refused when unreadable, held by check-promo-claim, which drives the endpoint over seven database outcomes |
| (by hand, A202) typed values in emails | every name or note a person typed, put into an email's HTML | two cron emails: the survey nudge's name and both check-in names, one of them typed by the OTHER partner. Escaped now; check-email-escaping renders all 14 emails with markup in every typed field |
| (by hand, A202) app writes left unread | every call to one of the app's write functions whose answer is dropped | four that hid a failure: both note deletions (the row vanished and came back next load, unexplained), the daily-push picker, and turning notifications off (recorded off, server kept sending). Each rolls back and says so in an existing line; check-app-write-results holds the rest to a counted list of receipts |
| (by hand, A202) app retries | a write the app sends again after a timeout, which could do it twice | nothing: the app replays only after a 401, which the server refused before running |
| (by hand, A202) markup sinks | every innerHTML in the static pages and the admin fed a typed value | one weak escape in the admin (it escaped `<` only, inside option values); checkout's gift note and success email, which only ever show the buyer their own typing, escaped anyway because a `</textarea>` broke the cart |
| (by hand, A202) server writes left unread | a database write on the server whose answer nothing reads (`sweep-server-unread-writes.mjs`) | two that mattered. Account deletion went on after failing to remove orders, workbooks or a feedback address, leaving personal data with no owner; it stops first now, held by check-deletion-complete. And a retake overwrote a couple's results after its archive failed; it waits for the archive now, held by check-frozen-split. Wrong first: it does not follow `x = await fetch(...)` assignments or `.catch` chains, so read every hit |
| (by hand, A202) order numbers | every place an order number is made, against every place one is read | card orders were numbered twice: checkout showed the customer one built from the payment id and the webhook stored a random one, so no card buyer could claim their order by the number in their own link, and a retried webhook wrote a second order. One number now, minted by the payment endpoint; old numbers are found through their payment. check-order-number |
| (by hand, A202) fake signups | a form that says it saved something and sends it nowhere | the In Practice "new posts" signup: "Thanks, you're on the list." and no request at all. Put to Ellie (A202b) |
| `sweep-db-down.mjs` (A203) | every edge endpoint run with a signed-in caller while every database request fails | seven endpoints answering 200 to something they could not read: the check-in cron said nobody was due, the push cron said it was not set up, the retention job reported failure inside a success, the exercise-done signal said it had told the partner (so the website never retried), the beta tile said not beta, and marking an alert read said done. Now check-db-down. Wrong first: with one generic body, 28 of the write endpoints stopped at a 400 and were never tested at all; each has a valid body now and the gate prints the two that still stop |
| (by hand, A203) re-derived links | every invite, setup and gift link, built against read | nothing new: invite links agree everywhere. The gift link carries no order number and the order carries the giver's email, so a recipient can only claim through the setup link the giver forwards, which is why the order-number bug hit gifts hardest |
| (by hand, A203) clock changes | every time stored as a local hour | the daily notification: its offset was stored once, so every daylight-saving change moved it an hour. /api/home refreshes it; check-tz-refresh |

The 29 October four, and how each was wrong first:

- `sweep-uncalled-endpoints` reported nothing on its first run, because
  vercel.json rewrites every endpoint to its own file, so every route looked
  called. Only a cron path, or a rewrite from some other address, counts now.
- `sweep-inflight-caches` went on reporting the two caches it had found after
  both were fixed, because the fix (a promise kept beside the cache) is not
  the shape it matched. It learned the fixed form, and still finds the broken
  one: the survey loader was found by it, unfixed, on the run that taught it.
- `sweep-unchecked-json` saw 44 reads and the code has 59: most clients write
  `.then(r => r.json())`, and the static pages write `function (r) { return
  r.json(); }`. It knows the first two; the third (four sites) was read by hand
  and all four check what came back.

The 20 October four were wrong five times between them before they were right,
which is worse than the usual ratio and worth the detail:

- `sweep-valid-requests` reported thirteen endpoints refusing a good token and
  seven were admin endpoints it could not see: they reach the rule through
  `checkAdminAuth` and the literal ADMIN_SECRET appears in none of them.
- `sweep-argument-shape` reported `orderConfirmationHtml(ctx)`. That `ctx` is
  `{ ...body, setupUrl, giftUrl }`, a bag built for exactly that call, and
  `ctx` is the conventional name for the thing the sweep was looking for the
  absence of.
- `sweep-updater-effects` matched `/^set[A-Z]/`, which `setTimeout` satisfies:
  eight of its nineteen findings were timeout callbacks clearing a flash
  message, and a ninth was the one real finding reported twice. A setter is
  the second half of a `useState` destructure, and that is readable.
- `sweep-unwritten-columns` was wrong three times in a row. It could not see a
  column list built as a JavaScript array, could not see a computed key
  (`updates[\`${exercise}_completed_at\`]`), and could not see a member
  assignment (`patch.tz_offset_minutes = ...`). Twenty findings became one.

Each of those is the same lesson in a new costume: when a scanner looks for a
string, ask what the indirection for that string is, and match on both.

Two of the earlier ones were wrong before they were right, which is the usual
ratio:

- `sweep-payload-fields` matched `name:` only, so it could not see
  `return { groups, buckets }`. Every one of its seven findings was that
  blindness. A clean run before the fix would have meant nothing.
- `sweep-role-tokens` reported 38 disagreements and all 38 were impossible
  pairings: it ran every couple type's strings against every kind of couple,
  including couples who could never be that type.
- `sweep-nested-components` first measured each component's size by counting
  braces from its first line and reported Sidebar as two lines and Entry as
  two lines. Both are forty to fifty. It reads the extent off the parsed node
  now, which is the only thing that knows where a function ends.
- `sweep-swallowed-errors` looked for an explanatory comment only ABOVE the
  catch, and most of the explanations in this codebase are written inside the
  block. It was calling the documented ones undocumented. It reads both now,
  and it reports separately the 22 that sit round a database or network call,
  because a catch round localStorage is not the same question.

So: when one of these reports something surprising, the first hypothesis is
the harness. Print one case end to end before believing the column.

The 21 October six were wrong eleven times between them, which is the worst
ratio yet and all of it the measurement:

- `sweep-key-lists` reported thirteen keys that "resolve nowhere". Twelve were
  word lists matched against free text and one was a CSV header; none of them
  indexes anything. Narrowed to the lists whose keys index a STATIC object,
  which is 2 of 20, and the other 18 are now printed as not measured rather
  than passed over.
- `sweep-app-arithmetic` matched `value` and `total`, which caught a card's
  entrance animation and a progress bar counting what the person had typed.
  Both are the phone's own numbers wearing a figure's name.
- `sweep-percentage-range` called `null` a failure four times. It is the
  designed no-figure answer, documented, and asked for by name.
- `sweep-nan-reach` was wrong four times in a row. A four-line window called a
  `parseInt` guarded because `featured: r.featured_question === q` sat two
  lines below it, which is manufacturing the evidence. Scoped to the statement,
  it then reported three correct reads because this codebase writes
  `const raw = Number(x);` and guards `raw` on the NEXT line: the fix is to
  follow the BINDING, not to widen the window. And `== null` is not a NaN
  guard, while `|| null` is.
- `sweep-masquerading-defaults` was blind to three reads in the one file its
  lesson came from, because every profiles read goes through `selectProfiles`
  and names no table.

`check-admin-read-errors.mjs` came out of the last one, and it took eight
plants and six wrong versions. Worth reading its header: the exemption for a
read with no visible default had to be deleted outright, because the default
had moved inside `withoutDemoOrders`.
| `sweep-email-links.mjs` (A205) | every href in every email the catalogue renders, and where it lands and what it carries | every link resolves. What it carries was the finding: a gift buyer is told "We've sent 's access link in a separate email" (blank name) and nothing is ever sent, because checkout never asks for the couple's address and the gift buyer gets no setup email either, so the row above about the giver forwarding a setup link was wrong too. Put to Ellie (A205b). And the unsubscribe link acted on a GET, which a mail scanner's prefetch performs; now it asks, and only a POST acts (check-unsubscribe-asks) |
| (by hand, A205) the other direction of sweep-fetch-routes | every endpoint no surface, cron or webhook names | /api/account-signup, uncalled since 9d053ab5 and able to make a login for any address. Put to Ellie (A205c) |
| (by hand, A205) typed values in filters | every PostgREST `or=(`, `in.(` and `cs.{` built from a value | the workbook promo put a typed partner address in unquoted, which could be shaped to match any code, and the same endpoint emailed that address. Partner now read from the account; values quoted by api/_lib/filter-value.js (check-workbook-promo-recipients) |
