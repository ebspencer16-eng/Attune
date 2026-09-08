/**
 * Which identity providers Attune offers, in the order they are shown.
 *
 * One list, because the rule is not "we support Google" but "we support these
 * together". App Store Review Guideline 4.8 requires Sign in with Apple
 * wherever a third-party login is offered, so a surface that ships Google
 * alone is a rejected build, and the way that happens is someone adding a
 * provider to one screen and not the other.
 *
 * Labels only. What each button looks like belongs to the surface drawing it.
 */
export const OAUTH_PROVIDERS = [
  { id: 'google', label: 'Google' },
  { id: 'apple', label: 'Apple' },
];

export const OAUTH_PROVIDER_IDS = OAUTH_PROVIDERS.map((p) => p.id);

/** True for a provider Attune actually offers. Everything else is email. */
export const isOAuthProvider = (id) => OAUTH_PROVIDER_IDS.includes(id);
