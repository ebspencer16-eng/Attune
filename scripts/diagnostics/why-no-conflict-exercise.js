// Paste into the browser console on attune-relationships.com while signed in.
// Read-only. Changes nothing.
//
// I have fixed three separate things and none of them made the exercise
// appear, which means my model of where it is failing is wrong. This reports
// the actual state at each step so the break is visible rather than guessed.

(() => {
  const j = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return 'UNPARSEABLE'; } };
  const order = j('attune_order');
  const account = j('attune_account');

  const out = {
    // STEP 1: did the grant reach this browser at all?
    // The whole UI reads pkg.hasConflict, which is !!(order.addonConflict).
    // If this is false or undefined, nothing downstream can work regardless of
    // what the database says.
    order_addonConflict: order ? order.addonConflict : '(no attune_order)',
    order_addonIntimacy: order ? order.addonIntimacy : '(no attune_order)',
    order_pkg: order ? order.pkg : null,
    order_num: order ? order.orderNum : null,

    // STEP 2: is the entitlement actually granted server-side for THIS account?
    // If step 1 is false but this is true, the grant is fine and the client is
    // not picking it up. If both are false, the SQL did not take effect for
    // this email.
    signedInAs: account ? account.email : '(not signed in)',
    accountId: account ? account.id : null,

    // STEP 3: which build is running? If this is missing, the deploy carrying
    // the fixes has not reached this browser and everything above is moot.
    buildHasConflictTile: typeof document !== 'undefined'
      && document.documentElement.innerHTML.includes('How You Fight'),

    // STEP 4: what does the dashboard actually show? The tiles live in the
    // exercises list, so if you are on a different view they will not be there
    // even when everything else is correct.
    currentUrl: location.href,

    allAttuneKeys: Object.keys(localStorage).filter(k => k.startsWith('attune_')).sort(),
  };

  console.table(out);
  console.log(JSON.stringify(out, null, 2));

  // Also try the direct route, which bypasses the dashboard entirely.
  console.log('Direct route test: open /app?view=conflict — if the exercise loads there but no tile appears, the entitlement is fine and only the tile placement is wrong. If it redirects to the dashboard, pkg.hasConflict is false.');
  return out;
})();
