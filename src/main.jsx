import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.jsx'

// ── Sentry error tracking ────────────────────────────────────────────────
// Initialize only in production builds so dev errors don't pollute issue
// tracker and rate-limit the free tier. DSN is passed via Vite env var so
// it can be rotated without a code change.
if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: 'production',
    // Light performance sampling — catches slow pages but doesn't blow
    // through the free tier's 10K transactions/month.
    tracesSampleRate: 0.1,
    // No session replays for routine sessions — privacy-sensitive content
    // in exercises. Only replay when an error fires, and sample down.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.25,
    // Strip URL query params + form fields that might contain PII before
    // sending to Sentry. Names/emails in exercise answers stay client-side.
    beforeSend(event) {
      try {
        if (event.request?.url) {
          // Remove query params entirely — may contain invite codes or emails
          event.request.url = event.request.url.split('?')[0];
        }
        if (event.request?.headers) {
          delete event.request.headers.Authorization;
          delete event.request.headers.Cookie;
        }
        // Scrub breadcrumb inputs
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.map(b => {
            if (b.data?.url) b.data.url = b.data.url.split('?')[0];
            return b;
          });
        }
      } catch {}
      return event;
    },
    // Ignore noisy errors that don't reflect real problems
    ignoreErrors: [
      // Browser extensions and crawlers that inject scripts
      /ResizeObserver loop/,
      /Non-Error promise rejection captured/,
      // Chrome extensions
      /chrome-extension:\/\//,
      /safari-extension:\/\//,
      // Network errors that aren't actionable
      /NetworkError when attempting to fetch resource/,
      /Failed to fetch/,
    ],
  });
}

// Use Sentry's ErrorBoundary so any React render error is captured AND
// shows a user-friendly fallback instead of a blank screen.
const FallbackUI = () => (
  <div style={{ padding: '3rem 1.5rem', textAlign: 'center', fontFamily: 'system-ui, sans-serif', maxWidth: 480, margin: '0 auto' }}>
    <h2 style={{ fontSize: '1.4rem', marginBottom: '0.75rem', color: '#0E0B07' }}>Something went wrong.</h2>
    <p style={{ fontSize: '0.9rem', color: '#8C7A68', marginBottom: '1.5rem', lineHeight: 1.6 }}>
      We've been notified. Try refreshing the page — your progress is saved.
    </p>
    <button onClick={() => window.location.reload()}
      style={{ background: 'linear-gradient(135deg,#E8673A,#1B5FE8)', color: 'white', border: 'none', padding: '0.7rem 1.6rem', fontSize: '0.8rem', fontWeight: 600, borderRadius: 10, cursor: 'pointer' }}>
      Refresh the page
    </button>
  </div>
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<FallbackUI />} showDialog={false}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
