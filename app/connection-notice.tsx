'use client';
import { useSyncExternalStore } from 'react';
function subscribe(listener: () => void) {
  window.addEventListener('online', listener); window.addEventListener('offline', listener);
  return () => { window.removeEventListener('online', listener); window.removeEventListener('offline', listener); };
}
export default function ConnectionNotice() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  return online ? null : <aside className="notice" role="status">You’re offline. You can keep reviewing in this tab; saving, loading and verification need a connection. This unfinished draft is not a cloud backup.</aside>;
}
