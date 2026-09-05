import assert from 'node:assert/strict';
import { before,after,test } from 'node:test';
import { Miniflare } from 'miniflare';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { extract } from '../lib/evidence.ts';
import { evidenceState, verificationBasis } from '../lib/verification.ts';
let mf;
before(async()=>{
 const files=(await readdir('dist/server',{recursive:true})).filter(f=>f.endsWith('.js')&&f!=='index.js');
 mf=new Miniflare({modules:['index.js',...files].map(f=>({type:'ESModule',path:resolve('dist/server',f)})),modulesRoot:resolve('dist/server'),compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],bindings:{},log:undefined});
 const db=await mf.getD1Database('DB');
 const journal=JSON.parse(await readFile('drizzle/meta/_journal.json','utf8'));
 for(const entry of journal.entries){const sql=await readFile(`drizzle/${entry.tag}.sql`,'utf8');for(const statement of sql.split('--> statement-breakpoint'))await db.prepare(statement.trim()).run();}
});
after(async()=>{await mf?.dispose();});
const auth=(id='owner-a')=>({'oai-authenticated-user-id':id,'oai-authenticated-user-email':`${id}@example.test`});
const request=(method,body,id='owner-a',extra={})=>mf.dispatchFetch('https://workproof.test/api/experiences',{method,headers:{...auth(id),'Content-Type':'application/json',...extra},...(body?{body:JSON.stringify(body)}:{})});
function record(){const r=extract('A customer was unsure. I compared two options. The customer chose the smaller model.','Retail sales','2026-09-02');r.title='Comparing two options';r.claims=r.claims.map(c=>({...c,state:c.state==='MISSING EVIDENCE'?c.state:'USER VERIFIED'}));return r;}
function excludeOldCapabilities(r){for(const c of r.claims)if(c.kind==='skill'&&!r.claims.some(a=>a.kind==='action'&&!a.rejected&&a.quote===c.quote))c.rejected=true;}
test('Anonymous requests are rejected',async()=>{const res=await mf.dispatchFetch('https://workproof.test/api/experiences');assert.equal(res.status,401);});
test('Save, retrieve, repeated save, edit and owner isolation',async()=>{const r=record();let res=await request('POST',r);assert.equal(res.status,200,await res.text());res=await request('GET');let data=await res.json();assert.equal(data.records.length,1);assert.equal(data.records[0].raw,r.raw);assert.deepEqual(data.records[0].claims,r.claims);res=await request('POST',r);assert.equal(res.status,200);r.title='Updated title';res=await request('POST',r);assert.equal(res.status,200);data=await (await request('GET')).json();assert.equal(data.records.length,1);assert.equal(data.records[0].title,'Updated title');data=await (await request('GET',undefined,'owner-b')).json();assert.equal(data.records.length,0);res=await request('POST',r,'owner-b');assert.equal(res.status,403);});
test('Pending claims, false sources, invalid dates and fictional records are not saved',async()=>{const pending=record();pending.claims[0].state='DERIVED FROM USER INPUT';assert.equal((await request('POST',pending)).status,400);const falseSource=record();falseSource.claims[1].quote='Fabricated source';assert.equal((await request('POST',falseSource)).status,400);const badDate=record();badDate.date='2026-02-31';assert.equal((await request('POST',badDate)).status,400);const demo=record();demo.demo=true;assert.equal((await request('POST',demo)).status,400);});
test('Worker corrections remain traceable; outdated capabilities require review',async()=>{const r=record();const action=r.claims.find(c=>c.kind==='action');action.text='I explained the differences between two options.';action.quote=action.text;action.source='clarification';r.clarifications.push(action.text);r.claims.find(c=>c.kind==='outcome').rejected=true;assert.equal((await request('POST',r)).status,400);excludeOldCapabilities(r);const res=await request('POST',r);assert.equal(res.status,200,await res.text());const data=await (await request('GET')).json();const saved=data.records.find(x=>x.id===r.id);assert.equal(saved.raw,r.raw);assert.deepEqual(saved.clarifications,r.clarifications);assert.ok(saved.claims.find(c=>c.kind==='outcome').rejected);assert.ok(saved.claims.filter(c=>c.kind==='skill').every(c=>c.rejected));});
test('Cross-origin writes are rejected',async()=>{assert.equal((await request('POST',record(),'owner-a',{origin:'https://other.test'})).status,403);});
test('Evidence limitations survive saving and retrieval with original sources',async()=>{
 const r=record();const raw='I do not know whether they made a purchase.';r.raw+=' '+raw;
 r.claims.push({id:crypto.randomUUID(),kind:'limitation',text:raw,quote:raw,source:'raw',state:'USER VERIFIED',rejected:false});
 let res=await request('POST',r);assert.equal(res.status,200,await res.text());
 const saved=(await (await request('GET')).json()).records.find(x=>x.id===r.id);
 assert.equal(saved.claims.find(c=>c.kind==='limitation').quote,raw);
 // Older clients may still send the former action category; the API corrects it.
 r.claims[r.claims.length-1].kind='action';res=await request('POST',r);assert.equal(res.status,200,await res.text());
 const updated=(await (await request('GET')).json()).records.find(x=>x.id===r.id);
 assert.equal(updated.claims.find(c=>c.quote===raw).kind,'limitation');
});

