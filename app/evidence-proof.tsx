'use client';

import { CircleHelp, FileText, Paperclip, ShieldCheck, Download } from 'lucide-react';
import { type Claim, type Experience, labels } from '@/lib/evidence';
import { evidenceState, type VerificationBasis } from '@/lib/verification';

export function EvidenceBadge({ record, claim }: { record: Experience; claim: Claim }) {
  const status = evidenceState(record, claim);
  const Icon = status === 'Verified' ? ShieldCheck : status === 'Supported' ? Paperclip : status === 'Missing evidence' ? CircleHelp : FileText;
  return <span className={`proof-state proof-${status.split(' ')[0].toLowerCase()}`}><Icon size={14} />{status}</span>;
}

export function EvidenceLegend() {
  return <details className="proof-legend">
    <summary>What these statuses mean</summary>
    <dl>
      <dt>Reported</dt><dd>You stated it. Reviewing your own words is not external verification.</dd>
      <dt>Supported</dt><dd>You added a reference to supporting material. WorkProof has not checked it.</dd>
      <dt>Verified</dt><dd>A named, signed-in person confirmed this exact claim version. Their relationship and basis are recorded, not independently certified.</dd>
    </dl>
    <p>Capabilities are interpretations of your actions, not ratings of you.</p>
  </details>;
}

export function ExtractedOverview({ record }: { record: Experience }) {
  const retained = record.claims.filter(c => !c.rejected && c.state !== 'MISSING EVIDENCE');
  const actions = retained.filter(c => c.kind === 'action');
  const outcomes = retained.filter(c => c.kind === 'outcome');
  const capabilities = retained.filter(c => c.kind === 'skill');
  return <details className="extracted-overview">
    <summary>Experience at a glance</summary>
    <dl><dt>Context</dt><dd>{record.context}</dd><dt>Action</dt><dd>{actions.map(c => c.text).join(' ') || 'Not provided'}</dd>
      <dt>Outcome</dt><dd>{outcomes.map(c => c.text).join(' ') || 'Outcome not established'}</dd></dl>
    <h3>Capabilities suggested by these actions</h3><div className="chips">{capabilities.length ? capabilities.map(c => <span key={c.id}>{c.text}</span>) : <p>Not provided</p>}</div>
    <p className="fine">Reported, not yet independently verified. Check the statements below.</p>
  </details>;
}

export function SharedEvidence({ snapshot, workerName }: { snapshot: VerificationBasis; workerName: string }) {
  return <div className="shared-evidence">
    <dl className="sharing-meta"><dt>Worker</dt><dd>{workerName}</dd><dt>Context</dt><dd>{snapshot.context}</dd><dt>Date</dt><dd>{snapshot.date}</dd></dl>
    <h3>{labels[snapshot.claim.kind]}</h3><p className="selected-claim">{snapshot.claim.text}</p>
    <details className="source"><summary>Supporting description: {snapshot.claim.source === 'clarification' ? 'worker clarification' : 'source excerpt'}</summary><blockquote>{snapshot.claim.quote}</blockquote></details>
    {snapshot.limitations.length > 0 && <div className="shared-limitations"><h3>Limitations included</h3>{snapshot.limitations.map((l, i) => <p key={i}>{l.text}</p>)}</div>}
    {snapshot.support.length > 0 && <div className="shared-support"><h3>Worker-added references</h3>{snapshot.support.map(s => <p key={s.id}>{s.description}{s.url && <> <a href={s.url} target="_blank" rel="noopener noreferrer">Open reference</a></>}</p>)}<p className="fine">The existence and accuracy of this material have not been checked by WorkProof.</p></div>}
  </div>;
}

export function ExportEvidence({ records }: { records: Experience[] }) {
  function download() {
    const payload = { format: 'workproof-evidence-v1', exportedAt: new Date().toISOString(),
      verificationScope: 'Only confirmed, unchanged claim versions are externally verified. Self-review is Reported. References are worker-supplied. Verifier relationships are self-described.',
      records: records.filter(r => !r.demo) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'workproof-evidence.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <button className="text-button" disabled={!records.some(r => !r.demo)} onClick={download}><Download size={17} />Export evidence</button>;
}
