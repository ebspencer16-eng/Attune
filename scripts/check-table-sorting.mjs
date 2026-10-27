/**
 * Sorting a date column puts the dates in order.
 *
 * ── THE BUG THIS ENCODES ──────────────────────────────────────────────────
 * Ellie: "Just sorted the order column by date and it seems wrong."
 *
 * It was. The Date column's sort key returns a Date OBJECT, and `typeof` a
 * Date is 'object', so the comparator fell past its numeric branch and
 * compared String(date) with localeCompare: "Fri Oct 02 2026..." against
 * "Mon Sep 28 2026...". That orders by the WEEKDAY NAME, alphabetically.
 * The first five rows came back Oct 2, Oct 9, Oct 16, Oct 23, Sep 18: seven
 * day steps, which is every Friday, then every Monday.
 *
 * Every row was in a strict, stable, repeatable order, which is why it read
 * as a problem with the data rather than with the sort.
 *
 * ── WHY IT DRIVES THE TABLE ───────────────────────────────────────────────
 * The comparator can be read as correct and still do this: the mistake is one
 * `typeof` against a value whose type is not what it looks like. So this
 * clicks the header the way a reader does and reads the column back.
 *
 * It runs scripts/probe-admin.mjs rather than standing up a second admin: a
 * fixture that mirrors an existing one is a second version of a rule.
 */
import { execFileSync } from 'node:child_process';

const fail = [];
let report = null;
try {
  const out = execFileSync('node', ['scripts/probe-admin.mjs', 'orders'], {
    env: { ...process.env, SORTPROBE: 'orders-table:1' },
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 180000,
  });
  const line = out.split('\n').find((l) => l.includes('sort orders-table:1:'));
  if (!line) fail.push('the order table did not report its sort; this gate has lost its subject');
  else report = JSON.parse(line.slice(line.indexOf('{')));
} catch (e) {
  fail.push('could not drive the admin: ' + String(e.message).split('\n')[0]);
}

if (report) {
  if (report.err) fail.push(report.err);
  else {
    if (!report.n || report.n < 4) fail.push(`only ${report.n} rows in the table; too few to tell an order from an accident`);
    const asc = (report.asc || []).map((d) => Date.parse(d));
    if (asc.some((t) => Number.isNaN(t))) fail.push(`a date cell did not parse: ${JSON.stringify(report.asc)}`);
    else {
      for (let i = 1; i < asc.length; i++) {
        if (asc[i] < asc[i - 1]) {
          fail.push(`sorting by date gave ${JSON.stringify(report.asc)}, which is not in order. `
            + 'A Date is an object, so a comparator testing typeof for a number falls through to comparing the '
            + 'printed string, which orders by weekday name.');
          break;
        }
      }
    }
    /* The other direction, because a comparator can be right one way and
       ignore its direction flag the other. */
    const desc = (report.descFirst || []).map((d) => Date.parse(d));
    if (desc.length === 2 && desc[0] < desc[1]) fail.push(`clicking twice gave ${JSON.stringify(report.descFirst)}, which is still ascending`);
    if (desc.length === 2 && asc.length && desc[0] < asc[asc.length - 1]) {
      fail.push('the descending first row is earlier than the ascending last row, so the two directions disagree');
    }
  }
}

if (fail.length) {
  console.error('check-table-sorting FAILED');
  for (const f of fail) console.error('  - ' + f);
  process.exit(1);
}
console.log(`[check-table-sorting] the order table's date column sorts ${report.n} rows into date order and reverses, `
  + `first five ${report.asc.join(', ')}.`);
