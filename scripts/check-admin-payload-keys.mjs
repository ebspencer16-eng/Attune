/**
 * Every key the admin reads off /api/admin-data is a key that endpoint sets.
 *
 * ── THE BUG THIS ENCODES ──────────────────────────────────────────────────
 * Seven renderers in public/admin.html read `data.inheritance`,
 * `data.intimacyStats`, `data.reflectionCodes`, `data.conflictCodes`,
 * `data.repairRank`, `data.expCoupleDistances` and `data.alignedBand` off the
 * top level of the payload. api/admin-data.js builds all seven inside
 * buildResponseAggregates, so it sends them one level down, under `responses`.
 * Every one of those tiles drew its empty state. Ellie reported it seven times
 * in a single message as missing data, and the figures had never once shown.
 *
 * Nothing could see it. The server was right, the client was right about the
 * name, and reading either file alone finds nothing wrong: `data.inheritance`
 * is a perfectly ordinary member read and `inheritance,` is a perfectly
 * ordinary key. Only the pair is wrong. That is this codebase's whole failure
 * mode, one rule in two places with nothing checking they agree, and the two
 * places here are a producer and a consumer rather than two producers.
 *
 * scripts/probe-admin.mjs made it worse rather than catching it: its stub put
 * those keys at the TOP level, so the harness rendered all seven tiles while
 * production rendered none. A stub is a claim about the server's shape, and a
 * wrong one reports a broken feature as working.
 *
 * ── WHAT THIS DELIBERATELY DOES NOT COVER ─────────────────────────────────
 * Only the top level, and only literal member reads. A key reached through a
 * variable (`data[name]`) is invisible here, which is the cost of matching a
 * name, and this file says so rather than implying coverage it has not got.
 * It also says nothing about VALUES: a key that is set and always null passes.
 * The one thing it promises is that a name the client reads is a name the
 * server writes.
 *
 * A spread in either object literal is reported as a failure, not skipped,
 * because an unresolvable key set is not evidence that the keys agree.
 */
import { readFileSync } from 'node:fs';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
const traverse = _traverse.default || _traverse;

const fail = [];
const note = (m) => fail.push(m);

/* ── THE SERVER'S TWO KEY SETS ─────────────────────────────────────────── */
const serverSrc = readFileSync('api/admin-data.js', 'utf8');
const serverAst = parse(serverSrc, { sourceType: 'module', plugins: ['objectRestSpread'] });

/** Top-level keys of an ObjectExpression, or null if a spread makes it unknowable. */
function keysOf(obj) {
  const out = new Set();
  for (const prop of obj.properties) {
    if (prop.type === 'SpreadElement') return null;
    const k = prop.key;
    if (!k) return null;
    out.add(k.type === 'Identifier' ? k.name : String(k.value));
  }
  return out;
}

let payloadKeys = null;       // what json({...}) sends
let responseKeys = null;      // what buildResponseAggregates returns
traverse(serverAst, {
  CallExpression(path) {
    const { callee, arguments: args } = path.node;
    if (callee.type !== 'Identifier' || callee.name !== 'json') return;
    if (!args.length || args[0].type !== 'ObjectExpression') return;
    const keys = keysOf(args[0]);
    /* The one response that carries the whole dataset, identified by the two
       keys only it has rather than by being the largest or the last. */
    if (keys && keys.has('responses') && keys.has('responsesBySegment')) payloadKeys = keys;
  },
  FunctionDeclaration(path) {
    if (path.node.id?.name !== 'buildResponseAggregates') return;
    path.traverse({
      ReturnStatement(r) {
        if (r.getFunctionParent()?.node !== path.node) return;   // not a nested function's return
        if (r.node.argument?.type === 'ObjectExpression') responseKeys = keysOf(r.node.argument);
      },
    });
  },
});

if (!payloadKeys) note('could not find the json({ ok, responses, responsesBySegment, ... }) response in api/admin-data.js, or a spread in it made its keys unknowable');
if (!responseKeys) note('could not find the object buildResponseAggregates returns in api/admin-data.js, or a spread in it made its keys unknowable');

