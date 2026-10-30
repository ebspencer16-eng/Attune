# Lessons: the detail behind CLAUDE.md

Every rule is stated in CLAUDE.md in one line, with an id. This file holds only
what a session needs to act on the rules that need more than a line: the
mechanism, the command, the gate that holds it. Ids never change. A rule whose
line is enough has no entry here.

---

## Gates

**G2. Split gates by what they check, not how.** When the conflict privacy rule
needed a second gate, the useful split was: one proves the allowlist carries no
pattern data, the other proves no endpoint bypasses the allowlist. Neither
could be deleted without losing coverage.

**G3. A literal-name gate is blind to a registry.** `api/home.js` selects every
answer column through `EXERCISE_COLUMNS`, so `conflict_data` appears nowhere in
it while the row it holds carries that column. When every profile read moved
behind `selectProfiles` in `api/_lib/demo-accounts.js`, a gate grepping for
`from('profiles')` found one read with eleven in front of it. Count calls to
the module; keep the literal only as a thing to forbid outside the gateway.

**G5. Plant the indirect forms.** Each of these gates caught the bug as found
and missed the tidy-up form:

| Gate | Missed |
|---|---|
| `check-partner-privacy` | a loop over `EXERCISE_COLUMNS` into a response |
| `check-intimacy-privacy` | `...partner` spread into a response |
| `check-entitlement-inputs` | `const { pkg } = body`, an aliased body, a loop over add-on names |
| `check-ownership-rule` | `BUNDLES[me.pkg]`, `['premium'].includes(pkg)` |
| `check-entitlement-bypass` | the read hoisted one line up |
| `check-auth-headers` | double quotes, a property, anything under `api/_lib` |

**G6. Execute the copy that ships.** `check-card-type-clipping` ran
`cardTypeNative` from `api/_lib/storycard-style.js` while the app drew with its
own copy in `highlight-cards.tsx`, which had no floor, so 60pt type sat in a
54pt box. The gate now lifts `t()` out of the TSX by brace depth, strips types
with esbuild, runs it against the server's answer at three widths, and throws
if it cannot find the function. Same family: `/api/notes` answers `notes`
(unanchored) and `annotations` (anchored); `results.tsx` read the wrong one and
no mark ever drew on a results page. `check-annotation-source` holds every
caller of `fetchNotes()` to the anchored list.

**G7. Two ways to defeat a gate without deleting anything.** A name matched
without what follows it: `/payloadForCouple/` matches `payloadForCoupleX`,
`/latest\.current/` matches a cleanup that hands a stale closure on. And a
branch disabled with a constant: `if (false)` leaves every string in place.
When a plant passes, ask whether it changed what the gate reads or only what
the code does. Plant both.

**G8. Assert the plant landed.** `s.replace(needle, ...)` with a needle that is
absent returns the file unchanged and the gate "passes". `assert
s.count(needle) == 1` also stops a plant landing in a comment that names the
same key. For a gate about agreement, the plant is a second copy; changing a
value both sides import changes nothing.

**G9. Sample the thresholds.** Quarter-step sweeps missed a move from 0.75 to
0.80. Choose inputs a hundredth either side of each line. And when comparing
two implementations, each one's data comes from its own side: handing the
website's labels to the server's copy compared a function with itself.

**G10. Ask what a count counted.** check-chrome said "one nav across 12 pages"
and never read `public/practice/`, where seventeen pages had drifted, nor the
mobile menu, which is what a phone uses. Eighteen gates walk one directory; a
deliberate scope says so beside the walk.

**G11. A file that claims to be safe to paste.** supabase/schema.sql said it was
idempotent and failed at line 25: PostgreSQL has no `create policy if not
exists`. Idempotence is DROP POLICY IF EXISTS then CREATE POLICY.
check-schema-runnable holds that every CREATE in it is idempotent; it once
skipped a policy because it stripped `--` comments and not `/* */`. The pglast
command that parses every .sql file is in HANDOFF.md.

**G12. Comments are not code.** Gates and throwaway scripts both tripped on
comments that quote the pattern they explain. Blank comments before scanning,
or assert on the shape the code uses (`path: '/api/x'`), not the bare name.
`probe-dead-comments.mjs` finds the shape.

