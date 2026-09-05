'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { contexts, normalizeEvidence, type Experience } from '@/lib/evidence';

type DraftState = { raw: string; context: string; date: string; draft: Experience | null; step: 'capture' | 'review' | 'preview' };
type Update = Partial<DraftState> | ((current: DraftState) => Partial<DraftState>);
const empty: DraftState = { raw: '', context: 'Retail sales', date: '', draft: null, step: 'capture' };
const serverSnapshot = JSON.stringify(empty);

function decode(value: string): DraftState {
  try {
    const data = JSON.parse(value);
    return {
      raw: typeof data.raw === 'string' ? data.raw : '',
      context: contexts.includes(data.context) ? data.context : 'Retail sales',
      date: typeof data.date === 'string' ? data.date : '',
      draft: data.draft && Array.isArray(data.draft.claims) ? normalizeEvidence(data.draft) : null,
      step: ['capture', 'review', 'preview'].includes(data.step) ? data.step : 'capture',
    };
  } catch { return empty; }
}

function createStore(key: string) {
  let snapshot = serverSnapshot;
  if (typeof window !== 'undefined') {
    let stored: string | null = null;
    try { stored = sessionStorage.getItem(key); } catch { /* A blocked store still permits an in-memory draft. */ }
    const initial = stored ? decode(stored) : empty;
    snapshot = JSON.stringify({ ...initial, date: initial.date || new Date().toLocaleDateString('en-CA') });
  }
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    update: (change: Update) => {
      const current = decode(snapshot);
      snapshot = JSON.stringify({ ...current, ...(typeof change === 'function' ? change(current) : change) });
      try { sessionStorage.setItem(key, snapshot); } catch { /* Keep the draft usable without browser persistence. */ }
      listeners.forEach(listener => listener());
    },
  };
}

export function useCaptureDraft(accountId: string) {
  const key = `workproof-draft-v1:${accountId}`;
  const store = useMemo(() => createStore(key), [key]);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, () => serverSnapshot);
  return { ...useMemo(() => decode(snapshot), [snapshot]), key, update: store.update };
}
