import assert from 'node:assert/strict';
import test from 'node:test';
import {extract,verified,pending,canSave,translations,gaps,followups,demoRecords} from '../lib/evidence.ts';
import { groundingError, hasQuantitativeEvidence, suggestedCapabilities } from '../lib/evidence.ts';
import { pilotScenarios } from './pilot-scenarios.mjs';
import { evidenceState, matchesCurrentClaim, verificationBasis } from '../lib/verification.ts';
const approve=r=>({...r,claims:r.claims.map(c=>({...c,state:c.state==='MISSING EVIDENCE'?c.state:'USER VERIFIED'}))});
test('No supplied metric or outcome means explicit gaps, never invented success',()=>{const r=extract('I explained the options to a customer.','Retail sales','2026-09-02');assert.equal(r.claims.find(c=>c.kind==='metrics').text,'Not provided');assert.equal(r.claims.find(c=>c.kind==='outcome').text,'Outcome not established');assert.ok(gaps(r).includes('outcome'));assert.equal(translations(r).ids.length,0);});
test('Every extracted assertion has a verbatim source',()=>{for(const r of demoRecords())for(const c of r.claims){if(c.state==='MISSING EVIDENCE')continue;assert.ok(c.source==='context'?c.quote===r.context:r.raw.includes(c.quote));}});
test('Review is required; rejected claims never appear in career views',()=>{const r=extract('I explained two models to a customer. The customer chose the smaller model.','Retail sales','2026-09-02');assert.ok(pending(r).length);assert.equal(canSave(r),false);const checked=approve(r);assert.equal(canSave(checked),true);const outcome=checked.claims.find(c=>c.kind==='outcome');outcome.rejected=true;const t=translations(checked);assert.ok(!t.bullet.includes('chose'));assert.equal(t.star.find(s=>s.label==='Result').claims.length,0);});
test('All four views use only verified evidence and team credit is retained',()=>{const r=approve(extract('Our group had four members. We submitted on time.','University','2026-09-02'));const t=translations(r);assert.match(t.bullet,/Contributed within a team/);assert.ok(t.questions.length);assert.equal(t.star.length,4);const ids=new Set(verified(r).map(c=>c.id));for(const id of [...t.ids,...t.skills.map(c=>c.id),...t.questions.flatMap(q=>q.ids)])assert.ok(ids.has(id));});
test('An action and context are required; missing evidence does not block an honest record',()=>{const r=approve(extract('The café was busy.','Hospitality','2026-09-02'));assert.equal(canSave(r),false);const good=approve(extract('I checked the order.','Hospitality','2026-09-02'));assert.equal(canSave(good),true);good.claims.find(c=>c.kind==='context').rejected=true;assert.equal(canSave(good),false);});
test('Follow-up questions target gaps and never exceed three',()=>{for(const raw of ['Busy shift.','I helped a customer.','I compared two models. The customer chose one.']){const r=extract(raw,'Retail sales','2026-09-02');assert.ok(followups(r).length<=3);for(const q of followups(r))assert.ok(gaps(r).includes(q.kind));}});
test('Negated skill descriptions do not generate skill claims',()=>{const r=extract('I never explained the options.','Retail sales','2026-09-02');assert.equal(r.claims.filter(c=>c.kind==='skill'&&c.state!=='MISSING EVIDENCE').length,0);});
test('Fictional examples use stable source identifiers',()=>{const a=demoRecords(),b=demoRecords();assert.deepEqual(a.map(r=>r.claims.map(c=>c.id)),b.map(r=>r.claims.map(c=>c.id)));assert.ok(a.every(r=>r.demo));});

