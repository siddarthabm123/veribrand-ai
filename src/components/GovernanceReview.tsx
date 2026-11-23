'use client';
import { authFetch } from '@/lib/auth-fetch';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import type { AuditFinding, Submission } from '@/types/governance';
import { readSession } from '@/lib/session';
import { saveSubmission } from '@/lib/client-state';
import { evidenceFor } from '@/lib/evidence';
import { readiness, type ReviewActor, type ReviewCommand, type VisualInput } from '@/lib/governance';
import { AccessibilityFields, CheckLedger, PassportLinks, ReadinessCard } from './GovernanceControls';
import PublicationMonitor from './PublicationMonitor';
import AccessNotice from './WorkspaceAccess';
import { useWorkspaceAccess } from './WorkspaceAccess';
import GateSimulator from './GateSimulator';

function MarkedCopy({ record }: { record: Submission }) {
  let cursor = 0; const nodes: ReactNode[] = [];
  for (const finding of record.findings.filter(f => f.category !== 'visual' && f.category !== 'accessibility').toSorted((a, b) => a.start_index - b.start_index)) {
    if (finding.start_index < cursor || record.body_text.slice(finding.start_index, finding.end_index) !== finding.exact_span) continue;
    nodes.push(record.body_text.slice(cursor, finding.start_index), <mark key={finding.id}>{finding.exact_span}</mark>); cursor = finding.end_index;
  }
  nodes.push(record.body_text.slice(cursor));
  return <p className="gv-copy">{nodes}</p>;
}

