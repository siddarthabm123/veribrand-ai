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
  const name = session?.name ?? 'Alex Morgan';
  const role = session?.role ?? 'Brand Reviewer';
  const initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return <div className="profile-session-wrap"><button className="profile profile-session" aria-expanded={open} onClick={() => setOpen((value) => !value)}><span className="avatar">{initials}</span><span className="profile-session-copy"><b>{name}</b><small>{role}</small></span><ChevronRight size={15}/></button>{open && <div className="profile-menu"><button onClick={() => { setOpen(false); router.push('/welcome'); }}><UsersRound size={14}/> Switch User</button><button onClick={() => { clearSession(); setOpen(false); router.push('/'); }}><LogOut size={14}/> Sign Out</button></div>}</div>;
}
