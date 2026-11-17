'use client';

import { Suspense, useSyncExternalStore } from 'react';
import Workspace from '@/components/Workspace';
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
  if (session === undefined) return <main className="welcome-loading" aria-busy="true">Loading VeriBrand AI…</main>;
  if (session?.entered) return <Suspense fallback={<main className="welcome-loading" aria-busy="true">Opening workspace…</main>}><Workspace /></Suspense>;
  return <WelcomeLanding onEnter={saveSession} />;
}