function FindingDecision({ finding, busy, decide }: { finding: AuditFinding; busy: boolean; decide: (command: Partial<ReviewCommand>) => Promise<void> }) {
  const [action, setAction] = useState<'edit' | 'reject' | 'override'>(finding.category === 'accessibility' || finding.category === 'visual' ? 'override' : 'edit');
  const [replacement, setReplacement] = useState(finding.suggested_fix), [reason, setReason] = useState('');
  return <div className="gv-decisions">{finding.category !== 'accessibility' && finding.category !== 'visual' && <button className="gv-primary" type="button" disabled={busy} onClick={() => void decide({ action: 'accept', findingId: finding.id })}>Accept fix</button>}<details><summary>Edit, reject, or record an exception</summary><form onSubmit={e => { e.preventDefault(); void decide({ action, findingId: finding.id, replacement, reason }); }}><label>Decision<select value={action} onChange={e => setAction(e.target.value as typeof action)}><option value="edit" disabled={finding.category === 'accessibility' || finding.category === 'visual'}>Edit replacement</option><option value="reject">Reject suggestion (keeps finding open)</option><option value="override">Override with reason</option></select></label>{action === 'edit' ? <label>Replacement wording<textarea required maxLength={1000} value={replacement} onChange={e => setReplacement(e.target.value)}/></label> : <label>Reason<textarea required maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain the decision and any supporting evidence."/></label>}<button className="gv-quiet" type="submit" disabled={busy || (action !== 'edit' && !reason.trim())}>Record decision</button></form></details></div>;
}

function DraftRevision({ record, busy, decide }: { record: Submission; busy: boolean; decide: (command: Partial<ReviewCommand>) => Promise<void> }) {
  const [text, setText] = useState(record.body_text);
  const [visual, setVisual] = useState<VisualInput>(record.governance!.visual);
  return <details className="gv-panel"><summary>Edit content or accessibility inputs</summary><form onSubmit={e => { e.preventDefault(); void decide({ action: 'revise', text, visual }); }}><p>Saving creates a new content version, rescans the inputs, and clears any existing approval.</p><label>Current draft<textarea className="gv-draft" value={text} onChange={e => setText(e.target.value)} maxLength={100000} required={!record.image_inspection}/></label><AccessibilityFields value={visual} onChange={setVisual} disabled={busy}/><button className="gv-primary" disabled={busy} type="submit">Save new version and rescan</button></form></details>;
}

export default function GovernanceReview({ id, embedded = false, onNew }: { id: string; embedded?: boolean; onNew?: () => void }) {
  const [record, setRecord] = useState<Submission | null>(null), [message, setMessage] = useState('Loading saved review…'), [busy, setBusy] = useState(false);
  const [actor, setActor] = useState<ReviewActor>({ name: 'Alex Morgan', role: 'Brand Reviewer' });
  const access = useWorkspaceAccess();
  const effectiveActor = access.mode === 'demo' ? actor : access.actor;
  const [comment, setComment] = useState('');
  useEffect(() => {
    let active = true;
    authFetch(`/api/submissions/${encodeURIComponent(id)}`, { cache: 'no-store' }).then(async response => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Review not found.'); return data as Submission;
    }).then(data => { if (!active) return; setRecord(data); saveSubmission(data); const session = readSession(); if (session) setActor({ name: session.name, role: session.role }); setMessage(''); }).catch(error => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, [id]);
  async function reload() {
    setBusy(true);
    try { const response = await authFetch(`/api/submissions/${encodeURIComponent(id)}`, { cache: 'no-store' }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setRecord(data); saveSubmission(data); setMessage('Loaded the latest saved review.'); }
    catch { setMessage('The latest review could not be loaded. Please retry.'); } finally { setBusy(false); }
  }
  async function decide(command: Partial<ReviewCommand>) {
    if (!record?.governance || busy) return;
    setBusy(true); setMessage('');
    try {
      const response = await authFetch(`/api/submissions/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...command, actor: effectiveActor || actor, expectedRevision: record.governance.revision }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'The decision could not be saved.');
      setRecord(data); saveSubmission(data); setMessage('Decision recorded.'); if (command.action === 'comment') setComment('');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The review could not be saved. Reload before retrying.'); }
    finally { setBusy(false); }
  }
  const reviewer = effectiveActor?.role !== 'Content Creator' && Boolean(effectiveActor);
  const state = record ? readiness(record) : null;
  return <main className="gv-page"><header className="gv-nav"><Link href="/impact">Brand Passport</Link><nav><Link href="/evidence">Evidence Library</Link><Link href="/operations">Review queue</Link></nav></header>{!record ? <p role="status">{message}</p> : <><AccessNotice access={access}/><nav className="gv-review-steps" aria-label="Review steps"><a href="#review-copy">1. Draft</a><a href="#review-findings">2. Evidence and fixes</a><a href="#review-signoff">3. Sign-off</a><a href="#prepublish-gate">4. Publish</a><a href="#publication-monitor">5. Monitor</a>{embedded && <button className="gv-quiet" onClick={onNew}>New draft</button>}</nav><section className="gv-intro"><h1>{record.title}</h1><p>{record.governance?.channel} / Submitted by {record.author_name} / {new Date(record.created_at).toLocaleString()}</p></section><div className="gv-reviewer">{access.mode === 'demo' && <><label>Reviewer name<input value={actor.name} onChange={e => setActor({ ...actor, name: e.target.value })} maxLength={80}/></label><label>Demo role<select value={actor.role} onChange={e => setActor({ ...actor, role: e.target.value as ReviewActor['role'] })}><option>Content Creator</option><option>Brand Reviewer</option><option>Brand Admin</option></select></label></>}<button className="gv-quiet" type="button" disabled={busy} onClick={() => void reload()}>Reload latest review</button><button className="gv-quiet" type="button" disabled={busy} onClick={() => void decide({ action: 'rescan' })}>Rescan evidence pack</button></div><p className="gv-message" role="status">{message}</p><ReadinessCard record={record}/><div id="review-copy" className="gv-diff"><section className="gv-panel"><h2>Original submission</h2><p className="gv-copy">{record.governance?.original ?? record.body_text}</p></section><section className="gv-panel"><h2>Current content, v{record.governance?.version}</h2><MarkedCopy record={record}/></section></div><DraftRevision key={'draft-' + record.governance?.revision} record={record} busy={busy} decide={decide}/><section id="review-findings" className="gv-panel"><h2>Source-linked findings</h2><p>Exact rule matches are deterministic. Rejected suggestions remain open until resolved or explicitly overridden.</p>{record.findings.length ? record.findings.map(finding => {
    const source = record.governance?.evidence ? evidenceFor(finding, record.governance.evidence) : null;
    return <article className="gv-finding" key={finding.id}><div className="gv-finding-head"><b>{finding.rule_citation}</b><span>{finding.severity} risk</span><span className="gv-status">{finding.reviewer_status}</span></div><div className="gv-phrase"><del>{finding.exact_span}</del><ins>{finding.suggested_fix}</ins></div><p>{finding.explanation}</p><blockquote>{finding.source_excerpt}</blockquote>{source && <div className="gv-source"><Link href={`/evidence?query=${encodeURIComponent(source.title)}`}>Inspect evidence: {source.title}</Link><small>Approved wording: {source.approvedWording}<br/>Evidence pack {source.packVersion}<br/>Recorded approval: {source.source.approvedBy}{source.source.at ? ` / ${new Date(source.source.at).toLocaleDateString()}` : ''}</small></div>}{finding.override_reason && <p>Recorded reason: {finding.override_reason}</p>}{['pending', 'rejected'].includes(finding.reviewer_status) && <FindingDecision finding={finding} busy={busy} decide={decide}/>}</article>;
  }) : <p className="gv-clear">No current findings in the supported checks. Human approval is still required.</p>}</section><details className="gv-panel"><summary>Checks run and not run</summary><CheckLedger record={record}/></details><details className="gv-panel"><summary>Decision and revision history</summary><ol className="gv-timeline">{record.governance?.events.map(event => <li key={event.id}><b>{event.action.replace('_', ' ')}</b><span>{event.actor.name} / {event.actor.role} / v{event.version}</span><time dateTime={event.at}>{new Date(event.at).toLocaleString()}</time>{event.finding && <p>{event.finding.rule_citation}: {event.finding.exact_span}</p>}{event.reason && <p>{event.reason}</p>}{event.before !== undefined && <details><summary>View the recorded before/after</summary><div className="gv-diff"><pre>{event.before}</pre><pre>{event.after}</pre></div></details>}</li>)}</ol></details><section className="gv-panel"><h2>Review comments</h2>{record.comments.map((entry, index) => <p key={index}>{entry}</p>)}<form onSubmit={e => { e.preventDefault(); void decide({ action: 'comment', reason: comment }); }}><label>Comment<textarea value={comment} onChange={e => setComment(e.target.value)} maxLength={1000} required/></label><button className="gv-quiet" disabled={busy || !comment.trim()} type="submit">Add comment</button></form></section><section id="review-signoff" className="gv-panel"><h2>Human sign-off</h2><p>Approval applies only to this content version, channel, and evidence pack. Content changes require a new review.</p><div className="gv-actions"><button className="gv-quiet" type="button" disabled={busy || !reviewer} onClick={() => void decide({ action: 'request_changes' })}>Request changes</button><button className="gv-primary" type="button" disabled={busy || !reviewer || Boolean(state?.open) || !effectiveActor?.name.trim()} onClick={() => void decide({ action: 'approve' })}>Approve this version</button></div></section><section className="gv-panel"><h2>Your Brand Passport</h2><p>Exports include the full decision trail and list checks that were not run. Unapproved records are clearly labelled as needing review.</p><PassportLinks record={record}/><p className="gv-demo-note">{access.mode === 'demo' ? 'Demo passport links are public. Use non-sensitive sample content.' : 'Workspace membership is required to read records and exports. Reviewer identity is verified by the server.'}</p></section><GateSimulator key={'gate-' + record.governance?.revision} submission={record}/><PublicationMonitor key={'monitor-' + record.governance?.revision} record={record} busy={busy || !reviewer} decide={decide}/></>}</main>;
}
