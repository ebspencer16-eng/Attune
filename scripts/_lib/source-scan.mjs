/**
 * Deciding whether a line puts a value into a response.
 *
 * ── WHY THIS IS SHARED ────────────────────────────────────────────────────
 * Two gates need this: check-partner-privacy.mjs asks it about conflict_data,
 * check-intimacy-privacy.mjs about intimacy_data. Both got it wrong in the
 * same two ways, one after the other.
 *
 * First they compared a single line, so a column named inside a multi-line
 * object literal went straight past:
 *
 *   return json({
 *     leak: me.intimacy_data,     // never seen: no `json(` on this line
 *   });
 *
 * Then they looked back a fixed number of lines, which caught that and also
 * caught an unrelated early return eight lines above a select:
 *
 *   if (!URL) return json({ error: 'missing' }, 500);   // matched this
 *   ...
 *   admin.from('profiles').select('… intimacy_data …')  // and blamed this
 *
 * The fix is to bound the window to the current statement. A line ending in a
 * semicolon closes what came before it, so anything earlier cannot be part of
 * the same expression.
 *
 * One implementation, because two gates asking the same question two ways is
 * how they drift apart and the weaker one wins.
 */

/** Response-building calls, as they are written in this codebase. */
const RESPONSE = /(?:JSON\.stringify|new Response\(|return json\(|[^a-zA-Z]json\(|res\.(?:status\(\d+\)\.)?json\()/;

/**
 * Is the line at `index` part of an expression that builds a response?
 *
 * Looks back only as far as the end of the previous statement, so an earlier
 * `return json(...)` on its own line cannot implicate a later one.
 */
export function insideResponse(lines, index) {
  const collected = [];
  for (let i = index; i >= 0 && index - i < 40; i--) {
    const line = lines[i];
    collected.unshift(line);
    if (i < index) {
      // A completed statement above us. Nothing before it is in scope.
      const trimmed = line.trim();
      if (trimmed.endsWith(';') || trimmed === '' ) break;
    }
  }
  return RESPONSE.test(collected.join('\n'));
}

/**
 * Does this file hold a profile row containing `column`?
 *
 * Naming the column is the obvious way. The other way is selecting it through
 * EXERCISE_COLUMNS, which is derived from api/_exercises.js and is how
 * /api/home selects every answer column at once. That file contains no literal
 * "conflict_data" anywhere, so a gate filtering on the literal skipped it
 * entirely, while the row it holds carries both private columns.
 *
 * The indirection is correct: deriving the list is what stops it going stale.
 * It just means a scanner cannot filter on the literal alone.
 */
export function holdsColumn(text, column, registryColumns = []) {
  if (text.includes(column)) return true;
  return registryColumns.includes(column) && /\bEXERCISE_COLUMNS\b/.test(text);
}

/** A comment line, which never ships a value anywhere. */
export function isComment(line) {
  return /^\s*(\/\/|\*|\/\*)/.test(line);
}

/** Row variables: the ones that hold a whole profile or answers record. */
const ROW_VAR = /^(me|partner|profile|row|data|self|rec|record|them|other)$/;

/** A property read whose key is computed, so the column name is not written. */
const COMPUTED_READ = /\b([A-Za-z_$][\w$]*)\s*\??\.?\s*\[\s*[A-Za-z_$][^\]]*\]/g;

/**
 * Is this line reading a column off a row without naming it?
 *
 * `partner?.[col]` inside a loop over EXERCISE_COLUMNS reads conflict_data and
 * contains no string a search can find. That is the whole point of deriving the
 * column list, and it is also how a leak becomes invisible to a scanner.
 *
 * Returns the row variable being indexed, or null.
 */
export function computedColumnRead(line) {
  if (isComment(line)) return null;
  for (const m of line.matchAll(COMPUTED_READ)) {
    if (ROW_VAR.test(m[1])) return m[1];
  }
  return null;
}

/**
 * Names that were filled from a computed read off a row.
 *
 * `for (const col of EXERCISE_COLUMNS) theirAnswers[col] = partner?.[col]`
 * builds `theirAnswers` out of every answer column including conflict_data.
 * The name of the column appears nowhere, so putting `theirAnswers` in a
 * response leaks it past any check looking for the literal.
 *
 * Two shapes, both of them declarations:
 *
 *   const x = <anything indexing a row by computed key>
 *   const x = {} ... x[k] = row[k]          (the accumulator)
 *
 * ── WHY ONLY DECLARATIONS ─────────────────────────────────────────────────
 * The first version tracked any assignment, and flagged five lines of
 * api/admin-data.js. `p` there is an arrow-function parameter, bound half a
 * dozen times in unrelated scopes, and one of those did index a row. Matching
 * on the bare name across a whole file cannot tell those apart.
 *
 * Requiring a declaration is what makes the name mean one thing. A leak still
 * has to declare its accumulator somewhere, so nothing real is given up.
 */
export function namesBuiltFromRow(lines) {
  const built = new Map();
  const empties = new Map();     // name -> line, declared as {} or []

  lines.forEach((line, i) => {
    if (isComment(line)) return;

    const decl = line.match(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(.*)$/);
    if (decl) {
      const [, name, rhs] = decl;
      if (/^\s*(\{\s*\}|\[\s*\])\s*;?\s*$/.test(rhs)) { empties.set(name, i + 1); return; }
      if (computedColumnRead(rhs) && !built.has(name)) built.set(name, i + 1);
      return;
    }

    // The accumulator being filled: x[k] = row[k], or x.push(row[k]).
    const fill = line.match(/\b([A-Za-z_$][\w$]*)\s*(?:\[[^\]]*\]\s*=|\.push\()/);
    if (fill && empties.has(fill[1]) && computedColumnRead(line) && !built.has(fill[1])) {
      built.set(fill[1], empties.get(fill[1]));
    }
  });
  return built;
}

/** A whole row spread into an object, which names no column at all. */
const ROW_SPREAD = /^\s*\.\.\.(?:data|profile|row|me|partner|self|them|other|rec|record)\b/;

/**
 * Every way `column` can reach a response from this file.
 *
 * ── WHY BOTH PRIVACY GATES CALL THIS ──────────────────────────────────────
 * They ask the same question about two different columns, and they had drifted
 * into asking it differently. check-partner-privacy knew about a spread of the
 * whole row; check-intimacy-privacy did not, and a `...partner` in a response
 * passed it. Neither knew about a column reached through EXERCISE_COLUMNS,
 * which is how both of them are reached everywhere else in this codebase.
 *
 * That last one is the failure CLAUDE.md describes and records as closed. It
 * was closed for deciding which FILES to scan: holdsColumn resolves the
 * registry, so api/home.js is no longer skipped. It was never closed for
 * deciding what counts as putting the column in a response. Planting this in
 * api/home.js
 *
 *   const theirAnswers = {};
 *   for (const col of EXERCISE_COLUMNS) theirAnswers[col] = partner?.[col];
 *   return json({ theirAnswers, ... });
 *
 * sent one partner every answer the other had given, conflict patterns
 * included, past all six privacy and response gates.
 *
 * So there is one implementation and both gates call it. Two gates asking one
 * question two ways is how the weaker one ends up being the one that still
 * passes.
 *
 * Returns `{ line, why, text }` for each leak, or an empty array.
 */
export function responseLeaks(lines, column) {
  const built = namesBuiltFromRow(lines);
  const out = [];

  lines.forEach((line, i) => {
    if (isComment(line)) return;
    if (!insideResponse(lines, i)) return;
    const text = line.trim().slice(0, 90);

    if (line.includes(column)) {
      out.push({ line: i + 1, why: `${column} put into a response`, text });
      return;
    }
    if (ROW_SPREAD.test(line)) {
      out.push({ line: i + 1, why: `a row spread into a response carries ${column}`, text });
      return;
    }
    const rowVar = computedColumnRead(line);
    if (rowVar) {
      out.push({
        line: i + 1,
        why: `a column read off \`${rowVar}\` by computed key, in a response; the name is never written`,
        text,
      });
      return;
    }
    for (const [name, at] of built) {
      if (!new RegExp(`\\b${name}\\b`).test(line)) continue;
      out.push({
        line: i + 1,
        why: `\`${name}\` was filled from a row by computed key at line ${at}, and reaches a response`,
        text,
      });
      return;
    }
  });

  return out;
}
