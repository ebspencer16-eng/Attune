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

---

# Deploying the builder

Was `scripts/PDF_BUILDER_STEPS.md`, folded in here on 2026-10-10. One service,
one document.

What you need to do, in order. Items marked **DONE** are already in the repo. Items marked **YOU** need an account or a deploy you control.

---

### What's already in the repo

- **DONE — Service-mode pipeline.** `scripts/build_workbook.py --from-stdin` reads JSON, writes HTML. `scripts/render_workbook.mjs --from-stdin` reads HTML, writes PDF. Verified end-to-end against a real payload (41-page PDF, byte-identical to local sample mode).
- **DONE — Payload transformer.** `api/_couple-shape.js` exports `payloadToCouple(payload)` which maps `buildWorkbookPayload`'s output to the COUPLE shape. Includes per-domain alignment percent computation.
- **DONE — Vercel endpoint.** `api/store-workbook-pdf.js`. Auth gate matching `/api/store-workbook`, runs the transformer, calls the external service, uploads to Supabase Storage at `workbooks/<orderId>/<file>.pdf`, updates the order row with `workbook_url`, `workbook_status='ready'`, `workbook_format='pdf'`, returns a 7-day signed URL.
- **DONE — Service wrapper.** `scripts/service.mjs`. HTTP server with `POST /render` and `GET /health`. Validates the shared secret header, pipes the JSON through the build/render pipeline, returns PDF bytes. 60-second timeout, 1 MB body cap, child-process cleanup on every path.
- **DONE — Dockerfile.** `Dockerfile.workbook`. Single image with the Microsoft Playwright base, Python 3, and the four files the service needs. Runs as the non-root `pwuser` (Chromium refuses root). Listens on 8080.

### What you do

#### 1. Pick and provision the host

Recommended: **Render.** No Docker registry, no command-line, deploys directly from this GitHub repo. Railway and Fly.io work the same way; pick whichever you already use.

On Render:
1. New → **Web Service**
2. Connect the `Attune` GitHub repo
3. Runtime: **Docker**
4. Dockerfile path: `Dockerfile.workbook`
5. Plan: **Starter** ($7/mo) or higher. The Free tier sleeps after 15 min idle and has cold starts of ~45s; not great for live customer traffic.
6. Region: pick the same one your Vercel project is in (US East works for most).
7. Don't deploy yet — set environment variables first (next step).

#### 2. Generate a shared secret

```
openssl rand -hex 32
```

(Or any long random string. 32+ bytes of entropy.) Save it somewhere temporarily — you'll paste this same value into two places: the service host and Vercel.

#### 3. Set the service environment variable

On Render → Environment → Add:

| Key | Value |
|---|---|
| `WORKBOOK_SERVICE_SECRET` | the random string from step 2 |

That's the only one you need. Render injects `PORT` automatically, and the service reads it from `process.env.PORT`.

#### 4. Deploy the service

On Render: **Deploy**. First build takes ~6–8 minutes (apt-install Python, npm install Playwright, copy files). Subsequent deploys are faster.

When the build finishes, you'll have a URL like `https://attune-workbook.onrender.com`. Note it — you need it in the next step.

#### 5. Smoke-test the service directly

From your local machine:

```bash
curl -i https://attune-workbook.onrender.com/health
## expect: 200 ok

curl -X POST https://attune-workbook.onrender.com/render \
  -H "X-Service-Secret: <the secret from step 2>" \
  -H "Content-Type: application/json" \
  --data @sample-couple.json \
  -o test.pdf
## expect: ~1.2 MB PDF, 41 pages

open test.pdf  # visually inspect
```

For a `sample-couple.json` to use here, you can grab the one used in dev:
```bash
node -e "import('./api/_couple-shape.js').then(m => { const sample = require('./scripts/sample-payload.json'); process.stdout.write(JSON.stringify(m.payloadToCouple(sample), null, 2)) })" > sample-couple.json
```

(Or just copy the COUPLE dict from `scripts/build_workbook.py` line ~553 and paste it into a JSON file.)

If the PDF looks right end-to-end, move on. If something's off, the service logs are visible in Render → Logs tab.

#### 6. Set the Vercel environment variables

On Vercel → Project → Settings → Environment Variables, add (Production scope):

