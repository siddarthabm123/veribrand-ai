'use client';
import { authFetch } from '@/lib/auth-fetch';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, FileCheck2, RefreshCw, Sparkles } from 'lucide-react';
import { CUSTOM_GUIDELINES_KEY, normalizeCustomRules } from '@/lib/custom-guidelines';
import { readCustomGuidelines, readSubmissions } from '@/lib/client-state';
import type { AuditFinding, CustomAuditRule, Submission } from '@/types/governance';

type Proposal = { code: string; title: string; rationale: string; doExample: string; dontExample: string; phrase: string; replacement: string; category: CustomAuditRule['category']; signals: number; overrides: number };
const changed = 'veribrand-ai:guidelines-change';
const hash = (value: string) => [...value].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7).toString(16).toUpperCase().slice(0, 6);
function savedPhrases() {
  if (typeof window === 'undefined') return [] as string[];
  try { return normalizeCustomRules(JSON.parse(localStorage.getItem(CUSTOM_GUIDELINES_KEY) || '[]')).map((rule) => rule.phrase.toLowerCase()); }
  catch { return [] as string[]; }
}

export default function GuidelineAutoDrafter() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [published, setPublished] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [publishing, setPublishing] = useState('');
  const [message, setMessage] = useState('');
  const publishLock = useRef(false);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    const local = readSubmissions();
    try {
      const response = await authFetch('/api/submissions', { cache: 'no-store' });
      const baseline = response.ok ? await response.json() as Submission[] : [];
      const merged = new Map(baseline.map((record) => [record.id, record]));
      local.forEach((record) => merged.set(record.id, record));
      setSubmissions([...merged.values()]);
    } catch { setSubmissions(local); }
    finally { setRefreshing(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => { void refresh(); }, 0); window.addEventListener('storage', refresh); return () => { window.clearTimeout(timer); window.removeEventListener('storage', refresh); }; }, [refresh]);

  const proposals = useMemo(() => {
    const groups = new Map<string, { findings: AuditFinding[]; records: Submission[] }>();
    for (const record of submissions) for (const finding of record.findings ?? []) {
      const key = finding.exact_span.trim().toLowerCase();
      if (!key || key.length > 120) continue;
      const group = groups.get(key) ?? { findings: [], records: [] };
      group.findings.push(finding); group.records.push(record); groups.set(key, group);
    }
    const existing = savedPhrases();
    return [...groups.entries()].flatMap(([phraseKey, group]) => {
      const phrase = group.findings[0].exact_span;
      const overrides = group.findings.filter((finding) => finding.reviewer_status === 'overridden').length;
      if ((group.findings.length < 2 && overrides === 0) || existing.includes(phraseKey)) return [];
      const replacement = group.findings.find((finding) => finding.suggested_fix.trim())?.suggested_fix ?? 'Use approved brand wording';
      const category = group.findings[0].category;
      const citations = [...new Set(group.findings.map((finding) => finding.rule_citation))];
      const rationale = `${group.findings.length} related finding${group.findings.length === 1 ? '' : 's'} across ${new Set(group.records.map((record) => record.id)).size} submission${new Set(group.records.map((record) => record.id)).size === 1 ? '' : 's'}${overrides ? `, including ${overrides} reviewer override${overrides === 1 ? '' : 's'}` : ''}. Recurring citation${citations.length === 1 ? '' : 's'}: ${citations.join(', ')}.`;
      const code = `BG-AI-${hash(phraseKey)}`;
      if (published.includes(code)) return [];
      return [{ code, title: `Clarify approved wording for “${phrase}”`, rationale, doExample: replacement, dontExample: phrase, phrase, replacement, category, signals: group.findings.length, overrides }];
    }).slice(0, 6);
  }, [submissions, published]);

  function publish(proposal: Proposal) {
    if (publishLock.current) return;
    publishLock.current = true; setPublishing(proposal.code); setMessage('');
    try {
      const current = readCustomGuidelines();
      if (!current.some((rule) => rule.phrase.toLowerCase() === proposal.phrase.toLowerCase())) {
        const rule: CustomAuditRule = { id: proposal.code, name: proposal.title.slice(0, 72), phrase: proposal.phrase, replacement: proposal.replacement, category: proposal.category, explanation: proposal.rationale };
        localStorage.setItem(CUSTOM_GUIDELINES_KEY, JSON.stringify([...current, rule]));
        window.dispatchEvent(new Event(changed));
      }
      setPublished((items) => [...items, proposal.code]); setMessage('Rule published to Brand Knowledge and ready for the next audit.');
    } catch { setMessage('Could not save the rule in this browser. Check storage availability and retry.'); }
    finally { publishLock.current = false; setPublishing(''); }
  }

  return <section id="guideline-auto-drafter" className="panel auto-drafter">
    <div className="panel-head"><div><h2><Sparkles size={17}/> Automated Guideline Gap Auto-Drafter</h2><p>Recurring audit flags and reviewer overrides become draft rules for your approval.</p></div><button className="secondary-btn" onClick={() => void refresh()} disabled={refreshing}><RefreshCw size={14}/> {refreshing ? 'Refreshing…' : 'Refresh signals'}</button></div>
    <div className="drafter-note"><FileCheck2 size={15}/> Suggestions come from current workspace submissions, repeated citations and reviewer override reasons. Nothing is published until you approve it.</div>
    {message && <p className="campaign-message" role="status">{message}</p>}
    {proposals.length ? <div className="proposal-grid">{proposals.map((proposal) => <article className="rule-proposal" key={proposal.code}><div className="proposal-top"><code>{proposal.code}</code><span>{proposal.signals} signals · {proposal.overrides} overrides</span></div><h3>{proposal.title}</h3><p>{proposal.rationale}</p><div className="proposal-examples"><div><small>DO</small><b>{proposal.doExample}</b></div><div><small>DON’T</small><del>{proposal.dontExample}</del></div></div><button className="primary-btn" onClick={() => publish(proposal)} disabled={published.includes(proposal.code) || publishing === proposal.code}>{publishing === proposal.code ? 'Publishing rule…' : published.includes(proposal.code) ? <><Check size={14}/> Published to Brand Knowledge</> : <>Approve & Publish Rule <ArrowRight size={14}/></>}</button></article>)}</div> : <div className="drafter-empty"><b>No repeated patterns need a new rule yet.</b><span>Run a few audits or record an override in Review Room, then refresh signals.</span></div>}
  </section>;
}
