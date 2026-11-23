'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { BadgeCheck, CheckCircle2, ChevronRight, Plus, X } from 'lucide-react';
import { CUSTOM_GUIDELINES_KEY, normalizeCustomRules } from '@/lib/custom-guidelines';

type Guideline = { id: string; name: string; description: string; phrase?: string; replacement?: string; category?: string };
const changeEvent = 'veribrand-ai:guidelines-change';
const defaults: Guideline[] = [
  { id: 'BG-1.1', name: 'Voice & Tone', description: 'Clear, confident, helpful and human. Avoid hype and absolute promises.' },
  { id: 'BG-1.2', name: 'Product Terminology', description: 'Use Acme Cloud. Avoid ACC and autonomous AI.' },
  { id: 'BG-2.1', name: 'Verified Metrics & Claims', description: '99.95% uptime SLA · 15 minutes support · 10 GB free · SOC2 Type II' },
  { id: 'BG-3.1', name: 'Brand Color Palette', description: 'Approved: #4F46E5 · #0F172A · #10B981 · #F8FAFC' },
  { id: 'BG-3.2', name: 'Accessibility Standards', description: 'WCAG AA contrast ratio of at least 4.5:1.' },
];
const facts = [['99.95%', 'Uptime SLA'], ['15 minutes', 'Enterprise response'], ['10 GB', 'Free storage'], ['SOC2 Type II', 'Certified']];
const terminology = [['game-changing', 'powerful'], ['ACC', 'Acme Cloud'], ['100% uptime', '99.95% uptime SLA'], ['autonomous AI', 'AI-assisted workflows']];

function subscribeGuidelines(listener: () => void) {
  window.addEventListener(changeEvent, listener);
  window.addEventListener('storage', listener);
  return () => { window.removeEventListener(changeEvent, listener); window.removeEventListener('storage', listener); };
}
function getGuidelinesSnapshot() {
  try {
    const saved = localStorage.getItem(CUSTOM_GUIDELINES_KEY);
    const custom = saved ? normalizeCustomRules(JSON.parse(saved)).map((rule) => ({ id: rule.id, name: rule.name, phrase: rule.phrase, replacement: rule.replacement, category: rule.category, description: rule.explanation })) : [];
    return JSON.stringify([...defaults, ...custom]);
  } catch { return JSON.stringify(defaults); }
}

