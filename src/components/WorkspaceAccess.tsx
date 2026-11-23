'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/auth-fetch';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import { clearSession } from '@/lib/session';
import { useRouter } from 'next/navigation';
import type { ReviewActor } from '@/lib/governance';

type Access = { mode: 'loading' | 'demo' | 'authenticated'; actor: ReviewActor | null; error?: string };
export function useWorkspaceAccess() {
  const [access, setAccess] = useState<Access>({ mode: 'loading', actor: null });
  useEffect(() => {
    let active = true;
    authFetch('/api/access', { cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error('Workspace access could not be verified.');
      return response.json();
    }).then(value => { if (active) setAccess(value); }).catch(() => { if (active) setAccess({ mode: 'authenticated', actor: null, error: 'Workspace access could not be verified. Reload to retry.' }); });
    return () => { active = false; };
  }, []);
  return access;
}
export default function WorkspaceAccess({ access }: { access: Access }) {
  const router = useRouter();
  const [error, setError] = useState('');
  async function signOut() {
    const result = await getSupabaseBrowser()?.auth.signOut();
    if (result?.error) { setError('Sign out failed. Please try again.'); return; }
    clearSession(); router.push('/login');
  }
  return <section className="gv-access-notice" aria-label="Workspace identity"><b>{access.mode === 'demo' ? 'Demo workspace' : access.actor ? 'Verified workspace member' : 'Workspace access'}</b><span>{access.mode === 'loading' ? 'Verifying identity…' : access.mode === 'demo' ? 'Roles are demonstration personas. No authenticated approval is claimed.' : access.actor ? `${access.actor.name} / ${access.actor.role}` : access.error || 'Sign in with an account assigned to this workspace.'}</span>{access.mode === 'authenticated' && !access.actor && <Link href="/login">Sign in</Link>}{access.actor && <button className="gv-quiet" onClick={() => void signOut()}>Sign out</button>}{error && <p role="alert">{error}</p>}</section>;
}
