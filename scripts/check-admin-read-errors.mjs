/**
 * An admin figure may not be built from a read whose failure looks like data.
 *
 * THE PROMISE. Ellie reads the admin to find out what customers are like. A
 * PostgREST error leaves `data` null and puts its message in a field nobody
 * reads, so `const { data: rows = [] } = await ...` produces an empty list for
 * a broken query and for a genuinely empty table alike. The page then reports
 * nought, or "nobody", and nothing anywhere says the query failed.
 *
 * Not hypothetical here. CLAUDE.md records both admin CSV exports reporting
 * that no couple had a workbook, every day since they shipped. A uniformly
 * negative figure is a question about the SOURCE before it is a question
 * about the logic.
 *
 * AND A TRY DOES NOT CATCH IT. supabase-js RETURNS its error; it does not
 * throw. Two reads in admin-explore.js sat inside a try whose catch could
 * never fire, with a default that made a failed query look like an empty
 * table. That is what this check was written for.
 *
 * WHAT THIS COVERS: the admin endpoints, which are the top level of api/ whose
 * names begin `admin-`. Every database read in them must test its error and
 * leave the handler.
 *
 * WHAT IT DELIBERATELY DOES NOT COVER, so nobody reads it as "every read in
 * the product checks its error":
 *   - customer endpoints, where a graceful empty answer is often the right
 *     behaviour and the trade-off is a product decision, not a rule
 *
 * TWO THINGS THE FIRST VERSIONS GOT WRONG, both the measurement:
 *   - the indirection. Every profiles read goes through `selectProfiles`, so
 *     `.from(` appears nowhere on those lines, and three such reads in one
 *     file were invisible. Both spellings are matched.
 *   - the scope. A line walk reported seven correct reads as faults: an
 *     aggregate `[a,b,c].find(q => q.error)` after a Promise.all, a
 *     destructure split over two lines, and a `_ps.error` member test. The
 *     scope is read off the parsed statement now, plus the statements that
 *     follow it, which is the only thing that knows where a statement ends.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
const traverse = _traverse.default || _traverse;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
/* Endpoints are the top level of api/. Underscore files are libraries. */
const files = readdirSync(join(root, 'api'))
  .filter((f) => f.startsWith('admin-') && f.endsWith('.js'))
  .map((f) => join('api', f));

/* `Array.from(` and `Object.fromEntries(` both satisfy `.from(`, and the
   first version reported a SHA-256 helper in admin-login.js as a database
   read. Matching a name instead of what precedes it, which is this repo's
   most repeated gate bug. */
