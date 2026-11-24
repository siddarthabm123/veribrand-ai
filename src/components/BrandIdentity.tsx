'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import { brandName, brandInitials } from '@/lib/brand-profile';
import '@/app/brand-profile.css';

export default function BrandIdentity() {
  const [name, setName] = useState('Your brand'), [signedIn, setSignedIn] = useState(false), [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const client = getSupabaseBrowser();
    async function sync() {
      if (!client) { if (active) setLoading(false); return; }
      const { data } = await client.auth.getUser();
      if (!active) return;
      setSignedIn(Boolean(data.user)); setName(brandName(data.user?.user_metadata?.brand_name) || 'Add your brand'); setLoading(false);
    }
    void sync();
    const listener = client?.auth.onAuthStateChange(() => { void sync(); });
    return () => { active = false; listener?.data.subscription.unsubscribe(); };
  }, []);
  return <Link className="brand-profile-switch" href={signedIn ? '/brand' : '/login'} aria-label={signedIn ? `Edit brand profile: ${name}` : 'Sign in to add your brand'}><span className="brand-profile-initials">{brandInitials(name)}</span><span className="brand-profile-copy"><b>{loading ? 'Your brand' : name}</b><small>{loading ? 'Loading profile…' : signedIn ? 'Edit brand profile' : 'Sign in to add your brand'}</small></span><ChevronRight size={15}/></Link>;
}
