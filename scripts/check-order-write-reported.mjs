/**
 * A paying customer with no order row must set off an alarm.
 *
 * THE PROMISE. Two files write to the `orders` table: the Stripe webhook, on
 * every paid order, and create-payment-intent, on a 100%-off promo. If that
 * write fails, the customer has been charged and nothing anywhere records the
 * sale. It has happened: a missing promo_code column dropped every order
 * insert with a 42703 "for weeks", which is written in the comment above
 * writeOrderRow.
 *
 * So a failed order write has to do two things, and a console.error is
 * neither. It has to be REPORTED, to Sentry, so somebody is told; and the
 * webhook has to answer Stripe non-2xx, so Stripe retries the delivery and
 * marks the endpoint as failing in its own dashboard, which is somewhere
 * Ellie can see without reading Vercel logs. The inserts are idempotent on
 * order_num, so a retry writes the missing row and nothing twice.
 *
 * WHAT THIS COVERS: every file that POSTs to /rest/v1/orders. Found by the
 * path, not by a filename, so a third writer is covered the day it is added.
 *
 * WHAT IT DOES NOT COVER: whether Stripe is configured to call the webhook at
 * all. That lives in Stripe's dashboard and no check here can see it. The
 * nearest thing is that the handler answers 500 "Webhook not configured" when
 * STRIPE_WEBHOOK_SECRET is unset, so one curl against the deployed endpoint
 * tells the two apart.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const api = join(root, 'api');
/* The path with its terminator. `includes('/rest/v1/orders')` is satisfied by
   `/rest/v1/orders_v2`, so renaming the table left this check still counting
   the file and still reporting success about code it was no longer reading.
   Same family as `[^'"]*alignment.js` being satisfied by `comm-alignment.js`. */
const ORDERS_PATH = /\/rest\/v1\/orders(?![\w-])/;
const files = readdirSync(api).filter((f) => f.endsWith('.js'))
  .filter((f) => ORDERS_PATH.test(readFileSync(join(api, f), 'utf8')));

const fails = [];
let writers = 0, branches = 0;

for (const f of files) {
  const src = readFileSync(join(api, f), 'utf8');
  /* Only a POST is a write. A GET of the same path is a read. */
  const posts = [...src.matchAll(/\/rest\/v1\/orders(?![\w-])[\s\S]{0,400}?method:\s*'POST'/g)];
  if (!posts.length) continue;
  writers++;

  /* Every branch that handles a non-ok, non-409 result. The tell is a
     console.error naming an insert or an order. */
  const logged = [...src.matchAll(/console\.error\(([^\n]*?(?:insert|order)[^\n]*)\)/gi)];
  for (const m of logged) {
    branches++;
    /* THIS BRANCH ONLY, to its closing brace. A 1200-character window passed
       a plant that deleted one branch's report, because the other branch's
       report sat inside the window: the gate reported the neighbour's care as
       this branch's. Bounded by brace depth instead.
       And the report has to be a CALL. Matching the bare name `reportToSentry`
       passed a plant that renamed the import to `_r`, because the name was
       still there in the import line. */
    const after = blockAfter(src, m.index);
    if (!/reportToSentry\s*\(/.test(after)) {
      const line = src.slice(0, m.index).split('\n').length;
      fails.push(`api/${f}:${line} logs a failed order write and reports it nowhere.\n` +
                 `    The customer has been charged and nothing records the sale.\n` +
                 `    ${m[0].slice(0, 90)}`);
    }
  }

  /* The webhook additionally has to tell Stripe, so the delivery is retried
     and the endpoint shows as failing. */
  if (f === 'stripe-webhook.js') {
    /* The CONDITION, not the text. `if (false) { ... status: 500 ... }` left
       every string in place and walked through a check that only looked for
       the strings. A guard is checked by what it compares. */
    const tellsStripe = /if\s*\(\s*orderInsertFailed\s*\)\s*\{[\s\S]{0,400}?status:\s*500/.test(src);
    if (!tellsStripe) {
      fails.push('api/stripe-webhook.js answers Stripe 2xx even when the order row was not written,\n' +
                 '    so Stripe never retries and the failure appears nowhere but a log line.');
    }
  }
}

/** From a point, forward to the end of the enclosing block. */
function blockAfter(src, at) {
  let depth = 0;
  for (let i = at; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') { if (depth === 0) return src.slice(at, i); depth--; }
  }
  return src.slice(at);
}

/* THE SUBJECT, asserted. Renaming the REST path to /rest/v1/orders_v2 dropped
   the webhook out of `files` entirely, so the webhook-specific rule was never
   applied and the check reported success about a file it had stopped reading.
   A check that has lost its subject must fail, not pass. */
const EXPECTED = ['stripe-webhook.js', 'create-payment-intent.js'];
for (const want of EXPECTED) {
  if (!files.includes(want)) {
    console.error(`[check-order-write-reported] ${want} no longer writes to /rest/v1/orders.`);
    console.error('If the table or the path was renamed on purpose, change EXPECTED here and say');
    console.error('why. Until then this check cannot see the thing it is about.');
    process.exit(1);
  }
}

if (!writers) {
  console.error('[check-order-write-reported] found no file writing to the orders table.');
  console.error('Either the path changed or this check has lost its subject. A check that');
  console.error('cannot find what it is about must never report success.');
  process.exit(1);
}

if (fails.length) {
  console.error('[check-order-write-reported] a lost order would be silent:\n');
  for (const x of fails) console.error('  ' + x + '\n');
  process.exit(1);
}
console.log(`[check-order-write-reported] ${writers} files write an order row, ${branches} failure branches, every one reported to Sentry, and the webhook answers Stripe non-2xx so the delivery is retried.`);
