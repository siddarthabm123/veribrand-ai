'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, LogOut, UsersRound } from 'lucide-react';
import { clearSession, readSession, sessionChangeEvent, type ActiveSession } from '@/lib/session';

export default function SessionProfile() {
  const router = useRouter();
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { const sync = () => setSession(readSession()); sync(); window.addEventListener(sessionChangeEvent(), sync); window.addEventListener('storage', sync); return () => { window.removeEventListener(sessionChangeEvent(), sync); window.removeEventListener('storage', sync); }; }, []);
  const name = session?.email ?? session?.name ?? 'Alex Morgan';
  const role = session?.role ?? 'Brand Reviewer';
  const initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return <div className="profile-session-wrap"><button className="profile profile-session" aria-expanded={open} onClick={() => setOpen((value) => !value)}><span className="avatar">{initials}</span><span className="profile-session-copy"><b title={name}>{name}</b><small>• {role}</small></span><ChevronRight size={15}/></button>{open && <div className="profile-menu"><button onClick={() => { clearSession(); setOpen(false); router.push('/welcome'); }}><UsersRound size={14}/> Switch Demo Account</button><button onClick={() => { clearSession(); setOpen(false); router.push('/welcome'); }}><LogOut size={14}/> Sign Out</button></div>}</div>;
}
