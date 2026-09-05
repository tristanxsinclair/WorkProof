'use client';
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';

export default function DataControls({ accountId, recordId }: { accountId: string; recordId?: string }) {
  const [open, setOpen] = useState(false), [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function remove() {
    if (confirmation !== 'DELETE' || busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/privacy', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(recordId ? { scope: 'record', recordId, confirmation } : { scope: 'all', confirmation }) });
      const data = await response.json() as { error?: string; deleted?: boolean };
      if (!response.ok) throw new Error(data.error || 'Deletion did not complete.');
      try {
        const key = `workproof-draft-v1:${accountId}`;
        const draft = sessionStorage.getItem(key);
        if (!recordId || (draft && JSON.parse(draft).draft?.id === recordId)) sessionStorage.removeItem(key);
      } catch { /* Server deletion succeeded even if browser storage is blocked. */ }
      window.location.assign('/evidence');
    } catch (error) { setError(error instanceof Error ? error.message : 'Deletion did not complete.'); setBusy(false); }
  }
  return <AlertDialog open={open} onOpenChange={value => { if (!busy) { setOpen(value); setConfirmation(''); setError(''); } }}>
    <AlertDialogTrigger className="text-button danger-button"><Trash2 size={16}/>{recordId ? 'Delete this experience' : 'Delete my WorkProof data'}</AlertDialogTrigger>
    <AlertDialogContent className="delete-dialog"><AlertDialogHeader><AlertDialogTitle>{recordId ? 'Delete this experience?' : 'Delete all your WorkProof data?'}</AlertDialogTitle><AlertDialogDescription>
      {recordId ? 'This permanently removes this record and its verification requests from WorkProof. Its request links will stop working.' : 'This permanently removes your saved experiences, sent verification requests and verification responses you gave on other records. Those confirmations will no longer count.'}
      {' '}Download an export first if you want to keep a copy. Other people’s downloaded copies cannot be recalled. This does not delete your ChatGPT account.
    </AlertDialogDescription></AlertDialogHeader>
      <label className="field-label" htmlFor="delete-confirmation">Type DELETE to confirm</label><input className="plain-input" id="delete-confirmation" autoComplete="off" value={confirmation} onChange={e => setConfirmation(e.target.value)} disabled={busy}/>
      {error && <p role="alert" className="form-error">{error}</p>}
      <AlertDialogFooter><AlertDialogCancel disabled={busy}>Keep my data</AlertDialogCancel><button className="button danger-fill" disabled={confirmation !== 'DELETE' || busy} onClick={remove}>{busy ? 'Deleting…' : 'Delete permanently'}</button></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
