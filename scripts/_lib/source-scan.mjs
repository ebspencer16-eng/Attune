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
