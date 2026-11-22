'use client';

import { useRef, useState } from 'react';
import { BadgeCheck, Download, LockKeyhole, Radio, ShieldAlert } from 'lucide-react';
import type { Submission } from '@/types/governance';
import { buildComplianceCertificate } from '@/lib/compliance-certificate';

type GateResult = { status: 'BLOCKED' | 'APPROVED' | 'NOT_FOUND' | 'UNAVAILABLE'; submissionId: string; targetChannel: string; error?: string; httpStatus?: number; unresolvedFindings?: Array<{ citation: string; phrase: string; severity: string }>; certificateId?: string; sha256Signature?: string; approvedBy?: string; timestamp?: string };

export default function GateSimulator({ submission }: { submission: Submission | null }) {
  const [channel, setChannel] = useState('Website CMS');
  const [result, setResult] = useState<GateResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const requestLock = useRef(false);

  async function testGate() {
    if (!submission || requestLock.current) return;
    requestLock.current = true;
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/webhook/gate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ submissionId: submission.id, targetChannel: channel }) });
      const payload = await response.json() as GateResult;
      setResult({ ...payload, httpStatus: response.status });
      setMessage(response.status === 403 ? 'Publication stopped. Resolve every finding and approve the review to continue.' : response.ok ? 'Verified sign-off received. This asset is cleared for the selected channel.' : payload.error || 'The gate could not verify this review. Try again.');
    } catch { setMessage('The gate is temporarily unavailable. Your review remains saved in this browser.'); }
    finally { requestLock.current = false; setBusy(false); }
  }

  async function downloadCertificate() {
    if (!submission || !result?.certificateId || !result.sha256Signature) return;
    try {
      const bytes = await buildComplianceCertificate(submission, { certificateId: result.certificateId, sha256Signature: result.sha256Signature, approvedBy: result.approvedBy, timestamp: result.timestamp, targetChannel: result.targetChannel });
      const buffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(buffer).set(bytes);
      const url = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }));
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `VeriBrand-Certificate-${result.certificateId}.pdf`; anchor.click();
      URL.revokeObjectURL(url);
    } catch { setMessage('The PDF certificate could not be created. Please retry.'); }
  }

  return <section id="prepublish-gate" className="gate-simulator">
    <div className="gate-heading"><span><Radio size={17}/></span><div><h2>Live CMS / Git Webhook Gate</h2><p>Test how publication responds to this review’s current sign-off state.</p></div><span className="gate-live"><i/> LIVE</span></div>
    <div className="gate-controls"><label>Target channel<select value={channel} onChange={(event) => setChannel(event.target.value)}><option>Website CMS</option><option>GitHub release</option><option>Social scheduler</option><option>Email platform</option></select></label><button className="primary-btn" onClick={testGate} disabled={!submission || busy}>{busy ? 'Checking gate…' : 'Test Pre-Publish Deploy Gate'}</button></div>
    {!submission && <p className="gate-message">Send a draft to human review to create a submission for the gate.</p>}
    {result && <div className={`gate-result ${result.status === 'APPROVED' ? 'approved' : 'blocked'}`}><span>{result.status === 'APPROVED' ? <BadgeCheck size={18}/> : <ShieldAlert size={18}/>}</span><div><b>HTTP {result.httpStatus ?? (result.status === 'APPROVED' ? 200 : result.status === 'BLOCKED' ? 403 : 404)} · {result.status}</b><small>{message}</small>{result.status === 'BLOCKED' && result.unresolvedFindings?.length ? <ul>{result.unresolvedFindings.map((finding, index) => <li key={`${finding.citation}-${index}`}><strong>{finding.citation}</strong> · “{finding.phrase}” · {finding.severity}</li>)}</ul> : null}{result.status === 'APPROVED' && <div className="certificate-proof"><small><LockKeyhole size={12}/> {result.certificateId} · SHA-256 {result.sha256Signature?.slice(0, 24)}…</small><small>Signed by {result.approvedBy} · {result.timestamp ? new Date(result.timestamp).toLocaleString() : ''}</small><button className="secondary-btn" onClick={downloadCertificate}><Download size={14}/> Download compliance certificate</button></div>}</div></div>}
    {!result && message && <p className="gate-message" role="status">{message}</p>}
  </section>;
}