const verificationCall = (path, method = 'GET', body, id = 'owner-a', extra = {}) => mf.dispatchFetch(`https://workproof.test/api/verifications${path}`, {
 method, headers: { ...auth(id), 'Content-Type': 'application/json', ...extra }, ...(body ? { body: JSON.stringify(body) } : {}),
});
const submission = (r, claim = r.claims.find(c => c.kind === 'action')) => ({ id: crypto.randomUUID(), experienceId: r.id, claimId: claim.id, recipientEmail: 'manager@example.test', expectedSnapshot: JSON.stringify(verificationBasis(r, claim)), consent: true });
const decision = { decision: 'confirmed', relationship: 'Manager', basis: 'Direct observation', attest: true };

const deleteData = (body, id = 'owner-a', extra = {}) => mf.dispatchFetch('https://workproof.test/api/privacy', {
 method: 'DELETE', headers: { ...auth(id), 'Content-Type': 'application/json', ...extra }, body: JSON.stringify(body),
});
test('Deletion requires authentication, exact confirmation and same origin', async () => {
 assert.equal((await mf.dispatchFetch('https://workproof.test/api/privacy', { method: 'DELETE' })).status, 401);
 assert.equal((await deleteData({ scope: 'all', confirmation: 'yes' })).status, 400);
 assert.equal((await deleteData({ scope: 'all', confirmation: 'DELETE', ownerId: 'someone-else' })).status, 400);
 assert.equal((await deleteData({ scope: 'all', confirmation: 'DELETE' }, 'delete-check', { origin: 'https://evil.test' })).status, 403);
});
test('Record deletion is owner-scoped and removes associated request access', async () => {
 const r = record(); await request('POST', r, 'delete-owner');
 const created = await verificationCall('', 'POST', submission(r), 'delete-owner');
 assert.equal(created.status, 201);
 const v = (await created.json()).request;
 const body = { scope: 'record', recordId: r.id, confirmation: 'DELETE' };
 assert.equal((await deleteData(body, 'outsider')).status, 404);
 assert.equal((await verificationCall(`/${v.id}`, 'GET', undefined, 'manager')).status, 200);
 assert.equal((await deleteData(body, 'delete-owner')).status, 200);
 assert.equal((await verificationCall(`/${v.id}`, 'GET', undefined, 'manager')).status, 404);
 assert.deepEqual((await (await request('GET', undefined, 'delete-owner')).json()).records, []);
});
test('Deleting verifier data removes their identity and confirmation, not another worker record', async () => {
 const r = record(); await request('POST', r, 'kept-worker');
 const own = record(); await request('POST', own, 'erasable-verifier');
 const input = { ...submission(r), recipientEmail: 'erasable-verifier@example.test' };
 const v = (await (await verificationCall('', 'POST', input, 'kept-worker')).json()).request;
 assert.equal((await verificationCall(`/${v.id}`, 'POST', decision, 'erasable-verifier')).status, 200);
 let saved = (await (await request('GET', undefined, 'kept-worker')).json()).records[0];
 assert.equal(evidenceState(saved, saved.claims.find(c => c.id === input.claimId)), 'Verified');
 assert.equal((await deleteData({ scope: 'all', confirmation: 'DELETE' }, 'erasable-verifier')).status, 200);
 saved = (await (await request('GET', undefined, 'kept-worker')).json()).records[0];
 assert.equal(saved.id, r.id);
 assert.equal(evidenceState(saved, saved.claims.find(c => c.id === input.claimId)), 'Reported');
 assert.equal(saved.verifications[0].response, null);
 assert.equal(saved.verifications[0].recipientEmail, '');
 assert.equal(saved.verifications[0].status, 'withdrawn');
 assert.deepEqual((await (await request('GET', undefined, 'erasable-verifier')).json()).records, []);
 assert.equal((await verificationCall(`/${v.id}`, 'GET', undefined, 'erasable-verifier')).status, 404);
 assert.equal((await deleteData({ scope: 'all', confirmation: 'DELETE' }, 'erasable-verifier')).status, 200);
});
test('Deleting all worker data removes their requests and preserves unrelated accounts', async () => {
 const r = record(); await request('POST', r, 'erase-all');
 const other = record(); await request('POST', other, 'keep-all');
 const v = (await (await verificationCall('', 'POST', submission(r), 'erase-all')).json()).request;
 assert.equal((await deleteData({ scope: 'all', confirmation: 'DELETE' }, 'erase-all')).status, 200);
 assert.equal((await verificationCall(`/${v.id}`, 'GET', undefined, 'manager')).status, 404);
 assert.equal((await (await request('GET', undefined, 'keep-all')).json()).records[0].id, other.id);
});

