'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, BadgeCheck, BookOpenCheck, Check, Contrast, FileCheck2, LockKeyhole, Palette, ScanSearch, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { saveSession, type ActiveSession, type WorkspaceRole } from '@/lib/session';

const personas: Array<{ name: string; role: WorkspaceRole; initials: string; color: string; note: string }> = [
  { name: 'Alex Morgan', role: 'Brand Reviewer', initials: 'AM', color: 'indigo', note: 'Review findings and approve' },
  { name: 'Samira Rao', role: 'Content Creator', initials: 'SR', color: 'peach', note: 'Submit and improve drafts' },
  { name: 'Devon Patel', role: 'Brand Admin', initials: 'DP', color: 'green', note: 'Manage rules and facts' },
];

const checks = [
  { icon: ScanSearch, title: 'Wrong Numbers & Fake Claims', text: 'Checks product stats and promises against your company’s verified fact sheet.' },
  { icon: Sparkles, title: 'Tone & Banned Words', text: 'Catches hype or off-brand wording and suggests a fix that keeps the writer’s natural voice.' },
  { icon: Palette, title: 'Brand Colors & Readability', text: 'Checks design colors against your palette and checks whether text is easy to read.' },
  { icon: LockKeyhole, title: 'Human Approval & Privacy', text: 'Masks sensitive emails and API keys before optional AI review. A person stays in control of every change.' },
];

const steps = [
  { icon: UserRound, number: '01', title: 'Pick a role below', text: 'Choose Content Creator, Brand Reviewer, or Brand Admin to enter the demo.' },
  { icon: BookOpenCheck, number: '02', title: 'Check rules, then test a draft', text: 'Open Brand Knowledge, then try New Audit or the 30-second Brand Passport.' },
  { icon: FileCheck2, number: '03', title: 'Review and approve', text: 'Accept a suggested fix or record an override in the Review Room, then approve the draft.' },
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

  return <main className="welcome-page">
    <section className="welcome-quick-launch" aria-label="Skip the guide and jump to a section">
      <div className="welcome-quick-head"><div><span>RETURNING USER OR JUDGE?</span><b>Skip intro &amp; jump directly</b></div><button className="welcome-skip-button" onClick={() => enter('Alex Morgan', 'Brand Reviewer')}>Skip Guide &amp; Open Workspace <ArrowRight size={16}/></button></div>
      <nav className="welcome-quick-links" aria-label="Quick jump">{quickLinks.map((item) => item.overview
        ? <Link key={item.href} href={item.href} onClick={(event) => { event.preventDefault(); enter('Alex Morgan', 'Brand Reviewer'); }}>{item.label}<ArrowRight size={13}/></Link>
        : <Link key={item.href} href={item.href}>{item.label}<ArrowRight size={13}/></Link>)}</nav>
    </section>

    <nav className="welcome-nav"><Link href="/welcome" className="welcome-logo"><span><ShieldCheck size={18}/></span><b>VeriBrand<span> AI</span></b></Link><div><span className="demo-dot"/> Acme Cloud demo</div><Link href="/disclosures">How we built this <ArrowRight size={13}/></Link></nav>

    <section className="welcome-hero welcome-guide-hero">
      <div className="welcome-badge"><Sparkles size={13}/> Team ArticXCoders <i/> CodeZen India 2026 (Inkloom AI Challenge)</div>
      <span className="welcome-guide-kicker">UNDERSTAND VERIBRAND AI IN 30 SECONDS</span>
      <h1>Your Brand’s Pre-Publish<br/>Quality Gate—Explained Simply.</h1>
      <div className="welcome-analogy"><span className="analogy-icon"><ShieldCheck size={19}/></span><div><b>The Head Chef at the Kitchen Pass</b><p>Think of a busy restaurant kitchen. Before any plate leaves the kitchen for a customer’s table, the head chef checks it—making sure the ingredients are right and nothing unsafe goes out. Today, companies have dozens of writers, agencies, and AI tools publishing blogs, ads, and posters at once. VeriBrand AI is that head chef sitting right between “Save Draft” and “Publish”—catching wrong product numbers, off-brand colors, and risky claims before the public ever sees them.</p></div></div>
      <div className="welcome-assurance"><span><Check size={12}/> No account required</span><span><Check size={12}/> Demo data is ready</span><span><LockKeyhole size={12}/> Human sign-off stays in control</span></div>
    </section>

    <section className="welcome-checks"><div className="strip-heading"><span>WHAT IT CHECKS</span><h2>A simple check before your work goes public.</h2></div><div className="welcome-check-grid">{checks.map(({ icon: Icon, title, text }) => <article key={title}><span><Icon size={18}/></span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></section>

    <section className="welcome-audience"><div><span className="audience-heading">WHO IS IT FOR?</span><p>One shared brand rulebook, with a useful view for each person.</p></div><div className="audience-pills"><span>Writers &amp; Creators <small>Fast feedback while drafting</small></span><span>Brand Reviewers <small>Faster checks with rule citations</small></span><span>Founders &amp; Admins <small>See repeated team mistakes</small></span></div></section>

    <section className="how-strip welcome-how"><div className="strip-heading"><span>HOW TO USE IT</span><h2>Three steps from draft to approval.</h2><p>Choose a role below to start the demo.</p></div><div className="how-grid">{steps.map(({ icon: Icon, number, title, text }) => <article key={number}><div className="how-top"><span>{number}</span><Icon size={18}/></div><h3>{title}</h3><p>{text}</p></article>)}</div></section>

    <section className="persona-section" id="roles"><div className="persona-intro"><div><span>STEP 1 · CHOOSE YOUR ROLE</span><h2>Start with one click.</h2><p>Use a demo teammate or enter your own name. You can switch users later.</p></div><div className="persona-demo-tag"><BadgeCheck size={15}/> Safe demo workspace</div></div><div className="persona-grid">{personas.map((persona) => <button className="persona-card" key={persona.name} onClick={() => enter(persona.name, persona.role)}><span className={'persona-avatar '+persona.color}>{persona.initials}</span><span className="persona-copy"><b>{persona.name}</b><small>{persona.role}</small><em>{persona.note}</em></span><ArrowRight size={16}/></button>)}</div><form className="custom-persona" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const name = String(data.get('name') ?? '').trim(); const role = String(data.get('role') ?? 'Content Creator') as WorkspaceRole; if (name) enter(name, role); }}><UserRound size={16}/><label><span>Or use your name</span><input name="name" placeholder="Your name" maxLength={48} required/></label><label><span>Workspace role</span><select name="role" defaultValue="Content Creator"><option>Content Creator</option><option>Brand Reviewer</option><option>Brand Admin</option></select></label><button type="submit">Enter workspace <ArrowRight size={14}/></button></form></section>

    <section className="welcome-proof"><div><span><Contrast size={16}/></span><b>Exact contrast math</b><small>WCAG ratio with a clear pass/fail</small></div><div><span><Palette size={16}/></span><b>Brand color guardrails</b><small>Preview palette choices before publishing</small></div><div><span><BadgeCheck size={16}/></span><b>Evidence you can inspect</b><small>Rule citations, reviewer trail, exportable record</small></div></section>
    <footer className="welcome-footer"><span>VERIBRAND AI <i/> TEAM ARTICXCODERS</span><span>CodeZen India 2026 · Brand Governance Demo</span><Link href="/disclosures">AI &amp; tools disclosure <ArrowRight size={12}/></Link></footer>
  </main>;
}