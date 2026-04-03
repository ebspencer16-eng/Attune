/**
 * GET /api/stripe-config
 * Returns the Stripe publishable key (safe to expose to frontend).
 */
export const config = { runtime: 'edge' };

export default function handler(req) {
  const pk = process.env.STRIPE_PUBLISHABLE_KEY || '';
  return new Response(JSON.stringify({ publishableKey: pk }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
