'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCheck, ShieldCheck, LoaderCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SharedEvidence } from '@/app/evidence-proof';
import { responseLabels, type VerificationRequest } from '@/lib/verification';

type Loaded = { request?: VerificationRequest; role?: 'owner' | 'verifier'; unavailable?: string };

export default function VerificationResponse({ id, email }: { id: string; email: string }) {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState('');
  const [decision, setDecision] = useState('');
  const [relationship, setRelationship] = useState('');
  const [basis, setBasis] = useState('');
  const [correction, setCorrection] = useState('');
  const [attest, setAttest] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/verifications/${id}`, { cache: 'no-store', signal: controller.signal }).then(async res => {
      const value = await res.json() as Loaded & { error?: string };
      if (!res.ok) throw new Error(value.error);
      setData(value);
    }).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Could not load the request.'); });
    return () => controller.abort();
  }, [id]);

  async function respond(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const res = await fetch(`/api/verifications/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision, relationship: relationship || undefined, basis: basis || undefined, correction, attest }) });
      const value = await res.json() as { error?: string; request: VerificationRequest };
      if (!res.ok) throw new Error(value.error);
      setData({ request: value.request, role: 'verifier' });
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save your response.'); }
    finally { setBusy(false); }
  }

  const request = data?.request;
  const closed = request && request.status !== 'pending';
  return <><header className="site-header"><div className="header-inner"><Link href="/" className="brand"><span className="brand-mark"><CheckCheck size={25} /></span>workproof.</Link></div></header>
    <main className="main verification-page">
      <div className="page-intro"><h1>Confirm a work experience</h1><p className="fine">Signed in as {email}</p></div>
      {error && <div className="form-error" role="alert"><p>{error}</p>{!data && <><p>Use the account named in the request. The link does not grant access to other evidence.</p><button className="text-button" onClick={() => window.location.reload()}>Try again</button></>}</div>}
      {!data && !error && <p role="status"><LoaderCircle size={20} className="spin" />Loading the selected evidence...</p>}
      {data?.unavailable && <p>This request is {data.unavailable}. The shared evidence is no longer available through this link.</p>}
      {request && <>
        <p>Can you confirm that <strong>{request.workerName}</strong> handled this part of the work and that the selected description is materially accurate?</p>
        <SharedEvidence snapshot={request.snapshot} workerName={request.workerName} />
        <p className="fine">This is one selected claim, not an endorsement of the worker or their other experiences.</p>
        {data.role === 'owner' && <div className="notice">This is your request. Only {request.recipientEmail} can respond. Your other records are not shared.</div>}
        {closed && <section className="response-result" role="status"><h2><ShieldCheck size={20} />{responseLabels[request.status]}</h2>
          {request.response && <><p>{request.response.verifierName} responded on {new Date(request.response.respondedAt).toLocaleString('en-AU')}.</p>
            {request.response.relationship && <p>{request.response.relationship} (self-described). {request.response.basis}.</p>}
            {request.status === 'corrected' && <><blockquote>{request.response.correction}</blockquote><p>The original wording is not verified. This correction has been returned to the worker for review.</p></>}
          </>}
          <p>No other record has been changed or shared.</p>
        </section>}
        {data.role === 'verifier' && !closed && <form className="response-form" onSubmit={respond}>
          <fieldset><legend>What can you confirm?</legend>
            <RadioGroup value={decision} onValueChange={value => { setDecision(value); setAttest(false); }}>
              <label className="response-choice"><RadioGroupItem value="confirmed" id="response-confirm" /><span>Confirm</span></label>
              <label className="response-choice"><RadioGroupItem value="corrected" id="response-correct" /><span>Confirm with correction</span></label>
              <label className="response-choice"><RadioGroupItem value="cannot_verify" id="response-cannot" /><span>Cannot verify</span></label>
            </RadioGroup>
          </fieldset>
          {decision && decision !== 'cannot_verify' && <>
            <div className="field"><label id="relationship-label">Your relationship to this worker</label><Select value={relationship} onValueChange={setRelationship}><SelectTrigger className="picker" aria-labelledby="relationship-label"><SelectValue placeholder="Choose relationship" /></SelectTrigger><SelectContent>{['Manager', 'Colleague', 'Tutor', 'Other'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
            <div className="field"><label id="basis-label">How can you confirm this?</label><Select value={basis} onValueChange={setBasis}><SelectTrigger className="picker" aria-labelledby="basis-label"><SelectValue placeholder="Choose your basis" /></SelectTrigger><SelectContent>{['Direct observation', 'Checked supporting material'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
          </>}
          {decision === 'corrected' && <div className="field"><label htmlFor="correction">Corrected factual wording</label><textarea id="correction" required minLength={5} maxLength={2000} rows={4} value={correction} onChange={e => setCorrection(e.target.value)} /><p className="fine">The original wording will not be marked verified. The worker will review your correction.</p></div>}
          {decision && <div className="consent-row"><Checkbox id="response-attest" checked={attest} onCheckedChange={value => setAttest(value === true)} /><label htmlFor="response-attest">{decision === 'cannot_verify' ? 'I cannot confirm this claim from what I know.' : decision === 'corrected' ? 'I can confirm only my corrected wording, based on the knowledge stated above.' : 'I can confirm this exact claim from the knowledge stated above.'}</label></div>}
          <p className="fine">Your name, account identity, relationship, basis and response time will be saved with this claim. WorkProof does not independently certify your role.</p>
          <button className="button" disabled={busy || !attest || !decision || (decision !== 'cannot_verify' && (!relationship || !basis)) || (decision === 'corrected' && correction.trim().length < 5)}>{busy && <LoaderCircle size={17} className="spin" />}Save response</button>
        </form>}
        <details className="source"><summary>Version and request dates</summary><p className="version-id">{request.version}</p><p>Requested {new Date(request.createdAt).toLocaleString('en-AU')}. Expires {new Date(request.expiresAt).toLocaleString('en-AU')}.</p></details>
      </>}
    </main></>;
}
