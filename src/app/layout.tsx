import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import './globals.css';
import './impact.css';
import './review-room.css';
import './disclosures.css';
import './welcome.css';
import './readability.css';
import './welcome-upgrade.css';
import './studio.css';
import './workspace-studio.css';

export const metadata: Metadata = {
  title: 'VeriBrand AI | Keep your brand’s word',
  description: 'Check claims, copy, and colors before your brand goes public. Source-cited findings, focused fixes, and human approval.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth"><body>{children}<Link className="passport-launcher" href="/impact"><span><ShieldCheck size={15} aria-hidden="true"/></span><b>Brand Passport</b></Link></body></html>;
}
