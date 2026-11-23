'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
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

const demoPassword = 'VeriBrand@2026';
const demoAccounts: Array<{ email: string; role: WorkspaceRole; name: string }> = [
  { email: 'reviewer@acmecloud.demo', role: 'Brand Reviewer', name: 'Alex Morgan' },
  { email: 'creator@acmecloud.demo', role: 'Content Creator', name: 'Samira Rao' },
  { email: 'admin@acmecloud.demo', role: 'Brand Admin', name: 'Devon Patel' },
];

export default function WelcomeLanding({ onEnter }: { onEnter?: (session: ActiveSession) => void }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginRole, setLoginRole] = useState<WorkspaceRole>('Brand Reviewer');
  const [loginError, setLoginError] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const enter = (name: string, role: WorkspaceRole, accountEmail?: string) => {
    const session: ActiveSession = { name, role, workspace: 'Acme Cloud', entered: true, ...(accountEmail ? { email: accountEmail } : {}) };
    if (onEnter) onEnter(session);
    else {
      saveSession(session);
      router.push('/');
    }
  };
  const signIn = (accountEmail: string, role: WorkspaceRole, name?: string) => {
    const cleanEmail = accountEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || !cleanEmail.endsWith('.demo')) {
      setLoginError('Use a valid demo email address ending in .demo.');
      return;
    }
    setSigningIn(true);
    setLoginError('');
    enter(name || cleanEmail.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()), role, cleanEmail);
  };
  const submitDemoLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const account = demoAccounts.find((item) => item.email === email.trim().toLowerCase());
    if (account && password !== demoPassword) {
      setLoginError('That demo account password does not match.');
      return;
    }
    if (!account && password.trim().length < 4) {
      setLoginError('Enter a demo password (at least 4 characters) to continue.');
      return;
    }
    signIn(email, account?.role ?? loginRole, account?.name);
  };
  const quickLinks = [
    { label: 'Overview Dashboard', href: '/', overview: true },
    { label: 'Run New Audit', href: '/audit/new' },
    { label: 'Brand Knowledge & Rules', href: '/knowledge' },
    { label: '30-Sec Brand Passport', href: '/impact' },
    { label: 'Gap Radar Analytics', href: '/analytics' },
    { label: 'Claim Evidence Library', href: '/evidence' },
  ];

  return <main className="vb-site">
    <a className="vb-skip" href="#main-content">Skip to content</a>
    <header className="vb-header vb-container">
      <Link href="/welcome" className="vb-logo" aria-label="VeriBrand AI home"><ShieldCheck size={28} strokeWidth={1.5} aria-hidden="true" /><span>VeriBrand<span className="vb-logo-ai"> AI</span></span></Link>
      <nav className="vb-navigation" aria-label="Main navigation"><a href="#product">The workspace</a><a href="#checks">What we check</a><a href="#roles">Your role</a></nav>
      <details className="vb-quickmenu"><summary>Quick access<ChevronDown size={14} aria-hidden="true"/></summary><nav aria-label="Workspace shortcuts">{quickLinks.map((item) => item.overview ? <Link href={item.href} key={item.href} onClick={(event) => { event.preventDefault(); enter('Alex Morgan', 'Brand Reviewer'); }}>{item.label}</Link> : <Link href={item.href} key={item.href}>{item.label}</Link>)}</nav></details>
      <Link className="vb-nav-action" href="/login">Sign in / Create account</Link>
    </header>
    <section className="vb-hero vb-container" id="main-content">
      <div className="vb-hero-copy">
        <h1>Keep your<br/>brand’s word.</h1>
        <p>Check claims, copy, and colors before your brand goes public.</p>
        <div className="vb-hero-actions"><button className="vb-button" type="button" onClick={() => enter('Alex Morgan', 'Brand Reviewer', 'reviewer@acmecloud.demo')}>Explore workspace</button><a className="vb-text-link" href="/impact">Start a review</a></div>
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
      <div className="vb-personas">{personas.map((persona) => <button type="button" className="vb-persona" key={persona.name} onClick={() => enter(persona.name, persona.role, demoAccounts.find((item) => item.role === persona.role)?.email)}><span className="vb-persona-initials">{persona.initials}</span><span className="vb-persona-copy"><small>{persona.role}</small><b>{persona.name}</b><span>{persona.note}</span></span><span className="vb-persona-enter">Enter</span></button>)}</div>
      <details className="vb-custom-persona"><summary><UserRound size={20} aria-hidden="true"/>Prefer your own name?<ChevronDown size={16} aria-hidden="true"/></summary><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const name = String(data.get('name') ?? '').trim(); const role = String(data.get('role') ?? 'Content Creator') as WorkspaceRole; if (name) enter(name, role); }}><label>Your name<input name="name" autoComplete="name" placeholder="Your name" maxLength={48} required pattern=".*\S.*"/></label><label>Workspace role<select name="role" defaultValue="Content Creator"><option>Content Creator</option><option>Brand Reviewer</option><option>Brand Admin</option></select></label><button type="submit" className="vb-button">Enter workspace</button></form></details>
    </section>
    <section className="demo-login-section" aria-labelledby="demo-login-title">
      <div className="demo-login-heading"><span>JUDGE &amp; REVIEWER ACCESS</span><h2 id="demo-login-title">Demo account credentials</h2><p>Try a role with one click, or sign in with any demo email.</p></div>
      <div className="demo-login-grid">
        <div className="demo-credentials-card"><div className="demo-card-label"><ShieldCheck size={19}/><span>Ready-to-use accounts<small>Password for each: <b>{demoPassword}</b></small></span></div>
          {demoAccounts.map((account, index) => <div className="demo-credential-row" key={account.email}><span className={`demo-role-mark role-${index}`}>{account.name.split(' ').map((part) => part[0]).join('')}</span><span className="demo-credential-copy"><b>{account.role}{index === 0 ? ' · Recommended' : ''}</b><small>{account.email}</small></span><button type="button" disabled={signingIn} onClick={() => signIn(account.email, account.role, account.name)}>{signingIn ? 'Opening…' : 'Fill & Sign In'}</button></div>)}
        </div>
        <form className="demo-signin-card" onSubmit={submitDemoLogin}><div className="demo-card-label"><UserRound size={19}/><span>Email + password sign-in<small>Custom demo emails work too.</small></span></div>
          <label>Email<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@acmecloud.demo"/></label>
          <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter demo password"/></label>
          <label>Workspace role<select value={loginRole} onChange={(event) => setLoginRole(event.target.value as WorkspaceRole)}><option>Brand Reviewer</option><option>Content Creator</option><option>Brand Admin</option></select></label>
          {loginError && <p className="demo-login-error" role="alert">{loginError}</p>}
          <button className="demo-signin-submit" type="submit" disabled={signingIn}>{signingIn ? 'Signing in…' : 'Sign in to workspace →'}</button>
          <small className="demo-login-note">Demo access only. No real account or external authentication is required.</small>
        </form>
      </div>
    </section>
    <footer className="vb-footer"><div className="vb-container"><div className="vb-footer-top"><Link className="vb-logo" href="/welcome"><ShieldCheck size={28} strokeWidth={1.5} aria-hidden="true"/>VeriBrand AI</Link><p>Built by Team ArticXCoders.<br/>CodeZen India 2026, Inkloom AI Challenge.</p><div><Link href="/disclosures">How we built this</Link><Link href="/disclosures">AI &amp; tools disclosure</Link></div></div><div className="vb-footer-wordmark" aria-hidden="true">VeriBrand.</div><div className="vb-colophon"><span>Brand governance, with a human in the loop.</span><span>A live brand governance demo</span></div></div></footer>
  </main>;
}
