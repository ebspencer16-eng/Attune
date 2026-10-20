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

Two of them were wrong before they were right, which is the usual ratio:

- `sweep-payload-fields` matched `name:` only, so it could not see
  `return { groups, buckets }`. Every one of its seven findings was that
  blindness. A clean run before the fix would have meant nothing.
- `sweep-role-tokens` reported 38 disagreements and all 38 were impossible
  pairings: it ran every couple type's strings against every kind of couple,
  including couples who could never be that type.

So: when one of these reports something surprising, the first hypothesis is
the harness. Print one case end to end before believing the column.
