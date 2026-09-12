/**
 * The Shared Budget tool: its categories, its models, and its arithmetic.
 *
 * ── WHY THIS IS NOT IN src/App.jsx ────────────────────────────────────────
 * It was, all of it, which meant the budget could only ever exist on the
 * website. Ellie: "I want all of these to open in app if the user is in the
 * app." Same move the checklist just made, for the same reason.
 *
 * ── THE ARITHMETIC, AND THE RULE ABOUT SCORING ────────────────────────────
 * CLAUDE.md says the app never scores anything, and means it: two scorers
 * drifting apart is how this product starts lying to couples about their
 * relationship.
 *
 * This is not that. computeReveal is a calculator over numbers the reader
 * typed in themselves, and there is no claim about them in it. It also cannot
 * live behind an endpoint the way results do: the reveal updates as you type,
 * and a round trip per keystroke is not a budget tool.
 *
 * So it follows the pattern this codebase already uses for the one other
 * thing in that position, the website's copy of the scoring engine: one
 * implementation here, a mirror in the app, and a gate that runs both over the
 * same fixtures and fails the build if a single number differs. See
 * check-budget-mirror.mjs.
 *
 * ── ITEM TEXT IS IDENTITY ─────────────────────────────────────────────────
 * An expense is stored as `${cat.id}__${item}`, so editing the words of a line
 * item silently empties that line for everyone who had filled it in. Changing
 * one is a data migration, not a copy edit.
 */

export const BUDGET_CATEGORIES = [
  { id: "housing",   label: "Housing",                      icon: "🏠", group: "essentials",
    items: ["Rent / Mortgage", "Utilities (electric, gas, water)", "Internet & phone", "Home insurance / renters insurance", "Home maintenance / repairs"] },
  { id: "transport", label: "Transportation",               icon: "🚗", group: "essentials",
    items: ["Car payment(s)", "Car insurance", "Gas", "Parking & tolls", "Public transit / rideshare"] },
  { id: "food",      label: "Food & Dining",                icon: "🍽", group: "essentials",
    items: ["Groceries", "Dining out", "Coffee & snacks", "Meal delivery services"] },
  { id: "health",    label: "Health & Wellness",            icon: "💊", group: "essentials",
    items: ["Health insurance premiums", "Gym / fitness", "Medical copays", "Prescriptions", "Mental health / therapy"] },
  { id: "debt",      label: "Debt Payments",                icon: "📊", group: "essentials",
    items: ["Student loans", "Credit card minimums", "Personal loans"] },
  { id: "savings",   label: "Regular savings & retirement", icon: "💰", group: "essentials",
    items: ["401(k) / employer retirement", "IRA contribution", "Emergency fund contribution", "Joint savings", "Individual savings"] },
  { id: "lifestyle", label: "Lifestyle & Fun",              icon: "✨", group: "discretionary",
    items: ["Streaming & subscriptions", "Hobbies & activities", "Vacations / travel fund", "Gifts & celebrations"] },
  { id: "giving",    label: "Giving & Charity",             icon: "🤲", group: "discretionary",
    items: ["Regular charitable donations", "Religious / tithing contributions", "One-time causes or fundraisers", "Community or family support"] },
];

// Pooling-model cards shown in the Orient section. Label + description read
// as plain statements; the math logic lives in the computeReveal function.
export const POOLING_MODELS = [
  { id: "combined",     label: "Fully combined",         desc: "All income into one pool. All expenses come from the pool." },
  { id: "proportional", label: "Proportional to income", desc: "Each of you contributes to shared expenses in proportion to your income." },
  { id: "fifty_fifty",  label: "50 / 50 split",          desc: "Each of you covers half of shared expenses regardless of income." },
  { id: "separate",     label: "Fully separate",         desc: "You each cover your own expenses. No shared calculation." },
];

// Parse a currency-like string to a number. Tolerates "1,500", "$1500", "1500.50".
export function bNum(v) { return parseFloat(String(v || "").replace(/[^0-9.-]/g, '')) || 0; }

