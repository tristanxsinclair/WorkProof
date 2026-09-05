'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Copy, Download, FileText, Share2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import type { Experience } from '@/lib/evidence';
import { capabilityIndex, careerRecords, careerPackText, MAX_PACK_RECORDS, packRecords } from '@/lib/career-pack';

export function CapabilitySummary({ records, onChoose }: { records: Experience[]; onChoose: (skill: string) => void }) {
  const capabilities = capabilityIndex(records);
  if (!capabilities.length) return null;
  const tiles = (items: typeof capabilities) => items.map(item => <button key={item.name} className="capability-tile" onClick={() => onChoose(item.name)}>
    <strong>{item.name}</strong><span>Based on {item.recordIds.length} experience{item.recordIds.length === 1 ? '' : 's'}</span>
    {item.confirmedActionRecordIds.length > 0 && <small>{item.confirmedActionRecordIds.length} with a confirmed source action</small>}
  </button>);
  return <section className="capability-summary" aria-labelledby="capability-heading">
    <div className="section-heading"><div><h2 id="capability-heading">What your experience shows</h2><p>Each count links back to distinct, reviewed experiences. Not a rating.</p></div></div>
    <div className="capability-list">{tiles(capabilities.slice(0, 4))}</div>
    {capabilities.length > 4 && <details className="review-archive"><summary>Show {capabilities.length - 4} more capabilities</summary><div className="capability-list">{tiles(capabilities.slice(4))}</div></details>}
  </section>;
}

export default function CareerPack({ records }: { records: Experience[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [purpose, setPurpose] = useState('');
  const available = careerRecords(records);
  const chosen = packRecords(records, selected);
  const text = careerPackText(records, selected, purpose);
  async function copy() {
    try { await navigator.clipboard.writeText(text); toast.success('Career Pack copied'); }
    catch { toast.error('Copy is unavailable. Select the preview text or download it instead.'); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'workproof-career-pack.txt'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function share() {
    if (!navigator.share) { await copy(); return; }
    try { await navigator.share({ title: 'WorkProof Career Pack', text }); }
    catch (error) { if (!(error instanceof Error && error.name === 'AbortError')) toast.error('Sharing is unavailable. Copy or download the pack instead.'); }
  }
  return <div className="career-pack-page">
    <div className="page-intro"><div className="eyebrow">FROM EVIDENCE TO OPPORTUNITY</div><h1>Your Career Pack<span className="green-text">.</span></h1><p>Choose the real experiences you want to use. Take their career wording, interview notes and evidence status with you.</p></div>
    {!available.length ? <div className="empty-state"><FileText size={32}/><h2>Start with one real experience.</h2><p>Saved, fully reviewed experiences appear here. Fictional examples and records that need source corrections are excluded.</p><Link className="button" href="/">Capture an experience</Link><Link className="text-button" href="/evidence">Review your Evidence Bank</Link></div> : <>
      <div className="pack-layout"><section className="pack-selection" aria-labelledby="pack-selection-heading">
        <h2 id="pack-selection-heading">1. Choose your evidence</h2><p className="subtle">Up to {MAX_PACK_RECORDS} experiences. Nothing is shared automatically.</p>
        <label className="field-label" htmlFor="pack-purpose">What are you preparing for? <span className="subtle">Optional</span></label>
        <input id="pack-purpose" className="plain-input" maxLength={120} value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="Retail interview, promotion conversation…"/>
        <div className="pack-records">{available.map(record => <label key={record.id} className={`pack-record ${selected.includes(record.id) ? 'selected' : ''}`}>
          <Checkbox aria-label={`Include ${record.title}`} checked={selected.includes(record.id)} disabled={!selected.includes(record.id) && selected.length >= MAX_PACK_RECORDS} onCheckedChange={checked => setSelected(current => checked ? [...current, record.id] : current.filter(id => id !== record.id))}/>
          <span><strong>{record.title}</strong><small>{record.context} · {record.date}</small><Link href={`/evidence/${record.id}`}>Inspect source record</Link></span>
        </label>)}</div>
      </section><section className="pack-output" aria-labelledby="pack-preview-heading">
        <h2 id="pack-preview-heading">2. Review what leaves WorkProof</h2><p className="subtle">Includes selected reviewed statements and their limitations. Excludes full raw history, private reference links and verifier contact details.</p>
        <p className="pack-count" role="status">{chosen.length} experience{chosen.length === 1 ? '' : 's'} selected</p>
        {text ? <><pre className="pack-preview" tabIndex={0} aria-label="Exact Career Pack text">{text}</pre><div className="pack-actions"><button className="button" onClick={share}><Share2 size={17}/>Share / copy</button><button className="button outline" onClick={download}><Download size={17}/>Download</button><button className="text-button" onClick={copy}><Copy size={17}/>Copy text</button></div><p className="fine">Sharing creates a copy. Check for customer names or confidential workplace details before sending.</p></> : <div className="pack-placeholder"><FileText size={28}/><p>Select an experience to see the exact pack you can copy, download or share.</p></div>}
      </section></div>
    </>}
  </div>;
}
