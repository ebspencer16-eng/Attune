/**
 * Which environment variables have a value in the running deployment.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * Ellie, after setting WORKBOOK_SERVICE_URL: "when I clicked to edit, it did
 * not show that there was a value I was replacing, just an empty value box...
 * I want to make sure there aren't other empty en vars in my vercel."
 *
 * Vercel shows an empty box for any variable marked Sensitive, whether or not
 * it holds a value, so the dashboard cannot answer that question. The running
 * server can, and it is the only thing that can.
 *
 * ── WHAT IT NEVER DOES ────────────────────────────────────────────────────
 * Return a value, or any part of one. Not a prefix, not a length, not a hash.
 * The answer is a boolean per name and nothing else, because this endpoint
 * exists to be used casually and anything that leaks a credential under a
 * convenient name is how credentials leak.
 *
 * Admin-guarded like every other admin endpoint, which is belt and braces on
 * top of that: the names alone are a map of the infrastructure.
 *
 * ── THE LIST IS GENERATED ─────────────────────────────────────────────────
 * api/_lib/env-inventory.js is written by scripts/build-env-inventory.mjs from
 * the code that actually reads them, and check-env-inventory.mjs fails the
 * build if it has drifted. A hand-kept list here would go stale the first time
 * someone added a variable, and a variable nothing asks about is the exact
 * failure this was built after.
 */

import { checkAdminAuth } from './_lib/admin-auth.js';
import { ENV_VARS } from './_lib/env-inventory.js';

// Edge, like every other admin endpoint: this handler takes (req) and returns
// a Response. Declaring nodejs here and returning a Response is how
// admin-posts.js answered FUNCTION_INVOCATION_FAILED to every request it ever
// received. check-runtime-shape.mjs holds that now.
export const config = { runtime: 'edge' };

const HEADERS = { 'Content-Type': 'application/json' };

export default async function handler(req) {
  const auth = checkAdminAuth(req);
  if (!auth.ok) return new Response(auth.body, { status: auth.status, headers: HEADERS });

  /** True when the name holds something other than whitespace. */
  const hasValue = (name) => String(process.env[name] ?? '').trim().length > 0;

  const vars = ENV_VARS.map((v) => {
    const names = [v.name, ...(v.alsoAccepts || [])];
    const setUnder = names.filter(hasValue);
    return {
      name: v.name,
      required: v.required,
      set: setUnder.length > 0,
      /* Which spelling carried it, where a variable accepts more than one. Not
         a value: a name Ellie already typed herself. */
      ...(v.alsoAccepts ? { alsoAccepts: v.alsoAccepts, setUnder } : {}),
      ...(v.note ? { note: v.note } : {}),
      readBy: v.readBy,
    };
  });

  const missingRequired = vars.filter((v) => v.required && !v.set).map((v) => v.name);
  const missingOptional = vars.filter((v) => !v.required && !v.set).map((v) => v.name);

  return new Response(JSON.stringify({
    ok: true,
    /* The headline, so the answer is readable without reading the table. */
    summary: missingRequired.length
      ? `${missingRequired.length} required variable(s) have no value: ${missingRequired.join(', ')}`
      : 'Every required variable has a value.',
    missingRequired,
    missingOptional,
    counted: vars.length,
    vars,
  }, null, 2), { status: 200, headers: HEADERS });
}
