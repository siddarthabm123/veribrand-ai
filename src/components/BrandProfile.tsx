'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import { brandName, brandInitials } from '@/lib/brand-profile';
import { readSession, saveSession } from '@/lib/session';
import '@/app/brand-profile.css';

export default function BrandProfile() {
  const [name, setName] = useState(''), [description, setDescription] = useState('');
  const [signedIn, setSignedIn] = useState(false), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    async function load() {
      const client = getSupabaseBrowser();
      if (!client) { if (active) { setMessage('Account access must be configured to save your brand profile.'); setLoading(false); } return; }
      const { data, error } = await client.auth.getUser();
      if (!active) return;
      if (error || !data.user) setMessage('Sign in to add or edit your brand.');
      else { setSignedIn(true); setName(brandName(data.user.user_metadata?.brand_name)); setDescription(typeof data.user.user_metadata?.brand_description === 'string' ? data.user.user_metadata.brand_description.slice(0, 500) : ''); }
      setLoading(false);
    }
    void load().catch(() => { if (active) { setMessage('Your brand profile could not be loaded. Reload to retry.'); setLoading(false); } });
    return () => { active = false; };
  }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    const clean = brandName(name);
    if (clean.length < 2) { setMessage('Enter a brand name with at least two characters.'); return; }
    const client = getSupabaseBrowser(); if (!client) return;
    setBusy(true); setMessage('');
    try {
      const { data, error } = await client.auth.updateUser({ data: { brand_name: clean, brand_description: description.trim().slice(0, 500) } });
      if (error || !data.user) throw new Error(error?.message || 'Sign in again to save your brand.');
      const session = readSession();
      if (session && session.email === data.user.email) saveSession({ ...session, workspace: clean });
      setName(clean); setMessage('Brand profile saved to your account. Your brand name will appear in the workspace header.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Your brand could not be saved. Please retry.'); }
    finally { setBusy(false); }
  }
  return <main className="gv-page"><header className="gv-nav"><Link href="/dashboard">VeriBrand dashboard</Link><Link href="/judge">Try judge demo</Link></header><section className="gv-intro"><h1>Your brand profile.</h1><p>Use your own brand name instead of the fictional Acme Cloud example.</p></section><section className="gv-panel"><div className="brand-profile-preview"><span className="brand-profile-initials">{brandInitials(brandName(name))}</span><div><b>{brandName(name) || 'Your brand name'}</b><small>Account brand profile</small></div></div><p role="status">{loading ? 'Loading your profile…' : message}</p>{!loading && !signedIn ? <Link className="gv-primary" href="/login">Sign in to add your brand</Link> : <form onSubmit={save}><fieldset disabled={loading || busy || !signedIn}><label>Brand name<input value={name} onChange={event => setName(event.target.value)} minLength={2} maxLength={80} required placeholder="e.g. Northstar Studio" autoComplete="organization"/></label><label>About your brand (optional)<textarea value={description} onChange={event => setDescription(event.target.value)} maxLength={500} placeholder="What does your brand do?"/></label><button className="gv-primary">{busy ? 'Saving…' : 'Save brand profile'}</button></fieldset></form>}<p className="gv-demo-note">This saves your account’s brand profile. It does not create a separate team workspace or change shared evidence, review rules, or permissions. Judge mode continues to use fictional examples.</p></section></main>;
}