**G20. Drive the second branch.** check-slicer-click walked to the first leaf
(Demographics, Age, 18-24) on all 68 slicers and never reached a derived cut,
which was the broken half. It drives each twice now. Traps: a branch row's text
is "Demographics›" because the chevron is a child element; a local `want`
shadowed by the path object made the key assertion a constant false.

**G21. Compare answers, not inputs.** check-scoring-mirror compared which
questions belong where and never ran a scorer, while `api/admin-data.js`
averaged plainly where the engine weights, with an empty flipped set. Up to
1.25 points apart on a 1–5 scale. A tidy fixture of all-3s hides a weighting
difference.

**G23. Print the baseline.** Counting characters could not tell a deliberate
one-sentence view from an empty one, and a baseline from an unknown view fell
through to the results page. What works: the text of the one region views
render into, fixed overlays removed (empty 16 chars, dashboard 0, thinnest real
view 43). `?view=home` cannot render signed out and `checklist` is newlywed
only: drive each view at a package that owns it.

**G31. Run a value rule three ways.** `check-invitee-sees-results` matched
`inheritedHasGrant: !!json.inherited.hasGrant` and failed a correct grant-only
change. It now lifts the merge out of `src/App.jsx` and runs it: a grant
arriving lands, a held grant survives a response that knows nothing, and
nothing arriving grants nothing.

---

## Investigating and measuring

**I1. The harness is the first suspect.** Seven of sixteen sweeps were wrong
before they were right, every time in the measurement:

| Said | True |
|---|---|
| DM Sans 500 missing | italic, hidden by a column headed "weight" |
| /privacy dead | a redirect; the sweep read only rewrites |
| Two endpoints throw | they take `(req, res)` and got one argument |
| Buttons at contrast 1.0 | the walk started at the parent; a button paints its own |
| 404 loads no fonts | the wait raced Google's stylesheet |
| 78 missing columns | one ALTER adds three; `.from()` paired with the next `.select()` |
| 21 dead exports | true, nearly all aliases |

**I3. Absence may be a decision.** `/how-it-works` and `/couple-types` were
retired in 5c1924e, then put back into every nav after an audit called them
"nearly orphaned". 1316f378 deleted them and `/methodology`; a 404 on all three
is correct.

**I4. A check that always fails is unread.** check:docs reported "18 of 27
generators failed" for months (sandbox paths), and hid a real break: the
copy-review doc listed ten action items the product never renders.

**I5. Use the stored bytes.** `EXERCISE_FLOW_DUMP` makes check-exercise-flow
write what it stored; probe-exercise-chain feeds those bytes to /api/results.
Hand-typed fixtures had numbers where picks store strings and no `completedAt`.

**I7. Sweep from outside.** Edge handlers take `(req)` and return a Response;
Node handlers take `(req, res)`. Mixed, the function answers
FUNCTION_INVOCATION_FAILED before a line runs, and no runtime declared means
Node. One curl pass over admin endpoints expecting 401 found two 500s.
`check-runtime-shape.mjs` holds it.

**I8. Stubs from the server's return statement.** probe-admin put seven
aggregates at the top level when `api/admin-data.js` sends them under
`responses`, so the harness drew seven tiles production never drew. Where the
server calls a module to shape a value, the probe calls it too:
`withEffectivePromoCodes`, `genericLabel`, `DIM_META`.

**I9. Store the database's spelling.** A fixture of "Engaged" or "Instagram"
pretty-prints to itself, so a missing `QX_VAL_LABELS` conversion was invisible.

**I10. A bodiless status takes `null`.** `new Response('', { status: 204 })`
throws, and a plant "caught" that way proves nothing.

**I14. Vercel's bot checkpoint.** After a burst, curl can get the checkpoint
instead of the page. Send a browser user agent and grep for
`security-checkpoint`.

**I15. Spellings.** A payload sweep matched `name:` and missed `return {
groups, buckets }`, the common form. An admin sweep looked for `const { data =
[] }` and missed `const { data: profile }`.

**I19. Diagnostic queries.** Keep the columns that decide (mutual couple link,
what the account grants, the entitlements blob). Print one plain block per
person she can paste back. A clean result says NOTHING THIS QUERY CAN SEE.

