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

Two of them were wrong before they were right, which is the usual ratio:

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
