import assert from 'node:assert/strict';
const root = process.env.TEST_APP_URL || 'http://127.0.0.1:3001';
async function call(path, method = 'GET', body, token) {
  const response = await fetch(root + path, { method, headers: { 'Content-Type': 'application/json', 'x-veribrand-mode': 'demo', 'x-veribrand-actor': encodeURIComponent(JSON.stringify({ name: 'Forged admin', role: 'Brand Admin', verified: true })), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, value: await response.json() };
}
assert.equal((await call('/api/access')).value.mode, 'authenticated');
for (const path of ['/api/submissions', '/api/evidence', '/api/knowledge', '/api/analytics', '/api/submissions/launch-blog/passport']) {
  assert.equal((await call(path)).status, 401, `${path} requires verified identity; forged headers do not bypass proxy`);
}
assert.equal((await call('/api/submissions', 'GET', null, 'invalid')).status, 401);
assert.equal((await call('/api/submissions', 'GET', null, 'outsider')).status, 403);
assert.equal((await call('/api/submissions', 'GET', null, 'metadata-only')).status, 403, 'User-editable metadata cannot grant access');
const creator = await call('/api/access', 'GET', null, 'creator');
assert.equal(creator.value.actor.role, 'Content Creator');
let created = await call('/api/submissions', 'POST', { title: 'Authenticated regression', body_text: 'Acme Cloud helps teams.', channel: 'Website CMS', author_name: 'Forged author' }, 'creator');
assert.equal(created.status, 201);
let record = created.value;
assert.equal(record.author_name, 'creator@example.com');
const spoofed = { name: 'Forged admin', role: 'Brand Admin', verified: true };
const action = (actor, revision = record.governance.revision) => ({ action: 'approve', actor, expectedRevision: revision });
assert.equal((await call(`/api/submissions/${record.id}`, 'PATCH', action(spoofed), 'creator')).status, 403);
assert.equal((await call('/api/evidence', 'POST', {}, 'reviewer')).status, 403);
assert.equal((await call('/api/knowledge', 'POST', {}, 'reviewer')).status, 403);
const approved = await call(`/api/submissions/${record.id}`, 'PATCH', action(spoofed), 'reviewer');
assert.equal(approved.status, 200);
record = approved.value;
assert.equal(record.governance.events.at(-1).actor.id, 'reviewer-verified-id');
assert.equal(record.governance.events.at(-1).actor.name, 'reviewer@example.com');
assert.equal(record.governance.events.at(-1).actor.verified, true);
assert.equal((await call('/api/webhook/gate', 'POST', { submissionId: record.id, targetChannel: 'Website CMS' }, 'creator')).status, 403);
assert.equal((await call('/api/webhook/gate', 'POST', { submissionId: record.id, targetChannel: 'Website CMS' }, 'reviewer')).status, 200);
const evidence = await call('/api/evidence', 'POST', { claim: 'Admin source', approvedWording: '20 GB', sourceTitle: 'Plan', approvedBy: 'Forged name', role: 'Content Creator' }, 'admin');
assert.equal(evidence.status, 201);
assert.equal(JSON.parse(evidence.value.source_doc).approvedBy, 'admin@example.com');
console.log('PASS: required sessions, workspace membership, forged headers, user metadata escalation, creator approval denied, reviewer admin-write denied, server-recorded reviewer identity, protected exports and gate. Uses disposable identity stub, not live Supabase.');
