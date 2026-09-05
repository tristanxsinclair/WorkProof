import { canSave, groundingError, normalizeEvidence, reviewed, translations, type Experience } from './evidence.ts';
import { evidenceState, factualKinds } from './verification.ts';

export const MAX_PACK_RECORDS = 12;

// The bank can display legacy records, but a career output must pass today's
// grounding checks. Neither fictional data nor stale interpretations count.
export function careerRecords(records: Experience[]) {
  const unique = new Map<string, Experience>();
  for (const value of records) {
    const record = normalizeEvidence(value);
    if (!record.demo && canSave(record) && !groundingError(record)) unique.set(record.id, record);
  }
  return [...unique.values()].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}

export function capabilityIndex(records: Experience[]) {
  const capabilities = new Map<string, { name: string; recordIds: string[]; confirmedActionRecordIds: string[] }>();
  for (const record of careerRecords(records)) {
    for (const skill of translations(record).skills) {
      const item = capabilities.get(skill.text) ?? { name: skill.text, recordIds: [], confirmedActionRecordIds: [] };
      if (!item.recordIds.includes(record.id)) item.recordIds.push(record.id);
      const confirmed = reviewed(record, 'action').some(action => action.quote === skill.quote && evidenceState(record, action) === 'Verified');
      if (confirmed && !item.confirmedActionRecordIds.includes(record.id)) item.confirmedActionRecordIds.push(record.id);
      capabilities.set(skill.text, item);
    }
  }
  return [...capabilities.values()].sort((a, b) => b.recordIds.length - a.recordIds.length || a.name.localeCompare(b.name));
}

export function matchesEvidenceSearch(record: Experience, search: string) {
  const haystack = [record.title, record.context, record.date, ...reviewed(record).map(c => c.text)].join(' ').toLocaleLowerCase();
  return search.trim().toLocaleLowerCase().split(/\s+/).every(term => haystack.includes(term));
}

export function packRecords(records: Experience[], selectedIds: string[]) {
  const selected = new Set(selectedIds.slice(0, MAX_PACK_RECORDS));
  return careerRecords(records).filter(record => selected.has(record.id));
}

export function careerPackText(records: Experience[], selectedIds: string[], purpose = '') {
  const selected = packRecords(records, selectedIds);
  if (!selected.length) return '';
  const lines = ['WORKPROOF — CAREER PACK', ...(purpose.trim() ? [`Preparation for: ${purpose.trim().slice(0, 120)}`] : []),
    'Worker-reviewed evidence. Capabilities are interpretations, not independent ratings.',
    'Reported = worker-stated. Supported = worker-added reference, not inspected. Verified = a named signed-in person confirmed this exact fact version; authority is not independently certified.', ''];
  for (const record of selected) {
    const career = translations(record);
    lines.push(`${record.title} | ${record.context} | ${record.date}`, `Record ID: ${record.id}`, '', 'CAREER WORDING', career.bullet,
      `Source statement IDs: ${career.ids.join(', ')}`, '', 'INTERVIEW PREPARATION');
    for (const part of career.star) lines.push(`${part.label}: ${part.claims.length ? part.claims.map(c => c.text).join(' ') : part.fallback ?? (part.label === 'Result' ? 'Outcome not established' : 'Not provided')}`);
    lines.push(`Quantitative evidence: ${reviewed(record, 'metrics').map(c => c.text).join(' ') || 'Not provided'}`,
      `Capabilities suggested: ${career.skills.map(c => c.text).join(', ') || 'Not provided'}`, '', 'LIMITATIONS',
      ...(career.limitations.length ? career.limitations.map(c => c.text) : ['No additional limitations recorded. This is not a guarantee of accuracy.']), '', 'SOURCE STATEMENTS');
    for (const claim of reviewed(record).filter(c => factualKinds.includes(c.kind) || c.kind === 'limitation')) {
      lines.push(`[${claim.id}] ${evidenceState(record, claim)} — ${claim.text}`);
    }
    lines.push('', 'PRACTISE ANSWERING', ...career.questions.map(q => q.text), '', '---', '');
  }
  lines.push('This pack includes selected reviewed statements, not the full raw record, private reference links, verifier contact details or correction history. Keep the private JSON export for the full audit trail. Sharing makes a copy that WorkProof cannot withdraw.');
  return lines.join('\n');
}
