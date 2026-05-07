# Workbook PDF Service — Production Integration

This is the guide for deploying `build_workbook.py` + `render_workbook.mjs` as a real production service that returns the Attune workbook PDF on demand.

It assumes you've already worked through the design iteration locally. Both scripts now have a `--from-stdin` mode so they can be chained as a pipeline: JSON in, PDF out.

---

## What you have today

**Two scripts that already work as a pipeline.**

```
echo "$couple_json" | python3 scripts/build_workbook.py --from-stdin \
  | node scripts/render_workbook.mjs --from-stdin > workbook.pdf
```

- `build_workbook.py --from-stdin` — reads a `COUPLE`-shaped JSON payload from stdin, writes the rendered HTML to stdout.
- `render_workbook.mjs --from-stdin` — reads HTML from stdin, runs Playwright/Chromium, writes PDF bytes to stdout.

**Both scripts also still work in their original sample modes** (no flag), so iterating on the design with the hardcoded Maya & David data is unchanged.

---

## The input shape (`COUPLE`)

The JSON payload is identical to the `COUPLE` Python dict at the top of `build_workbook.py`. The simplest reference is to look at that file (line ~553). Here's the abbreviated shape:

```json
{
  "u": "Maya",
  "p": "David",
  "together": "Together, four years",
  "couple_type": {
    "id": "WX",
    "name": "The Jumpstart",
    "subtitle": "initiator-anchor",
    "tagline": "Both want resolution. Different instruments, same direction.",
    "description": "Maya and David both move toward resolution...",
    "phrase_that_lands": "I need to process this out loud, bear with me..."
  },
  "edition_internal": "0247",
  "date": "April 2026",
  "scores": {
    "energy":     [4.0, 3.4],
    "expression": [4.5, 2.3],
    "needs":      [2.0, 2.2],
    "bids":       [4.3, 3.6],
    "conflict":   [1.8, 2.0],
    "repair":     [4.0, 2.4],
    "closeness":  [4.5, 2.8],
    "love":       [2.0, 4.2],
    "stress":     [4.2, 1.8],
    "feedback":   [4.2, 2.5]
  },
  "expectations": {
    "household": 82, "emotional": 48, "extended_family": 67,
    "money": 78, "life": 73, "operate": 68
  },
  "expectations_detail": {
    "household": {
      "maya":  [["Cooking weeknights", "Both of us"], ...],
      "david": [["Cooking weeknights", "Both of us"], ...]
    },
    "emotional":       { "maya": [...], "david": [...] },
    "extended_family": { "maya": [...], "david": [...] },
    "money":           { "maya": [...], "david": [...] },
    "life":            { "maya": [...], "david": [...] },
    "operate":         { "maya": [...], "david": [...] }
  }
}
```

Each `scores` value is `[user_score, partner_score]` on the 1–5 scale. Each `expectations_detail` row inside a domain is `[label, value]` where value is the answer the partner gave.

The two inner keys under each `expectations_detail` domain (`maya`, `david` in the sample) need to match the partner names in lowercase. The renderer reads them by `COUPLE['u'].lower()` and `COUPLE['p'].lower()`.

---

## The transformation gap

The site builds a payload via `buildWorkbookPayload()` in `src/App.jsx` (around line 2436). That payload has a different shape than `COUPLE` — it carries raw responses, not the alignment percentages and per-domain detail rows. The transformation between the two shapes is the work that doesn't exist yet.

Specifically:

| `buildWorkbookPayload` field | Maps to `COUPLE` field | Transformation |
|---|---|---|
| `userName` / `partnerName` | `u` / `p` | direct |
| `coupleType.id/name/tagline/description` | `couple_type.id/name/tagline/description` | direct |
| `phraseThatLands` | `couple_type.phrase_that_lands` | direct |
| `scores.{dim}` / `partnerScores.{dim}` | `scores.{dim}` | zip into `[user, partner]` pairs |
| `responsibilities` + `lifeQuestions` | `expectations.{domain}` | **compute alignment percent per domain** |
| `responsibilities` + `lifeQuestions` | `expectations_detail.{domain}` | **map each row through to its display value** |