**I20. Find a function defined twice:**

    grep -rn "^\(export \)\?function " api/ | awk ... | sort | uniq -d

Over all three surfaces it found 28. The dangerous kind is a one-line copy
(`base + add-ons` beside the library's).

**I21. Print the size you got.** macOS gave a 500pt viewport for every
`--window-size` under it; `Emulation.setDeviceMetricsOverride` inside `launch`
fixed it.

**I22. Headless animations stay at 0ms.** `animation-fill-mode: both` then
renders opacity 0 forever. `animation: none !important`; `scripts/shot.mjs`
does it.

**I23. check-db-down.** All endpoints, a signed-in caller, every database
request failing. 28 write endpoints stopped at their own 400 until each got a
valid body; the gate prints the ones that still stop.

**I24. innerText vs textContent.** innerText applies `text-transform:
uppercase`, so "Back to insights" reads "BACK TO INSIGHTS". This has cost four
probes and a gate.

---

## Data and the server

**D1. Who a row belongs to.** Excluding demo profiles left their notes, tags,
reads, orders and survey answers counted. A row counts only if its owner is in
the figure's list; ownerless `page_events` are anonymous visits, so what to do
with an ownerless row is an argument the caller passes. The fixture gives the
demo one row beside each real one, so right is 1 and wrong is 2.

**D2. Derive on the way out.** Results rows are frozen. Couple-map coordinates
added beside the axes in `api/_lib/results.js` reached nobody who had already
finished. Anything derivable from stored data goes in `withContent`.

**D4. Names that do not resolve.** esbuild emits an unresolved identifier as a
global, so `vite build` passes. `check-server-undefined.mjs` resolves scopes,
and also catches `const X = X` (seven forms planted; it walks every identifier
in the initialiser). Exempt: `x.X`, `x?.X`, a function calling itself unless
invoked on the spot.

**D5. `MAP[k] || k`.** `DIM_LABELS` had `stress` and no `reassurance`, so one
row printed its key. The conflict catalogue never sent `riskLabel`, so the
fallback printed a whole question. Guard key agreement at load;
`api/_lib/dimensions.js` throws.

**D6. Failed reads as null.** Find them with:

    grep -rn "json().catch(() => \[\]))?.\[0\]" api

Triage by what the next line does with null. A read the caller needs is refused
(503, `ok: false`). Three had then written on it: unpublished a post, replaced
survey answers, overwrote shared tools.

**D7. Claim, then send.** A conditional PATCH `field=is.null` with
`return=representation`: one row back means it is yours. Give the claim back if
the send fails.

**D11. Tables no migration made.** `DROP POLICY IF EXISTS` still errors on a
missing table, and the SQL Editor runs a paste as one transaction. Wrap in `do
$$ begin if to_regclass('public.x') is not null then ... end if; end $$;`, with
the drop written out so policy gates still read it.

**D13. Checkout's own prices.** public/checkout.html builds the summary and the
receipt from its own table. Seven gates passed a planted 25 against a 40.
`check-checkout-page-prices.mjs` holds all 23; `public/_pkg-rules.js` is the
road to deriving them.

**D16. Every producer.** `url: fresh || (signedUrlIsLive(row.workbook_url) ?
row.workbook_url : null)`: minting returned null for every couple, so the
cached .docx was served while check-workbook-format tested the minter.

**D19. What a shared module drags along.** Making the workbook content read the
shared distance rule pulled in the question set and three copy modules, which
the workbook image does not have. The rule moved to `_lib/resp-distance.js`
(no imports), re-exported by expectations.js. check-workbook-image caught it.

**D20. Two reads, two handlings.** `api/cron-survey-nudge.js` answered 503 on one
failed read and `catch {}` then `users = []` on the next, which skips a
time-windowed nudge for ever. Of 175 silent catches, the 22 round a database
or network call are the signal.

**D21. Cuts.** Five admin tile groups offered only cuts the server had
pre-computed (the funnel 23 of 150). The page now evaluates any cut and sends
the server the people or couples it keeps by an opaque handle. A cut the server
cannot resolve (field `g` on a profile) is refused, never drawn as zero.

**D22. Same rule, different inputs.** `resultsGate` said ready for an invited
partner on the server and pending on the website, because the website's
`purchased` came from terms only the buyer's order carries. Run the rule with
each surface's own arguments and print both.

**D23. Money.** `create-payment-intent` priced three ways in one file and sent
Stripe no line for Conflict Patterns. Invariant: the lines sent to the
processor add up to what the cart says is owed.

**D24. Normalisers.** `normalizeItem` had no `addonConflict` key, so a $40
exercise fell out of everything downstream. Check the shape against the
catalogue's list, and read PKG_CAPS rather than naming packages.

**D30. supabase-js returns errors; it does not throw.** A `try` round a read
does nothing, and `= []` on the destructure makes failure look empty.
check-admin-read-errors accepts three endings: test the error and leave, throw
to the handler's catch, or put the failed reads in the reply (as
`api/admin-engagement.js` does). Building it, `Array.from(` satisfied `.from(`,
and a lazy `[\s\S]{0,140}` ran past the semicolon into the guard it verified.

