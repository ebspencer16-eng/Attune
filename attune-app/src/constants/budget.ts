/**
 * The budget's arithmetic, mirroring api/_budget.js.
 *
 * ── WHY A MIRROR AND NOT AN ENDPOINT ──────────────────────────────────────
 * Every other number in this product arrives already worked out, because
 * CLAUDE.md says the app never scores anything and means it: two scorers
 * drifting apart is how this product starts lying to couples about their
 * relationship.
 *
 * This is not that. It is a calculator over numbers the reader typed in, with
 * no claim about them in it. It also cannot sit behind an endpoint: the
 * reveal updates as you type, and a round trip per keystroke is not a budget
 * tool.
 *
 * So it follows the pattern already used for the website's copy of the
 * scoring engine. One implementation is the server's, this is the mirror, and
 * check-budget-mirror.mjs runs both over the same fixtures and fails the build
 * if a single number differs. Change one of these files and the build tells
 * you about the other.
 *
 * The categories, the models and the words all arrive from the server. Only
 * the arithmetic is repeated here, because only the arithmetic has to be.
 */

export type BudgetState = {
  incomes?: Record<string, string>;
  pooling?: string;
  expenses?: Record<string, string>;
  personal?: Record<string, string>;
  goals?: { id?: string; name?: string; target?: string; months?: string }[];
};

export type BudgetCategory = {
  id: string; label: string; icon?: string; group: string; items: string[];
};

/** Parse a currency-like string. Tolerates "1,500", "$1500", "1500.50". */
export function bNum(v: unknown): number {
  return parseFloat(String(v ?? '').replace(/[^0-9.-]/g, '')) || 0;
}

/** Format a number as currency for display. */
export function bFmt(n: number): string {
  const num = Math.round(Math.abs(n));
  return `$${num.toLocaleString()}`;
}

export type Reveal = ReturnType<typeof computeReveal>;

export function computeReveal(
  state: BudgetState,
  categories: BudgetCategory[],
  userName: string,
  partnerName: string,
) {
  const uIncome = bNum(state.incomes?.[userName]);
  const pIncome = bNum(state.incomes?.[partnerName]);
  const totalIncome = uIncome + pIncome;

  const catSums: Record<string, number> = {};
  categories.forEach((cat) => {
    catSums[cat.id] = cat.items.reduce(
      (s, item) => s + bNum(state.expenses?.[`${cat.id}__${item}`]), 0);
  });
  const sharedExpenses = Object.values(catSums).reduce((s, n) => s + n, 0);

  const uPersonal = bNum(state.personal?.[userName]);
  const pPersonal = bNum(state.personal?.[partnerName]);

  const goalsMonthly = (state.goals || []).reduce((s, g) => {
    const t = bNum(g.target);
    const m = bNum(g.months);
    return s + (m > 0 ? t / m : 0);
  }, 0);

  const totalAllocated = sharedExpenses + uPersonal + pPersonal + goalsMonthly;
  const surplus = totalIncome - totalAllocated;

  const savingsSpend = (catSums.savings || 0) + goalsMonthly;
  const savingsRate = totalIncome > 0 ? (savingsSpend / totalIncome) * 100 : 0;

  const topCats = Object.entries(catSums)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, v]) => {
      const cat = categories.find((x) => x.id === id);
      return { label: cat?.label || id, amount: v, pct: totalIncome > 0 ? (v / totalIncome) * 100 : 0 };
    });

  const pooling = state.pooling || 'proportional';
  let uContribution = 0; let pContribution = 0; let uLeftover = 0; let pLeftover = 0;
  const sharedPlusGoals = sharedExpenses + goalsMonthly;
  if (pooling === 'combined') {
    uContribution = uIncome; pContribution = pIncome;
    uLeftover = 0; pLeftover = 0;
  } else if (pooling === 'proportional') {
    if (totalIncome > 0) {
      uContribution = (uIncome / totalIncome) * sharedPlusGoals;
      pContribution = sharedPlusGoals - uContribution;
    }
    uLeftover = uIncome - uContribution - uPersonal;
    pLeftover = pIncome - pContribution - pPersonal;
  } else if (pooling === 'fifty_fifty') {
    uContribution = sharedPlusGoals / 2;
    pContribution = sharedPlusGoals / 2;
    uLeftover = uIncome - uContribution - uPersonal;
    pLeftover = pIncome - pContribution - pPersonal;
  }

  return {
    uIncome, pIncome, totalIncome,
    sharedExpenses, uPersonal, pPersonal, goalsMonthly,
    totalAllocated, surplus,
    savingsRate, savingsSpend,
    topCats,
    pooling,
    uContribution, pContribution, uLeftover, pLeftover,
    catSums,
  };
}