test('Malformed JSON, duplicated IDs, forged facts and unsafe references are rejected', async () => {
 const malformed = await mf.dispatchFetch('https://workproof.test/api/experiences', { method: 'POST', headers: { ...auth(), 'Content-Type': 'application/json' }, body: '{broken' });
 assert.equal(malformed.status, 400);
 const duplicate = record(); duplicate.claims[1].id = duplicate.claims[0].id;
 assert.equal((await request('POST', duplicate)).status, 400);
 const forged = record(); forged.claims.find(c => c.kind === 'action').text = 'Increased revenue by 50%.';
 assert.equal((await request('POST', forged)).status, 400);
 const unsafe = record(); const c = unsafe.claims.find(c => c.kind === 'action');
 unsafe.support = [{ id: crypto.randomUUID(), claimId: c.id, claimText: c.text, claimKind: c.kind, quote: c.quote, description: 'Receipt', url: 'javascript:alert(1)' }];
 assert.equal((await request('POST', unsafe)).status, 400);
});

test('End-to-end selected-claim request, manager confirmation, reopen and version invalidation', async () => {
 const r = record(); r.raw += ' My private university history is unrelated.';
 let saved = await request('POST', r); assert.equal(saved.status, 200, await saved.text());
 const input = submission(r);
 let res = await verificationCall('', 'POST', input); assert.equal(res.status, 201, await res.clone().text());
 const created = (await res.json()).request;
 assert.match(created.version, /^[a-f0-9]{64}$/);
 assert.equal(created.snapshot.claim.id, input.claimId);
 assert.ok(!JSON.stringify(created).includes('private university history'));
 assert.equal(created.snapshot.raw, undefined);
 assert.equal(created.snapshot.claims, undefined);
 res = await verificationCall('', 'POST', input); assert.equal(res.status, 200);
 assert.equal((await res.json()).request.id, created.id);
 const invisible = await verificationCall(`/${created.id}`, 'GET', undefined, 'unrelated');
 assert.equal(invisible.status, 404); assert.ok(!(await invisible.text()).includes(r.raw));
 assert.equal((await verificationCall(`/${created.id}`, 'POST', decision, 'unrelated')).status, 404);
 assert.equal((await verificationCall(`/${created.id}`, 'POST', decision, 'owner-a')).status, 404);
 res = await verificationCall(`/${created.id}`, 'GET', undefined, 'manager');
 assert.equal(res.status, 200); assert.equal((await res.json()).role, 'verifier');
 res = await verificationCall(`/${created.id}`, 'POST', decision, 'manager');
 assert.equal(res.status, 200, await res.clone().text());
 const response = (await res.json()).request;
 assert.equal(response.response.verifierId, 'manager'); assert.equal(response.status, 'confirmed');
 assert.equal((await verificationCall(`/${created.id}`, 'POST', decision, 'manager')).status, 200);
 let reopened = (await (await request('GET')).json()).records.find(x => x.id === r.id);
 assert.equal(evidenceState(reopened, reopened.claims.find(c => c.id === input.claimId)), 'Verified');
 assert.equal(evidenceState(reopened, reopened.claims.find(c => c.kind === 'outcome')), 'Reported');
 assert.ok((await (await request('GET', undefined, 'manager')).json()).records.length === 0);
 const changed = r.claims.find(c => c.id === input.claimId);
 changed.text = changed.quote = 'I compared the warranty terms.'; changed.source = 'clarification'; r.clarifications.push(changed.text);
 excludeOldCapabilities(r);
 saved = await request('POST', r); assert.equal(saved.status, 200, await saved.text());
 reopened = (await (await request('GET')).json()).records.find(x => x.id === r.id);
 assert.equal(evidenceState(reopened, reopened.claims.find(c => c.id === input.claimId)), 'Reported');
 assert.equal(reopened.verifications[0].snapshot.claim.text, created.snapshot.claim.text);
 assert.equal(reopened.verifications[0].response.respondedAt, response.response.respondedAt);
});

