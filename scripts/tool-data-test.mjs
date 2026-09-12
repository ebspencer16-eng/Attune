// What /api/tool-data will and will not do.
//
// The endpoint itself needs Supabase, so this checks the decisions it makes
// before it gets there: who owns what, which tool maps to which column, and
// that a body it should refuse is refused. Those are the parts that can be
// wrong in a way nobody notices, because the wrong answer still returns 200.

import { readFileSync } from 'fs';
import { capabilitiesFor } from '../api/_lib/ownership.js';

const ROOT = new URL('..', import.meta.url).pathname;
const src = readFileSync(ROOT + 'api/tool-data.js', 'utf8');

let pass = 0; let fail = 0;
const ok = (name, cond) => {
  if (cond) { pass += 1; console.log(`  ok    ${name}`); }
  else { fail += 1; console.error(`  FAIL  ${name}`); }
};

// ── Ownership is asked, not assumed ────────────────────────────────────────
ok('the endpoint asks capabilitiesFor rather than comparing a package',
  /capabilitiesFor\(/.test(src) && !/pkg\s*===\s*['"]/.test(src));

// Newlywed owns budget and checklist; core owns neither.
const nw = capabilitiesFor({ pkg: 'newlywed' });
const core = capabilitiesFor({ pkg: 'core' });
ok('newlywed owns the checklist and the budget', nw.ownsChecklist && nw.ownsBudget);
ok('core owns neither', !core.ownsChecklist && !core.ownsBudget);

// An add-on grants on top of the package, which is what the write path reads.
const addon = capabilitiesFor({ pkg: 'core', addon_budget: true });
ok('an add-on grants the budget on a core package', addon.ownsBudget && !addon.ownsChecklist);

// ── The tool map ───────────────────────────────────────────────────────────
ok('checklist writes checklist_data', /checklist:\s*\{\s*column:\s*'checklist_data'/.test(src));
ok('budget writes budget_data', /budget:\s*\{\s*column:\s*'budget_data'/.test(src));
ok('an unknown tool is refused', /unknown tool/.test(src));
ok('the column is never taken from the request',
  !/\[\s*body\.(tool|column)\s*\]/.test(src) && /TOOLS\[body\?\.tool\]/.test(src));

// ── The body ───────────────────────────────────────────────────────────────
ok('a non-object body is refused', /data must be an object/.test(src));
ok('an array is refused too', /Array\.isArray\(data\)/.test(src));
ok('there is a size limit', /MAX_BYTES/.test(src) && /413/.test(src));

// ── Reading ────────────────────────────────────────────────────────────────
ok('a tool that is not owned reads back null, not absent',
  /caps\.ownsChecklist \? \(profile\.checklist_data \|\| null\) : null/.test(src));
ok('the checklist content is only sent to someone who owns it',
  /areas: caps\.ownsChecklist \?/.test(src));
ok('the budget content is only sent to someone who owns it',
  /budgetCategories: caps\.ownsBudget \?/.test(src));
ok('the workbook is only looked up for someone who owns it',
  /if \(caps\.ownsWorkbook\)/.test(src));

// ── Writing ────────────────────────────────────────────────────────────────
ok('a write the caller does not own is a 403',
  /if \(!caps\[tool\.capability\]\)/.test(src) && /403/.test(src));
ok('the write is scoped to the caller', /profiles\?id=eq\.\$\{me\}/.test(src));
ok('the id comes from the token, never the body', !/body\.userId/.test(src));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
