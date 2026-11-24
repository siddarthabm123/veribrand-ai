'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ShieldCheck, RotateCcw, ArrowLeft, Check } from 'lucide-react';
import { createJudgeWorkspace, JUDGE_STORAGE_KEY, judgeActor, type JudgeWorkspace } from '@/lib/judge-demo';
import { applyReview, expiredEvidence, readiness, sourceDetails, type ReviewCommand } from '@/lib/governance';
import { evidencePack, evidenceFor } from '@/lib/evidence';
import { publicationChecks, textDifference } from '@/lib/publishing';
import { buildPassport, passportMarkdown } from '@/lib/passport';
import { CheckLedger, ReadinessCard } from './GovernanceControls';

type GateCheck = Awaited<ReturnType<typeof publicationChecks>>;
export default function JudgeDemo() {
  const [workspace, setWorkspace] = useState<JudgeWorkspace | null>(null), [selected, setSelected] = useState('demo-launch');
  const [message, setMessage] = useState('Preparing your judge sandbox…'), [busy, setBusy] = useState(false), [gate, setGate] = useState<GateCheck | null>(null);
  const [text, setText] = useState<string | null>(null), [snapshot, setSnapshot] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    async function load() {
      let value: JudgeWorkspace | null = null;
      try { const stored = localStorage.getItem(JUDGE_STORAGE_KEY); const parsed = stored ? JSON.parse(stored) : null; if (parsed?.schema === 1 && parsed.pack?.version && parsed.expiredPack?.version && Array.isArray(parsed.records) && parsed.records.length === 4 && parsed.records.every((row: { governance?: unknown }) => row.governance)) value = parsed; } catch { /* A new sandbox is safe if storage is unavailable or corrupt. */ }
      value ??= await createJudgeWorkspace();
      if (active) { setWorkspace(value); setMessage('Choose the first sample to follow the complete review flow.'); }
    }
    void load().catch(() => { if (active) setMessage('The demo could not initialize. Reload this page to retry.'); });
    return () => { active = false; };
  }, []);
  const record = workspace?.records.find(row => row.id === selected);
  const pack = selected === 'demo-expired' ? workspace?.expiredPack : workspace?.pack;
  const state = record ? readiness(record) : null;
  function save(value: JudgeWorkspace) {
    setWorkspace(value);
    try { localStorage.setItem(JUDGE_STORAGE_KEY, JSON.stringify(value)); } catch { setMessage('Demo changes remain in this tab; browser storage is unavailable.'); }
  }
  function choose(id: string) { setSelected(id); setGate(null); setText(null); setSnapshot(null); setMessage(''); }
  async function decide(command: Partial<ReviewCommand>) {
    if (!workspace || !record || !pack || busy) return;
    setBusy(true); setGate(null); setMessage('');
    try {
      const updated = await applyReview(record, { ...command, action: command.action!, actor: judgeActor, expectedRevision: record.governance!.revision }, pack);
      save({ ...workspace, records: workspace.records.map(row => row.id === updated.id ? updated : row) });
      setText(null); setSnapshot(null); setMessage('Saved in your judge sandbox. Real workspace data is unchanged.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The demo action could not be completed.'); }
    finally { setBusy(false); }
  }
  async function reset() {
    if (busy) return; setBusy(true);
    try { save(await createJudgeWorkspace()); choose('demo-launch'); setMessage('All four fictional scenarios have been reset.'); }
    catch { setMessage('Reset failed. Please reload and retry.'); }
    finally { setBusy(false); }
  }
  async function renew() {
    if (!workspace || !record || busy) return; setBusy(true);
    try {
      const renewed = await evidencePack({ ...workspace.expiredPack, facts: workspace.expiredPack.facts.map(fact => ({ ...fact, source_doc: JSON.stringify({ ...JSON.parse(fact.source_doc), expiresAt: new Date(Date.now() + 90 * 86400000).toISOString() }) })) });
      const updated = await applyReview(record, { action: 'rescan', actor: { name: 'Judge (fictional admin)', role: 'Brand Admin' }, expectedRevision: record.governance!.revision }, renewed);
      save({ ...workspace, expiredPack: renewed, records: workspace.records.map(row => row.id === updated.id ? updated : row) }); setGate(null); setMessage('Demo evidence renewed and campaign rescanned. It now needs a fresh approval.');
    } catch { setMessage('The demo source could not be renewed.'); }
    finally { setBusy(false); }
  }
  async function download(format: 'pdf' | 'json' | 'markdown') {
    if (!record || !pack || busy) return; setBusy(true);
    try {
      const passport = buildPassport(record, pack);
      passport.title = `[Fictional judge demo] ${passport.title}`;
      passport.scope = 'Fictional judge demo. Browser-local decisions, not authenticated approvals. ' + passport.scope;
      const contents = format === 'pdf' ? new Uint8Array(await (await import('@/lib/passport-pdf')).passportPdf(passport)) : format === 'json' ? JSON.stringify(passport, null, 2) : passportMarkdown(passport);
      const url = URL.createObjectURL(new Blob([contents], { type: format === 'pdf' ? 'application/pdf' : format === 'json' ? 'application/json' : 'text/markdown' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `Judge-Demo-Passport.${format === 'markdown' ? 'md' : format}`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('Fictional demo Passport downloaded.');
    } catch { setMessage('Download failed. Please try again.'); }
    finally { setBusy(false); }
  }
  const publication = record?.governance?.publication;
  const delta = publication ? textDifference(publication.baseline, publication.observed) : null;
  return <main className="gv-page judge-page"><header className="gv-nav"><Link href="/welcome"><ShieldCheck size={18}/>VeriBrand</Link><nav><Link href="/login">Sign in to real workspace</Link><button className="gv-quiet" disabled={busy || !workspace} onClick={() => void reset()}><RotateCcw size={15}/>Reset judge demo</button></nav></header><section className="judge-banner"><b>Judge demo — fictional data</b><span>No signup. Changes stay in this browser and never reach the real workspace.</span></section><section className="gv-intro"><h1>Try a complete brand review.</h1><p>Find an unsupported claim, apply its fix, approve the new version, and check the publishing gate.</p></section><ol className="judge-walkthrough"><li><b>1. Inspect</b><span>Open the risky campaign and its evidence.</span></li><li><b>2. Fix</b><span>Accept each source-linked correction.</span></li><li><b>3. Approve</b><span>Record a fictional reviewer’s sign-off.</span></li><li><b>4. Prove</b><span>Check the gate and download a Passport.</span></li></ol><p className="gv-message" role="status">{message}</p>{workspace && record && pack && <div className="judge-layout"><aside className="judge-samples"><h2>Sample campaigns</h2>{workspace.records.map((row, index) => <button key={row.id} className={selected === row.id ? 'selected' : ''} onClick={() => choose(row.id)}><span>Scenario {index + 1}</span><b>{row.title}</b><small>{row.id === 'demo-expired' && expiredEvidence(workspace.expiredPack).length ? 'Expired source' : row.governance?.publication?.status === 'drift' ? 'Published change detected' : readiness(row).approved ? 'Approved' : readiness(row).open ? `${readiness(row).open} findings` : 'Awaiting approval'}</small></button>)}<p>All sources, names, and campaigns are fictional. Decisions here demonstrate the workflow and do not grant real publishing permission.</p></aside><div className="judge-review"><section className="gv-panel"><h2>{record.title}</h2><p className="gv-copy">{record.body_text}</p><details><summary>Edit the draft to invalidate approval</summary><form onSubmit={event => { event.preventDefault(); void decide({ action: 'revise', text: text ?? record.body_text }); }}><label>Draft content<textarea value={text ?? record.body_text} onChange={event => setText(event.target.value)} maxLength={100000}/></label><button className="gv-quiet" disabled={busy}>Save new version</button></form></details></section><ReadinessCard record={record}/><section className="gv-panel"><h2>Source-linked findings</h2>{record.findings.filter(finding => ['pending', 'rejected'].includes(finding.reviewer_status)).map(finding => { const evidence = evidenceFor(finding, pack); return <article className="gv-finding" key={finding.id}><b>{finding.rule_citation}: {finding.exact_span}</b><p>{finding.explanation}</p><blockquote>Approved wording: {evidence.approvedWording}<br/>Source: {evidence.source.title}</blockquote><p>Suggested fix: <strong>{finding.suggested_fix}</strong></p><button className="gv-primary" disabled={busy} onClick={() => void decide({ action: 'accept', findingId: finding.id })}>Accept this fix</button></article>; })}{!state?.open && <p><Check size={17}/> No unresolved findings in the supported checks. {state?.approved ? 'This version has demo sign-off.' : 'Human approval is still required.'}</p>}</section><details className="gv-panel"><summary>Inspect fictional evidence and source dates</summary>{pack.facts.map(fact => { const source = sourceDetails(fact.source_doc); return <article className="gv-finding" key={fact.fact_key}><b>{fact.claim_statement}: {fact.exact_value}</b><p>{source.title}</p><small>Owner: {source.owner}<br/>Verified: {source.at}<br/>Expires: {source.expiresAt}</small></article>; })}</details>{selected === 'demo-expired' && <section className="gv-panel"><h2>Expired-source scenario</h2><p>Try approval while the source is expired. Then renew the fictional source and approve again.</p><button className="gv-quiet" disabled={busy} onClick={() => void renew()}>Renew demo source and rescan</button></section>}<section className="gv-panel"><h2>Human sign-off and publishing gate</h2><p>Acting as {judgeActor.name}. This is a demo persona, not an authenticated identity.</p><div className="gv-actions"><button className="gv-primary" disabled={busy || Boolean(state?.open)} onClick={() => void decide({ action: 'approve' })}>Approve demo version</button><button className="gv-quiet" disabled={busy} onClick={() => { void publicationChecks(record, pack.version, record.governance!.channel, false, expiredEvidence(pack).length).then(setGate); }}>Check demo publishing gate</button></div>{gate && <div role="status"><h3>{gate.every(check => check.pass) ? 'Demo gate: APPROVED (200)' : 'Demo gate: BLOCKED (403)'}</h3><ul className="gv-gate-checks">{gate.map(check => <li key={check.id}><b>{check.pass ? 'Pass' : 'Blocked'}</b>{check.label}</li>)}</ul><p>Computed locally with the same gate checks. No CMS request or publication is performed.</p></div>}</section>{publication && <section className="gv-panel"><h2>Published content changed after approval</h2><p>Compare the registered fictional publication with its latest submitted snapshot.</p><div className="gv-diff"><div><h3>Approved copy</h3><p>{publication.baseline}</p></div><div><h3>Last published snapshot</h3><p>{publication.observed}</p></div></div><p>Status: <b>{publication.status === 'drift' ? 'Unapproved change detected' : 'Matches approval'}</b></p>{delta?.added && <p>Added text: <mark>{delta.added}</mark></p>}<label>Submit a new fictional snapshot<textarea value={snapshot ?? publication.observed} onChange={event => setSnapshot(event.target.value)} maxLength={100000}/></label><div className="gv-actions"><button className="gv-quiet" disabled={busy} onClick={() => void decide({ action: 'observe', text: snapshot ?? publication.observed })}>Compare snapshot</button><button className="gv-primary" disabled={busy} onClick={() => void decide({ action: 'observe', text: publication.baseline })}>Restore approved demo copy</button></div></section>}<section className="gv-panel"><h2>Your fictional Brand Passport</h2><p>Download the content, sources, unrun checks, and decision trail. Unapproved versions are labelled as needing review.</p><div className="gv-actions">{(['pdf', 'json', 'markdown'] as const).map(format => <button key={format} className="gv-quiet" disabled={busy} onClick={() => void download(format)}>Download demo {format.toUpperCase()}</button>)}</div></section><details className="gv-panel"><summary>Decision history</summary><ol className="gv-timeline">{record.governance?.events.map(event => <li key={event.id}><b>{event.action}</b><span>{event.actor.name} / v{event.version}</span><time dateTime={event.at}>{new Date(event.at).toLocaleString()}</time>{event.reason && <p>{event.reason}</p>}</li>)}</ol></details><details className="gv-panel"><summary>Checks run and not run</summary><CheckLedger record={record}/></details><Link href="/welcome"><ArrowLeft size={15}/>Leave judge mode</Link></div></div>}</main>;
}
