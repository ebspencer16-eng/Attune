/**
 * Every environment variable the server reads. GENERATED: do not edit.
 *
 * Written by scripts/build-env-inventory.mjs, held current by
 * check-env-inventory.mjs. /api/admin-env reports which of these have a value
 * in the running deployment, and never reports a value.
 *
 * Ellie: "I want to make sure there aren't other empty en vars in my vercel."
 * Vercel shows an empty box for any variable marked Sensitive, whether or not
 * it has a value, so the screen cannot answer that question and the server can.
 */

export const ENV_VARS = [
  { name: "ADMIN_API_KEY", required: false, readBy: ["api/generate-workbook.js","api/save-exercise.js","api/store-workbook-pdf.js","api/store-workbook.js"] },
  { name: "ADMIN_EMAILS", required: false, readBy: ["api/_lib/admins.js"] },
  { name: "ADMIN_EMAIL_HASH", required: false, readBy: ["api/admin-login.js"] },
  { name: "ADMIN_PASSWORD_HASH", required: false, readBy: ["api/admin-login.js"] },
  { name: "ADMIN_SECRET", required: true, readBy: ["api/_lib/admin-auth.js","api/admin-login.js"], note: "The admin sign-in." },
  { name: "ANTHROPIC_API_KEY", required: false, readBy: ["api/cron-feedback-synthesis.js"] },
  { name: "ATTUNE_PHYSICAL_ENABLED", required: false, readBy: ["api/create-payment-intent.js"] },
  { name: "BROWSERLESS_TOKEN", required: false, readBy: ["api/generate-pdf.js","api/store-workbook.js"], note: "Optional. Without it the workbook prints in the browser instead." },
  { name: "CONSENT_PEPPER", required: false, readBy: ["api/_lib/consent.js"] },
  { name: "CRON_SECRET", required: false, readBy: ["api/cron-beta-digest.js","api/cron-checkin.js","api/cron-feedback-synthesis.js","api/cron-prune-events.js"] },
  { name: "DIGEST_TO", required: false, readBy: ["api/cron-beta-digest.js","api/cron-feedback-synthesis.js"] },
  { name: "FROM_EMAIL", required: false, readBy: ["api/cron-beta-digest.js","api/cron-checkin.js","api/cron-feedback-synthesis.js","api/cron-survey-nudge.js"] },
  { name: "INTERNAL_API_SECRET", required: false, readBy: ["api/_lib/origin.js","api/generate-workbook-promo.js"] },
  { name: "KV_REST_API_TOKEN", required: false, readBy: ["api/admin-csv.js","api/get-feedback.js","api/send-feedback.js","api/track-type.js"] },
  { name: "KV_REST_API_URL", required: false, readBy: ["api/admin-csv.js","api/get-feedback.js","api/send-feedback.js","api/track-type.js"] },
  { name: "RESEND_API_KEY", required: true, readBy: ["api/cron-beta-digest.js","api/cron-checkin.js","api/cron-feedback-synthesis.js","api/cron-survey-nudge.js"], note: "Without it, no email is sent at all." },
  { name: "RESEND_AUDIENCE_ID", required: false, readBy: ["api/join-waitlist.js"] },
  { name: "RESEND_SEGMENT_ID", required: false, readBy: ["api/join-waitlist.js"] },
  { name: "SENTRY_DSN", required: false, readBy: ["api/_lib/sentry-edge.js"] },
  { name: "SITE_URL", required: false, readBy: ["api/_lib/site.js"] },
  { name: "STRIPE_PUBLISHABLE_KEY", required: false, readBy: ["api/stripe-config.js"] },
  { name: "STRIPE_SECRET_KEY", required: true, readBy: ["api/calculate-tax.js","api/create-payment-intent.js","api/stripe-webhook.js"] },
  { name: "STRIPE_WEBHOOK_SECRET", required: true, readBy: ["api/stripe-webhook.js"], note: "Without it, paid orders are never recorded." },
  { name: "SUPABASE_ANON_KEY", required: true, readBy: ["api/account-signup.js","api/admin-config.js","api/claim-order.js","api/conflict-results.js"] },
  { name: "SUPABASE_SERVICE_KEY", required: true, readBy: ["api/_lib/consent.js","api/_lib/notifications.js","api/admin-actions.js","api/admin-csv.js"], alsoAccepts: ["SUPABASE_SERVICE_ROLE_KEY","SUPABASE_SERVICE_ROLE"], note: "The server's own database key. Everything needs it." },
  { name: "SUPABASE_URL", required: true, readBy: ["api/_lib/consent.js","api/_lib/notifications.js","api/account-signup.js","api/admin-actions.js"] },
  { name: "SUPPORT_EMAIL", required: false, readBy: ["api/send-feedback.js"] },
  { name: "VERCEL_GIT_COMMIT_SHA", required: false, readBy: ["api/_lib/sentry-edge.js"] },
  { name: "VITE_SENTRY_DSN", required: false, readBy: ["api/_lib/sentry-edge.js"] },
  { name: "VITE_SUPABASE_ANON_KEY", required: false, readBy: ["api/account-signup.js","api/admin-config.js","api/claim-order.js","api/conflict-results.js"] },
  { name: "VITE_SUPABASE_URL", required: false, readBy: ["api/_lib/notifications.js","api/account-signup.js","api/admin-config.js","api/admin-posts.js"] },
  { name: "WORKBOOK_SERVICE_SECRET", required: true, readBy: ["api/store-workbook-pdf.js"], note: "The password that service asks for." },
  { name: "WORKBOOK_SERVICE_URL", required: true, readBy: ["api/store-workbook-pdf.js"], note: "The PDF builder on Render. Without it the workbook fails instantly." },
];

export const REQUIRED_ENV = ENV_VARS.filter((v) => v.required).map((v) => v.name);
