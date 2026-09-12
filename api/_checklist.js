/**
 * The Starting Out checklist: what a couple has to actually do after a wedding.
 *
 * ── WHY THIS IS NOT IN src/App.jsx ────────────────────────────────────────
 * It was. Two hundred and eleven lines of it, which meant the app could not
 * read a word of it and the checklist could only ever exist on the website.
 * Ellie: "I want all of these to open in app if the user is in the app."
 *
 * Same shape as every other content module here: the words live under api/,
 * both surfaces import them, and neither can drift from the other.
 *
 * ── THE SHAPE ─────────────────────────────────────────────────────────────
 * Areas, each with an id, a label, a colour and an icon key, and items. An
 * item is { text, description?, links? }. `text` is the identity of an item:
 * progress is stored as `${area.id}__${item.text}`, so editing the words of an
 * item silently un-checks it for everyone who had ticked it. Changing an
 * item's text is a data migration, not a copy edit.
 *
 * ── THE STATE ─────────────────────────────────────────────────────────────
 * Each key is `true` (done), `'na'` (not applicable) or absent. Tapping cycles
 * through those three, which is why the page explains itself in a note.
 */

export const CHECKLIST_AREAS = [
  {
    id: "namechange", label: "Name Change", icon: "✍", color: "#1B5FE8",
    items: [
      {
        text: "Apply for updated Social Security card",
        description: "Start here. Most other name changes require your updated Social Security card first. File Form SS-5 with the Social Security Administration, in person or by mail, with your marriage certificate. This is free.",
        links: [
          { label: "SSA Form SS-5 (PDF)", url: "https://www.ssa.gov/forms/ss-5.pdf" },
          { label: "SSA: Change of name", url: "https://www.ssa.gov/personal-record/change-name" },
        ],
      },
      {
        text: "Update driver's license / state ID",
        description: "Once you have your new Social Security card, visit your state's DMV with your marriage certificate and current ID. Requirements and fees vary by state.",
        links: [
          { label: "usa.gov: change your name after marriage", url: "https://www.usa.gov/legally-change-name" },
        ],
      },
      {
        text: "Update passport (or apply if needed)",
        description: "If your passport was issued in the last year, you may qualify for a free update via Form DS-5504. Otherwise use Form DS-82 for renewals with a name change.",
        links: [
          { label: "Change passport name", url: "https://travel.state.gov/content/travel/en/passports/have-passport/change-of-name.html" },
        ],
      },
      {
        text: "Notify employer HR for payroll records",
        description: "Update your payroll name, direct deposit, and benefits enrollment. Do this before the end of the tax year so your W-2 reflects the correct name.",
      },
      {
        text: "Update bank and financial accounts",
        description: "Visit each bank with your new ID and marriage certificate. This cascades to linked credit cards, loans, and retirement accounts. Update brokerage and retirement beneficiaries while you're at it.",
      },
      {
        text: "Update voter registration",
        description: "Most states let you update voter registration online once your driver's license is updated.",
        links: [
          { label: "vote.gov", url: "https://vote.gov/" },
        ],
      },
      {
        text: "Notify key contacts and update accounts",
        description: "Let doctors, dentists, pharmacies, insurance, utilities, and other important accounts know. Low stakes individually, easy to forget.",
      },
      {
        text: "Update social media and professional profiles",
        description: "LinkedIn, email signature, professional website, personal social accounts. Optional but ties everything together.",
      },
    ],
  },
  {
    id: "finances", label: "Merging Finances", icon: "💳", color: "#E8673A",
    items: [
      {
        text: "Decide whether to combine finances, keep them separate, or do a hybrid approach",
        description: "This is the foundational decision. It shapes everything that follows, joint accounts, bill pay, savings goals, spending allowances. Attune's Build a Budget exercise walks you through this decision together.",
        links: [
          { label: "Attune Build a Budget exercise", url: "/app" },
        ],
      },
      {
        text: "Open a joint bank account",
        description: "If you're combining or going hybrid, open a joint checking and savings together. Bring both IDs and marriage certificate if recently changing names.",
      },
      {
        text: "Review and align on a monthly budget",
        description: "Use Attune's Build a Budget exercise to set shared categories and amounts. Revisit quarterly.",
        links: [
          { label: "Attune Build a Budget exercise", url: "/app" },
        ],
      },
      {
        text: "Set up automatic bill payment from joint account",
        description: "Rent/mortgage, utilities, subscriptions, insurance. Removes the month-to-month question of who's paying what.",
      },
      {
        text: "Update direct deposit allocations",
        description: "If you want money flowing into a joint account automatically, update your payroll direct deposit through your employer.",
      },
      {
        text: "Decide on individual spending allowances",
        description: "Most couples benefit from each person having some money that doesn't need to be discussed. Decide the amount and the cadence.",
      },
      {
        text: "Create an emergency fund goal together",
        description: "Typical target is 3–6 months of essential expenses in a high-yield savings account. Start with a smaller milestone ($1,000, then one month) if that feels more reachable.",
      },
    ],
  },
  {
    id: "insurance", label: "Insurance & Benefits", icon: "🛡", color: "#10b981",
    items: [
      {
        text: "Review and update health insurance plan",
        description: "Marriage is a qualifying life event. Most policies give you a 30-day window after the wedding to add a spouse or switch plans, contact your HR or insurer immediately. Compare both partners' plans to pick the better option.",
      },
      {
        text: "Update life insurance beneficiaries",
        description: "Check employer-provided and private life insurance policies. Old beneficiaries (parents, siblings, exes) don't update automatically.",
      },
      {
        text: "Update car insurance to joint policy",
        description: "Combining policies often drops per-person rates. Call both carriers, compare, and pick the better offer.",
      },
      {
        text: "Review home/renters insurance together",
        description: "Update the policy to list both names and revise coverage if you're combining households with more belongings.",
      },
      {
        text: "Update employer benefits forms",
        description: "HSA, FSA, 401(k), disability, emergency contact. Life event window applies here too.",
      },
    ],
  },
  {
    id: "estate", label: "Estate Basics", icon: "📋", color: "#F59E0B",
    items: [
      {
        text: "Create or update your will",
        description: "Simple wills are inexpensive and usually fine for young couples. Services like FreeWill or Trust & Will are popular; a local estate attorney is worth it if you have significant assets or complex family situations.",
        links: [
          { label: "FreeWill", url: "https://www.freewill.com/" },
        ],
      },
      {
        text: "Set up healthcare proxies / medical directives",
        description: "Names the person who makes medical decisions if you can't. Often bundled with a will, check what your state requires.",
      },
      {
        text: "Designate beneficiaries on retirement accounts",
        description: "401(k), IRA, pension. Retirement account beneficiaries override your will, update them directly with each institution.",
      },
      {
        text: "Consider a durable power of attorney",
        description: "Lets your spouse act on your behalf for financial and legal matters if you're incapacitated. Pairs with the healthcare proxy.",
      },
      {
        text: "Consider term life insurance",
        description: "If someone depends on your income, term life insurance protects them if something happens to you. 20–30 year policies are common and often affordable when you're young and healthy. Start with 10–12× your annual income as a rough rule.",
      },
      {
        text: "Store important documents in one place",
        description: "Marriage certificate, wills, insurance policies, deeds, account numbers. Tell your spouse where it is. A small fireproof safe or a shared encrypted folder both work.",
      },
    ],
  },
  {
    id: "taxes", label: "Taxes", icon: "🧾", color: "#8B5CF6",
    items: [
      {
        text: "Decide on tax filing status (MFJ vs MFS)",
        description: "Marriage any time in the year, even December 31, updates your filing status for the whole year. Most couples benefit from Married Filing Jointly, but there are edge cases (high medical expenses, income-based student loans) where Married Filing Separately wins.",
        links: [
          { label: "IRS: Filing status", url: "https://www.irs.gov/individuals/how-a-taxpayer-may-obtain-a-tax-filing-extension" },
        ],
      },
      {
        text: "Update W-4 withholding at work",
        description: "File a new W-4 with your employer. The IRS withholding estimator helps you choose an amount.",
        links: [
          { label: "IRS Tax Withholding Estimator", url: "https://www.irs.gov/individuals/tax-withholding-estimator" },
        ],
      },
      {
        text: "Plan for any marriage tax penalty or bonus",
        description: "Couples with similar incomes sometimes owe more combined than they would separately. Couples with very different incomes usually benefit.",
      },
      {
        text: "Start tracking deductible expenses",
        description: "Mortgage interest, charitable giving, HSA contributions. Decide if you're itemizing this year or taking the standard deduction.",
      },
      {
        text: "Discuss approach with a tax professional if needed",
        description: "Worth a one-time consult if you have business income, rental property, or significant investment income. Otherwise good tax software is usually fine.",
      },
    ],
  },
  {
    id: "home", label: "Household Setup", icon: "🏠", color: "#EC4899",
    items: [
      {
        text: "If moving in together or to a new place, update your address with USPS, the IRS, your bank, subscriptions, and employer",
        description: "USPS mail forwarding lasts 12 months, do this right after the move. File IRS Form 8822 separately (mail forwarding does not update your address with the IRS). Then update bank, employer, and recurring subscriptions.",
        links: [
          { label: "USPS Change of Address", url: "https://moversguide.usps.com/" },
          { label: "IRS Form 8822", url: "https://www.irs.gov/forms-pubs/about-form-8822" },
        ],
      },
      {
        text: "Consolidate or organize household subscriptions, including streaming subscriptions",
        description: "Cancel duplicates, swap to family plans where cheaper. Common overlaps: Netflix, Spotify, Disney+, Amazon, iCloud, cloud storage, gym memberships.",
      },
      {
        text: "Set up shared calendar for household tasks",
        description: "Google Calendar, iCloud, Notion, whichever you both already use. Recurring tasks (trash day, bill due dates) and one-offs (doctor visits, trips).",
      },
      {
        text: "Establish a system for shared errands",
        description: "Shared grocery list, chore rotation, whose turn for what. Low-tech works: a whiteboard on the fridge. High-tech works too: Todoist, Cozi, Tody.",
      },
      {
        text: "Inventory and organize important documents",
        description: "Birth certificates, passports, Social Security cards, marriage certificate, vehicle titles, tax returns. Stored somewhere both of you can find.",
      },
      {
        text: "Set up an emergency contact system",
        description: "Update each other's phones with emergency contact info. Share a list of key people (parents, close friends, doctors) with the other partner.",
      },
    ],
  },
];

/**
 * The words on the checklist page.
 *
 * Here for the same reason the areas are: they were inline in src/App.jsx, so
 * the app could not render the page without someone retyping them, and a
 * retyped sentence is a sentence that drifts. Ellie's, verbatim.
 *
 * `progress` is a pattern rather than a sentence because the two numbers are
 * computed per surface. Nothing else is assembled.
 */
export const CHECKLIST_COPY = {
  title: 'Starting Out Checklist',
  intro: "The real-world logistics of merging your lives. Tap the arrow next to each item for a bit more context. Check things off as you go, no rush, just a clear picture of what's done and what's next.",
  howItWorks: 'Tap a box once to mark it done. Tap again to mark it not applicable. Tap a third time to clear it.',
  progress: 'complete',
  notApplicable: '(not applicable)',
  areaDone: 'Done',
};