**D31. Empty table or broken query.** Both CSV exports read a `workbooks` table
nothing writes; `orders.workbook_status` holds the answer. With the public key,
a real empty table answers 200 and `[]`; a missing one answers PGRST205.

**D32. One moment, one implementation.** Results opening lived in
`api/save-exercise.js`, the app's path; website completions never told the
partner or built the workbook. It is `api/_lib/completion.js` now. The trigger
also passed the whole `capabilitiesFor` object where `resultsGate` wants
`caps`.

**D33. Derivations admit to themselves.** Nothing asks gender. Ellie chose to
convert pronouns to gender words ("Keep demo titles as gender not pronoun") in
one table, `QX_VAL_LABELS` in public/admin.html, with a tooltip saying so. The
bug was the conversion in three places, unlabelled.

**D36. Unknown is not no.** `api/partner-sync` pre-filled every field false and
swallowed a failed read, which is the shape for "bought nothing"; `pkg: 'core'`
was both the initialiser and a package. It sends null now, meaning keep. The
browser merge is one `keep(mine, theirs)`, grant-only, the client twin of
`capabilitiesFor`.

**D38. Money and deletion.** Promo uses are claimed by compare-and-swap
(`PATCH ...&uses_count=eq.N`; check-promo-claim). Account deletion does the
reversible steps first, checks each, and deletes the auth user last
(check-deletion-complete). Emails are normalised where written, ideally by a
trigger. An edge function is frozen when it returns: await everything
(check-server-awaits).

**D40. Move the row.** Refunds move the order to `refunded_orders`
(api/_lib/refund-order.js), copy first, delete second. Copies of its meaning
still had to be undone: `profiles.pkg`, the invitee's add-on columns, the
browser's grant-only copy.

---

## Website and admin

**W1. Synthetic faces.** Weight 700 in a family loaded to 600, or italic with no
italic face, renders synthesised with no error; DM Mono has no bold.
`document.fonts.check()` says yes to a face about to be synthesised, and
`document.fonts.status` is 'loaded' before the stylesheet arrives: poll the
face count until it stops growing. `check-web-fonts.mjs`. Request
`wght@0,300..800` ranges, not lists.

**W2. Where a JSX comment cannot go.** Any parenthesis opening a single JSX
expression takes the element and nothing before it: `return (`, `{cond && (`,
`{cond ? (`, and a `.map((x) => (` callback. Put the comment above the
expression or inside the root. Everywhere else is fine.

**W3. `String.replace` reads `$&`, `` $` ``, `$'`, `$1` in the replacement.** A
CHECK constraint ending `$'` made `build-tasks-sql.mjs` append the document to
itself three times. Use `doc.replace(RE, () => block)`. The tell is a diff far
larger than the edit.

**W4. Native controls.** A macOS `<select>` popup is painted outside the page;
optgroup colours never arrive. The admin's field picker renders its own list
from a hidden `<select>` that stays authoritative: picking writes `.value` and
dispatches `change`. Code assigns `.value` without events, so the button
re-reads its select in `render()`. `check-field-picker` reads computed band
colours.

