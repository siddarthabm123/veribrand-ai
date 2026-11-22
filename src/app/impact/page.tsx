'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BadgeCheck, BookOpen, Check, CheckCircle2, ClipboardCheck, Download, FileCheck2, Fingerprint, LockKeyhole, Shield, ShieldAlert, Sparkles, WandSparkles } from 'lucide-react';
import type { AuditFinding, Submission } from '@/types/governance';
import { readCustomGuidelines, readDraft, readSubmissions, savePassport, saveSubmission, writeDraft } from '@/lib/client-state';
import { auditCustomRules } from '@/lib/audit/custom';
import GateSimulator from '@/components/GateSimulator';

const sample = 'Acme Cloud helps teams move faster with reliable tools. Our 100% uptime and 5-minute support response keep every team moving.';
const rules = [
  { phrase: '100% uptime', replacement: '99.95% uptime SLA', code: 'BG-2.1', source: 'Acme Cloud SLA 2026', reason: 'The published SLA is 99.95%. The absolute guarantee overstates the verified commitment.' },
  { phrase: '5-minute', replacement: '15-minute', code: 'BG-2.1', source: 'Enterprise Support Plan', reason: 'The verified enterprise response target is 15 minutes.' },
  { phrase: 'guaranteed', replacement: 'designed to', code: 'BG-1.1', source: 'Voice & Tone guideline', reason: 'Avoid absolute promises. Keep the confident, helpful intent.' },
  { phrase: 'game-changing', replacement: 'powerful', code: 'BG-1.2', source: 'Product Terminology guideline', reason: 'Replace hype with clear, specific language.' },
];

