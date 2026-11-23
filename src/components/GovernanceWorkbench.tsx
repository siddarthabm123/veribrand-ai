'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AccessibilityFields } from './GovernanceControls';
import { readSession } from '@/lib/session';
import { saveSubmission } from '@/lib/client-state';
import type { Submission } from '@/types/governance';
import type { VisualInput } from '@/lib/governance';

const risky = 'Meet the game-changing ACC platform. Acme Cloud delivers 100% uptime with a 5-minute support response. Our autonomous AI helps teams work together.';

export default function GovernanceWorkbench() {
  const [text, setText] = useState(risky), [title, setTitle] = useState('Acme Cloud campaign review'), [channel, setChannel] = useState('Website CMS');
  const [visual, setVisual] = useState<VisualInput>({ imagePurpose: 'none', altText: '' });
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [record, setRecord] = useState<Submission | null>(null);
  async function scan(event: React.FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/submissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, body_text: text, content_type: 'Campaign copy', channel, visual, author_name: readSession()?.name || 'Demo creator' }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'The draft could not be checked.');
      saveSubmission(result); setRecord(result); setMessage('Scan saved. Review each finding and obtain human sign-off.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The review service is unavailable. Nothing was approved.'); }
    finally { setBusy(false); }
  }
  return <main className="gv-page"><header className="gv-nav"><Link href="/welcome">VeriBrand AI</Link><nav><Link href="/">Workspace</Link><Link href="/evidence">Claim Evidence Library</Link></nav></header><section className="gv-intro"><h1>A passport for every decision.</h1><p>Scan a draft, resolve source-linked findings, and approve one specific content version.</p></section><div className="gv-workbench"><form className="gv-panel" onSubmit={scan}><h2>Check your campaign</h2><div className="gv-fields"><label>Content title<input value={title} onChange={e => setTitle(e.target.value)} required maxLength={160}/></label><label>Target channel<select value={channel} onChange={e => setChannel(e.target.value)}><option>Website CMS</option><option>Social scheduler</option><option>Email platform</option><option>GitHub release</option><option>Print / PDF</option></select></label></div><label>Draft content<textarea className="gv-draft" value={text} onChange={e => setText(e.target.value)} maxLength={100000} required/></label><button type="button" className="gv-quiet" onClick={() => { setText(risky); setRecord(null); }}>Load risky sample</button><AccessibilityFields value={visual} onChange={setVisual} disabled={busy}/><button className="gv-primary" type="submit" disabled={busy || !text.trim()}>{busy ? 'Checking and saving…' : 'Run full governance check'}</button><p className="gv-message" role="status">{message}</p>{record && <Link className="gv-primary" href={`/impact/review/${record.id}`}>Review {record.findings.length} findings and generate passport</Link>}</form><aside className="gv-panel"><h2>What you’ll take away</h2><ol className="gv-explanation"><li><b>Evidence you can inspect</b><p>Rule citations and the approved fact pack travel with the audit.</p></li><li><b>A decision trail</b><p>Accept, edit, reject, or override with a recorded name, time, and reason.</p></li><li><b>A version-bound approval</b><p>Changing content clears sign-off and requires a fresh review.</p></li><li><b>A complete passport</b><p>PDF, Markdown, JSON, and a shareable view of the saved record.</p></li></ol><p>Deterministic checks cover the declared inputs. Semantic AI checks and full legal or WCAG compliance are not asserted.</p><p className="gv-demo-note">Demo roles are self-selected. Shared review links expose this demo record to anyone who has its URL; use non-sensitive sample content.</p><Link href="/evidence">Inspect the current evidence pack</Link><p><Link href="/welcome#file-banner-inspector">Upload a document or inspect a banner</Link></p></aside></div></main>;
}