// Format a number as currency for display.
export function bFmt(n) {
  const num = Math.round(Math.abs(n));
  return '$' + num.toLocaleString();
}

// Compute the reveal numbers from a budget state. Returns a flat object
// with all the facts needed — no commentary, no interpretation.
export function computeReveal(state, userName, partnerName) {
  const uIncome = bNum(state.incomes?.[userName]);
  const pIncome = bNum(state.incomes?.[partnerName]);
  const totalIncome = uIncome + pIncome;

  // Sum shared category expenses (everything except personal spending)
  const catSums = {};
  BUDGET_CATEGORIES.forEach(cat => {
    catSums[cat.id] = cat.items.reduce((s, item) =>
      s + bNum(state.expenses?.[cat.id + '__' + item]), 0);
  });
  const sharedExpenses = Object.values(catSums).reduce((s, n) => s + n, 0);

  // Personal spending is per-partner, not shared
  const uPersonal = bNum(state.personal?.[userName]);
  const pPersonal = bNum(state.personal?.[partnerName]);

  // Goals are treated as shared savings commitments
  const goalsMonthly = (state.goals || []).reduce((s, g) => {
    const t = bNum(g.target), m = bNum(g.months);
    return s + (m > 0 ? t / m : 0);
  }, 0);

  const totalAllocated = sharedExpenses + uPersonal + pPersonal + goalsMonthly;
  const surplus = totalIncome - totalAllocated;

  // Savings rate: regular savings contributions + goal contributions over income
  const savingsSpend = catSums.savings + goalsMonthly;
  const savingsRate = totalIncome > 0 ? (savingsSpend / totalIncome) * 100 : 0;

  // Top 3 categories by spend
  const topCats = Object.entries(catSums)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, v]) => {
      const cat = BUDGET_CATEGORIES.find(c => c.id === id);
      return { label: cat?.label || id, amount: v, pct: totalIncome > 0 ? (v / totalIncome) * 100 : 0 };
    });

  // Contribution math under each pooling model
  const pooling = state.pooling || 'proportional';
  let uContribution = 0, pContribution = 0, uLeftover = 0, pLeftover = 0;
  const sharedPlusGoals = sharedExpenses + goalsMonthly;
  if (pooling === 'combined') {
    // No separate contributions; report pool math instead.
    uContribution = uIncome; pContribution = pIncome;
    uLeftover = 0; pLeftover = 0;  // Not meaningful under this model
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
  // 'separate' — no contribution math

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

/**
 * The words on the budget page.
 *
 * Here for the same reason the categories are: they were inline in
 * src/App.jsx, so the app could not render the page without someone retyping
 * them. Ellie's, verbatim.
 *
 * The "sync across devices" line is not here. On the website it wraps around
 * the Save changes button mid-sentence, so it is not one string, and on a
 * phone it describes a button that does not exist because the app saves as
 * you type. A sentence that is only true on one surface belongs on that one.
 */
export const BUDGET_COPY = {
  title: 'Shared Budget Tool',
  intro: 'Build your real shared budget together. Your numbers stay yours, Attune is a calculator, not a financial advisor.',
  step1: 'Start with where you stand',
  step1Intro: 'Each of you enters your post-tax monthly take-home. Then pick the model that matches how you want to handle shared expenses.',
  incomeLabel: 'Post-tax monthly income',
  poolingLabel: "How you'll split shared expenses",
  essentials: 'Essentials',
  essentialsIntro: 'The things you pay every month to keep life running. Include regular savings and retirement contributions here.',
  discretionary: 'Discretionary',
  discretionaryIntro: 'Everything else. Personal spending at the bottom is split per partner. Your walking-around money.',
  personalLabel: 'Personal spending',
  goals: 'Savings goals',
  goalsIntro: "Add a goal and Attune will show the monthly contribution needed. Compare it against your surplus above to see what's realistic.",
  save: 'Save changes',
};
