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
| `sweep-endpoints.sh` | every endpoint answered from outside with no sign-in | nothing: 60 proper refusals, no 500s |
| `sweep-scorers.mjs` | the three `calcDimScores` over 400 answer sets | nothing: 4,000 scores, all agreeing |
| `sweep-role-tokens.mjs` | both `resolveRoleTokens` over every couple-type string | a hazard, now held by check-role-tokens |
| `sweep-payload-fields.mjs` | a field the app reads that the server never sets | nothing, after the harness learned shorthand |
| `sweep-dead-exports.mjs` | exported names nothing imports | three genuinely dead, two in rule-defining files |
| `sweep-twin-constants.mjs` | a constant declared on more than one surface | two colours typed twice, now in one place |
| `sweep-her-edits.mjs` | prose shapes Ellie has already rewritten once | eleven, in TASKS.md under W79 |
| `sweep-nested-components.mjs` | a React component declared inside another | one holding state, fixed and now gated |
| `sweep-swallowed-errors.mjs` | a catch that discards the error and says nothing | one cron reporting success after a failed read |
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
