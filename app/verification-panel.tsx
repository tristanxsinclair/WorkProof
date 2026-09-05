'use client';

import { useState } from 'react';
import { Copy, Link2, Mail, Paperclip, ShieldCheck, X, LoaderCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from 'sonner';
import { type Experience, labels, reviewed } from '@/lib/evidence';
import { factualKinds, matchesCurrentClaim, responseLabels, verificationBasis, type VerificationRequest } from '@/lib/verification';
import { SharedEvidence } from './evidence-proof';

export default function VerificationPanel({ record, workerName, onUpdate }: {
  record: Experience; workerName: string; onUpdate: (record: Experience) => void;
}) {
  const facts = reviewed(record).filter(c => factualKinds.includes(c.kind));
  const [claimId, setClaimId] = useState(facts.find(c => c.kind === 'action')?.id ?? facts[0]?.id ?? '');
  const [email, setEmail] = useState('');
  const [consented, setConsented] = useState('');
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [description, setDescription] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const claim = facts.find(c => c.id === claimId);
  const snapshot = claim ? verificationBasis(record, claim) : null;
  const snapshotJson = JSON.stringify(snapshot);
  const consentKey = snapshotJson + email.trim().toLowerCase() + workerName;
  const consent = !!consented && consented === consentKey;

  async function writeSupport(support: Experience['support']) {
    setBusy('support'); setError('');
    try {
      const res = await fetch('/api/experiences', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...record, support }) });
      const data = await res.json() as { error?: string; record: Experience };
      if (!res.ok) throw new Error(data.error);
      onUpdate({ ...data.record, verifications: record.verifications });
      setDescription(''); setReferenceUrl('');
      toast.success('References updated');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update the reference.'); }
    finally { setBusy(''); }
  }

  async function requestVerification(event: React.FormEvent) {
    event.preventDefault();
    if (!consent || !claim) return;
    setBusy('request'); setError('');
    try {
      const res = await fetch('/api/verifications', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: requestId, experienceId: record.id, claimId: claim.id, recipientEmail: email.trim(), expectedSnapshot: snapshotJson, consent: true }) });
      const data = await res.json() as { error?: string; request: VerificationRequest };
      if (!res.ok) throw new Error(data.error);
      onUpdate({ ...record, verifications: [data.request, ...(record.verifications ?? []).filter(v => v.id !== data.request.id)] });
      setRequestId(crypto.randomUUID()); setConsented('');
      toast.success('Request link ready. No email has been sent.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not create the request.'); }
    finally { setBusy(''); }
  }

  async function withdraw(id: string) {
    setBusy(id); setError('');
    try {
      const res = await fetch(`/api/verifications/${id}`, { method: 'DELETE' });
      const data = await res.json() as { error?: string; request: VerificationRequest };
      if (!res.ok) throw new Error(data.error);
      onUpdate({ ...record, verifications: record.verifications?.map(v => v.id === id ? data.request : v) });
      toast.success('Request withdrawn. The link no longer shows your evidence.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not withdraw the request.'); }
    finally { setBusy(''); }
  }

  async function copyLink(id: string) {
    try { await navigator.clipboard.writeText(new URL(`/verify/${id}`, window.location.origin).href); toast.success('Request link copied'); }
    catch { setError('Copy is unavailable. Open the request and use its address.'); }
  }

  function mailRequest(request: VerificationRequest) {
    const url = new URL(`/verify/${request.id}`, window.location.origin).href;
    const body = `Can you confirm that I handled this part of the work and that the selected description is materially accurate?\n\n${url}\n\nOnly this selected evidence is shared. You can confirm, correct, or say you cannot verify. Please sign in with ${request.recipientEmail}.`;
    window.location.href = `mailto:${encodeURIComponent(request.recipientEmail)}?subject=${encodeURIComponent('WorkProof: confirm a work experience')}&body=${encodeURIComponent(body)}`;
  }

  if (record.demo) return null;
  return <section id="record-verification" className="verification-panel" aria-labelledby="verification-heading">
    <div className="section-heading"><h2 id="verification-heading"><ShieldCheck size={21} />Verification</h2></div>
    <p>Your record belongs to you. Only the evidence you choose below is shared. Your other experiences stay private.</p>
    <details className="request-composer">
      <summary>Request verification</summary>
      {facts.length === 0 ? <p>Review a factual action before requesting verification.</p> : <>
        <div className="field"><label id="verification-claim-label">Choose one factual claim</label>
          <Select value={claimId} onValueChange={setClaimId}><SelectTrigger aria-labelledby="verification-claim-label" className="picker"><SelectValue /></SelectTrigger>
            <SelectContent>{facts.map(c => <SelectItem key={c.id} value={c.id}>{labels[c.kind]}: {c.text}</SelectItem>)}</SelectContent></Select>
        </div>
        <details className="reference-composer"><summary><Paperclip size={16} />Add a supporting reference</summary>
          <form onSubmit={e => { e.preventDefault(); if (claim) void writeSupport([...(record.support ?? []), { id: crypto.randomUUID(), claimId: claim.id, claimText: claim.text, claimKind: claim.kind, quote: claim.quote, description: description.trim(), url: referenceUrl.trim() }]); }}>
            <div className="field"><label htmlFor="reference-description">What material supports this claim?</label><textarea id="reference-description" required minLength={3} maxLength={600} rows={2} placeholder="For example, a customer feedback email dated 2 September. Do not include customer personal details." value={description} onChange={e => setDescription(e.target.value)} /></div>
            <div className="field"><label htmlFor="reference-url">Link to material (optional)</label><input id="reference-url" type="url" maxLength={2048} value={referenceUrl} onChange={e => setReferenceUrl(e.target.value)} placeholder="https://" /></div>
            <p className="fine">Add only material you are allowed to share. A reference is not independent verification.</p>
            <button className="button small outline" disabled={!!busy || description.trim().length < 3}>Save reference</button>
          </form>
        </details>
        {snapshot && <div className="sharing-preview"><h3>Exactly what will be shared</h3><SharedEvidence snapshot={snapshot} workerName={workerName} /></div>}
        {snapshot?.support.map(s => <button key={s.id} className="text-button" disabled={!!busy} onClick={() => void writeSupport(record.support?.filter(x => x.id !== s.id))}><X size={15} />Remove reference: {s.description}</button>)}
        <form onSubmit={requestVerification}>
          <div className="field"><label htmlFor="verifier-email">Verifier email</label><input id="verifier-email" required type="email" autoComplete="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} /></div>
          <p className="fine">Choose someone who observed this work or can check supporting material. They must sign in using this email and have access to WorkProof. A link does not grant site access.</p>
          <div className="consent-row"><Checkbox id="verification-consent" checked={consent} onCheckedChange={checked => setConsented(checked === true ? consentKey : '')} /><label htmlFor="verification-consent">Share this exact evidence with this person for verification.</label></div>
          <button className="button" disabled={!!busy || !consent || !email.trim()}>{busy === 'request' ? <LoaderCircle className="spin" size={17} /> : <Link2 size={17} />}Create request link</button>
          <p className="fine">You send the link yourself. It expires after 14 days and can be withdrawn. Withdrawal cannot remove copies already taken by the recipient.</p>
        </form>
      </>}
    </details>
    {error && <p className="form-error" role="alert">{error}</p>}
    {(record.verifications ?? []).map(request => <article className="verification-receipt" key={request.id}>
      <div className="receipt-heading"><strong>{responseLabels[request.status]}</strong><span>{request.snapshot.claim.kind}</span></div>
      <p>{request.snapshot.claim.text}</p>
      <p className="fine">Requested from {request.recipientEmail} on {new Date(request.createdAt).toLocaleDateString('en-AU')}.</p>
      {!matchesCurrentClaim(record, request) && <p className="form-warning">Earlier claim version. This response does not verify the current evidence.</p>}
      {request.response && <div className="response-detail">
        <p><strong>{request.response.verifierName}</strong> responded on {new Date(request.response.respondedAt).toLocaleString('en-AU')}.</p>
        {request.response.relationship && <p className="fine">{request.response.relationship} (self-described). Basis: {request.response.basis}.</p>}
        {request.status === 'corrected' && <><p><strong>Proposed correction</strong></p><blockquote>{request.response.correction}</blockquote><p className="fine">Your original statement is not verified. Review the correction, update your record if accurate, then request confirmation of the revised claim.</p></>}
      </div>}
      <details className="source"><summary>Claim version and shared evidence</summary><p className="version-id">{request.version}</p><SharedEvidence snapshot={request.snapshot} workerName={request.workerName} /></details>
      <div className="receipt-actions">
        <a href={`/verify/${request.id}`} className="text-button">Open request</a>
        {request.status === 'pending' && <><button className="text-button" onClick={() => void copyLink(request.id)}><Copy size={16} />Copy link</button><button className="text-button" onClick={() => mailRequest(request)}><Mail size={16} />Email request</button></>}
        {request.status !== 'withdrawn' && <button className="text-button" disabled={!!busy} onClick={() => void withdraw(request.id)}><X size={16} />Withdraw access</button>}
      </div>
    </article>)}
  </section>;
}
