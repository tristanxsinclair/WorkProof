import type { Claim, Experience, Kind } from './evidence';

export type SupportReference = {
  id: string;
  claimId: string;
  claimText: string;
  claimKind: Kind;
  quote: string;
  description: string;
  url: string;
};

export type VerificationBasis = {
  context: string;
  date: string;
  claim: Pick<Claim, 'id' | 'kind' | 'text' | 'quote' | 'source'>;
  limitations: { text: string; quote: string }[];
  support: SupportReference[];
};

export type VerificationResponse = {
  verifierId: string;
  verifierName: string;
  verifierEmail: string;
  relationship: string;
  basis: string;
  correction: string;
  respondedAt: string;
};

export type VerificationRequest = {
  id: string;
  experienceId: string;
  workerName: string;
  recipientEmail: string;
  version: string;
  snapshot: VerificationBasis;
  status: 'pending' | 'confirmed' | 'corrected' | 'cannot_verify' | 'withdrawn' | 'expired';
  createdAt: string;
  expiresAt: string;
  response: VerificationResponse | null;
};

export const factualKinds: Kind[] = ['situation', 'action', 'outcome', 'metrics'];

export function claimSupport(record: Experience, claim: Claim) {
  return (record.support ?? []).filter(s => s.claimId === claim.id && s.claimKind === claim.kind
    && s.claimText === claim.text && s.quote === claim.quote);
}

export function verificationBasis(record: Experience, claim: Claim): VerificationBasis {
  return {
    context: record.context,
    date: record.date,
    claim: { id: claim.id, kind: claim.kind, text: claim.text, quote: claim.quote, source: claim.source },
    limitations: record.claims.filter(c => c.kind === 'limitation' && !c.rejected && c.state === 'USER VERIFIED')
      .map(c => ({ text: c.text, quote: c.quote })),
    support: claimSupport(record, claim),
  };
}

export function matchesCurrentClaim(record: Experience, request: VerificationRequest) {
  const claim = record.claims.find(c => c.id === request.snapshot.claim.id && !c.rejected && c.state === 'USER VERIFIED');
  return !!claim && JSON.stringify(verificationBasis(record, claim)) === JSON.stringify(request.snapshot);
}

export function evidenceState(record: Experience, claim: Claim): 'Reported' | 'Supported' | 'Verified' | 'Missing evidence' {
  if (claim.rejected || claim.state === 'MISSING EVIDENCE') return 'Missing evidence';
  if (factualKinds.includes(claim.kind) && (record.verifications ?? []).some(v =>
    v.status === 'confirmed' && v.response && v.snapshot.claim.id === claim.id && matchesCurrentClaim(record, v))) return 'Verified';
  if (claimSupport(record, claim).length) return 'Supported';
  return 'Reported';
}

export const responseLabels: Record<VerificationRequest['status'], string> = {
  pending: 'Awaiting response', confirmed: 'Confirmed', corrected: 'Correction proposed',
  cannot_verify: 'Cannot verify', withdrawn: 'Withdrawn', expired: 'Expired',
};
