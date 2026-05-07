# PDF Builder Integration — Steps

What you need to do, in order. Items marked **DONE** are already in the repo. Items marked **YOU** need an account or a deploy you control.

---

## What's already in the repo

- **DONE — Service-mode pipeline.** `scripts/build_workbook.py --from-stdin` reads JSON, writes HTML. `scripts/render_workbook.mjs --from-stdin` reads HTML, writes PDF. Verified end-to-end against a real payload (41-page PDF, byte-identical to local sample mode).
- **DONE — Payload transformer.** `api/_couple-shape.js` exports `payloadToCouple(payload)` which maps `buildWorkbookPayload`'s output to the COUPLE shape. Includes per-domain alignment percent computation.
- **DONE — Vercel endpoint.** `api/store-workbook-pdf.js`. Auth gate matching `/api/store-workbook`, runs the transformer, calls the external service, uploads to Supabase Storage at `workbooks/<orderId>/<file>.pdf`, updates the order row with `workbook_url`, `workbook_status='ready'`, `workbook_format='pdf'`, returns a 7-day signed URL.
- **DONE — Service wrapper.** `scripts/service.mjs`. HTTP server with `POST /render` and `GET /health`. Validates the shared secret header, pipes the JSON through the build/render pipeline, returns PDF bytes. 60-second timeout, 1 MB body cap, child-process cleanup on every path.
- **DONE — Dockerfile.** `Dockerfile.workbook`. Single image with the Microsoft Playwright base, Python 3, and the four files the service needs. Runs as the non-root `pwuser` (Chromium refuses root). Listens on 8080.

## What you do

### 1. Pick and provision the host

Recommended: **Render.** No Docker registry, no command-line, deploys directly from this GitHub repo. Railway and Fly.io work the same way; pick whichever you already use.

On Render:
1. New → **Web Service**
2. Connect the `Attune` GitHub repo
3. Runtime: **Docker**
4. Dockerfile path: `Dockerfile.workbook`
5. Plan: **Starter** ($7/mo) or higher. The Free tier sleeps after 15 min idle and has cold starts of ~45s; not great for live customer traffic.
6. Region: pick the same one your Vercel project is in (US East works for most).
7. Don't deploy yet — set environment variables first (next step).

### 2. Generate a shared secret

```
openssl rand -hex 32
```

(Or any long random string. 32+ bytes of entropy.) Save it somewhere temporarily — you'll paste this same value into two places: the service host and Vercel.

### 3. Set the service environment variable

On Render → Environment → Add:

| Key | Value |
|---|---|
| `WORKBOOK_SERVICE_SECRET` | the random string from step 2 |
| `PORT` | `8080` (Render usually sets this for you, but be explicit) |

### 4. Deploy the service

On Render: **Deploy**. First build takes ~6–8 minutes (apt-install Python, npm install Playwright, copy files). Subsequent deploys are faster.

When the build finishes, you'll have a URL like `https://attune-workbook.onrender.com`. Note it — you need it in the next step.

### 5. Smoke-test the service directly

From your local machine:

```bash
curl -i https://attune-workbook.onrender.com/health
# expect: 200 ok

curl -X POST https://attune-workbook.onrender.com/render \
  -H "X-Service-Secret: <the secret from step 2>" \
  -H "Content-Type: application/json" \
  --data @sample-couple.json \
  -o test.pdf
# expect: ~1.2 MB PDF, 41 pages

open test.pdf  # visually inspect
```

For a `sample-couple.json` to use here, you can grab the one used in dev:
```bash
node -e "import('./api/_couple-shape.js').then(m => { const sample = require('./scripts/sample-payload.json'); process.stdout.write(JSON.stringify(m.payloadToCouple(sample), null, 2)) })" > sample-couple.json
```

(Or just copy the COUPLE dict from `scripts/build_workbook.py` line ~553 and paste it into a JSON file.)

If the PDF looks right end-to-end, move on. If something's off, the service logs are visible in Render → Logs tab.

### 6. Set the Vercel environment variables

On Vercel → Project → Settings → Environment Variables, add (Production scope):

| Key | Value |
|---|---|
| `WORKBOOK_SERVICE_URL` | `https://attune-workbook.onrender.com/render` (note `/render` suffix) |
| `WORKBOOK_SERVICE_SECRET` | same value as on Render |

