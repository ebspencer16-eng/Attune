# PHASE 5b HANDOFF

**Last session ended:** Phase 5a complete. Working tree clean. All work pushed.

**Branch:** `workbook-rebuild`
**HEAD commit:** `f28dff3` (Phase 5a: expand workbook payload to carry full ex2 data)
**Remote HEAD matches local HEAD.** Nothing uncommitted.

---

## What is committed and live on the branch

### Phase 1 — already on main
Pre-existing baseline.

### Phase 2 — committed at `2164f85` (WIP)
- App.jsx: Extended Family responsibility category added; 4 new family-contact life questions; lq_parents removed.
- scripts/build_workbook.py recovered (3006 lines, Volume 01 sample builder).
- scripts/render_workbook.mjs added (Playwright wrapper).
- Items 2 and 3 of Phase 3 done (notes pages and aging-parents row removed).

### Phase 3 + Phase 4 — committed at `a504973`
Volume 01 design at sample-PDF quality plus 6 review docs for Ellie's edit pass. See commit message for the full breakdown.

### Phase 5a — committed at `f28dff3`
Data contract expanded to carry full ex2 data. Specifically:

- New `buildWorkbookPayload()` helper in App.jsx — single source of truth for the workbook payload shape.
- 4 call sites all wired to the helper:
  1. `attune_live_session` localStorage save (results-view)
  2. Auto-fulfill on results page (post-checkout)
  3. Dashboard download button (manual)
  4. Partner-arrives-late update (`savePartnerSession`)
- `api/generate-workbook.js` accepts new `responsibilities` and `lifeQuestions` fields. **They are NOT yet consumed by the renderer** — that's Phase 5b's job. They flow through without error, additive only.
- Legacy `expGaps` field still computed and sent for backward compatibility.

**No behavior change for customers ordering today.** The existing renderer still drives output; the new fields are plumbed but unused.

---

## What Phase 5b is

Bring `api/generate-workbook.js` (the .docx generator, 2153 lines) up to Phase 3 / Volume 01 quality. Keep it as a docx output for now — do not start the PDF port (Phase 5c).

The detailed audit of what's stale and what works lives at:
`/mnt/user-data/outputs/PHASE_5_AUDIT.md`

Read it first.

### Phase 5b edits, in execution order

Each step has a verifiable outcome. Build locally after every edit (`npx vite build` — must still pass) before moving to the next.

**Step 1: Import GAP_BLURBS**
File: `api/generate-workbook.js`, line ~17.
Change:
```js
import { DIM_META, DIM_CONTENT, EXP_DOMAINS, DIMS, WHEN_THIS_SHOWS_UP } from './_workbook-content.js';
```
To:
```js
import { DIM_META, DIM_CONTENT, EXP_DOMAINS, DIMS, WHEN_THIS_SHOWS_UP, GAP_BLURBS } from './_workbook-content.js';
```
Verify: `grep "export const GAP_BLURBS" api/_workbook-content.js` — should return one match (the export was added in Phase 3).

**Step 2: Update buildDimensionHero to render two stacked italic blurbs**
File: `api/generate-workbook.js`, function around line 901.

Current signature: `function buildDimensionHero(meta, u, p, score1, score2, accentColor, gapAnalysisText)`. The right column renders one italic paragraph using `gapAnalysisText`.

Change to: `function buildDimensionHero(meta, u, p, score1, score2, accentColor, gapBlurb, typeBlurb)`. Right column renders TWO stacked italic paragraphs:
- Para 1 = `gapBlurb` (universal, varies by gap state)
- Para 2 = `typeBlurb` (couple-type-specific)

Both italic, muted color, ~24pt line spacing. Spacing between paragraphs: 80-120 twips after the first.

