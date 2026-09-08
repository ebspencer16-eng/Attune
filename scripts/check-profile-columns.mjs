// Fails the build when an endpoint selects a profiles column that no migration
// creates.
//
// /api/home asked for results_last_opened_at, partner_nudged_at and
// feedback_given_at. None existed. PostgREST rejects the whole select when one
// column is unknown, so the profile lookup returned nothing and the endpoint
// answered "profile not found" for an account whose profile was right there.
//
// The priority engine's 26 tests pass because they hand it plain objects
// rather than reading a database. The logic was right; the schema never caught
// up. This is the same class as every other bug on this project: two things
// that must agree, maintained separately, with nothing checking.

import { readFileSync, readdirSync } from 'fs';

const apiDir = new URL('../api/', import.meta.url);
const migDir = new URL('../supabase/migrations/', import.meta.url);

// Every column any migration adds TO PROFILES specifically.
//
// The first version of this check collected column names from every table,
// which is how it passed while addon_checklist existed only on orders. A
// column name is not a column; it belongs to a table, and the whole point of
// this gate is that profiles has it.
const known = new Set();
for (const f of readdirSync(migDir).filter((f) => f.endsWith('.sql'))) {
  const sql = readFileSync(new URL(f, migDir), 'utf8');

  // `alter table ... profiles ... add column x, add column y` up to the
  // statement terminator, so multi-column alters are covered.
  for (const stmt of sql.split(';')) {
    if (!/alter\s+table\s+(public\.)?profiles\b/i.test(stmt)) continue;
    for (const m of stmt.matchAll(/add column\s+(?:if not exists\s+)?([a-z0-9_]+)/gi)) known.add(m[1]);
  }

  const create = sql.match(/create table[^(]*\bprofiles\s*\(([\s\S]*?)\n\);/i);
  if (create) for (const m of create[1].matchAll(/^\s*([a-z0-9_]+)\s+[a-z]/gim)) known.add(m[1]);
}

// Columns that predate the migration folder. Listed rather than inferred,
// because guessing here would make the check useless in both directions.
for (const c of [
  'id', 'email', 'name', 'pronouns', 'partner_name', 'partner_pronouns', 'partner_email',
  'partner_profile_id', 'invite_code', 'joined_via_invite', 'pkg', 'is_comp',
  'ex1_answers', 'ex2_answers', 'ex3_answers', 'ex3_completed',
  'ex1_progress', 'ex2_progress', 'ex3_progress',
  'ex1_prior', 'ex2_prior', 'ex3_prior',
  'relationship_status', 'relationship_length', 'children', 'age_range', 'gender',
  'signup_source', 'email_opt_in', 'created_at', 'updated_at', 'couple_type',
  'workbook_url', 'workbook_status', 'entitlements', 'entitlements_updated_at',
]) known.add(c);

const problems = [];
for (const file of readdirSync(apiDir).filter((f) => f.endsWith('.js'))) {
  const text = readFileSync(new URL(file, apiDir), 'utf8');
  // Only column lists that actually reach a profiles select. admin-csv builds
  // a `cols` array too, but for CSV headers, and flagging those made the check
  // noise. A gate that cries wolf gets ignored, which is worse than no gate.
  for (const m of text.matchAll(/const cols = \[([\s\S]*?)\]\.join/g)) {
    const after = text.slice(m.index, m.index + 1200);
    if (!/profiles\?[^`]*select=\$\{cols\}/.test(after)) continue;
    const cols = [...m[1].matchAll(/'([a-z0-9_]+)'/g)].map((x) => x[1]);
    const missing = cols.filter((c) => !known.has(c));
    if (missing.length) problems.push({ file, missing });
  }
}

// Inline selects, and writes.
//
// The check above only understood one shape: a `const cols = [...]` array
// joined into the query. Most endpoints write the select inline, and none of
// them were being checked at all. Writes were not checked either, and a PATCH
// naming a column that does not exist is the same bug facing the other way:
// PostgREST rejects it, the write silently does nothing, and the value the
// endpoint was supposed to record is simply absent later.
//
// /api/claim-order writes purchase_email, auth_provider and claimed_order_num.
// Those three are the whole reason an account stays findable when someone signs
// in with an Apple relay address that matches no order.
function objectKeysAfter(text, from) {
  // The object literal passed to JSON.stringify, by brace matching rather than
  // a regex, so a nested object cannot end the match early.
  const open = text.indexOf('{', from);
  if (open === -1) return [];
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) {
        const inner = text.slice(open + 1, i);
        // Top-level keys only: anything nested belongs to a value, not a column.
        const keys = [];
        let d = 0;
        for (const m of inner.matchAll(/[{}]|(?:^|[,\s(])([a-z][a-z0-9_]*)\s*:/gm)) {
          if (m[0] === '{') d++;
          else if (m[0] === '}') d--;
          else if (d === 0 && m[1]) keys.push(m[1]);
        }
        return keys;
      }
    }
  }
  return [];
}

for (const file of readdirSync(apiDir).filter((f) => f.endsWith('.js'))) {
  const text = readFileSync(new URL(file, apiDir), 'utf8');

  for (const m of text.matchAll(/profiles\?[^`'"]*?select=([a-z0-9_,]+)/g)) {
    const missing = m[1].split(',').filter((c) => c && c !== '*' && !known.has(c));
    if (missing.length) problems.push({ file, missing, how: 'selects' });
  }

  for (const m of text.matchAll(/profiles\?[^`'"]*`,\s*\{[\s\S]{0,400}?method:\s*'PATCH'/g)) {
    const at = text.indexOf('JSON.stringify(', m.index);
    if (at === -1) continue;
    const missing = objectKeysAfter(text, at).filter((c) => !known.has(c));
    if (missing.length) problems.push({ file, missing, how: 'writes' });
  }
}

if (problems.length) {
  console.error('[check-profile-columns] endpoints naming columns no migration creates:');
  for (const p of problems) console.error(`  api/${p.file}  ${p.how || 'selects'}: ${p.missing.join(', ')}`);
  console.error('');
  console.error('A select naming an unknown column is rejected whole, so the lookup');
  console.error('returns nothing and the endpoint reports the row as missing. A write');
  console.error('naming one is rejected too, and that failure is usually caught and');
  console.error('logged, so the value is simply never recorded.');
  console.error('Add a migration, or stop naming the column.');
  process.exit(1);
}

console.log(`[check-profile-columns] every profiles column read or written exists (${known.size} known).`);