Trigger a redeploy of the latest main commit so the new env vars are picked up.

### 7. Smoke-test the Vercel endpoint

After Vercel finishes deploying:

```bash
# As an admin (bypasses user auth check)
curl -X POST https://attune-relationships.com/api/store-workbook-pdf \
  -H "X-Admin-Key: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  --data @buildWorkbookPayload-sample.json
# expect: { "ok": true, "url": "https://...supabase.co/...signed=...", "filename": "Attune_Workbook_Maya_and_David.pdf" }
```

(For `buildWorkbookPayload-sample.json` — easiest is to log the payload from a real session. Add `console.log(JSON.stringify(payload))` temporarily in `App.jsx` around line 6863, complete the flow once, copy from devtools.)

Open the returned URL — should download the PDF. Verify the order row in Supabase got `workbook_url`, `workbook_status='ready'`, `workbook_format='pdf'`.

### 8. Cut over the auto-fulfill path

Right now `App.jsx`'s digital auto-fulfill calls `/api/store-workbook` (docx). Switching to PDF is a one-line change at line ~6850:

```diff
-        const resp = await fetch('/api/store-workbook', {
+        const resp = await fetch('/api/store-workbook-pdf', {
```

Make that change in a feature branch, test it through the live flow with one real account end-to-end (create order, complete both partners, check the dashboard download), then merge. Watch the next few real orders carefully.

### 9. Optional: dual-format toggle

If you want to ship PDF to new orders but keep docx as a fallback, gate the endpoint choice on order metadata:

```js
const endpoint = ord.workbookFormat === 'pdf'
  ? '/api/store-workbook-pdf'
  : '/api/store-workbook';
```

`workbookFormat` would default to `pdf` for new orders going forward, with old orders left as `docx`. Set the default at order-creation time in `api/orders.js` action='create'.

---

## Costs

- Render Starter: $7/month, always-on
- Supabase Storage: pennies. Each PDF is ~1.2 MB; 1,000 orders/month = 1.2 GB. Supabase Pro includes 100 GB.
- Vercel: no change. The new endpoint runs in the same serverless function quota.

Total monthly: $7 + Supabase you already pay for.

## Cold-start behavior

If you ever drop to Render Free, expect ~45s on the first request after 15 minutes of idle. Starter doesn't sleep. If you want extra paranoia: hit `/health` from a cron-checkin job once every 10 minutes to keep the container warm. Cheap insurance.

## What stays put

- `/api/generate-workbook` and `/api/store-workbook` (the docx path) are unchanged. They remain the production fallback. If the PDF service is down, you can flip new orders back to docx with the toggle in step 9.
- `scripts/build_workbook.py` and `scripts/render_workbook.mjs` keep their sample modes. Iterate on the design exactly as before — `python3 scripts/build_workbook.py && node scripts/render_workbook.mjs`.

## If something breaks

| Symptom | Where to look |
|---|---|
| `/api/store-workbook-pdf` returns 502 "PDF service failed" | Render → Logs. Likely a syntax error in the COUPLE payload, or the service crashed on a long render. |
| Service returns 401 "unauthorized" | The secret on Vercel doesn't match the one on Render. Re-paste both. |
| PDF downloads but pages are blank | Playwright started before fonts loaded. Increase the `page.waitForTimeout(1500)` in `render_workbook.mjs` to 3000. |
| `/api/store-workbook-pdf` returns 500 "Server not configured for auth" | Vercel is missing `SUPABASE_URL` or `SUPABASE_SERVICE_KEY`. (These should already be set for the docx path; double-check they're scoped to Production.) |
| First request after deploy times out | Cold start. Hit `/health` once to warm the container. |

## Files in the repo for this work

```
api/_couple-shape.js          payloadToCouple() transformer
api/store-workbook-pdf.js     Vercel endpoint
scripts/service.mjs           HTTP wrapper for the external service
scripts/build_workbook.py     existing — has --from-stdin mode
scripts/render_workbook.mjs   existing — has --from-stdin mode
api/_workbook-content.js      existing — shared content (EXP_DOMAINS etc.)
Dockerfile.workbook           container build for the external service
scripts/SERVICE_INTEGRATION.md narrative reference (this file is the action list)
```