The block to update is around line 1023-1025 (the right cell's `children` array). Replace the single Paragraph with two Paragraphs.

**Step 3: Update buildOneDimension to look up the gap blurb by state**
File: `api/generate-workbook.js`, function around line 1033.

Current code (around line 1047-1050) computes `mainText` from WHEN_THIS_SHOWS_UP only. Add gap-state lookup:

```js
const gap = Math.abs(score1 - score2);
const gapState = gap < 0.8 ? 'aligned' : gap < 1.5 ? 'some_gap' : 'notable_gap';
const gapBlurbRaw = GAP_BLURBS[dim]?.[gapState] || '';
const gapBlurb = fill(personalizeTypeRefs(gapBlurbRaw, coupleType), u, p);

const ctId = coupleType?.id || 'WW';
const whenLookup = WHEN_THIS_SHOWS_UP[dim] || {};
const rawTypeText = whenLookup[ctId] || whenLookup.WW || '';
const typeBlurb = fill(personalizeTypeRefs(rawTypeText, coupleType), u, p);
```

Then update the call to buildDimensionHero (line ~1124) to pass both:
```js
result.push(...buildDimensionHero(meta, u, p, score1, score2, color, gapBlurb, typeBlurb));
```

Remove the old `mainText` variable.

**Step 4: Drop the gap >= 1.5 filter — render all 10 dimensions**
File: `api/generate-workbook.js`, function `buildInsights` around line 1250.

Current code filters `domain.dims` to only keep dims where `gapsByDim[d] >= GAP_THRESHOLD` (line 1261). Phase 3 renders all 10 dims regardless of gap.

Change:
```js
const domainsToShow = DOMAIN_ORDER
  .map(domain => ({ ...domain, dims: domain.dims.filter(d => gapsByDim[d] >= GAP_THRESHOLD) }))
  .filter(domain => domain.dims.length > 0);
```
To:
```js
const domainsToShow = DOMAIN_ORDER; // All 10 dims render in every workbook (Phase 3 model)
```

Drop `GAP_THRESHOLD`, `gapsByDim`, and the `if (domainsToShow.length === 0)` rare-finding branch (no longer reachable).

**Step 5: Update gapLabel and gapColour to 3-state model**
File: `api/generate-workbook.js`, around line 473-486.

Current:
```js
function gapLabel(gap) {
  if (gap < 0.8)  return 'In sync';
  if (gap < 1.5)  return 'Close';
  if (gap < 2.5)  return 'Different';
  return 'Very different';
}
function gapColour(gap) {
  if (gap < 0.8)  return GREEN;
  if (gap < 1.5)  return MUTED;
  if (gap < 2.5)  return ORANGE;
  return 'DC2626';
}
```

Replace with the 3-state model used in Phase 3:
```js
function gapLabel(gap) {
  if (gap < 0.8)  return 'Aligned';
  if (gap < 1.5)  return 'Some gap';
  return 'Notable gap';
}
function gapColour(gap) {
  if (gap < 0.8)  return GREEN;
  if (gap < 1.5)  return MUTED;
  return ORANGE;
}
```

**Step 6: Update EXP_DOMAINS in api/_workbook-content.js to the 6-domain Phase 3 list**
File: `api/_workbook-content.js`, around line 146.

Current EXP_DOMAINS has 7 keys (household, emotional, financial, career, children, lifestyle, values) — the old model.

Replace with the 6-domain Phase 3 list. The labels and color-keys are:
1. household — Visible Household Labor (gold)
2. emotional — Emotional & Invisible Labor (coral)
3. extended_family — Extended Family (plum) — NEW
4. money — Money, Work & Career (indigo) — replaces separate financial + career
5. life — Life Together (green) — replaces children + lifestyle
6. operate — How We Operate (purple) — replaces values

For each domain, three alignment-state texts plus a "Try this week" prompt. Source of truth for the prose lives in `scripts/build_workbook.py` → `EXP_DOMAINS` list, which is what the Phase 3 sample uses. Copy the prose from there and reformat for JS.

This is the most content-heavy step. Budget ~30-45 minutes.

**Step 7: Rewrite buildExpDomains to render 6 per-domain pages**
File: `api/generate-workbook.js`, function around line 1292.

Current code reads from `expGaps` (the legacy 7-row alignment array). Phase 3 reads from the new `responsibilities` + `lifeQuestions` payload fields and renders one page per domain with:
- Side-by-side rows of each partner's row values
- Alignment percentage per domain
- The 3-state prose ("Where you are") selected by alignment threshold (75+ aligned, 40-74 worth discussing, <40 different blueprints)
- "Try this week" practice

The Python builder in `scripts/build_workbook.py` (function `build_expectation_page`) is the visual reference. Match the layout.

Accept the new payload fields:
```js
function buildExpDomains(u, p, expGaps, responsibilities, lifeQuestions) {
  // If new fields are absent, fall back to legacy single-row behavior
  if (!responsibilities) return buildExpDomainsLegacy(u, p, expGaps);
  // ... new 6-page rendering
}
```

Update the handler (around line 2083) to pass the new fields:
```js
...buildExpDomains(u, p, expGaps, responsibilities, lifeQuestions),
```

**Step 8: Rebuild buildReferenceCard to match v2**
File: `api/generate-workbook.js`, function around line 1555.

Visual reference: `scripts/build_workbook.py` → `build_reference_card`. The v2 design has:
- Real Attune logo SVG (the docx version can't render SVG natively — use a simple letter mark or omit)
- "Understanding takes intention." italic Playfair tagline
- Coral partner names (no "Together, four years" line)
- Three tiles: couple type / logo+tagline / write-in goal box
- White write-in box with subtle ruled lines for goal-of-the-week
- Gradient rule (orange → purple → indigo) under the wordmark
- "Explore Attune In Practice" callout in the page surround below the card

For docx, the SVG isn't reproducible — use the letter "A." in italic Playfair as a stand-in, plus the "Attune Relationships" wordmark. Keep the rest of the design (white write-in, gradient rule, In Practice callout).

**Step 9: Replace placeholder epigraphs**
The handler (around line 2079, 2088, 2095, 2103) renders `PH('opening quote for Part 1')` etc. These are visible placeholder strings. Either:
- Replace with real epigraphs (ask Ellie for content)
- Remove the epigraph blocks entirely until content lands

Recommended for Phase 5b: remove them. Add a TODO comment for Ellie to provide.

**Step 10: Decide on buildNotesPages**
The handler appends 4 blank ruled pages at the end. The Phase 3 sample doesn't include these. Confirm with Ellie whether to keep or remove. Default: keep — they're harmless and useful for couples who want to write more.

---

## Verification at end of Phase 5b

1. Build passes locally: `cd /home/claude/unison && npx vite build` — no errors.
2. The generate-workbook endpoint can be hit with the new payload shape (the smoke test from Phase 5a still works).
3. Spot-check the docx output by running the endpoint locally with a sample payload — confirm:
   - All 10 dimension pages render
   - Each dimension page has TWO italic paragraphs in the right column
   - All 6 expectation domain pages render with rows
   - Reference card matches v2 design
   - No "PH(...)" placeholder strings visible
4. Commit with a comprehensive message naming each step.
5. Push.

---

## Critical things NOT to do

- **Do not start Phase 5c** (PDF port to workbook-render.html). It's a separate large port and depends on 5b being correct first.
- **Do not modify the auth gate** in generate-workbook.js. It's working.
- **Do not change the data contract again.** If you find yourself wanting to, the contract was wrong; finish 5b with what's there and revisit in 5d.
- **Do not push without local build.** Vite catches syntax errors that would break Vercel deploys.
- **Do not write `gapAnalysisText` anywhere** — that's the old single-paragraph variable name that was confusingly close to working at the end of last session.

---

## Container setup commands

If the container is fresh and `/home/claude/unison` doesn't exist:

```bash
cd /home/claude
git clone https://github.com/ebspencer16-eng/Attune.git unison
cd unison
git checkout workbook-rebuild
git remote set-url origin https://<TOKEN>@github.com/ebspencer16-eng/Attune.git
git config user.name "Ellie Spencer"
git config user.email "ebspencer16@gmail.com"
```

(Token must be supplied by Ellie at session start. Never store it persistently.)

If the container has the repo already, just confirm:
```bash
cd /home/claude/unison
git status                        # Should be clean
git log --oneline -1              # Should show f28dff3
git log --oneline origin/workbook-rebuild -1  # Same hash
```

---

## File index for fast navigation

- `api/generate-workbook.js` (2153 lines) — the .docx generator. Phase 5b touches this most.
- `api/_workbook-content.js` (~406 lines) — single source of truth for prose and design data. EXP_DOMAINS lives here. GAP_BLURBS exported here. WHEN_THIS_SHOWS_UP exported here.
- `api/generate-pdf.js` (88 lines) — Browserless wrapper. Don't touch in 5b. Phase 5c will rewrite.
- `public/workbook-render.html` (312 lines) — simpler template. Don't touch in 5b. Phase 5c rewrites.
- `scripts/build_workbook.py` (3006 lines) — the Phase 3 sample builder. **Read-only reference for layout/prose/design**. Do not modify in Phase 5b.
- `src/App.jsx` (13,103 lines) — front-end. Don't touch in 5b — Phase 5a finished the data contract.

---

## Phase 5 deliverables already in /mnt/user-data/outputs (read-only reference)

These were generated in Phase 4 and are useful reference material:

- `attune_workbook_sample.pdf` (41 pages) — cross-type Volume 01 sample. **The visual target** for Phase 5b.
- `attune_workbook_sample_same_type.pdf` (39 pages) — same-type Volume 01 sample.
- `attune_specific_content_review.docx/pdf` — all 130 blurbs, organized by dimension.
- `attune_lmft_context.docx/pdf` — clinical reviewer reference.
- `attune_workbook_content_review.docx/pdf` — overall workbook structure.
- `attune_workbook_content_map.docx/pdf` — what comes from where.
- `attune_master_review_checklist.docx/pdf` — pre-launch checklist.
- `attune_expectations_flow_*.docx/pdf` (4 files) — exercise flow specs.
- `PHASE_5_AUDIT.md` — the audit document this handoff references.
