/* Sweep: a cents value shown to a customer, or a dollars value sent to Stripe.
   The two live in the same files under similar names. CLAUDE.md records the
   198/295 bug, where one endpoint priced a package in dollars and another in
   a different number entirely; this is the unit half of the same question. */
import { readdirSync, readFileSync, statSync } from 'node:fs';

const files = [];
function walk(d) {
  for (const e of readdirSync(d)) {
    const p = `${d}/${e}`;
    if (e === 'node_modules' || e.startsWith('.')) continue;
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(m?js|tsx?|jsx|html)$/.test(p)) files.push(p);
  }
}
['api', 'public', 'src'].forEach(walk);

const CENTSY = /\b([A-Za-z_$][\w$]*(?:Cents|_cents|InCents))\b/;
const shownRaw = [];
const sentDollars = [];
let centsNames = 0, stripeAmounts = 0;

for (const f of files) {
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((raw, i) => {
    const line = raw.replace(/\/\/.*$/, '');
    if (CENTSY.test(line)) centsNames++;

    /* A cents name interpolated straight into a currency string. `$${x}` with
       x in cents prints $12900 for a $129 order. */
    const m = line.match(/\$\$\{\s*([A-Za-z_$][\w$.]*)\s*\}|\$\{\s*([A-Za-z_$][\w$.]*)\s*\}\s*(?:USD|dollars)/);
    if (m) {
      const name = m[1] || m[2];
      if (/Cents|_cents|InCents/.test(name)) shownRaw.push([f, i + 1, raw.trim().slice(0, 95)]);
    }

    /* An amount handed to Stripe. Stripe takes integer minor units, so a
       name that is not cents and is not multiplied by 100 is a hundredfold
       underpayment. */
    const a = line.match(/\b(?:amount|unit_amount|amount_total|unit_amount_decimal)\s*:\s*([^,}\n]+)/);
    if (a) {
      stripeAmounts++;
      const expr = a[1].trim();
      let ok = /Cents|_cents|InCents|\*\s*100|Math\.round\(.*100\)|100\s*\*/.test(expr)
        || /^\d+$/.test(expr);        // a literal integer is already minor units

      /* ── THE CONVERSION IS USUALLY ON THE DEFINITION, NOT THE USE ─────
         `amount: wb` is correct when `wb` was built two lines earlier as
         `Math.round(workbookAmount(it) * 100 * ...)`. The first run of this
         sweep looked only at the amount's own line and called all nine of its
         findings unconverted; every one was fine. Same blind spot this
         codebase has written down about guards. */
      if (!ok) {
        const name = expr.match(/^([A-Za-z_$][\w$]*)/)?.[1];
        if (name) {
          const def = new RegExp(`(?:const|let|var)\\s+${name}\\s*=([^;\\n]*)`);
          const hit = lines.slice(0, i).reverse().find((l) => def.test(l));
          if (hit && /\*\s*100|100\s*\*|Cents/.test(def.exec(hit)[1])) ok = true;
        }
      }

      /* A key called `amount` is not always money bound for a processor: the
         budget tool, the admin's order list and a promo row all use it for an
         ordinary number. Only lines that also name a tax code or a currency
         are this sweep's subject. */
      if (!ok && !/tax_code|currency|unit_amount|stripe/i.test(raw)) ok = true;

      if (!ok) sentDollars.push([f, i + 1, raw.trim().slice(0, 95)]);
    }
  });
}

console.log(`files scanned: ${files.length}`);
console.log(`names carrying cents: ${centsNames}`);
console.log(`amounts handed to a processor: ${stripeAmounts}`);
console.log(shownRaw.length ? `\nCENTS SHOWN AS DOLLARS (${shownRaw.length}):` : '\nno cents value is printed as a dollar amount.');
for (const [f, l, t] of shownRaw) console.log(`  ${f}:${l}\n      ${t}`);
console.log(sentDollars.length ? `\nAMOUNT WITH NO CENTS CONVERSION (${sentDollars.length}):` : 'no processor amount is missing its conversion.');
for (const [f, l, t] of sentDollars) console.log(`  ${f}:${l}\n      ${t}`);