| Key | Value |
|---|---|
| `WORKBOOK_SERVICE_URL` | `https://attune-workbook.onrender.com/render` (note `/render` suffix) |
| `WORKBOOK_SERVICE_SECRET` | same value as on Render |

Trigger a redeploy of the latest main commit so the new env vars are picked up.

#### 7. Smoke-test the Vercel endpoint

After Vercel finishes deploying:

```bash
## As an admin (bypasses user auth check)
curl -X POST https://attune-relationships.com/api/store-workbook-pdf \
  -H "X-Admin-Key: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  --data @buildWorkbookPayload-sample.json
## expect: { "ok": true, "url": "https://...supabase.co/...signed=...", "filename": "Attune_Workbook_Maya_and_David.pdf" }
```

(For `buildWorkbookPayload-sample.json` — easiest is to log the payload from a real session. Add `console.log(JSON.stringify(payload))` temporarily in `App.jsx` around line 6863, complete the flow once, copy from devtools.)

Open the returned URL — should download the PDF. Verify the order row in Supabase got `workbook_url`, `workbook_status='ready'`, `workbook_format='pdf'`.

#### 8. Cut over the auto-fulfill path

Right now `App.jsx`'s digital auto-fulfill calls `/api/store-workbook` (docx). Switching to PDF is a one-line change at line ~6850:

```diff
-        const resp = await fetch('/api/store-workbook', {
+        const resp = await fetch('/api/store-workbook-pdf', {
```

Make that change in a feature branch, test it through the live flow with one real account end-to-end (create order, complete both partners, check the dashboard download), then merge. Watch the next few real orders carefully.

#### 9. Optional: dual-format toggle

If you want to ship PDF to new orders but keep docx as a fallback, gate the endpoint choice on order metadata:

```js
const endpoint = ord.workbookFormat === 'pdf'
  ? '/api/store-workbook-pdf'
  : '/api/store-workbook';
```

`workbookFormat` would default to `pdf` for new orders going forward, with old orders left as `docx`. Set the default at order-creation time, where the order row is first written.

---

### Costs

- Render Starter: $7/month, always-on
- Supabase Storage: pennies. Each PDF is ~1.2 MB; 1,000 orders/month = 1.2 GB. Supabase Pro includes 100 GB.
- Vercel: no change. The new endpoint runs in the same serverless function quota.

Total monthly: $7 + Supabase you already pay for.

### Cold-start behavior

If you ever drop to Render Free, expect ~45s on the first request after 15 minutes of idle. Starter doesn't sleep. If you want extra paranoia: hit `/health` from a cron-checkin job once every 10 minutes to keep the container warm. Cheap insurance.

### What stays put

- `/api/generate-workbook` and `/api/store-workbook` (the docx path) are unchanged. They remain the production fallback. If the PDF service is down, you can flip new orders back to docx with the toggle in step 9.
- `scripts/build_workbook.py` and `scripts/render_workbook.mjs` keep their sample modes. Iterate on the design exactly as before — `python3 scripts/build_workbook.py && node scripts/render_workbook.mjs`.

### If something breaks

| Symptom | Where to look |
|---|---|
| `/api/store-workbook-pdf` returns 502 "PDF service failed" | Render → Logs. Likely a syntax error in the COUPLE payload, or the service crashed on a long render. |
| Service returns 401 "unauthorized" | The secret on Vercel doesn't match the one on Render. Re-paste both. |
| PDF downloads but pages are blank | Playwright started before fonts loaded. Increase the `page.waitForTimeout(1500)` in `render_workbook.mjs` to 3000. |
| `/api/store-workbook-pdf` returns 500 "Server not configured for auth" | Vercel is missing `SUPABASE_URL` or `SUPABASE_SERVICE_KEY`. (These should already be set for the docx path; double-check they're scoped to Production.) |
| First request after deploy times out | Cold start. Hit `/health` once to warm the container. |

### Files in the repo for this work

```
api/_couple-shape.js          payloadToCouple() transformer
api/store-workbook-pdf.js     Vercel endpoint
scripts/service.mjs           HTTP wrapper for the external service
scripts/build_workbook.py     existing — has --from-stdin mode
scripts/render_workbook.mjs   existing — has --from-stdin mode
api/_workbook-content.js      existing — shared content (EXP_DOMAINS etc.)
Dockerfile.workbook           container build for the external service
scripts/the section above narrative reference (this file is the action list)
```