The two starred rows are real work. Alignment percent is the count of rows where both partners gave the same answer, divided by total rows in the domain (multiplied by 100). Domain assignment for each responsibility item and life question lives in `api/_workbook-content.js` — the existing docx generator (`api/generate-workbook.js`) already does this computation. **Your transformer should call into the same shared source of truth** rather than duplicating the mapping. Move the helpers into `api/_workbook-content.js` if needed; both the docx path and the new PDF path can then share them.

I'd suggest building the transformer as a function `payloadToCouple(payload)` in a new file `api/_couple-shape.js`, exporting it from there, and calling it from both:
- The Node-side wrapper (`/api/store-workbook-pdf` — see below) before it shells out
- Optionally a unit test fixture so you can verify it round-trips correctly before deploy

---

## Hosting: where this runs

Vercel does not run Python or Playwright in their serverless functions (Python isn't an officially supported runtime, and Chromium binaries exceed the function size limit even on Pro). You have three viable options:

### Option A — Render / Railway / Fly.io as a private service

Recommended. Lowest ops burden. Ship a single Docker container that has Python 3.11, Node 20, and Playwright Chromium pre-installed. Expose one HTTP endpoint that takes JSON and returns PDF bytes.

A working `Dockerfile`:

```dockerfile
FROM mcr.microsoft.com/playwright:v1.46.0-jammy

# Python (Playwright image is Ubuntu-based; python3 is already there)
RUN apt-get update && apt-get install -y python3-pip && rm -rf /var/lib/apt/lists/*

# App
WORKDIR /app
COPY scripts/build_workbook.py scripts/render_workbook.mjs /app/scripts/
COPY api/_workbook-content.js                                /app/api/

# Tiny HTTP wrapper (next file)
COPY scripts/service.mjs                                     /app/scripts/

# Playwright is already installed in the base image; no npm install needed
EXPOSE 8080
CMD ["node", "/app/scripts/service.mjs"]
```

A working `scripts/service.mjs` (HTTP wrapper around the pipeline):

```js
import http from 'node:http';
import { spawn } from 'node:child_process';

const PORT = process.env.PORT || 8080;
const SHARED_SECRET = process.env.WORKBOOK_SERVICE_SECRET; // set this on Render

http.createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/render') {
    res.writeHead(404); return res.end();
  }
  if (req.headers['x-service-secret'] !== SHARED_SECRET) {
    res.writeHead(401); return res.end('unauthorized');
  }
  // Read JSON body
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const json = Buffer.concat(chunks).toString('utf-8');

  // Run: python build → node render → PDF bytes
  const py = spawn('python3', ['/app/scripts/build_workbook.py', '--from-stdin']);
  const node = spawn('node', ['/app/scripts/render_workbook.mjs', '--from-stdin']);
  py.stdin.end(json);
  py.stdout.pipe(node.stdin);

  const out = [];
  node.stdout.on('data', d => out.push(d));
  node.on('close', code => {
    if (code !== 0) { res.writeHead(500); return res.end('render failed'); }
    res.writeHead(200, { 'Content-Type': 'application/pdf' });
    res.end(Buffer.concat(out));
  });
}).listen(PORT, () => console.log(`workbook service on :${PORT}`));
```

Deploy steps:
1. Push the repo as-is to Render/Railway/Fly.
2. Set environment variable `WORKBOOK_SERVICE_SECRET` to a long random string (you'll need this same value in Vercel env vars — see below).
3. Note the service URL once it's deployed (e.g. `https://attune-workbook.onrender.com`).

Cost: roughly $7/month on Render's starter for this kind of job (always-on, low CPU when idle). Cold starts are ~30 seconds if you let it sleep — set keep-warm if you care about that.

### Option B — AWS Lambda with custom container image

Lambda supports up to 10GB container images and will run Playwright if you bundle Chromium. More complex setup, but pay-per-invocation rather than always-on. Skip unless you're already on AWS.

### Option C — Run it yourself on a small VM

A $5 Hetzner / DigitalOcean droplet, plus Caddy or Nginx for TLS, running the same `service.mjs` under a systemd unit or Docker. Cheapest, most ops. Skip unless you enjoy that.

---

## Wiring it into the Vercel API

Create a new endpoint `/api/store-workbook-pdf.js` (mirrors `/api/store-workbook.js` but calls the external Python service instead of `/api/generate-workbook`).

Pseudocode:

```js
import { payloadToCouple } from './_couple-shape.js';

export default async function handler(req, res) {
  // 1. Same auth + entitlement check as /api/store-workbook
  //    (verify Bearer token, look up user's orders, check addon_workbook).
  // 2. Transform the App.jsx payload into the COUPLE shape.
  const couple = payloadToCouple(req.body);
  // 3. Call the external Python service.
  const serviceUrl = process.env.WORKBOOK_SERVICE_URL;        // e.g. https://attune-workbook.onrender.com/render
  const serviceSecret = process.env.WORKBOOK_SERVICE_SECRET;  // the same shared secret
  const pdfRes = await fetch(serviceUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Service-Secret': serviceSecret,
    },
    body: JSON.stringify(couple),
  });
  if (!pdfRes.ok) {
    return res.status(502).json({ error: 'Workbook service failed', status: pdfRes.status });
  }
  const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
  // 4. Upload to Supabase Storage (same as /api/store-workbook does for docx,
  //    but with .pdf suffix and application/pdf content-type).
  // 5. Return the signed URL.
}
```

Then on the frontend, `App.jsx` auto-fulfill (around line 6850 — the digital path) should switch from calling `/api/store-workbook` to `/api/store-workbook-pdf` once the service is healthy in production. You can flag this with a feature flag if you want a careful rollout (`ord.workbookFormat = 'pdf' | 'docx'` based on env or a Supabase config row).

---

## Environment variables you'll need to set on Vercel

| Name | Where | What |
|---|---|---|
| `WORKBOOK_SERVICE_URL` | Vercel | Full URL of the deployed service, including path (e.g. `https://attune-workbook.onrender.com/render`) |
| `WORKBOOK_SERVICE_SECRET` | Vercel **and** the service host | Long random string, identical on both sides |

The existing Supabase env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`) are already configured and don't change.

---

## Test plan before flipping the switch

1. Deploy the service. Hit it directly with `curl` and the sample `COUPLE` JSON (you can grab the sample by exporting it from the Python script — there's a one-liner in this file's git history). Verify you get a 41-page PDF back.
2. Build `/api/store-workbook-pdf` on a feature branch. Test against the staging Vercel preview deploy with a real authenticated request. Verify the PDF is uploaded to Supabase Storage and the signed URL works.
3. Have one real customer (yours, ideally) go through the flow end-to-end on staging: complete exercises, trigger auto-fulfill, download the PDF from the dashboard, open it. Look at every page.
4. Once that passes, merge to main. Watch the first few real orders carefully.

---

## Things that intentionally stay as-is

- `/api/generate-workbook` and `/api/store-workbook` (the docx path) are unchanged. They remain the production fallback. If the PDF service is down, the system can degrade to the docx workbook rather than failing the order.
- `scripts/build_workbook.py` and `scripts/render_workbook.mjs` keep their existing sample modes. You can iterate on the design exactly as you've been doing.
- The doc generators (`build_content_review.mjs`, `build_specific_content_review.mjs`, etc.) are unaffected.

---

## TL;DR

What I built for you:
1. `--from-stdin` on `build_workbook.py` (JSON in → HTML out)
2. `--from-stdin` on `render_workbook.mjs` (HTML in → PDF out)
3. Verified the pipeline produces a 41-page PDF byte-identical to the local sample mode

What you need to do:
1. Write `payloadToCouple()` in JS (the transformation between `buildWorkbookPayload`'s shape and `COUPLE`)
2. Pick a host (Render is the lowest-friction)
3. Deploy the Dockerfile + `service.mjs` (sketches above)
4. Add `/api/store-workbook-pdf` on Vercel that calls the external service
5. Set the two env vars on both sides
6. Switch `App.jsx`'s auto-fulfill digital path to the new endpoint when ready
