/**
 * The three Communication domain pages: what each one is called, what it says,
 * and what colour it is painted.
 *
 * ── WHY THIS LEFT src/App.jsx ─────────────────────────────────────────────
 * These four facts were inline in the website's results component, which meant
 * the app could not have them. It had no intro paragraph on a domain page and
 * drew every one on the same cream ground, while the website opens each with a
 * paragraph on a ground tinted to that domain.
 *
 * The app was not choosing to look different. The words and the colour had
 * never been anywhere it could read them.
 *
 * `ground` is the gradient the website paints the page with, expressed as its
 * three stops so a native gradient can use the same numbers. `dark` is the
 * tint those stops are built from, kept because the website builds the string
 * from it.
 */

/** The tint each domain's page is painted with. */
const TINT = { inner: '#5B21B6', connection: '#C2410C', hard: '#1E3A8A' };

/** The three stops of a domain page's background, dark to light. */
export function groundFor(id) {
  const t = TINT[id] || TINT.inner;
  return [`${t}dd`, `${t}99`, '#22204a'];
}

export const COMM_DOMAINS = [
  {
    id: 'inner',
    label: 'Internal Processing',
    color: '#9B5DE5',
    dims: ['energy', 'expression', 'reassurance'],
    prose: "Internal processing focuses on how you handle feelings before sharing thoughts aloud. Whether energy, expression tendencies, or needs regarding reassurance are aligned or opposite, understanding each other's approaches helps you establish supportive communication methods.",
  },
  {
    id: 'connection',
    label: 'How You Connect',
    color: '#E8673A',
    dims: ['love', 'needs', 'bids', 'listening'],
    prose: "How you connect can be thought of as the mechanics of your relationship. The ways you make bids, show love, name needs, and listen define your relationship environment. Learn about each other's approaches to help you communicate love in a way that will be interpreted clearly.",
  },
  {
    id: 'hard',
    label: 'When Things Get Hard',
    color: '#1B5FE8',
    dims: ['conflict', 'repair', 'feedback'],
    prose: 'All couples navigate conflict. What sets healthy relationships apart is the ability to communicate effectively in hard situations. Understanding each other’s mindsets regarding conflict, repair, and feedback can help you each learn how to grow together and communicate under pressure.',
  },
];

/** Everything a renderer needs for one domain, ground included. */
export function commDomains() {
  return COMM_DOMAINS.map((d) => ({ ...d, ground: groundFor(d.id) }));
}
