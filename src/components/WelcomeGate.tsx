'use client';

import { Suspense, useSyncExternalStore } from 'react';
import OperationsHub from '@/components/OperationsHub';
import WelcomeLanding from '@/components/WelcomeLanding';
import { readSession, saveSession, sessionChangeEvent } from '@/lib/session';

function subscribe(listener: () => void) {
  window.addEventListener(sessionChangeEvent(), listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(sessionChangeEvent(), listener);
    window.removeEventListener('storage', listener);
  };
}

export default function WelcomeGate() {
  const session = useSyncExternalStore(subscribe, readSession, () => undefined);
  if (session === undefined) return <WelcomeLanding onEnter={saveSession} />;
  if (session?.entered) return <Suspense fallback={<main className="welcome-loading" aria-busy="true">Opening workspace…</main>}><OperationsHub /></Suspense>;
  return <WelcomeLanding onEnter={saveSession} />;
}
