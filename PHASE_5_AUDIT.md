# Phase 5 audit — current state of the production workbook generators

The production stack has TWO endpoints that generate a workbook. They serve
different files (.docx vs .pdf) and currently produce very different output.

---

## /api/generate-workbook.js — the .docx generator

**Length:** 2152 lines.
**Status:** This is the path most customers actually use. The "Download my
workbook" button in App.jsx points here. Quality is decent but does not match
Phase 3 Volume 01.

### What it already does well

- **Auth + payment gate.** Verifies the user is logged in and that one of
  their orders has `addon_workbook = true`. Admin path bypasses this for
  internal tools. Good code, leave it.
- **Reads from `_workbook-content.js`.** Imports DIM_META, DIM_CONTENT,
  EXP_DOMAINS, DIMS, WHEN_THIS_SHOWS_UP. Single source of truth is in place.
- **Page-by-page builders that map cleanly to Volume 01 sections.** The
  function names tell the story:
  - buildCover, buildTOC, buildIntro
  - buildSnapshot — communication dim table + expectations alignment table
  - buildPartCover (used 5 times for the part-divider pages)
  - buildInsights — the per-dimension pages
  - buildExpDomains — per-domain expectation pages
  - buildWorkbook, buildPriorityCheckIn, buildConversationGuide
  - buildWorkingKnowledge — the moments per couple type
  - buildReferenceCard
  - buildNotesPages
- **Couple-type personalization.** The `fill()` helper substitutes {U} and
  {P} with partner names. `personalizeTypeRefs()` converts "the W" / "the X"
  references to actual names based on the couple type ID.
- **Gap label and color logic.** `gapLabel()` and `gapColour()` produce
  the alignment readouts that match the visual design.
- **Footer with page numbers.** Uses Word fields so they render live in
  Word and Pages.

### What's stale or missing vs Phase 3

These need updating to match the current sample workbook:

1. **Two-paragraph dimension callout.** Currently uses ONLY the type blurb
   from WHEN_THIS_SHOWS_UP. The Phase 3 model is two italic paragraphs:
   gap blurb (universal, varies by gap state) followed by type blurb. Need
   to import GAP_BLURBS from `_workbook-content.js` and render both.
2. **Gap thresholds.** Code uses old thresholds: <0.8 in sync, <1.5 close,
   <2.5 different, ≥2.5 very different. Phase 3 collapsed to 3 states
   (aligned <0.8, some_gap 0.8-1.4, notable_gap ≥1.5). Either keep four
   labels or simplify; the gap-blurb lookup expects the 3-state version.
3. **All 10 dimensions render.** Currently only "insights" pages render
   for dims with gap ≥1.5. Phase 3 renders all 10 dims regardless of gap.
   This is a small change: drop the gap filter in buildInsights.
4. **Expectations: 5 domains, not 6.** EXP_DOMAINS in `_workbook-content.js`
   still has the old list (household, emotional, financial, career,
   children, lifestyle, values = 7 keys, although the code only renders
   the ones in expGaps). The Phase 3 design uses 6 domains:
   - Visible Household Labor
   - Emotional & Invisible Labor
   - Extended Family (NEW, with name-substituted rows)
   - Money, Work & Career (was two domains: financial + career)
   - Life Together
   - How We Operate
   The labels and rows in the docx generator need to match the new model.
5. **Reference card.** buildReferenceCard exists at line 1555 but predates
   the v2 design (real Attune logo SVG, italic tagline, white write-in
   goal box, "Explore Attune In Practice" callout). Needs full rebuild.
6. **Working Knowledge moments.** Builders exist (buildMomentCard,
   buildMomentCardShared) but content predates the rewrites. Compare
   against scripts/build_workbook.py output to confirm which version
   renders.
7. **Notes pages at the end.** `buildNotesPages(4)` adds 4 pages of blank
   ruled lines. The Phase 3 sample doesn't include these. Either remove
   or keep based on Ellie's preference.
8. **placeholder epigraphs.** The handler renders `PH('opening quote
   for Part 1')` etc. These are stubs. They render literally. Needs real
   epigraphs or removal.

### Data contract this endpoint expects

```
POST /api/generate-workbook
Headers: Authorization: Bearer <supabase-token>  OR  X-Admin-Key: <admin-key>
Body: {
  userName: string,
  partnerName: string,
  scores: { energy: 2.1, expression: 3.8, ... },           // 10 keys
  partnerScores: { ... },                                  // same 10 keys
  coupleType: { id, name, tagline, description, color },   // optional
  expGaps: [
    { key, label, yourAnswer, partnerAnswer, aligned }     // ~6 entries
  ]
}
```

**Problem with this contract.** It only carries one expectation answer per
domain. Volume 01 needs the full set: 25 responsibility items per partner
across 5 categories (Household, Financial, Career & Work, Extended Family,
Emotional Labor) plus 20 life questions across 6 categories. The current
shape can't express name-substituted Extended Family rows because it has
no concept of partner-specific row labels.

---

## /api/generate-pdf.js — the .pdf generator

**Length:** 88 lines.
**Status:** Renders by sending a Browserless request to `/workbook-render`
with the data encoded in the URL query string. The HTML template is at
public/workbook-render.html (312 lines, simpler than the docx version).

### What works

- Browserless integration is clean. Fetches a token from env, posts to
  chrome.browserless.io/pdf, returns the binary stream to the client.
