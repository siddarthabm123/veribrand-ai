import Link from 'next/link';
import { ArrowLeft, ArrowRight, BrainCircuit, Database, Fingerprint, LockKeyhole, ShieldCheck } from 'lucide-react';

const tools = [
  ['OpenAI Codex CLI', 'AI-assisted implementation support for code generation, editing, and debugging. Team members should review the code and report their own contributions accurately.'],
  ['OpenAI API', 'Optional runtime review request after email, phone, and common API-token redaction. Without a key, deterministic checks still run.'],
  ['Next.js 16 · React · TypeScript', 'App Router application, typed UI, and route handlers.'],
  ['Tailwind CSS v4 · Lucide React', 'Interface styling and icon library.'],
  ['Supabase · PostgreSQL · pgvector', 'Optional database client and documented schema. Persistence is partial in this prototype.'],
  ['Vercel', 'Intended deployment platform. This page does not imply that a deployment is live.'],
];
const roundThree = [
  ['01', 'Guideline learning loop', 'Turn reviewer overrides into admin-reviewed proposals that clarify rules. Never change policy silently.'],
  ['02', 'Multilingual governance', 'Add locale-aware rules and source-checked terminology for translated content.'],
  ['03', 'Design-system connectors', 'Import approved Figma tokens and detect brand-color or component drift.'],
];

export default function DisclosuresPage() {
  return <main className="disclosure-page">
    <header className="disclosure-nav"><Link href="/" className="disclosure-back"><ArrowLeft size={15}/> Workspace</Link><span><ShieldCheck size={16}/> VeriBrand AI <b>· Transparency</b></span><Link href="/impact" className="disclosure-passport">Try Brand Passport <ArrowRight size={13}/></Link></header>
    <section className="disclosure-hero"><div className="disclosure-kicker">CODEZEN INDIA · ROUND 2 · THE BUILD</div><h1>Governance you can<br/><em>inspect and challenge.</em></h1><p>This page explains what the prototype checks, what it stores, which tools helped build it, and what still needs work.</p></section>
    <section className="disclosure-section problem-card"><div className="disclosure-number">01 / THE PROBLEM</div><h2>Brand risk travels faster than review.</h2><p>Growing organisations publish through employees, agencies, and AI tools. Unsupported claims, stale facts, inconsistent language, off-brand visuals, and inaccessible assets can weaken trust before anyone notices.</p><div className="problem-tags"><span>Creators need fast feedback</span><span>Reviewers need evidence</span><span>Admins need recurring insight</span></div></section>
    <section className="disclosure-section architecture-card"><div className="disclosure-number">02 / HOW IT WORKS</div><h2>Two audit tiers. One human decision.</h2><div className="architecture-steps"><article><b>01 · Approved knowledge</b><p>Guidelines, verified facts, terminology, and palette define the demo’s brand boundary.</p></article><article><b>02 · Deterministic checks</b><p>Exact terms, selected numeric claims, and WCAG contrast can be explained and repeated.</p></article><article><b>03 · Optional AI request</b><p>PII patterns are redacted before a best-effort OpenAI request. Its output is not yet converted into structured findings.</p></article><article><b>04 · Human review</b><p>Reviewers can accept, override with a reason, comment, request changes, or approve.</p></article></div></section>
    <section className="disclosure-section privacy-card"><div className="disclosure-number">03 / PRIVACY & STORAGE</div><h2>Demo access requires no account or key.</h2><div className="privacy-columns"><article><LockKeyhole size={17}/><b>Before optional AI</b><p>Email addresses, phone numbers, and common API-token patterns are masked before the external request.</p></article><article><Database size={17}/><b>Storage behavior</b><p>The demo uses in-memory server data and browser-local records. Browser changes survive navigation and cold starts on that device; they do not sync across devices.</p></article><article><Fingerprint size={17}/><b>Human control</b><p>Suggested edits are optional. Final publication approval remains a human action.</p></article></div></section>
    <section className="disclosure-section tools-card"><div className="disclosure-number">04 / AI, TOOLS & SERVICES</div><h2>What this prototype uses</h2><div className="tool-disclosure-list">{tools.map(([name, description]) => <article key={name}><b>{name}</b><p>{description}</p></article>)}</div><p className="starter-disclosure"><BrainCircuit size={15}/> The repository began from a Next.js starter. Existing starter material and third-party libraries must be disclosed in the team submission; verify all licenses.</p></section>
    <section className="disclosure-section future-card"><div className="disclosure-number">05 / PLANNED ROUND 3 IMPROVEMENTS</div><h2>Three improvements we plan to deliver</h2><div className="future-grid">{roundThree.map(([number, title, text]) => <article key={number}><span>{number}</span><b>{title}</b><p>{text}</p></article>)}</div></section>
    <section className="disclosure-section team-disclosure"><div className="disclosure-number">06 / TEAM ARTICXCODERS</div><h2>Team contributions</h2><p>Each teammate should submit any required individual form and confirm their full name before the event submission.</p><div className="member-grid"><div><b>Team member</b><span>Siddartha B M</span><small>AI Audit Engine, Custom Rules &amp; Retrieval Architecture</small></div><div><b>Team member</b><span>[Teammate 2 Name]</span><small>Next.js Diff Workspace, Brand Passport &amp; Visual WCAG Inspector</small></div><div><b>Team member</b><span>[Teammate 3 Name]</span><small>Gap Radar Analytics, Session State &amp; End-to-End QA</small></div></div></section>
    <footer className="disclosure-footer"><span>VERIBRAND AI <i/> TEAM ARTICXCODERS</span><span>Hackathon prototype · Not a production compliance guarantee</span></footer>
  </main>;
}