export default function ImpactPage() {
  const [draft, setDraft] = useState(sample);
  const [accepted, setAccepted] = useState<string[]>([]);
  const [submissionId, setSubmissionId] = useState('');
  const [gateRecord, setGateRecord] = useState<Submission | null>(null);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const restore = window.setTimeout(() => {
      const saved = readDraft();
      setGateRecord(readSubmissions()[0] ?? null);
      if (saved.text) setDraft(saved.text);
      setAccepted(saved.accepted);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);
  useEffect(() => { if (hydrated) writeDraft({ text: draft, accepted }); }, [draft, accepted, hydrated]);
  const findings = useMemo(() => rules.filter((rule) => draft.toLowerCase().includes(rule.phrase.toLowerCase())), [draft]);
  const applyFix = (phrase: string) => {
    const rule = rules.find((item) => item.phrase === phrase);
    if (!rule) return;
    setDraft((copy) => copy.replace(new RegExp(rule.phrase, 'gi'), rule.replacement));
    setAccepted((items) => items.includes(phrase) ? items : [...items, phrase]);
  };
  const sendToReview = async () => {
    if (saveLock.current) return;
    if (!draft.trim()) { setSaveMessage('Add campaign copy before sending it to review.'); return; }
    saveLock.current = true; setSaving(true); setSaveMessage('');
    try {
      const response = await fetch('/api/submissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Brand Passport · Acme Cloud draft', content_type: 'Copy audit', body_text: draft, author_name: 'Demo creator', customRules: readCustomGuidelines() }) });
      if (!response.ok) throw new Error('Review record could not be saved. Please retry.');
      const record = await response.json() as Submission; saveSubmission(record); setGateRecord(record); setSubmissionId(record.id); setSaveMessage(`Saved ${record.findings.length} cited finding${record.findings.length === 1 ? '' : 's'} to the review queue.`);
    } catch {
      const id = `local-${crypto.randomUUID()}`;
      const builtInFindings: AuditFinding[] = findings.map((item) => { const start = draft.toLowerCase().indexOf(item.phrase.toLowerCase()); return { id: crypto.randomUUID(), submission_id: id, category: item.code === 'BG-2.1' ? 'fact_claim' : 'terminology', severity: 'high', exact_span: item.phrase, start_index: start, end_index: start + item.phrase.length, rule_citation: item.code, source_excerpt: item.source, explanation: item.reason, suggested_fix: item.replacement, intent_preservation_score: 92, reviewer_status: 'pending' }; });
      const customFindings = auditCustomRules(draft, id, readCustomGuidelines());
      const customSpans = new Set(customFindings.map((finding) => finding.start_index + ':' + finding.end_index));
      const localFindings = [...builtInFindings.filter((finding) => !customSpans.has(finding.start_index + ':' + finding.end_index)), ...customFindings].sort((a, b) => a.start_index - b.start_index);
      const record: Submission = { id, title: 'Brand Passport · Acme Cloud draft', content_type: 'Copy audit', body_text: draft, status: localFindings.length ? 'audited' : 'draft', author_name: 'Demo creator', created_at: new Date().toISOString(), findings: localFindings, comments: [], history: ['Draft created in this browser', 'Deterministic audit completed'] };
      saveSubmission(record); setGateRecord(record); setSubmissionId(record.id); setSaveMessage('Saved to this browser’s review queue.');
    }
    finally { saveLock.current = false; setSaving(false); }
  };
  const downloadPassport = () => {
    const passport = { product: 'VeriBrand AI', workspace: 'Acme Cloud Demo', issuedAt: new Date().toISOString(), status: findings.length ? 'needs_review' : 'clear', findings: findings.map(({ phrase, replacement, code, source }) => ({ phrase, replacement, rule: code, evidenceSource: source })), acceptedFixes: rules.filter((rule) => accepted.includes(rule.phrase)).map(({ phrase, replacement, code, source }) => ({ phrase, replacement, rule: code, evidenceSource: source })), checksRun: ['approved terminology', 'verified numeric claims'], checksNotRun: ['WCAG contrast', 'brand palette'], piiRedaction: 'enabled' };
    savePassport(passport);
    const url = URL.createObjectURL(new Blob([JSON.stringify(passport, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'acme-cloud-brand-passport.json'; a.click(); URL.revokeObjectURL(url);
  };
  return <main className="passport-page">
    <header className="passport-nav"><Link href="/" className="back-link"><ArrowLeft size={15}/> Back to workspace</Link><span className="passport-brand"><span><Shield size={16}/></span> VeriBrand <b>Impact Lab</b></span><span className="demo-live"><i/> Live demo</span></header>
    <section className="passport-hero"><div className="passport-kicker"><Sparkles size={13}/> THE BRAND PASSPORT</div><h1>Proof your content is<br/><em>safe to publish.</em></h1><p>Every recommendation has a source. Every decision has an owner. Every approved asset leaves with a verifiable record.</p><div className="passport-pills"><span><Fingerprint size={13}/> Evidence-linked</span><span><LockKeyhole size={13}/> Privacy-aware</span><span><ClipboardCheck size={13}/> Human-approved</span></div></section>
    <section className="passport-workbench"><div className="workbench-copy"><div className="section-overline">01 / TRY THE DIFFERENCE</div><h2>Meaning stays yours.<br/>Risk gets removed.</h2><p>Try a rewrite. VeriBrand only changes the phrases tied to a cited rule, verified fact, or measurable standard.</p><label className="passport-input-label" htmlFor="passport-copy">YOUR CONTENT <span>{draft.trim().split(/\s+/).filter(Boolean).length} words</span></label><textarea id="passport-copy" value={draft} onChange={(event) => setDraft(event.target.value)} />
    <div className="passport-diff"><div><small>CREATOR’S INTENT</small><p>{draft.trim() ? 'Help teams move faster with confidence.' : 'Add a draft to see its core intent.'}</p></div><ArrowRight size={15}/><div><small>SAFE EDITS</small><p>{findings.length ? 'Only flagged phrases change; your core message stays.' : 'No flagged phrases. Your draft stays as written.'}</p></div></div>
    </div><div className="workbench-evidence"><div className="evidence-head"><div><span className="evidence-icon"><FileCheck2 size={17}/></span><div><b>Evidence ledger</b><small>Every flag tied to an approved source</small></div></div><span className="live-check"><i/> {findings.length ? `${findings.length} checks` : 'All clear'}</span></div>
    {findings.length ? findings.map((item) => <article className="evidence-item" key={item.phrase}><div className="evidence-item-top"><span className="risk-tag">FACT CHECK</span><code>{item.code}</code></div><div className="evidence-phrase"><del>{item.phrase}</del><ArrowRight size={13}/><ins>{item.replacement}</ins></div><p>{item.reason}</p><div className="evidence-source"><BookOpen size={12}/><span>{item.source}<small>Approved source · Acme Cloud</small></span><BadgeCheck size={14}/></div><button className="apply-recommendation" onClick={() => applyFix(item.phrase)}>{accepted.includes(item.phrase) ? <><Check size={13}/> Applied to draft</> : <><WandSparkles size={13}/> Apply safe fix</>}</button></article>) : <div className="all-clear"><CheckCircle2 size={22}/><b>Clear to publish</b><p>No flagged phrases. Your copy matches the demo workspace rules.</p></div>}
    <div className="ledger-foot"><ShieldAlert size={13}/> Deterministic checks run locally. PII is masked before optional AI review.</div><div className="send-review"><button onClick={sendToReview} disabled={saving || !draft.trim()}>{saving ? 'Saving review…' : <><ClipboardCheck size={14}/> Send to human review</>}</button>{saveMessage && <p role="status">{saveMessage} {submissionId && <Link href={`/impact/review/${submissionId}`}>Open review <ArrowRight size={12}/></Link>}</p>}</div></div></section>
    <section className="passport-bottom"><div className="passport-metrics"><div><span>01 · DELIVERED</span><b>Evidence-linked findings</b><small>Each flag points to an Acme rule and approved source.</small></div><div><span>02 · DELIVERED</span><b>Intent-safe corrections</b><small>Apply a focused edit without rewriting the whole draft.</small></div><div><span>03 · DELIVERED</span><b>Human review trail</b><small>Save a review, comment, override with reason, and sign off.</small></div></div><div className="passport-export"><div className="export-icon"><BadgeCheck size={19}/></div><div><b>Take the proof with you</b><p>Download a portable Brand Passport showing this audit’s sources, checks and status.</p></div><button onClick={downloadPassport}><Download size={14}/> Export passport</button></div></section>
    <GateSimulator submission={gateRecord}/>
    <footer className="passport-footer"><span>VERIBRAND AI <i/> TEAM ARTICXCODERS</span><Link href="/review/security-update">See an approved example <ArrowRight size={13}/></Link></footer>
  </main>;
}
