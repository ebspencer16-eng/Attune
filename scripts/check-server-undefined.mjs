#!/usr/bin/env node
/**
 * A name read in a server file has to be a name something declares.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * No file under api/ or public/ reads an identifier that nothing in the file
 * declares, imports, or receives as a parameter, and that is not a runtime
 * global. Every module here is strict, so reading an undeclared name is a
 * ReferenceError at the moment that line runs, not a warning.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * api/send-order-email.js built the order receipt from an explicit line-item
 * list, with a fallback that rebuilds the list from the add-on flags when the
 * list is missing. Three of those flags, addonChecklist, addonIntimacy and
 * addonConflict, were read in the fallback and never added to the function's
 * parameter list or to the call. So any order arriving without line items
 * threw ReferenceError inside the template, the handler answered
 * FUNCTION_INVOCATION_FAILED, and checkout.html catches that and calls it
 * "non-blocking": the buyer would have been charged and sent nothing at all,
 * no receipt and no setup link.
 *
 * Nothing caught it. It is not a syntax error, so `node --check` passes. The
 * branch never runs from checkout, which always sends line items, so no test
 * and no smoke run reaches it. It was found by POSTing an empty body at the
 * deployed endpoint and reading the 500.
 *
 * ── HOW IT IS CHECKED ─────────────────────────────────────────────────────
 * Babel parses the file and resolves scopes, and the program scope's set of
 * unresolved references is exactly this question asked properly. That is real
 * scope analysis, not a grep: a name declared in an inner block is bound, a
 * name shadowed is bound, a name only ever assigned is not.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Not src/. That is JSX compiled by Vite, which fails the build on the same
 * mistake, so it is already gated by something louder.
 *
 * Not the temporal dead zone, not shadowing, not a name that exists but holds
 * the wrong thing. A declared name is accepted here whatever it holds.
 *
 * The globals list below is what these files may lean on without declaring.
 * Adding to it is a decision: a name that belongs there is one the runtime
 * really provides. If a typo is ever "fixed" by adding it to this list, the
 * gate has been turned off rather than satisfied.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';

const traverse = _traverse.default || _traverse;
const ROOT = new URL('..', import.meta.url).pathname;

/** Names the runtime provides. Anything else has to be declared in the file. */
const GLOBALS = new Set([
  // language
  'globalThis', 'undefined', 'NaN', 'Infinity', 'Object', 'Array', 'String',
  'Number', 'Boolean', 'Symbol', 'BigInt', 'Math', 'JSON', 'Date', 'RegExp',
  'Map', 'Set', 'WeakMap', 'WeakSet', 'Promise', 'Proxy', 'Reflect', 'Error',
  'TypeError', 'RangeError', 'SyntaxError', 'ReferenceError', 'EvalError',
  'URIError', 'AggregateError', 'Function', 'Intl', 'parseInt', 'parseFloat',
  'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent', 'encodeURI',
  'decodeURI', 'structuredClone', 'queueMicrotask', 'escape', 'unescape',
  // both runtimes
  'console', 'fetch', 'Request', 'Response', 'Headers', 'URL', 'URLSearchParams',
  'AbortController', 'AbortSignal', 'TextEncoder', 'TextDecoder', 'Blob', 'File',
  'FormData', 'ReadableStream', 'WritableStream', 'TransformStream', 'crypto',
  'atob', 'btoa', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'Uint8Array', 'Uint16Array', 'Uint32Array', 'Int8Array', 'Int16Array',
  'Int32Array', 'Float32Array', 'Float64Array', 'ArrayBuffer', 'DataView',
  'performance', 'Event', 'EventTarget', 'CustomEvent',
  // node
  'process', 'Buffer', 'require', 'module', 'exports', '__dirname', '__filename',
  'setImmediate',
  // service worker: public/sw.js runs in a worker, not a page
  'caches', 'clients', 'skipWaiting', 'registration', 'importScripts',
  // browser, for public/
  'window', 'document', 'navigator', 'location', 'history', 'localStorage',
  'sessionStorage', 'alert', 'confirm', 'prompt', 'getComputedStyle', 'Image',
  'Option', 'Node', 'Element', 'HTMLElement', 'MutationObserver', 'Chart',
  'IntersectionObserver', 'ResizeObserver', 'requestAnimationFrame',
  'cancelAnimationFrame', 'matchMedia', 'screen', 'frames', 'parent', 'top',
  'self', 'XMLHttpRequest', 'WebSocket', 'CSS', 'DOMParser', 'Stripe',
  'supabase', 'Supabase', 'html2canvas', 'jspdf', 'gtag', 'dataLayer',
]);

function jsFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) jsFiles(full, out);
    else if (name.endsWith('.js') || name.endsWith('.mjs')) out.push(full);
  }
  return out;
}

const files = [
  ...jsFiles(join(ROOT, 'api')),
  ...jsFiles(join(ROOT, 'public')),
];

const problems = [];
let scanned = 0;

for (const file of files) {
  const code = readFileSync(file, 'utf8');
  let ast;
  try {
    ast = parse(code, {
      sourceType: 'unambiguous',
      allowReturnOutsideFunction: true,
      errorRecovery: false,
      plugins: ['topLevelAwait'],
    });
  } catch (err) {
    problems.push(`${file.replace(ROOT, '')}: will not parse. ${err.message}`);
    continue;
  }
  scanned++;

  traverse(ast, {
    Program(path) {
      for (const [name, node] of Object.entries(path.scope.globals)) {
        if (GLOBALS.has(name)) continue;
        const line = node.loc ? node.loc.start.line : '?';
        problems.push(
          `${file.replace(ROOT, '')}:${line}: reads \`${name}\`, which nothing declares. ` +
          `In a module this throws ReferenceError the moment the line runs.`
        );
      }
      path.stop();
    },
  });
}

if (problems.length) {
  console.error('[check-server-undefined] a server file reads a name nothing declares:\n');
  for (const p of problems) console.error('  ' + p);
  console.error(`\n${problems.length} in ${scanned} files. Declare it, pass it in, or, if the`);
  console.error('runtime really does provide it, add it to GLOBALS in this file and say why.');
  process.exit(1);
}

console.log(`[check-server-undefined] ${scanned} files under api/ and public/ read no undeclared names.`);
