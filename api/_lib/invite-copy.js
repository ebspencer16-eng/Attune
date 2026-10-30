/**
 * The words on the "invite your partner" form, on the website's Account page
 * and in the app's Settings (A206). One copy: the website imports this, and
 * the app is sent it by GET /api/invite-partner, so the two cannot say
 * different things.
 *
 * Placeholders of mine, listed for Ellie under A206 in TASKS.md. `{partner}`
 * is the partner's name, or "your partner".
 */
export const INVITE_COPY = {
  heading: 'Invite your partner',
  line: 'Send {partner} their invitation so you can each start your exercises.',
  placeholder: 'partner@example.com',
  label: "Your partner's email",
  button: 'Send invitation',
  sending: 'Sending…',
  sent: 'Invitation sent to {email}.',
  failed: 'That did not go through. Check the address and try again.',
  soon: 'An invitation was just sent. Try again in a few minutes.',
};

/** A line with its name filled in. */
export const inviteLine = (key, { partner, email } = {}) =>
  INVITE_COPY[key].replace('{partner}', partner || 'your partner').replace('{email}', email || '');
