import assert from 'node:assert/strict';
import test from 'node:test';
import { extract, demoRecords } from '../lib/evidence.ts';
import { capabilityIndex, careerRecords, careerPackText, matchesEvidenceSearch, packRecords, MAX_PACK_RECORDS } from '../lib/career-pack.ts';
import { verificationBasis } from '../lib/verification.ts';

function real(raw = 'I explained product differences to a customer. I do not know whether they purchased.') {
  const r = extract(raw, 'Retail sales', '2026-09-02');
  r.title = 'Explaining options';
  r.claims = r.claims.map(c => ({ ...c, state: c.state === 'MISSING EVIDENCE' ? c.state : 'USER VERIFIED' }));
  return r;
}
test('Capability counts use distinct real, grounded, reviewed experiences', () => {
  const a = real(), b = real();
  a.claims.push({ ...a.claims.find(c => c.kind === 'skill'), id: crypto.randomUUID() });
  const index = capabilityIndex([a, a, b, ...demoRecords()]);
  assert.equal(index.find(c => c.name === 'Communication').recordIds.length, 2);
  assert.deepEqual(index.find(c => c.name === 'Communication').confirmedActionRecordIds, []);
});
test('A confirmed source action does not become an independently verified capability', () => {
  const r = real(), action = r.claims.find(c => c.kind === 'action');
  r.verifications = [{ id: 'request', experienceId: r.id, status: 'confirmed', snapshot: verificationBasis(r, action), response: { verifierId: 'manager', verifierEmail: 'secret@example.test' } }];
  assert.deepEqual(capabilityIndex([r])[0].confirmedActionRecordIds, [r.id]);
  const text = careerPackText([r], [r.id]);
  assert.match(text, /Verified — I explained/);
  assert.doesNotMatch(text, /secret@example|Verified — Communication/);
  r.verifications[0].status = 'withdrawn';
  assert.deepEqual(capabilityIndex([r])[0].confirmedActionRecordIds, []);
});
test('Stale source capabilities and unreviewed records are excluded from the pack', () => {
  const stale = real(); stale.claims.find(c => c.kind === 'action').rejected = true;
  const pending = real(); pending.claims[0].state = 'DERIVED FROM USER INPUT';
  assert.deepEqual(careerRecords([stale, pending, ...demoRecords()]), []);
  assert.equal(careerPackText([stale], [stale.id]), '');
});
test('Selected pack retains unknown outcomes and metrics, and excludes private history', () => {
  const r = real(); r.raw += ' My unrelated private note is confidential.';
  const other = real('I organised a private team checklist.');
  const text = careerPackText([r, other], [r.id], 'Interview');
  assert.match(text, /Outcome not established/);
  assert.match(text, /Quantitative evidence: Not provided/);
  assert.match(text, /I do not know whether they purchased/);
  assert.match(text, /Source statement IDs:/);
  assert.doesNotMatch(text, /unrelated private note|private team checklist/);
});
test('Search matches reviewed evidence, not rejected claims or unrelated raw text', () => {
  const r = real();
  r.raw += ' Confidential unrelated note.';
  assert.equal(matchesEvidenceSearch(r, 'product retail'), true);
  assert.equal(matchesEvidenceSearch(r, 'CONFIDENTIAL'), false);
  r.claims.find(c => c.kind === 'action').rejected = true;
  assert.equal(matchesEvidenceSearch(r, 'customer'), false);
});
test('Selection is bounded, deduplicated, and cannot include fictional records', () => {
  const records = Array.from({ length: 15 }, () => real());
  assert.equal(packRecords(records, records.map(r => r.id)).length, MAX_PACK_RECORDS);
  assert.equal(packRecords(records, [records[0].id, records[0].id]).length, 1);
  assert.equal(packRecords(demoRecords(), demoRecords().map(r => r.id)).length, 0);
});
test('Pack preserves team credit and does not upgrade unsupported interpretations', () => {
  const r = real('We compared two product models. We submitted our comparison on time.');
  assert.match(careerPackText([r], [r.id]), /Contributed within a team:/);
  assert.doesNotMatch(careerPackText([r], [r.id]), /Led a team|increased revenue/i);
});