export default function KnowledgePage() {
  const snapshot = useSyncExternalStore(subscribeGuidelines, getGuidelinesSnapshot, () => JSON.stringify(defaults));
  const guidelines = useMemo(() => JSON.parse(snapshot) as Guideline[], [snapshot]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phrase, setPhrase] = useState('');
  const [replacement, setReplacement] = useState('');
  const [category, setCategory] = useState<'terminology' | 'fact_claim' | 'tone'>('terminology');
  const [formMessage, setFormMessage] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    void fetch('/api/knowledge', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) return null;
      return await response.json() as { customGuidelines?: Array<{ id: string; name: string; phrase: string; replacement: string; category: string; explanation: string }> };
    }).then((remote) => {
      if (!active || !remote?.customGuidelines?.length) return;
      const local = normalizeCustomRules(JSON.parse(localStorage.getItem(CUSTOM_GUIDELINES_KEY) || '[]'));
      const byPhrase = new Map([...remote.customGuidelines, ...local].map((rule) => [rule.phrase.toLowerCase(), rule]));
      localStorage.setItem(CUSTOM_GUIDELINES_KEY, JSON.stringify(normalizeCustomRules([...byPhrase.values()])));
      window.dispatchEvent(new Event(changeEvent));
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  async function addGuideline(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setFormMessage('');
    const next = {
      id: 'BG-C-' + crypto.randomUUID().slice(0, 8).toUpperCase(),
      name: name.trim(),
      description: description.trim(),
      phrase: phrase.trim(),
      replacement: replacement.trim(),
      category,
    };
    if (!next.name || !next.description || !next.phrase || !next.replacement) { setFormMessage('Fill in each field with non-blank text.'); setSaving(false); return; }
    if (guidelines.some((item) => item.phrase?.toLowerCase() === next.phrase.toLowerCase())) { setFormMessage('That phrase already has a workspace rule.'); setSaving(false); return; }
    const custom = [...guidelines.filter((item) => !defaults.some((base) => base.id === item.id)), next];
    try {
      const response = await fetch('/api/knowledge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...next, explanation: next.description }) });
      if (!response.ok) throw new Error('The workspace could not save this rule.');
      const result = await response.json() as { entry?: { id: string } };
      if (result.entry) next.id = result.entry.id;
      localStorage.setItem(CUSTOM_GUIDELINES_KEY, JSON.stringify(custom));
    } catch { setFormMessage('Rule could not be saved. Check storage and your connection, then retry.'); setSaving(false); return; }
    window.dispatchEvent(new Event(changeEvent));
    setName('');
    setDescription('');
    setPhrase('');
    setReplacement('');
    setAdding(false);
    setSaving(false);
  }
  const cardStyle: React.CSSProperties = { position: 'static', height: 'auto', maxHeight: 'none', minWidth: 0, overflow: 'visible', background: '#fff', border: '1px solid #d8dfda', borderRadius: 8, boxShadow: '0 2px 8px rgba(24,41,36,.04)' };
  const headingStyle: React.CSSProperties = { margin: 0, fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontSize: 20, lineHeight: 1.4, fontWeight: 650, letterSpacing: 'normal', wordSpacing: 'normal' };
  const bodyStyle: React.CSSProperties = { margin: 0, fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontSize: 14, lineHeight: 1.5, letterSpacing: 'normal', wordSpacing: 'normal', overflowWrap: 'anywhere' };
  return <div aria-label="Brand knowledge and verified facts" style={{ position: 'relative', zIndex: 1, height: 'auto', maxHeight: 'none', overflow: 'visible', paddingTop: 24, display: 'grid', gridTemplateColumns: 'minmax(0, 1.55fr) minmax(0, 1fr)', gap: 24, alignItems: 'start', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', letterSpacing: 'normal', wordSpacing: 'normal', lineHeight: 1.5 }} className="knowledge-grid">
    <section aria-labelledby="knowledge-title" style={{ ...cardStyle, gridColumn: 'auto' }}>
      <header style={{ position: 'static', height: 'auto', maxHeight: 'none', overflow: 'visible', padding: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', borderBottom: '1px solid #e7ece8' }}><div style={{ minWidth: 0, flex: '1 1 260px' }}><p style={{ ...bodyStyle, color: '#617169', textTransform: 'uppercase', fontSize: 12, fontWeight: 700, letterSpacing: '.08em' }}>Acme Cloud • Brand Operations</p><h1 id="knowledge-title" style={{ ...headingStyle, fontSize: 30, marginTop: 5 }}>Brand Knowledge</h1><p style={{ ...bodyStyle, color: '#617169', marginTop: 5 }}>{guidelines.length} standards · custom phrase rules are applied in New Audit.</p><div style={{ ...bodyStyle, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 12, color: '#52685d', fontSize: 13 }}><span className="pulse"/>Synced with Acme Cloud workspace <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><BadgeCheck size={13}/> Changes saved on this device</span></div></div><button type="button" className="secondary-btn" onClick={() => setAdding((value) => !value)} style={{ position: 'static', flex: '0 0 auto', height: 40, maxWidth: '100%', whiteSpace: 'nowrap', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', letterSpacing: 'normal', wordSpacing: 'normal' }}>{adding ? <><X size={15}/> Cancel</> : <><Plus size={15}/> Add guideline</>}</button></header>
      <p style={{ padding: 20, margin: 0 }}><Link href="/evidence">Open the searchable Claim Evidence Library</Link></p>
      {adding && <form className="guideline-form" onSubmit={addGuideline}><label>Guideline name<input autoFocus required maxLength={72} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Approved product name"/></label><label>Phrase to flag<input required maxLength={120} value={phrase} onChange={(event) => setPhrase(event.target.value)} placeholder="e.g. guaranteed results"/></label><label>Preferred replacement<input required maxLength={120} value={replacement} onChange={(event) => setReplacement(event.target.value)} placeholder="e.g. designed for reliable results"/></label><label>Rule category<select value={category} onChange={(event) => setCategory(event.target.value as typeof category)}><option value="terminology">Terminology</option><option value="fact_claim">Fact claim</option><option value="tone">Tone</option></select></label><label>Why this rule applies<textarea required maxLength={400} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Explain the approved wording or evidence behind this rule"/></label>{formMessage && <p role="alert" className="form-message">{formMessage}</p>}<button className="primary-btn" type="submit" disabled={saving}>{saving ? 'Saving rule…' : 'Save audit rule'}</button></form>}
      {guidelines.map((item) => <div className="guideline-row" key={item.id} style={{ position: 'static', height: 'auto', maxHeight: 'none', minHeight: 68, overflow: 'visible', display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 20px', borderBottom: '1px solid #edf0ee', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', letterSpacing: 'normal', wordSpacing: 'normal', lineHeight: 1.5 }}><span className="rule-id" style={{ flex: '0 0 auto' }}>{item.id}</span><span style={{ flex: '1 1 auto', minWidth: 0 }}><b style={{ display: 'block', ...bodyStyle, fontWeight: 650, color: '#263a32' }}>{item.name}</b><small style={{ display: 'block', ...bodyStyle, fontSize: 13, color: '#617169', marginTop: 4 }}>{item.phrase ? 'Flag “' + item.phrase + '” → use “' + item.replacement + '”. ' : ''}{item.description}</small></span><ChevronRight size={16} style={{ flex: '0 0 auto', marginTop: 3 }}/></div>)}
    </section>
    <aside className="knowledge-side" style={{ position: 'static', height: 'auto', maxHeight: 'none', overflow: 'visible', gridColumn: 'auto', display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
      <section aria-labelledby="facts-title" style={{ ...cardStyle, paddingBottom: 8 }}><header style={{ position: 'static', height: 'auto', padding: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderBottom: '1px solid #edf0ee' }}><div><h2 id="facts-title" style={headingStyle}>Approved facts</h2><p style={{ ...bodyStyle, color: '#617169', marginTop: 4 }}>Verified claims only</p></div><CheckCircle2 size={19} color="#23865b"/></header>{facts.map(([fact, label]) => <div className="fact-row" key={fact} style={{ position: 'static', height: 'auto', maxHeight: 'none', minHeight: 48, overflow: 'visible', display: 'grid', gridTemplateColumns: 'minmax(0, .8fr) minmax(0, 1fr) 18px', alignItems: 'center', gap: 10, padding: '10px 18px', borderBottom: '1px solid #edf0ee', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', letterSpacing: 'normal', wordSpacing: 'normal', lineHeight: 1.5 }}><b style={{ ...bodyStyle, fontWeight: 650 }}>{fact}</b><span style={{ ...bodyStyle, color: '#617169' }}>{label}</span><CheckCircle2 size={15} color="#23865b"/></div>)}</section>
      <section aria-labelledby="terms-title" style={{ ...cardStyle, padding: 22 }}><h2 id="terms-title" style={headingStyle}>Terminology guardrails</h2><p style={{ ...bodyStyle, color: '#617169', fontSize: 12, fontWeight: 700, letterSpacing: '.08em', marginTop: 4, marginBottom: 10 }}>BANNED → PREFERRED</p>{terminology.map(([bad, good]) => <div key={bad} style={{ position: 'static', height: 'auto', maxHeight: 'none', minHeight: 44, overflow: 'visible', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, padding: '9px 0', borderTop: '1px solid #edf0ee', ...bodyStyle }}><del style={{ color: '#b54c4c', background: '#fff0ee', padding: '3px 6px', borderRadius: 4 }}>{bad}</del><span aria-hidden="true" style={{ color: '#8a968f' }}>→</span><b style={{ color: '#187a51' }}>{good}</b></div>)}</section>
    </aside>
  </div>;
}
