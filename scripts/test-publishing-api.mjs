import assert from 'node:assert/strict';
const root = process.env.TEST_APP_URL || 'http://127.0.0.1:3001';
const actor = { name: 'Test reviewer', role: 'Brand Reviewer', id: 'spoofed', verified: true };
async function call(path, method = 'GET', body) {
  const response = await fetch(root + path, { method, headers: { 'Content-Type': 'application/json', 'x-veribrand-actor': encodeURIComponent(JSON.stringify(actor)) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const value = await response.json(); return { status: response.status, value };
}
assert.equal((await call('/api/access')).value.mode, 'demo', 'Run this smoke test only against a disposable demo server');
let { value: record, status } = await call('/api/submissions', 'POST', { title: 'Publishing regression test', body_text: 'Acme Cloud helps teams work together.', channel: 'Website CMS' });
assert.equal(status, 201);
async function command(action, other = {}) {
  const result = await call('/api/submissions/' + record.id, 'PATCH', { action, actor, expectedRevision: record.governance.revision, ...other });
  if (result.status === 200) record = result.value;
  return result;
}
async function gate(channel = 'Website CMS') { return call('/api/webhook/gate', 'POST', { submissionId: record.id, targetChannel: channel }); }
assert.equal((await gate()).status, 403);
assert.equal((await command('publish', { text: record.body_text, url: 'https://example.com/test' })).status, 409);
assert.equal((await command('approve')).status, 200);
assert.equal(record.governance.events.at(-1).actor.verified, undefined, 'Spoofed identity fields are stripped in demo mode');
assert.equal((await gate()).status, 200);
assert.equal((await gate('Email platform')).status, 403);
assert.equal((await command('publish', { text: record.body_text, url: 'https://example.com/test' })).status, 200);
assert.equal((await command('observe', { text: record.body_text + ' Different live copy.' })).status, 200);
let blocked = await gate();
assert.equal(blocked.status, 403);
assert.equal(blocked.value.checklist.find(item => item.id === 'publication').pass, false);
assert.equal((await command('observe', { text: record.body_text })).status, 200);
assert.equal((await gate()).status, 200);
const passport = await call(`/api/submissions/${record.id}/passport?format=json`);
assert.equal(passport.value.publication.status, 'matching');
assert(passport.value.decisions.some(event => event.action === 'observe'));
const original = record.body_text;
assert.equal((await command('revise', { text: original + ' A new version.' })).status, 200);
assert.equal((await gate()).status, 403, 'Editing after approval blocks publication');
assert.equal((await command('approve')).status, 200);
const evidence = { claim: 'Test dated source', approvedWording: '42 GB', sourceTitle: 'Regression evidence', sourceUrl: 'https://example.com/evidence', owner: 'Evidence owner', expiresAt: '2000-01-01', role: 'Brand Admin', approvedBy: 'Test admin' };
const added = await call('/api/evidence', 'POST', evidence);
assert.equal(added.status, 201);
assert.equal((await gate()).status, 403);
assert.equal((await command('rescan')).status, 200);
assert.equal((await command('approve')).status, 409, 'Expired evidence prevents new approval');
const renewal = await call('/api/evidence', 'PUT', { ...evidence, factKey: added.value.fact_key, expiresAt: '2099-01-01' });
assert.equal(renewal.status, 200);
assert.equal((await command('rescan')).status, 200);
assert.equal((await command('approve')).status, 200);
assert.equal((await gate()).status, 200);
const stale = await call(`/api/submissions/${record.id}`, 'PATCH', { action: 'comment', actor, reason: 'stale', expectedRevision: 1 });
assert.equal(stale.status, 409);
console.log('PASS: publish gate, wrong channel, snapshots and drift, post-approval edits, identity spoofing, evidence expiry/renewal, stale revisions, passport monitoring trail.');
