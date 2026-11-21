'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, Contrast, FileCheck2, LockKeyhole, Palette, ScanSearch, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import BrandSculpture from '@/components/BrandSculpture';
import { saveSession, type ActiveSession, type WorkspaceRole } from '@/lib/session';

const personas: Array<{ name: string; role: WorkspaceRole; initials: string; color: string; note: string }> = [
  { name: 'Alex Morgan', role: 'Brand Reviewer', initials: 'AM', color: 'indigo', note: 'Review findings and approve' },
  { name: 'Samira Rao', role: 'Content Creator', initials: 'SR', color: 'peach', note: 'Submit and improve drafts' },
  { name: 'Devon Patel', role: 'Brand Admin', initials: 'DP', color: 'green', note: 'Manage rules and facts' },
];

const checks = [
  { icon: ScanSearch, title: 'Claims that hold up', text: 'Checks product promises against your verified fact sheet.' },
  { icon: Sparkles, title: 'A voice that stays yours', text: 'Catches off-brand wording. Suggests fixes that preserve your intent.' },
  { icon: Palette, title: 'Colors you can read', text: 'Checks your palette and measures text contrast.' },
  { icon: LockKeyhole, title: 'Privacy before review', text: 'Masks emails and API keys before optional AI review.' },
];

export default function WelcomeLanding({ onEnter }: { onEnter?: (session: ActiveSession) => void }) {
  const router = useRouter();
  const enter = (name: string, role: WorkspaceRole) => {
    const session: ActiveSession = { name, role, workspace: 'Acme Cloud', entered: true };
    if (onEnter) onEnter(session);
    else {
      saveSession(session);
      router.push('/');
    }
  };
  const quickLinks = [
    { label: 'Overview Dashboard', href: '/', overview: true },
    { label: 'Run New Audit', href: '/audit/new' },
    { label: 'Brand Knowledge & Rules', href: '/knowledge' },
    { label: '30-Sec Brand Passport', href: '/impact' },
    { label: 'Gap Radar Analytics', href: '/analytics' },
  ];

  return <main className="vb-site">
    <a className="vb-skip" href="#main-content">Skip to content</a>
    <header className="vb-header vb-container">
      <Link href="/welcome" className="vb-logo" aria-label="VeriBrand AI home"><ShieldCheck size={28} strokeWidth={1.5} aria-hidden="true" /><span>VeriBrand<span className="vb-logo-ai"> AI</span></span></Link>
      <nav className="vb-navigation" aria-label="Main navigation"><a href="#product">The workspace</a><a href="#checks">What we check</a><a href="#roles">Your role</a></nav>
      <details className="vb-quickmenu"><summary>Quick access<ChevronDown size={14} aria-hidden="true"/></summary><nav aria-label="Workspace shortcuts">{quickLinks.map((item) => item.overview ? <Link href={item.href} key={item.href} onClick={(event) => { event.preventDefault(); enter('Alex Morgan', 'Brand Reviewer'); }}>{item.label}</Link> : <Link href={item.href} key={item.href}>{item.label}</Link>)}</nav></details>
      <button className="vb-nav-action" type="button" onClick={() => enter('Alex Morgan', 'Brand Reviewer')}>Open workspace</button>
    </header>
    <section className="vb-hero vb-container" id="main-content">
      <div className="vb-hero-copy">
        <h1>Keep your<br/>brand’s word.</h1>
        <p>Check claims, copy, and colors before your brand goes public.</p>
        <div className="vb-hero-actions"><button className="vb-button" type="button" onClick={() => enter('Alex Morgan', 'Brand Reviewer')}>Explore workspace</button><a className="vb-text-link" href="/impact">Try Brand Passport</a></div>
      </div>
      <BrandSculpture />
      <div className="vb-hero-foot"><span><Check size={16} aria-hidden="true" />No account required</span><span><LockKeyhole size={16} aria-hidden="true" />Human sign-off, always</span><a href="#product">See what’s inside<ChevronDown size={16} aria-hidden="true" /></a></div>
    </section>
    <section className="vb-product" id="product">
      <div className="vb-container">
        <div className="vb-section-head"><h2>A second look.<br/>Before the world looks.</h2><p>From first draft to human approval.<br/>Every finding comes with its source.</p></div>
        <figure className="vb-product-shot"><Image src="/images/workspace.png" width={1440} height={900} sizes="(max-width: 1440px) 90vw, 1296px" alt="VeriBrand’s actual audit workspace, showing the draft editor and audit controls"/><figcaption><span>The pre-seeded demo workspace</span><Link href="/audit/new">Run a new audit</Link></figcaption></figure>
        <ol className="vb-workflow"><li><h3>Know the rules.</h3><p>Open <Link href="/knowledge">Brand Knowledge</Link> for approved facts.</p></li><li><h3>Test a draft.</h3><p>Run a <Link href="/audit/new">new audit</Link> or try <Link href="/impact">Brand Passport</Link>.</p></li><li><h3>Review and approve.</h3><p>Accept a fix or record an override in the <Link href="/review/launch-blog">Review Room</Link>.</p></li></ol>
        <nav className="vb-product-links" aria-label="Quick jump">{quickLinks.map((item) => item.overview ? <Link href={item.href} key={item.href} onClick={(event) => { event.preventDefault(); enter('Alex Morgan', 'Brand Reviewer'); }}>{item.label}</Link> : <Link href={item.href} key={item.href}>{item.label}</Link>)}</nav>
      </div>
    </section>
    <section className="vb-checks vb-container" id="checks">
      <div className="vb-check-intro"><h2>Small details.<br/>Your whole reputation.</h2><p>A shared rulebook for the things your brand puts into the world.</p><Link className="vb-text-link" href="/knowledge">Explore brand knowledge</Link></div>
      <div className="vb-check-list">{checks.map(({ icon: Icon, title, text }) => <article key={title}><Icon size={24} strokeWidth={1.5} aria-hidden="true"/><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
    </section>
    <section className="vb-human">
      <div className="vb-container vb-human-layout"><div className="vb-human-type" aria-hidden="true">Human<br/>by design.</div><div className="vb-human-copy"><ShieldCheck size={40} strokeWidth={1} aria-hidden="true"/><h2>The final word<br/>is still yours.</h2><p>Accept a focused fix. Record an override. Leave a comment. You decide what gets published.</p><div className="vb-human-details"><span><Contrast size={20} aria-hidden="true"/>Exact WCAG contrast</span><span><FileCheck2 size={20} aria-hidden="true"/>Exportable review record</span></div><Link className="vb-light-link" href="/impact">Open Brand Passport</Link></div></div>
    </section>
    <section className="vb-roles vb-container" id="roles">
      <div className="vb-section-head"><h2>One brand.<br/>A seat for everyone.</h2><p>Choose a demo teammate to begin.<br/>You can switch roles in the workspace.</p></div>
      <div className="vb-personas">{personas.map((persona) => <button type="button" className="vb-persona" key={persona.name} onClick={() => enter(persona.name, persona.role)}><span className="vb-persona-initials">{persona.initials}</span><span className="vb-persona-copy"><small>{persona.role}</small><b>{persona.name}</b><span>{persona.note}</span></span><span className="vb-persona-enter">Enter</span></button>)}</div>
      <details className="vb-custom-persona"><summary><UserRound size={20} aria-hidden="true"/>Prefer your own name?<ChevronDown size={16} aria-hidden="true"/></summary><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const name = String(data.get('name') ?? '').trim(); const role = String(data.get('role') ?? 'Content Creator') as WorkspaceRole; if (name) enter(name, role); }}><label>Your name<input name="name" autoComplete="name" placeholder="Your name" maxLength={48} required pattern=".*\S.*"/></label><label>Workspace role<select name="role" defaultValue="Content Creator"><option>Content Creator</option><option>Brand Reviewer</option><option>Brand Admin</option></select></label><button type="submit" className="vb-button">Enter workspace</button></form></details>
    </section>
    <footer className="vb-footer"><div className="vb-container"><div className="vb-footer-top"><Link className="vb-logo" href="/welcome"><ShieldCheck size={28} strokeWidth={1.5} aria-hidden="true"/>VeriBrand AI</Link><p>Built by Team ArticXCoders.<br/>CodeZen India 2026, Inkloom AI Challenge.</p><div><Link href="/disclosures">How we built this</Link><Link href="/disclosures">AI &amp; tools disclosure</Link></div></div><div className="vb-footer-wordmark" aria-hidden="true">VeriBrand.</div><div className="vb-colophon"><span>Brand governance, with a human in the loop.</span><span>A live brand governance demo</span></div></div></footer>
  </main>;
}
