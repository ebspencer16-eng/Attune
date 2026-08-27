// Paste this whole block into the browser console on attune-relationships.com,
// in the window that is showing the wrong state, AFTER signing in.
// It reads only. It changes nothing.
//
// It answers the one question the database cannot: is the app holding cached
// answers, or is it reading them from the server, or is it substituting demo
// data because it thinks nobody is signed in?

(() => {
  const g = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const j = (k) => { try { return JSON.parse(g(k) || 'null'); } catch { return 'UNPARSEABLE'; } };
  const n = (v) => (v && typeof v === 'object') ? Object.keys(v).length : (v == null ? 0 : 1);

  const account = j('attune_account');
  const ps = j('attune_partner_session');
  const ex1 = j('attune_ex1');

  const out = {
    // Who the app thinks you are. If signedIn is false, everything below is
    // sample data and the fix is simply to sign in.
    signedIn: !!account,
    accountEmail: account && (account.email || '(no email on the cached account)'),
    accountId: account && account.id,

    // Your own answers, as cached on this device.
    // ex1_cached should be 0 after the reset. If it is 54 you are looking at a
    // browser that never cleared, and this is not an incognito window.
    ex1_cached: n(ex1),
    ex1_partnerView_cached: ex1 ? Object.keys(ex1).filter(k => k.startsWith('pv_')).length : 0,
    ex1_progress_cached: n(j('attune_ex1_progress')?.answers),
    ex2_cached: n(j('attune_ex2')),
    ex3_cached: n(j('attune_ex3')),

    // The partner. partnerSession_present should be false after the reset.
    // If it is true, a stale session is being read and the partner will show
    // as complete regardless of the database.
    partnerSession_present: !!ps,
    partnerSession_name: ps && ps.name,
    partnerSession_ex1: n(ps && ps.ex1),

    // Every Attune key on this device. In a genuinely fresh incognito window
    // after one sign-in, expect attune_account and little else.
    allKeys: Object.keys(localStorage).filter(k => k.startsWith('attune_')).sort(),

    url: location.href,
  };
  console.table(out);
  console.log(JSON.stringify(out, null, 2));
  return out;
})();