test('Reported mobile example keeps unknown purchase out of actions and resume claims',()=>{
 const raw='During a retail shift, a customer was unsure which television suited their living room. I asked about their budget, viewing distance and what they usually watched. I helped the customer compare the available options and explained the differences using product information. When they asked about delivery, I checked the information before answering rather than guessing. The customer thanked me for explaining the options. They were still deciding when our conversation ended, so I do not know whether they made a purchase.';
 const r=approve(extract(raw,'Retail sales','2026-09-02'));
 const limitation=r.claims.find(c=>c.kind==='limitation');
 assert.equal(limitation.text,'They were still deciding when our conversation ended, so I do not know whether they made a purchase.');
 assert.equal(limitation.quote,limitation.text);
 assert.equal(verified(r,'action').length,3);
 assert.equal(verified(r,'outcome')[0].text,'The customer thanked me for explaining the options.');
 assert.equal(r.claims.find(c=>c.kind==='metrics').text,'Not provided');
 const t=translations(r);assert.ok(!t.bullet.includes('purchase'));assert.ok(!t.star.find(s=>s.label==='Action').claims.some(c=>c.text.includes('purchase')));assert.equal(t.limitations[0].text,limitation.text);
});
test('Unknown positive results and numbers are not achievements or metrics',()=>{
 for(const text of ["I don't know if sales increased by 20%.",'I do not know how many people I helped.',"I couldn’t confirm whether they purchased anything.",'I was not sure whether the customer chose a model.']){
  const r=approve(extract(text,'Retail sales','2026-09-02'));
  assert.equal(verified(r,'action').length,0,text);assert.equal(verified(r,'outcome').length,0,text);assert.equal(verified(r,'metrics').length,0,text);assert.equal(verified(r,'skill').length,0,text);assert.equal(canSave(r),false,text);assert.equal(translations(r).limitations.length,1,text);
 }
});
test('Mixed action and uncertainty preserve exact source fragments',()=>{
 const raw="I explained the options, but I don't know whether they made a purchase.";
 const r=approve(extract(raw,'Retail sales','2026-09-02'));
 assert.equal(verified(r,'action')[0].text,'I explained the options');
 assert.equal(verified(r,'limitation')[0].text,"I don't know whether they made a purchase.");
 for(const c of r.claims.filter(c=>c.source==='raw'&&c.quote))assert.ok(raw.includes(c.quote));
 assert.ok(gaps(r).includes('outcome'));
});
test('Existing reviewed records are corrected without changing words or verification decisions',async()=>{
 const {normalizeEvidence}=await import('../lib/evidence.ts');
 const r=approve(extract('I checked the options. I do not know whether they made a purchase.','Retail sales','2026-09-02'));
 const original=r.claims.find(c=>c.kind==='limitation');original.kind='action';
 const updated=normalizeEvidence(r);const fixed=updated.claims.find(c=>c.id===original.id);
 assert.equal(fixed.kind,'limitation');assert.equal(fixed.text,original.text);assert.equal(fixed.quote,original.quote);assert.equal(fixed.state,'USER VERIFIED');assert.equal(original.kind,'action');assert.equal(updated.id,r.id);assert.deepEqual(normalizeEvidence(updated),updated);assert.ok(!translations(r).bullet.includes('purchase'));
});
test('Unknown count is retained without asking again for the same missing count',()=>{
 const r=extract('I helped visitors. I do not know how many people I helped.','Volunteering','2026-09-02');
 assert.ok(gaps(r).includes('metrics'));assert.ok(!followups(r).some(q=>q.kind==='metrics'));
});

for (const scenario of pilotScenarios) test(`Pilot scenario: ${scenario.name} stays grounded`, () => {
 const record = approve(extract(scenario.raw, scenario.context, '2026-09-02'));
 assert.equal(canSave(record), true);
 assert.equal(groundingError(record), null);
 assert.ok(verified(record, 'skill').some(c => c.text === scenario.capability));
 for (const claim of record.claims.filter(c => c.state !== 'MISSING EVIDENCE' && c.kind !== 'skill')) assert.equal(claim.text, claim.quote);
 for (const viewId of translations(record).ids) assert.ok(record.claims.some(c => c.id === viewId && c.state === 'USER VERIFIED'));
 assert.ok(followups(record).length <= 3);
 assert.doesNotMatch(translations(record).bullet, /exceptional|elite|increased company revenue/i);
});

test('TV purchase is an outcome; screen size is context, not quantitative evidence', () => {
 const r = approve(extract(pilotScenarios[0].raw, 'Retail sales', '2026-09-02'));
 assert.equal(verified(r, 'outcome')[0].text, 'They bought that TV and added delivery.');
 assert.equal(verified(r, 'metrics').length, 0);
 assert.ok(gaps(r).includes('metrics'));
 assert.ok(verified(r, 'skill').some(c => c.text === 'Consultative selling'));
 assert.doesNotMatch(translations(r).bullet, /revenue|\$/i);
 for (const text of ['I showed a 65-inch TV.', 'I explained the 120Hz display.', 'I checked the 256GB specification.', 'I worked there in 2025.']) assert.equal(hasQuantitativeEvidence(text), false, text);
 for (const text of ['I compared two 65-inch models.', 'The transaction was $2000.', 'I helped 6 customers.']) assert.equal(hasQuantitativeEvidence(text), true, text);
});

test('Plans, speculation and another person\'s actions do not become worker capabilities', () => {
 for (const text of ['I might have increased sales by 20%.', 'I want to train new employees.', 'I hope to lead the team.', 'If I recommended it, they would buy it.']) {
  const r = approve(extract(text, 'Retail sales', '2026-09-02'));
  assert.equal(verified(r, 'action').length, 0, text);
  assert.equal(verified(r, 'outcome').length, 0, text);
  assert.equal(verified(r, 'metrics').length, 0, text);
  assert.equal(verified(r, 'skill').length, 0, text);
 }
 assert.deepEqual(suggestedCapabilities('My colleague explained the product while I watched.'), []);
 assert.deepEqual(suggestedCapabilities('I checked the order while my colleague explained the product.'), ['Attention to detail']);
});