/* ── WHAT THE ADMIN READS ──────────────────────────────────────────────── */
const adminSrc = readFileSync('public/admin.html', 'utf8');
const scripts = [...adminSrc.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
if (!scripts.length) note('no inline <script> found in public/admin.html');

/* Both reads are checked, against their own side's key set:
     const data = await fetchAdminData();  data.X          -> the payload
     respOf(data).X                                        -> the responses bundle
   Anything else is out of scope and says so in the header. */
let topReads = 0;
let respReads = 0;
for (const [i, code] of scripts.entries()) {
  let ast;
  try {
    ast = parse(code, { sourceType: 'script', allowReturnOutsideFunction: true });
  } catch (e) {
    note(`script block ${i + 1} of public/admin.html did not parse: ${e.message}`);
    continue;
  }
  /* ── THE BINDING, NOT THE NAME ───────────────────────────────────────
     The first version of this collected the NAMES assigned from
     fetchAdminData and then flagged every `d.x` and `data.x` in the file.
     `d` and `data` are ordinary parameter names in this file: a date, a row,
     a chart datum, a reply from a different endpoint. It reported 69
     findings, every one of them fine, including `d.getMonth` on a Date.

     Matching a name instead of the thing it is bound to, which is the same
     family as `[^'"]*alignment.js` being satisfied by `comm-alignment.js`.
     A gate that matches too much is not the safe direction: it gets loosened
     until it matches nothing, or it manufactures its own evidence.

     So resolve the identifier to its binding and ask whether THAT declarator
     is the one initialised from fetchAdminData(). A shadowing parameter in a
     callback resolves to the parameter and is correctly ignored. */
  /* Aliases are followed. `const p = data; p.inheritance` is the shape a
     tidy-up produces, and the first version of this gate passed that plant:
     it checked the identifier's own declarator and stopped. Hoisting a value
     onto a name one line earlier is on this file's own list of the four forms
     to plant every time, and it is the one that got through. Depth-capped so
     a circular initialiser cannot spin. */
  const fromFetch = (binding, depth = 0) => {
    if (depth > 6) return false;
    const d = binding?.path;
    if (d?.node?.type !== 'VariableDeclarator' || !d.node.init) return false;
    const init = d.node.init;
    const inner = init.type === 'AwaitExpression' ? init.argument : init;
    if (inner?.type === 'Identifier') return fromFetch(d.scope.getBinding(inner.name), depth + 1);
    return inner?.type === 'CallExpression' && inner.callee.type === 'Identifier'
      && inner.callee.name === 'fetchAdminData';
  };
  traverse(ast, {
    MemberExpression(path) {
      const { object, property, computed } = path.node;
      if (computed || property.type !== 'Identifier') return;   // data[x] is out of scope, per the header
      const key = property.name;
      /* respOf(data).X — a read of the responses bundle. */
      if (object.type === 'CallExpression' && object.callee.type === 'Identifier'
          && object.callee.name === 'respOf') {
        respReads++;
        if (responseKeys && !responseKeys.has(key)) {
          note(`public/admin.html reads respOf(...).${key}, which buildResponseAggregates does not return`
            + (payloadKeys?.has(key) ? ` (the payload carries it at the top level: read data.${key})` : ''));
        }
        return;
      }
      if (object.type !== 'Identifier') return;
      if (!fromFetch(path.scope.getBinding(object.name))) return;
      topReads++;
      if (payloadKeys && !payloadKeys.has(key)) {
        note(`public/admin.html reads ${object.name}.${key} off the payload, which api/admin-data.js does not send`
          + (responseKeys?.has(key) ? ` — it is inside the responses bundle, so read respOf(${object.name}).${key}` : ''));
      }
    },
  });
}

/* ── A GATE THAT HAS LOST ITS SUBJECT MUST NOT REPORT SUCCESS ──────────────
   This guard read `if (!topReads && !respReads)`, which is an AND over two
   independent halves, so renaming fetchAdminData took topReads to nought while
   respReads stayed at nine and the gate passed. Planted exactly that and
   watched it walk through: the top-level half had gone completely blind and
   the run still printed ok.

   Each half has its own subject and therefore its own guard. The figures are
   printed either way, so a run that quietly stops finding reads shows up as a
   number dropping rather than as a pass. */
if (!topReads) note('found no identifier bound from fetchAdminData(), so the top-level half of this gate read nothing and proved nothing');
if (!respReads) note('found no respOf(...) reads, so the responses-bundle half of this gate read nothing and proved nothing');

if (fail.length) {
  console.error('check-admin-payload-keys FAILED');
  for (const f of fail) console.error('  - ' + f);
  process.exit(1);
}
console.log(`check-admin-payload-keys ok: ${topReads} top-level reads against ${payloadKeys.size} keys sent, `
  + `${respReads} responses-bundle reads against ${responseKeys.size} keys returned`);