test('Clients cannot forge verification through a normal record save', async () => {
 const r = record(); const c = r.claims.find(c => c.kind === 'action');
 r.verifications = [{ status: 'confirmed', snapshot: verificationBasis(r, c), response: { verifierId: 'invented' } }];
 assert.equal((await request('POST', r)).status, 200);
 const saved = (await (await request('GET')).json()).records.find(x => x.id === r.id);
 assert.deepEqual(saved.verifications, []);
 assert.equal(evidenceState(saved, saved.claims.find(x => x.id === c.id)), 'Reported');
});

test('Reference status persists, but does not turn self-review into external verification', async () => {
 const r = record(); const c = r.claims.find(c => c.kind === 'action');
 r.support = [{ id: crypto.randomUUID(), claimId: c.id, claimText: c.text, claimKind: c.kind, quote: c.quote, description: 'Customer feedback email dated 2 September', url: 'https://example.test/feedback' }];
 assert.equal((await request('POST', r)).status, 200);
 const saved = (await (await request('GET')).json()).records.find(x => x.id === r.id);
 assert.equal(evidenceState(saved, saved.claims.find(x => x.id === c.id)), 'Supported');
});

test('Consent, ownership, factual scope and matching preview are enforced', async () => {
 const r = record(); await request('POST', r);
 const input = submission(r);
 assert.equal((await verificationCall('', 'POST', { ...input, consent: false })).status, 400);
 assert.equal((await verificationCall('', 'POST', input, 'owner-b')).status, 404);
 assert.equal((await verificationCall('', 'POST', { ...input, recipientEmail: 'owner-a@example.test' })).status, 400);
 assert.equal((await verificationCall('', 'POST', { ...input, expectedSnapshot: '{}' })).status, 409);
 const skill = r.claims.find(c => c.kind === 'skill');
 assert.equal((await verificationCall('', 'POST', submission(r, skill))).status, 400);
 assert.equal((await verificationCall('', 'POST', input, 'owner-a', { origin: 'https://other.test' })).status, 403);
 assert.equal((await mf.dispatchFetch('https://workproof.test/api/verifications', { method: 'POST' })).status, 401);
});

test('Correction and refusal preserve worker wording and never certify the original', async () => {
 for (const outcome of ['corrected', 'cannot_verify']) {
  const r = record(); await request('POST', r); const input = submission(r);
  const created = (await (await verificationCall('', 'POST', input)).json()).request;
  if (outcome === 'corrected') assert.equal((await verificationCall(`/${created.id}`, 'POST', { ...decision, decision: outcome, correction: '' }, 'manager')).status, 400);
  const res = await verificationCall(`/${created.id}`, 'POST', { ...decision, decision: outcome, correction: 'I compared the prices, not the technical features.' }, 'manager');
  assert.equal(res.status, 200, await res.clone().text());
  const reopened = (await (await request('GET')).json()).records.find(x => x.id === r.id);
  assert.equal(reopened.raw, r.raw); assert.deepEqual(reopened.claims, r.claims);
  assert.equal(evidenceState(reopened, reopened.claims.find(c => c.id === input.claimId)), 'Reported');
  assert.equal((await verificationCall(`/${created.id}`, 'POST', decision, 'manager')).status, 409);
 }
});

test('Withdrawal and expiry close recipient access without exposing the snapshot', async () => {
 for (const reason of ['withdrawn', 'expired']) {
  const r = record(); await request('POST', r);
  const created = (await (await verificationCall('', 'POST', submission(r))).json()).request;
  assert.equal((await verificationCall(`/${created.id}`, 'DELETE', undefined, 'manager')).status, 404);
  if (reason === 'withdrawn') {
   assert.equal((await verificationCall(`/${created.id}`, 'DELETE', undefined, 'owner-a', { origin: 'https://other.test' })).status, 403);
   assert.equal((await verificationCall(`/${created.id}`, 'DELETE')).status, 200);
  } else {
   const db = await mf.getD1Database('DB'); await db.prepare('UPDATE verification_requests SET expires_at = ? WHERE id = ?').bind('2000-01-01T00:00:00.000Z', created.id).run();
  }
  const data = await (await verificationCall(`/${created.id}`, 'GET', undefined, 'manager')).json();
  assert.equal(data.unavailable, reason); assert.equal(data.request, undefined);
  assert.equal((await verificationCall(`/${created.id}`, 'POST', decision, 'manager')).status, reason === 'expired' ? 410 : 409);
  assert.equal((await verificationCall(`/${created.id}`, 'GET')).status, 200);
 }
});