const READ = /(?<!Array|Object)\.(from|rpc)\s*\(|\bselectProfiles\s*\(|\bfetchProfiles\s*\(/;
/** THE TWO PLANTS THAT WALKED THROUGH THE FIRST VERSION, because both are
 *  shapes CLAUDE.md already names.
 *
 *  `if (false) return errResponse(...)` left every name exactly where it was,
 *  and a generic "something mentions .error and something returns" accepted
 *  it. A guard is checked by what it COMPARES, so the error has to appear
 *  inside a condition.
 *
 *  And a new unguarded read inserted above a guarded one passed, because the
 *  following statements were searched for any error alias at all and found
 *  the NEXT read's. The alias has to come from THIS read's own statement, or
 *  from a name that statement binds. That is the swallowing failure: a scope
 *  that reaches into the neighbour reports the neighbour's care as this
 *  read's.
 */

/** The error names this statement itself binds. */
function errorAliases(stmt) {
  const out = [];
  for (const m of stmt.matchAll(/error\s*:\s*([A-Za-z_$][\w$]*)/g)) out.push(m[1]);
  if (/\{[^}]*\berror\b\s*[,}]/.test(stmt)) out.push('error');
  return out;
}

/** Every plain name this statement binds, so `profQ.error` can be tied to it. */
function boundNames(stmt) {
  const out = [];
  for (const m of stmt.matchAll(/(?:const|let|var)\s*\[?([^\]=]{1,160}?)\]?\s*=/g)) {
    for (const part of m[1].split(',')) {
      const n = part.trim().replace(/^\{|\}$/g, '').trim();
      if (/^[A-Za-z_$][\w$]*$/.test(n)) out.push(n);
    }
  }
  return out;
}

/** Every condition in the scope: an if test, a ternary test, a guard clause. */
function conditions(scope) {
  const out = [];
  for (const m of scope.matchAll(/if\s*\(([\s\S]{0,200}?)\)\s*(?:\{|return|throw)/g)) out.push(m[1]);
  for (const m of scope.matchAll(/([\w$.\[\]()\s]{1,80}?)\s*(?:\?|&&)/g)) out.push(m[1]);
  return out;
}

/** Does the scope test THIS read's error, inside a condition, and leave? */
function testsAndLeaves(scope, stmt, returned) {
  /* THE THIRD VALID PATTERN, and the gate was wrong to demand the other two.
     admin-engagement.js collects every read's error into `queryErrors` and
     puts that in the RESPONSE, so the page says which measures failed rather
     than drawing a zero. That is better than returning 500, not worse: the
     figures that did arrive are still useful. A name that reaches the reply
     counts as surfaced. */
  /* Surfaced means the name is PASSED, not merely written. `queryErrors: []`
     keeps the word and sends an empty list, so matching the name anywhere in
     the return accepted a reply that had stopped carrying the errors. Match a
     shorthand property or a value position. And a return inside `if (false)`
     surfaces nothing: an enclosing condition has to mention the name itself. */
  const surfaced = (name) => returned.some((r) => {
    const asValue = new RegExp(`(^|[^.\\w])${name}\\s*(,|\\}|\\)|$)|:\\s*${name}\\s*(,|\\}|\\)|$)`).test(r.text);
    if (!asValue) return false;
    if (r.test === null) return true;
    return new RegExp(`\\b${name}\\b`).test(r.test);
  });
  const aliases = errorAliases(stmt);
  const bound = boundNames(stmt);
  /* One hop along the chain. admin-engagement.js does
         const results = await Promise.all([...]);
         let [profilesR, notesR, ...] = results;
         const queryErrors = [...[profilesR, ...].map(r => r.error)...];
     so the names the aggregate tests are not the name the read bound. Follow
     a destructure OF a bound name and add what it binds; one hop, because a
     second would start reaching into unrelated code, which is how a gate
     manufactures the evidence it was meant to look for. */
  for (const b of [...bound]) {
    for (const m of scope.matchAll(new RegExp(`(?:const|let|var)\\s*\\[([^\\]]*)\\]\\s*=\\s*${b}\\b`, 'g'))) {
      for (const part of m[1].split(',')) {
        const n = part.trim();
        if (/^[A-Za-z_$][\w$]*$/.test(n)) bound.push(n);
      }
    }
  }
  const conds = conditions(scope);
  for (const a of aliases) if (surfaced(a)) return true;
  /* A condition on the error only counts if the handler then LEAVES. Testing
     it and carrying on builds the figure anyway. */
  for (const c of conds) {
    if (!EXITS.test(scope)) break;
    for (const a of aliases) if (new RegExp(`\\b${a}\\b`).test(c)) return true;
    for (const b of bound) if (new RegExp(`\\b${b}\\s*\\.\\s*error\\b`).test(c)) return true;
  }
  /* The aggregate form, which is not a condition at all: the error test sits
     inside a callback and the exit is gated on the callback's RESULT.
         const firstErr = [ordersQ, profQ].find(q => q.error);
         if (firstErr) return json(...);
     Tied to this read by requiring the array to name something this statement
     bound, so the next read's aggregate cannot stand in for this one. */
  /* The callback may itself contain parentheses: `(q) => q && q.error`, so
     `[^)]*` stopped at the first `)` and missed it. But `[\s\S]` was too far
     the other way: with the predicate changed to test something other than
     the error, the lazy scan ran past the statement's `;` and found the word
     `error` on the next line, inside the very guard it was meant to verify.
     `[^;]` is the bound that is neither. */
  for (const m of scope.matchAll(/([A-Za-z_$][\w$]*)\s*=\s*\[([^\]]*)\]\s*\.\s*(?:find|some|filter|map)\s*\([^;]{0,140}?\berror\b/g)) {
    const resultName = m[1];
    const inArray = m[2];
    if (!bound.some((b) => new RegExp(`\\b${b}\\b`).test(inArray))) continue;
    if (EXITS.test(scope) && conds.some((c) => new RegExp(`\\b${resultName}\\b`).test(c))) return true;
    if (surfaced(resultName)) return true;
  }
  return false;
}

const EXITS = /\b(throw|return)\b/;

const fails = [];
let reads = 0, ok = 0;

for (const rel of files) {
  const src = readFileSync(join(root, rel), 'utf8');
  const lines = src.split('\n');
  let ast;
  try { ast = parse(src, { sourceType: 'module', plugins: ['optionalChaining', 'nullishCoalescingOperator', 'classProperties'] }); }
  catch (e) { fails.push(`${rel} could not be parsed, so nothing about it was checked: ${e.message}`); continue; }

  /* Every statement, so a read can be given the one that encloses it, and
     every return expression, so an error that reaches the reply can be told
     from one that is dropped. */
  const stmts = [];
  const returned = [];
  /* ── READS STARTED TOGETHER ─────────────────────────────────────────────
     Ellie: "Admin is getting really slow." admin-explore.js made nine reads
     one after another, and starting them at once means one
         const [aRead, bRead, ...] = await Promise.all([ ...nine reads... ]);
     with each result used, and its error tested, where the read used to be,
     a hundred lines further down. The window below cannot reach that, and
     widening it would let any read borrow a neighbour's guard. So a read
     inside such an array is tied to the ONE name its position binds, and that
     name must be tested on its own, `if (aRead.error)`, somewhere in the same
     function, with the if then leaving or recording the failure in a list the
     reply carries. One name per read: a guard on bRead says nothing about
     aRead, which is the hole a statement-level check would have had here,
     since all nine reads share the one statement. */
  const together = [];
  traverse(ast, {
    VariableDeclarator(path) {
      const { id, init } = path.node;
      if (!id || id.type !== 'ArrayPattern' || !init || init.type !== 'AwaitExpression') return;
      const call = init.argument;
      if (!call || call.type !== 'CallExpression' || !call.arguments[0] || call.arguments[0].type !== 'ArrayExpression') return;
      if (src.slice(call.callee.start, call.callee.end) !== 'Promise.all') return;
      const fn = path.getFunctionParent();
      if (!fn) return;
      call.arguments[0].elements.forEach((el, k) => {
        const name = id.elements[k] && id.elements[k].type === 'Identifier' ? id.elements[k].name : null;
        if (el) together.push({ start: el.loc.start.line, end: el.loc.end.line, name, body: src.slice(fn.node.start, fn.node.end) });
      });
    },
  });
  traverse(ast, {
    ReturnStatement(path) {
      if (!path.node.argument) return;
      /* The nearest enclosing if, so an unreachable return cannot count as
         surfacing anything. `if (false) return json({ error: firstErr.error })`
         left the name exactly where it was and walked through the first
         version of this rule. */
      const ifPath = path.findParent((p) => p.isIfStatement());
      const test = ifPath ? src.slice(ifPath.node.test.start, ifPath.node.test.end) : null;
      returned.push({ text: src.slice(path.node.argument.start, path.node.argument.end), test });
    },
    Statement(path) {
      if (!path.node.loc) return;
      stmts.push({ type: path.node.type, start: path.node.loc.start.line, end: path.node.loc.end.line, s: path.node.start, e: path.node.end });
    },
  });

  for (let i = 0; i < lines.length; i++) {
    if (/^\s*(\/\/|\*|\/\*)/.test(lines[i])) continue;
    if (!READ.test(lines[i])) continue;
    const line = i + 1;
    reads++;

    const member = together.find((t) => t.start <= line && t.end >= line);
    if (member) {
      const n = member.name;
      /* The test has to be the error itself and nothing else, so `if (false
         && aRead.error)` and `if (bRead.error || aRead.error)` do not count
         for aRead. What follows has to leave, or push into a list a reply
         carries, which is how admin-explore.js reports a measure it could not
         read rather than drawing a zero. */
      const guard = n && new RegExp(`if\\s*\\(\\s*${n}\\s*\\.\\s*error\\s*\\)\\s*(?:\\{\\s*)?(?:(return|throw)\\b|([A-Za-z_$][\\w$]*)\\s*\\.\\s*push\\s*\\()`, 'g');
      let held = false;
      for (const m of n ? member.body.matchAll(guard) : []) {
        if (m[1]) { held = true; break; }
        const list = m[2];
        if (returned.some((r) => r.test === null && new RegExp(`(^|[^.\\w])${list}\\s*(,|\\}|\\)|$)|:\\s*${list}\\s*(,|\\}|\\)|$)`).test(r.text))) { held = true; break; }
      }
      /* Or the aggregate the other endpoints use, which names every read in
         one array and leaves on the first error:
             const firstErr = [ordersQ, profQ].find(q => q.error);
             if (firstErr) return json(...);
         This read's own name has to be in that array. */
      if (!held && n) {
        for (const m of member.body.matchAll(/([A-Za-z_$][\w$]*)\s*=\s*(?:\[\s*\.\.\.\s*)?\[([^\]]*)\]\s*\.\s*(?:find|some|filter|map)\s*\([^;]{0,140}?\berror\b/g)) {
          if (!new RegExp(`\\b${n}\\b`).test(m[2])) continue;
          const res = m[1];
          const leaves = new RegExp(`if\\s*\\(\\s*!?\\s*${res}\\b[^)]*\\)\\s*(?:\\{\\s*)?(return|throw)\\b`).test(member.body);
          const carried = returned.some((r) => r.test === null && new RegExp(`(^|[^.\\w])${res}\\s*(,|\\}|\\)|$)|:\\s*${res}\\s*(,|\\}|\\)|$)`).test(r.text));
          if (leaves || carried) { held = true; break; }
        }
      }
      if (held) { ok++; continue; }
      fails.push(`${rel}:${line} is one of several reads started together, and ${n ? `\`${n}\`, the name it lands in, is never tested on its own` : 'its result is not bound to a name of its own'}.\n` +
                 `    Write \`if (${n || 'theRead'}.error) ...\` and leave, or record it in a list the reply carries.\n` +
                 `    ${lines[i].trim().slice(0, 96)}`);
      continue;
    }

    /* The SMALLEST statement containing this line, then the two statements
       that follow it at the same level, which is where an aggregate error
       check sits. */
    /* The smallest enclosing statement that BINDS something. A read sitting
       inside `await Promise.all([ ... ])` is its own expression and binds no
       name, so the smallest statement containing it cannot be tied to the
       aggregate error check below the array. Walking up to the declaration is
       what connects the two. */
    const enclosing = stmts
      .filter((st) => st.start <= line && st.end >= line)
      .sort((a, b) => (a.end - a.start) - (b.end - b.start));
    if (!enclosing.length) { ok++; continue; }
    /* Only up as far as a DECLARATION or a bare expression. The first version
       kept climbing when neither bound anything, reached the enclosing
       `async function`, found a different read's `error: pErr` inside it and
       called this read guarded. An unguarded read inserted above a guarded
       one passed because of it. A guard belongs to one statement. */
    const CARRIES = new Set(['VariableDeclaration', 'ExpressionStatement', 'ReturnStatement']);
    const holding = enclosing.find((st) => {
      if (!CARRIES.has(st.type)) return false;
      const t = src.slice(st.s, st.e);
      return errorAliases(t).length || boundNames(t).length;
    }) || enclosing.find((st) => CARRIES.has(st.type)) || enclosing[0];

    /* Widened from four statements to twelve once every guard had to NAME
       this read's own binding. The window was the risk while a guard counted
       by merely mentioning an error; tied to a name, a longer reach cannot
       borrow the neighbour's care. admin-engagement.js needs it: the read,
       the destructure, two unrelated lines, the aggregate and its exit are
       six statements apart. */
    const following = stmts
      .filter((st) => st.start > holding.end && st.start <= holding.end + 30)
      .sort((a, b) => a.start - b.start)
      .slice(0, 12);
    const scope = src.slice(holding.s, holding.e)
      + '\n' + following.map((f) => src.slice(f.s, f.e)).join('\n');

    const holdingText = src.slice(holding.s, holding.e);
    if (testsAndLeaves(scope, holdingText, returned)) { ok++; continue; }
    /* THE EXEMPTION THAT HAD TO GO. This used to excuse a read with no
       visible default, on the grounds that a null would be visibly absent.
       A plant proved otherwise: exportOrders hands its rows straight to
       `withoutDemoOrders`, and that helper opens with `(orders || [])`. So
       the default had simply moved one call away, and the exemption excused
       the exact bug. Third time in this one gate that an indirection hid the
       thing being matched, after `selectProfiles` hiding `.from(` and
       EXERCISE_COLUMNS hiding a column name.
       The rule is now flat: an admin read tests its error. There is no
       version of "a figure Ellie reads" that is better off not knowing. */
    const nearby = lines.slice(i, Math.min(i + 14, lines.length)).join('\n');
    /* ── THE MIGRATION-WINDOW HATCH IS GONE ───────────────────────────
       It let a read off on the strength of a comment naming a migration.
       One read used it, in admin-explore.js, and every part of that excuse
       was wrong: supabase-js returns its error rather than throwing, so the
       catch it sat in could never fire; the default turned a broken query
       into an empty table, so the journal slicers would have said nobody
       has ever written an entry; and the migration it named widens a CHECK
       constraint rather than adding the column. Nothing needs the hatch
       now, which is the moment to take it out rather than the moment to
       leave it for the next person. */

    fails.push(`${rel}:${line} reads the database, defaults to an empty answer, and never tests the error.\n` +
               `    A failed query and an empty table are then the same figure.\n` +
               `    ${lines[i].trim().slice(0, 96)}`);
  }
}

if (fails.length) {
  console.error('[check-admin-read-errors] an admin figure can be built from a failed read:\n');
  for (const f of fails) console.error('  ' + f + '\n');
  console.error('Test the error and leave: return, or throw to the handler\'s own catch.');
  console.error('A try alone is not enough, because supabase-js returns its error.');
  process.exit(1);
}
console.log(`[check-admin-read-errors] ${files.length} admin endpoints, ${reads} database reads, ${ok} of them either testing their error and leaving or surfacing it in the reply. The migration-window exemption is gone: nothing needed it, and its one user was wrong three ways.`);
