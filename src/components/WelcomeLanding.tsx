'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, BadgeCheck, BookOpenCheck, Check, Contrast, FileCheck2, LockKeyhole, Palette, ScanSearch, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { saveSession, type ActiveSession, type WorkspaceRole } from '@/lib/session';

const personas: Array<{ name: string; role: WorkspaceRole; initials: string; color: string; note: string }> = [
  { name: 'Alex Morgan', role: 'Brand Reviewer', initials: 'AM', color: 'indigo', note: 'Review findings & approve' },
  { name: 'Samira Rao', role: 'Content Creator', initials: 'SR', color: 'peach', note: 'Submit & refine drafts' },
  { name: 'Devon Patel', role: 'Brand Admin', initials: 'DP', color: 'green', note: 'Manage rules & facts' },
];
const steps = [
  { icon: BookOpenCheck, number: '01', title: 'Upload Rules & Verified Facts', text: 'Brand tone, banned words, product metrics, approved hex colors, and WCAG contrast.' },
  { icon: ScanSearch, number: '02', title: 'Pre-Publish Hybrid Audit', text: 'Deterministic checks verify numbers and contrast. Optional AI reviews tone and claim evidence after PII redaction.' },
  { icon: FileCheck2, number: '03', title: 'Cite, Fix & Sign Off', text: 'Inline red/green diffs keep the writer’s intent. Human reviewers decide, then export a Brand Passport.' },
];

export default function WelcomeLanding({ onEnter }: { onEnter?: (session: ActiveSession) => void }) {
  const router = useRouter();
  const enter = (name: string, role: WorkspaceRole) => {
    const session: ActiveSession = { name, role, workspace: 'Acme Cloud', entered: true };
    saveSession(session);
    if (onEnter) onEnter(session); else router.push('/');
  };
  return <main className="welcome-page">
    <nav className="welcome-nav"><Link href="/welcome" className="welcome-logo"><span><ShieldCheck size={18}/></span><b>VeriBrand<span> AI</span></b></Link><div><span className="demo-dot"/> Acme Cloud demo</div><Link href="/disclosures">How we built this <ArrowRight size={13}/></Link></nav>
    <section className="welcome-hero"><div className="welcome-badge"><Sparkles size={13}/> Team ArticXCoders <i/> CodeZen India 2026 (Inkloom AI Challenge)</div><h1>Stop Off-Brand Claims,<br/>Wrong Colors &amp; Tone Drift<br/><em>Before You Hit Publish.</em></h1><p className="welcome-subtitle">Like Grammarly + a fact-checker + a design reviewer for your entire brand. VeriBrand AI checks every draft against your approved rulebook, cites the exact rule behind every issue, and keeps humans in final control.</p><div className="welcome-actions"><button className="welcome-primary" onClick={() => enter('Alex Morgan', 'Brand Reviewer')}>Launch Live Demo Workspace <ArrowRight size={16}/></button><Link className="welcome-secondary" href="/impact">Try 30-Second Brand Passport Flow <ArrowRight size={15}/></Link></div><div className="welcome-assurance"><span><Check size={12}/> No account required</span><span><Check size={12}/> Demo data is ready</span><span><LockKeyhole size={12}/> Human sign-off stays in control</span></div></section>
    <section className="how-strip"><div className="strip-heading"><span>THE WORKFLOW</span><h2>From rough draft to ready-to-publish.</h2></div><div className="how-grid">{steps.map(({ icon: Icon, number, title, text }) => <article key={number}><div className="how-top"><span>{number}</span><Icon size={18}/></div><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    <section className="persona-section"><div className="persona-intro"><div><span>YOUR DEMO WORKSPACE</span><h2>Step in as a teammate.</h2><p>Choose a role to see the workflow from their side. One click opens the live Acme Cloud workspace.</p></div><div className="persona-demo-tag"><BadgeCheck size={15}/> Safe demo workspace</div></div><div className="persona-grid">{personas.map((persona) => <button className="persona-card" key={persona.name} onClick={() => enter(persona.name, persona.role)}><span className={'persona-avatar '+persona.color}>{persona.initials}</span><span className="persona-copy"><b>{persona.name}</b><small>{persona.role}</small><em>{persona.note}</em></span><ArrowRight size={16}/></button>)}</div><form className="custom-persona" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const name = String(data.get('name') ?? '').trim(); const role = String(data.get('role') ?? 'Content Creator') as WorkspaceRole; if (name) enter(name, role); }}><UserRound size={16}/><label><span>Or use your name</span><input name="name" placeholder="Your name" maxLength={48} required/></label><label><span>Workspace role</span><select name="role" defaultValue="Content Creator"><option>Content Creator</option><option>Brand Reviewer</option><option>Brand Admin</option></select></label><button type="submit">Enter workspace <ArrowRight size={14}/></button></form></section>
    <section className="welcome-proof"><div><span><Contrast size={16}/></span><b>Exact contrast math</b><small>WCAG ratio with a clear pass/fail</small></div><div><span><Palette size={16}/></span><b>Brand color guardrails</b><small>Preview palette choices before publishing</small></div><div><span><BadgeCheck size={16}/></span><b>Evidence you can inspect</b><small>Rule citations, reviewer trail, exportable record</small></div></section>
    <footer className="welcome-footer"><span>VERIBRAND AI <i/> TEAM ARTICXCODERS</span><span>CodeZen India 2026 · Brand Governance Demo</span><Link href="/disclosures">AI &amp; tools disclosure <ArrowRight size={12}/></Link></footer>
  </main>;
}