**W5. Slicers.** Assigning a value the select has no option for silently falls
back to the first option ("Everyone"). A placeholder fill never replaces a
tile's own list, in either direction, and the early return must not reassign
the tree the panel renders from. For a select rebuilt each render: fill, then
restore, then check the restore took. `check-slicer-click.mjs`.

**W6. Dead copies.** A promo toggle fix went into `toggleBetaCode`, whose only
caller returns on its first line. Grep the function, then grep what renders
the control that calls it. Removing seven dead functions from admin.html also
removed one that drew buyer addresses.

**W7. Render the thing named.** The word-of-the-day storycard was drawn from
Ellie's sentence and missed the two-card entry, the corner washes and the dark
type. The Notes entry is now one component used in both places, and a card may
ask for a page's own wash.

**W8. Existing renderers.** `public/workbook-render.html` is the workbook. A
second one built from the .docx was the wrong document. `check-workbook-view.mjs`
holds the page and the payload `src/App.jsx` hands it to one key set.

**W10. Is the fix live.** Pick a string only the new code has, build the
previous commit and confirm it is absent there, then count it in the live
bundle. The bundle is linked from `/app`, not `/`. Asset hashes differ because
Vercel has `VITE_SUPABASE_*` and local builds do not.

**W11. Reproduce Vercel's build.** Its command is `buildCommand` in
vercel.json, not `npm run build`:

    git clone . /tmp/x && cd /tmp/x && npm ci && <buildCommand from vercel.json>

An import of a `.ts` file from attune-app/ resolved a tsconfig extending
`expo/tsconfig.base`, present only where attune-app/node_modules exists.

**W13. Overlap is not coverage.** The thought-bubble cloud subtracts a shrunk
copy of each circle; the shrunk circles must cover the interior or the middle
paints. A large central lobe fixes it. Test whether a painted point can walk
out of the shape within a stroke width, not its distance to an edge.

**W14. Softening a dark ground.** The light stops are already at 4.6:1 under
white type. Move the middle stop so the lighter colours hold most of the
height (55% to 38%).

**W16. Nested components.** A component declared inside another is a new type
each render, so React remounts everything under it, destroying hook state,
refs, open `<details>`, typed text and scroll. Two effects with no deps array
made the results shell remount about 48 times a second and the Side by Side
panel unopenable. A MutationObserver on the root shows a remount as remove plus
add. check-nested-components forbids only stateful ones and finds extents by
parsing, not braces.

**W17. Unclosed start tags.** An accessibility pass ate the `>` on 59 selects in
admin.html and a truncated `<scr` broke sixteen pages. `check-tag-closure.mjs`
fails on a `<` before the `>`, with script and style blanked.

**W18. CSS caps.** `.chart-body canvas{max-height:220px}` overrode a computed
582pt height; Chart.js drew small without error. Measure both ends first.

---

## The app

**P1. Italic is a family.** iOS draws the upright face for `fontStyle:
'italic'` on a named family. Use `Fonts.bodyItalic`, `Fonts.bodyBoldItalic`,
`Fonts.displayItalic` in `attune-theme.ts`, each registered in `_layout.tsx`.
A font file ships in an EAS update. `check-fonts.mjs`.

**P2. Marks.** A note is anchored by `anchor_context`, the text it was made on,
so an edit in `api/` or a collapsed section orphans it silently. Every rendered
block reports what it drew; anything unclaimed is invisible. `mark-reach.ts`,
`check-mark-reach.mjs`.

**P3. Driving app screens in a browser.** `npx expo start --web`, then
`?probe=<name>` draws `attune-app/src/components/probe-host.tsx` with data from
`window.__PROBE__` (never on iOS). Traps: `request()` returns unauthorized
without fetching until `setToken` is called; a stub injected as a template
literal needs doubled backslashes; `adjustsFontSizeToFit` is ignored on web, so
measure width. `scripts/probe-notes-screen.mjs` still uses the old
`_layout.tsx` swap.

**P6. Publishing.** Ask Expo what is live:

    curl -s -D - -o /dev/null -H "expo-platform: ios" \
      -H "expo-runtime-version: 1.0.0" -H "expo-channel-name: production" \
      -H "expo-protocol-version: 1" -H "accept: multipart/mixed" \
      https://u.expo.dev/<projectId>

