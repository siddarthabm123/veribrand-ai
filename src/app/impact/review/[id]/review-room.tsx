'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, BadgeCheck, BookOpen, Check, Clock3, MessageSquare, ShieldCheck } from 'lucide-react';
import type { AuditFinding, Submission } from '@/types/governance';
import { readSubmission, saveSubmission } from '@/lib/client-state';
import GateSimulator from '@/components/GateSimulator';

export default function ReviewRoom({ id }: { id: string }) {
  const [record, setRecord] = useState<Submission | null>(null);
  const [role, setRole] = useState('Brand Reviewer');
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState('Loading saved audit…');
  const [busy, setBusy] = useState(false);
  const saveLock = useRef(false);

  useEffect(() => { const local = readSubmission(id); fetch(`/api/submissions/${encodeURIComponent(id)}`, { cache: 'no-store' }).then(async (response) => { if (!response.ok) throw new Error('Review record unavailable from the server.'); return response.json(); }).then((value: Submission) => { saveSubmission(value); setRecord(value); setMessage('Loaded the latest saved review record.'); }).catch(() => { if (local) { setRecord(local); setMessage('Using this browser’s saved review record.'); } else setMessage('This review record was not found in this browser. Submit the draft again from Brand Passport.'); }); }, [id]);

  const save = async (patch: Partial<Submission>) => {
    if (!record || saveLock.current) return;
    saveLock.current = true; setBusy(true);
    const updatedLocal: Submission = { ...record, ...patch, history: [...record.history, `${role} updated the review · ${new Date().toLocaleString()}`] };
    saveSubmission(updatedLocal); setRecord(updatedLocal);
    try { const response = await fetch(`/api/submissions/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) }); if (!response.ok) throw new Error('Could not sync this review.'); const updated = await response.json() as Submission; saveSubmission(updated); setRecord(updated); setMessage('Decision saved to this browser and review service.'); }
    catch { setMessage('Saved to this browser. It will remain available here if the review service is temporarily unavailable.'); }
    finally { saveLock.current = false; setBusy(false); }
  };

  const decideFinding = (finding: AuditFinding, decision: 'accepted' | 'overridden') => {
    if (!record) return;
    if (decision === 'overridden' && role !== 'Brand Reviewer' && role !== 'Brand Admin') { setMessage('A reviewer or admin must record an override.'); return; }
    let reason: string | undefined;
    if (decision === 'overridden') { const enteredReason = window.prompt('Why is this finding being overridden?'); if (!enteredReason?.trim()) return; reason = enteredReason; }
    const body = decision === 'accepted' ? record.body_text.replace(finding.exact_span, finding.suggested_fix) : record.body_text;
    const findings = record.findings.map((item) => item.id === finding.id ? { ...item, reviewer_status: decision, ...(reason ? { override_reason: reason } : {}) } : item);
    void save({ body_text: body, findings });
  };

  const addComment = () => { if (!record || !comment.trim()) return; void save({ comments: [...record.comments, `${role}: ${comment.trim()}`] }); setComment(''); };
  const signOff = (status: 'approved' | 'changes_requested') => { if (role === 'Content Creator') { setMessage('Switch to Brand Reviewer or Brand Admin to sign off.'); return; } if (status === 'approved' && record?.findings.some((finding) => finding.reviewer_status === 'pending')) { setMessage('Resolve or override each finding before approval.'); return; } void save({ status, reviewer_name: role }); };

  return <main className="passport-page review-room"><header className="passport-nav"><Link href="/impact" className="back-link"><ArrowLeft size={15}/> Back to Brand Passport</Link><span className="passport-brand"><span><ShieldCheck size={16}/></span> VeriBrand <b>Review room</b></span><label className="review-role">Acting as <select value={role} onChange={(event) => setRole(event.target.value)}><option>Content Creator</option><option>Brand Reviewer</option><option>Brand Admin</option></select></label></header>
    {message && <p className="review-message" role="status">{message}</p>}
    {record && <><div className="review-room-heading"><div><span className="passport-kicker"><Clock3 size={12}/> {record.status.replace('_', ' ').toUpperCase()}</span><h1>{record.title}</h1><p>{record.content_type} · Submitted by {record.author_name} · {record.findings.length} cited findings</p></div><span className="passport-record-id">REVIEW ID <code>{record.id.slice(0, 12)}</code></span></div>
      <div className="review-room-grid"><section className="room-card"><h2>Submitted content</h2><p className="room-copy">{record.body_text}</p><div className="room-history"><h3><Clock3 size={14}/> Revision history</h3>{record.history.map((event, index) => <p key={`${event}-${index}`}><i/>{event}</p>)}</div></section>
      <section className="room-card"><h2>Evidence ledger <span>{record.findings.length}</span></h2>{record.findings.length ? record.findings.map((finding) => <article className="room-finding" key={finding.id}><div className="room-rule"><b>{finding.rule_citation}</b><span>{finding.category.replace('_', ' ')} · {finding.severity}</span><em>{finding.reviewer_status}</em></div><div className="evidence-phrase"><del>{finding.exact_span}</del><span>→</span><ins>{finding.suggested_fix}</ins></div><p>{finding.explanation}</p><blockquote>{finding.source_excerpt}<small><BookOpen size={11}/> Approved source · {finding.rule_citation}</small></blockquote>{finding.override_reason && <p className="override-note">Override reason: {finding.override_reason}</p>}{finding.reviewer_status === 'pending' && <div className="room-actions"><button disabled={busy} onClick={() => decideFinding(finding, 'accepted')}><Check size={13}/> Accept fix</button><button disabled={busy} onClick={() => decideFinding(finding, 'overridden')}>Override with reason</button></div>}</article>) : <div className="all-clear"><BadgeCheck size={22}/><b>No open findings</b><p>This content passed the available deterministic checks.</p></div>}</section>
      <section className="room-card room-comments"><h2><MessageSquare size={15}/> Reviewer comments</h2>{record.comments.map((entry, index) => <p key={`${entry}-${index}`}>{entry}</p>)}<div className="room-comment-entry"><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Leave a comment for the team"/><button onClick={addComment} disabled={busy || !comment.trim()}>Add comment</button></div></section>
      <section className="room-card room-signoff"><div><h2>Human sign-off</h2><p>Final publication decisions remain with an authorised reviewer.</p></div><button onClick={() => signOff('changes_requested')} disabled={busy}>Request changes</button><button onClick={() => signOff('approved')} disabled={busy}><Check size={13}/> Approve for publish</button></section></div></>}
    {record && <GateSimulator submission={record}/>}
    <footer className="passport-footer"><span>DEMO WORKSPACE <i/> Acme Cloud</span><Link href="/">Workspace overview</Link></footer>
  </main>;
}
