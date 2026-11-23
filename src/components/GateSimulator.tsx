'use client';
import { authFetch } from '@/lib/auth-fetch';

import { useRef, useState } from 'react';
import { BadgeCheck, Download, LockKeyhole, Radio, ShieldAlert } from 'lucide-react';
import type { Submission } from '@/types/governance';


type GateResult = { status: 'BLOCKED' | 'APPROVED' | 'NOT_FOUND' | 'UNAVAILABLE'; submissionId: string; targetChannel: string; error?: string; checklist?: Array<{ id: string; label: string; pass: boolean }>; httpStatus?: number; unresolvedFindings?: Array<{ citation: string; phrase: string; severity: string }>; certificateId?: string; sha256Signature?: string; approvedBy?: string; timestamp?: string };

export default function GateSimulator({ submission }: { submission: Submission | null }) {
  const [channel, setChannel] = useState(submission?.governance?.channel || 'Website CMS');
  const [result, setResult] = useState<GateResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const requestLock = useRef(false);

  async function testGate() {
    if (!submission || requestLock.current) return;
    requestLock.current = true;
    setBusy(true); setMessage('');
    try {
      const response = await authFetch('/api/webhook/gate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ submissionId: submission.id, targetChannel: channel }) });
      const payload = await response.json() as GateResult;
      setResult({ ...payload, httpStatus: response.status });
      setMessage(response.status === 403 ? 'Publication stopped. Resolve findings and verify the approved version, evidence pack, and channel.' : response.ok ? 'Verified sign-off received. This recorded version has a human sign-off for the selected channel.' : payload.error || 'The gate could not verify this review. Try again.');
    } catch { setMessage('The gate is temporarily unavailable. Your review remains saved in this browser.'); }
    finally { requestLock.current = false; setBusy(false); }
  }

  async function downloadCertificate() {
    if (!submission || !result?.certificateId || !result.sha256Signature) return;
    try {
      const response = await authFetch('/api/submissions/' + encodeURIComponent(submission.id) + '/passport?format=pdf&version=' + submission.governance?.version);
      if (!response.ok) throw new Error('The record changed. Reload and test the gate again.');
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `VeriBrand-Passport-${result.certificateId}.pdf`; anchor.click();
      URL.revokeObjectURL(url);
    } catch { setMessage('The Brand Passport PDF could not be created. Please retry.'); }
  }

  return <section id="prepublish-gate" className="gate-simulator">
    <div className="gate-heading"><span><Radio size={17}/></span><div><h2>Publish gate: prove this version is ready</h2><p>Resolve findings, approve, test the gate, then edit the draft and test again. Changes must block publication.</p></div><span className="gate-live">Server verified</span></div>
    <div className="gate-controls"><label>Target channel<select value={channel} onChange={(event) => setChannel(event.target.value)}>{submission?.governance?.channel && !['Website CMS', 'GitHub release', 'Social scheduler', 'Email platform'].includes(submission.governance.channel) && <option>{submission.governance.channel}</option>}<option>Website CMS</option><option>GitHub release</option><option>Social scheduler</option><option>Email platform</option></select></label><button className="gv-primary" onClick={testGate} disabled={!submission || busy}>{busy ? 'Checking gate…' : 'Check publish gate'}</button></div>
    {!submission && <p className="gate-message">Send a draft to human review to create a submission for the gate.</p>}
    {result?.checklist && <ul className="gv-gate-checks">{result.checklist.map(check => <li key={check.id}><b>{check.pass ? 'Pass' : 'Blocked'}</b> {check.label}</li>)}</ul>}{result && <div className={`gate-result ${result.status === 'APPROVED' ? 'approved' : 'blocked'}`}><span>{result.status === 'APPROVED' ? <BadgeCheck size={18}/> : <ShieldAlert size={18}/>}</span><div><b>HTTP {result.httpStatus ?? (result.status === 'APPROVED' ? 200 : result.status === 'BLOCKED' ? 403 : 404)} · {result.status}</b><small>{message}</small>{result.status === 'BLOCKED' && result.unresolvedFindings?.length ? <ul>{result.unresolvedFindings.map((finding, index) => <li key={`${finding.citation}-${index}`}><strong>{finding.citation}</strong> · “{finding.phrase}” · {finding.severity}</li>)}</ul> : null}{result.status === 'APPROVED' && <div className="certificate-proof"><small><LockKeyhole size={12}/> {result.certificateId} · SHA-256 {result.sha256Signature?.slice(0, 24)}…</small><small>Approved by {result.approvedBy} · {result.timestamp ? new Date(result.timestamp).toLocaleString() : ''}</small><button className="gv-quiet" onClick={downloadCertificate}><Download size={14}/> Download review record</button></div>}</div></div>}
    {!result && message && <p className="gate-message" role="status">{message}</p>}
  </section>;
}