Compare `createdAt` with `git log --since` over `attune-app/src`. An update
downloads on one launch and runs on the next. Settings shows the bundle date.

**P10. Taps over the page gesture.** A Pressable and the page's tap gesture both
fire. `Gesture.Native().blocksExternalGesture()` does not help: a plain View
never activates. Use `Gesture.Tap()` and `Gesture.LongPress()` on the icon,
each with `blocksExternalGesture` (a composed gesture takes no relations and
no `withRef`, so the ref goes on the edge tap). Callbacks are worklets:
`runOnJS(fn)(arg)`. Gestures have no `hitSlop`. `check-mark-rail-tappable.mjs`;
`scripts/sim.mjs hold <x> <y> [ms]`.

**P11. Refs and effect order.** A ref is null during the render that fills it;
ask state. A parent's effect runs after its children's, so a parent "clear on
new page" wiped reports the children had just made; clear only when the
section changes.

**P14. The margin rail.** Each paragraph measures its icon's place against the
page card with `measureLayout` (same scroll context), and the card draws every
icon in its own padding, outside any clipping tile. The reporting effect sits
above the component's early return (check-hook-order).

---

## Content and quotations

**C1. Her answers go in the module.** INSIGHTS-REVIEW.md is written by
`build-insights-review.mjs`; her 74 kept and 14 edited were wiped by the next
check and recovered from a transcript. Apply answers to the source at once; an
answer that cannot be applied yet goes in TASKS.md, quoted.

**C2. Edited quotations.** check-quotes-verbatim splits on an ellipsis, a
bracketed insertion, and a capitalised dropped opening, and compares the pieces
in order. An unmarked dropped word still fails.

**C3. Extract, do not retype.** Fetch the page, split sentences, take by index.
A card shows one sentence: reject openers like "This means" or "Recognizing
them", and splits after "Dr.".

**C4. Check against the source.** Two "quotes" were fair paraphrases. A page the
machine cannot reach is reported apart from one that contradicts us; a bad
Google Books key (400) leaves entries unchecked, not failed.

**C5. Sourcing.** Remembered book quotations verified at about 45%; ones lifted
from a page quoting the book at length, about 75%.

**C6. Google Books key.** She stores it from her clipboard:

    security add-generic-password -U -a "$USER" -s attune-google-books \
      -w "$(pbpaste | tr -d '[:space:]')" && echo stored

check-quotes-verbatim reads `GOOGLE_BOOKS_KEY`, then
`security find-generic-password -s attune-google-books -w`.

---

## Working with Ellie

**E1. Lists she sends.** Attachments arrive empty. Have her run:

    pbpaste > /Users/Ellie/Projects/unison/ellie-paste.txt && wc -l /Users/Ellie/Projects/unison/ellie-paste.txt

She gives the line count, I read, apply, delete. The file is gitignored.

---

## Tooling and the machine

**T1. Chrome left behind.** `scripts/_lib/browser.mjs` reaps Chrome on exit,
throw, Ctrl-C and `process.exit()`, and sweeps `attune-smoke-*` profiles older
than two hours (2850 had piled up; launch went from 1109ms to 554ms). Escapees:
`pkill -f 'remote-debugging-port'`. `pgrep -c` is not a macOS flag; use
`| wc -l`.

**T2. A browser gate gone quiet.** Read `uptime` and `sysctl vm.swapusage`. A
machine paging at load 4 turns a 200ms page load into ten seconds. Four checks
in `npm run check` drive Chrome, so never run it beside `npm run smoke`, and
prefer browser gates one at a time on a loaded machine.

**T3. Simulator taps.** Synthetic CGEvent clicks via a small Swift binary give
press, hold, drag and release. Calibrate the mapping with two coloured buttons
a known distance apart; derived mapping was 30pt off and only wide targets
worked. `xcrun simctl io booted screenshot` plus a pixel scan locates targets.

**T4. Simulator with no window.** Screenshots still work, taps fail ("Can't get
window 1 of process Simulator"). Check:

    osascript -e 'tell application "System Events" to count windows of process "Simulator"'

Zero means say the screen could not be driven. After many hot reloads, ordinary
presses stop while gestures work: `xcrun simctl terminate booted
host.exp.Exponent` and reopen the exp:// URL.
