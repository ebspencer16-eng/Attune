#!/usr/bin/env node
/**
 * check-deletion-complete: an account is not deleted while data that names
 * the person is still there.
 *
 * supabase-js returns errors rather than throwing them, so the try around
 * each removal in api/delete-account.js never caught one. A failed order
 * delete, workbook removal or feedback update reported zero, the deletion
 * went on, and deleting the account then nulled the owner on what was left:
 * a name, an email and an address that nothing could find again, after the
 * person asked for them to go (A202). Driven against the file before the fix,
 * all five points below reported success and deleted the account.
 *
 * RUNS the handler with the network stubbed under supabase-js, failing one
 * point at a time, and asks the network what happened: whether the account
 * delete was sent, and whether the partner's row was touched.
 */
process.env.SUPABASE_URL = 'https://db.test'; process.env.SUPABASE_SERVICE_KEY = 'k';
const UID = '11111111-1111-4111-8111-111111111111';
const { default: handler } = await import('../api/delete-account.js');
async function run(label, fail) {
  const calls = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    const method = (init.method || (typeof input !== 'string' && input.method) || 'GET').toUpperCase();
    const path = url.replace('https://db.test', '');
    calls.push(`${method} ${path.split('?')[0]}`);
    const j = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json', 'content-range': '0-0/1' } });
    if (path.startsWith('/auth/v1/user')) return j({ id: UID, email: 'x@example.com', identities: [{ provider: 'google' }] });
    if (fail(method, path)) return j({ message: 'planted failure', code: 'XX000' }, 500);
    if (path.startsWith('/auth/v1/admin/users')) return j({});
    if (path.startsWith('/storage/v1/object/list')) return j([{ name: 'wb.pdf' }]);
    if (path.startsWith('/storage/v1/object')) return j([]);
    if (path.startsWith('/rest/v1/orders') && method === 'GET') return j([{ order_num: 'ATT-1' }]);
    if (path.startsWith('/rest/v1/profiles') && method === 'GET') return j([{ id: UID, name: 'X', email: 'x@example.com' }]);
    return j([]);
  };
  const warn = console.warn, error = console.error; console.warn = () => {}; console.error = () => {};
  const r = await handler(new Request('https://www.attune-relationships.com/api/delete-account', { method: 'POST', headers: { authorization: 'Bearer t', 'content-type': 'application/json' }, body: JSON.stringify({ userId: UID }) }));
  console.warn = warn; console.error = error;
  const deletedUser = calls.some((c) => c.startsWith('DELETE /auth/v1/admin/users'));
  const unlinked = calls.some((c) => c.startsWith('PATCH /rest/v1/profiles'));
  return { label, status: r.status, deletedUser, unlinked };
}
const fails = [];
const fine = await run('nothing fails', () => false);
if (fine.status !== 200 || !fine.deletedUser) fails.push(`with nothing failing the account was not deleted (${fine.status}); the driver has lost the happy path, so its other answers mean nothing`);
const POINTS = [
  ['the orders delete', (m, p) => m === 'DELETE' && p.startsWith('/rest/v1/orders')],
  ['the read of their orders, which finds the workbooks', (m, p) => m === 'GET' && p.startsWith('/rest/v1/orders')],
  ['listing a workbook folder', (m, p) => p.startsWith('/storage/v1/object/list')],
  ['removing the workbook files', (m, p) => m === 'DELETE' && p.startsWith('/storage/v1/object/workbooks')],
  ['taking their address off feedback', (m, p) => m === 'PATCH' && p.startsWith('/rest/v1/feedback_submissions')],
  ['removing their refunded orders', (m, p) => m === 'DELETE' && p.startsWith('/rest/v1/refunded_orders')],
];
for (const [what, fail] of POINTS) {
  const r = await run(what, fail);
  if (r.deletedUser) fails.push(`when ${what} fails, the account is deleted anyway and that data is left behind with no owner (${r.status})`);
  else if (r.status < 500) fails.push(`when ${what} fails, the reply is ${r.status}, which the app and site read as something other than "try again"`);
  if (r.unlinked) fails.push(`when ${what} fails, the partner is still told their partner deleted their account`);
}
if (fails.length) {
  console.error('[check-deletion-complete] ' + fails.length + ' problem(s):');
  for (const x of fails) console.error('  ' + x);
  process.exit(1);
}
console.log(`[check-deletion-complete] /api/delete-account driven with ${POINTS.length} failure points, one at a time: each stops it before the account or the partner is touched, and with none it deletes.`);