- Falls back to docx if BROWSERLESS_TOKEN is not set.
- File-naming is correct.

### What's broken or missing

1. **Data passed via URL query string.** Once data is full size (full
   ex1 + ex2 answer sets, all responsibility items, all life-question
   responses) this will exceed URL length limits. Browserless will
   start failing on long inputs. Need to switch to POST-with-body or
   server-rendered HTML.
2. **Template is the simple version.** workbook-render.html is 312
   lines; build_workbook.py is 3006 lines. The pdf path renders the
   simpler template, NOT Volume 01.
3. **The expGaps key labels in workbook-render.html are stale.** They
   reference 7 domains that no longer match the Phase 3 model.
4. **No auth gate on the /api/generate-pdf endpoint.** Anyone with the
   URL could POST and get a free PDF. Should mirror the auth gate from
   generate-workbook.js.

### Data contract this endpoint expects

Same shape as generate-workbook, encoded into the URL as a query param.

---

## App.jsx — front-end caller

**Two call sites for /api/generate-workbook** in App.jsx:
- ~line 6755: in the post-checkout flow, builds payload + posts.
- ~line 7902: in the dashboard "download workbook" button, also builds
  payload + posts. Has a fallback to a pre-generated URL stored in
  localStorage (the order's workbookUrl).

**Both call sites build expGaps from `ex2Answers.life['lq_' + key]`** with
keys `household, emotional, financial, career, children, lifestyle,
values`. These don't all match the actual life-question keys
(`lq_children, lq_inperson_user, lq_contact_user, lq_inperson_partner,
lq_contact_partner, lq_family_conf, lq_location, lq_social, lq_routine,
lq_faith, lq_values`), so most expGaps come back with `yourAnswer: null`.

**Neither call site passes responsibility items.** The 25 responsibility
items per partner aren't included in the payload at all. Volume 01 needs
them for the per-domain expectation pages.

---

## Phase 5 plan (revised)

Three real steps, in this order:

### Step A — Update the data contract (Phase 5a)

Single PR that touches App.jsx, generate-workbook.js, and adds a richer
payload. After this step, the docx generator has access to the full
ex1 + ex2 answer set, but doesn't necessarily render it differently yet.

What to add to the payload:
```
{
  userName, partnerName, scores, partnerScores, coupleType,

  // NEW: full responsibility data
  responsibilities: {
    user:    { household: [...], financial: [...], career: [...],
               extended_family: [...], emotional: [...] },
    partner: { ... same shape ... },
  },

  // NEW: full life-question data (replaces expGaps in part)
  lifeQuestions: {
    user:    { lq_children: 'value', lq_inperson_user: 'value', ... },
    partner: { ... },
  },

  // KEEP for backward compat for now
  expGaps,
}
```

App.jsx changes are mechanical: build the new objects from existing
ex1Answers/partnerEx1/ex2Answers/partnerEx2 state. No new state needed.

generate-workbook.js needs to accept the new fields without breaking.
For now, treat them as optional and ignore if absent. Volume 01 builders
in step C will use them.

### Step B — Update generate-workbook.js to match Phase 3 (Phase 5b)

Bring the docx output up to Volume 01 quality. Don't port to PDF yet.
This is a single-output bring-up that lets us verify content correctness
against the Phase 3 sample without taking on Browserless changes too.

Order of edits within generate-workbook.js:
1. Import GAP_BLURBS. Update buildOneDimension to render the two-paragraph
   callout (gap blurb + type blurb). Both italic, both in the right
   column of the hero.
2. Drop the gap >= 1.5 filter in buildInsights — render all 10 dims.
3. Update gap thresholds to 3 states: aligned (<0.8), some_gap (0.8-1.4),
   notable_gap (≥1.5).
4. Replace EXP_DOMAINS in `_workbook-content.js` with the 6-domain Phase 3
   list. This is also a single source of truth update.
5. Rewrite buildExpDomains to render all 6 domain pages with the
   responsibility-item rows (using the new payload data) and alignment
   percentage per domain.
6. Rebuild buildReferenceCard to match v2: real logo, italic tagline,
   coral names, white write-in goal box, gradient rule, no "together
   four years" line, In Practice callout in surround.
7. Replace placeholder epigraphs with real ones (or remove).

After this, the .docx download is at Phase 3 parity.

### Step C — Port to PDF / Volume 01 design (Phase 5c)

Now port the visual design from build_workbook.py → workbook-render.html.
This is the longest step and must come last because it depends on B
landing correctly.

Two architectural changes first:
1. Switch generate-pdf.js from URL-query-string-data to POST-body. Either
   construct the full HTML server-side and post that to Browserless, or
   POST a small data-id and have workbook-render fetch it from Supabase.
2. Add the same auth gate to generate-pdf.js that generate-workbook.js
   has. Currently anyone with the URL could POST.

Then port. Order of pages: cover → TOC → snapshot → 10 dimension pages →
6 expectation domain pages → working knowledge → focus areas → check-in
→ conversation library → first conversation guide → reference card.

CSS port: convert embedded `<style>` from build_workbook.py to the
workbook-render.html stylesheet. All design tokens (colors, fonts,
gradients) are defined; preserve them.

---

## Honest assessment of session-counts

- Step A (data contract): one focused session.
- Step B (docx upgrades): one session.
- Step C (PDF port): two to three sessions — too big for one.

Recommendation: do A and B in this session if there's time. Defer C to a
fresh session because the PDF rendering pipeline is its own surface area.