test('A real quotation does not legitimise invented claim text', () => {
 const r = approve(extract('I helped a customer choose a television.', 'Retail sales', '2026-09-02'));
 r.claims.find(c => c.kind === 'action').text = 'Delivered exceptional service and increased company revenue.';
 assert.match(groundingError(r), /must match their source/);
 assert.doesNotMatch(translations(r).bullet, /exceptional|revenue/);
});

test('Proof status is separate from worker review and references are version-specific', () => {
 const r = approve(extract('I explained the product differences.', 'Retail sales', '2026-09-02'));
 const c = verified(r, 'action')[0];
 assert.equal(evidenceState(r, c), 'Reported');
 r.support = [{ id: crypto.randomUUID(), claimId: c.id, claimText: c.text, claimKind: c.kind, quote: c.quote, description: 'Customer feedback email', url: '' }];
 assert.equal(evidenceState(r, c), 'Supported');
 const request = { id: crypto.randomUUID(), experienceId: r.id, workerName: 'Worker', recipientEmail: 'manager@example.test', version: 'test-version', snapshot: verificationBasis(r, c), status: 'confirmed', createdAt: new Date().toISOString(), expiresAt: new Date().toISOString(), response: { verifierId: 'manager', verifierName: 'Manager', verifierEmail: 'manager@example.test', relationship: 'Manager', basis: 'Direct observation', correction: '', respondedAt: new Date().toISOString() } };
 r.verifications = [request];
 assert.equal(evidenceState(r, c), 'Verified');
 assert.equal(evidenceState(r, verified(r, 'skill')[0]), 'Reported');
 c.text = c.quote = 'I explained the warranty terms.';
 assert.equal(matchesCurrentClaim(r, request), false);
 assert.equal(evidenceState(r, c), 'Reported');
});

test('Corrections, refusals, withdrawn requests and missing fields never certify a claim', () => {
 const r = approve(extract('I checked the order.', 'Retail sales', '2026-09-02'));
 const c = verified(r, 'action')[0];
 for (const status of ['pending', 'corrected', 'cannot_verify', 'withdrawn', 'expired']) {
  r.verifications = [{ status, snapshot: verificationBasis(r, c), response: { verifierId: 'manager' } }];
  assert.equal(evidenceState(r, c), 'Reported', status);
 }
 assert.equal(evidenceState(r, r.claims.find(c => c.kind === 'metrics')), 'Missing evidence');
});

test('Context, date, sources, references and limitations are part of the verified version', () => {
 const original = approve(extract('I checked the order. I do not know whether it was delivered.', 'Retail sales', '2026-09-02'));
 const claim = verified(original, 'action')[0];
 const request = { snapshot: verificationBasis(original, claim) };
 for (const change of [r => r.context = 'Hospitality', r => r.date = '2026-09-03', r => r.claims.find(c => c.kind === 'action').quote = 'A different source', r => r.claims.find(c => c.kind === 'limitation').rejected = true]) {
  const r = structuredClone(original); change(r); assert.equal(matchesCurrentClaim(r, request), false);
 }
});

test('Rejected actions cannot keep derived capabilities in any career output', () => {
 const r = approve(extract('I explained the product differences. I checked the order.', 'Retail sales', '2026-09-02'));
 r.claims.find(c => c.kind === 'action' && c.text.includes('explained')).rejected = true;
 assert.ok(!translations(r).skills.some(c => c.text === 'Communication'));
 assert.ok(!translations(r).questions.some(q => q.text.includes('communication')));
 assert.match(groundingError(r), /retained, reviewed action/);
});

test('Source checks reject cherry-picked fragments that discard a negation', () => {
 const r = approve(extract('I checked the order. The customer did not make a purchase.', 'Retail sales', '2026-09-02'));
 r.claims.push({ id: 'cherry-picked', kind: 'outcome', text: 'make a purchase.', quote: 'make a purchase.', source: 'raw', state: 'USER VERIFIED', rejected: false });
 assert.match(groundingError(r), /matching source/);
});

test('Plain sales verbs remain usable without claiming revenue or transaction value', () => {
 for (const raw of ['I sold a television and arranged delivery.', 'I advised a customer about the warranty.']) {
  const r = approve(extract(raw, 'Retail sales', '2026-09-02'));
  assert.equal(canSave(r), true); assert.equal(groundingError(r), null);
  assert.ok(gaps(r).includes('metrics'));
  assert.doesNotMatch(translations(r).bullet, /revenue|\$/i);
 }
});
