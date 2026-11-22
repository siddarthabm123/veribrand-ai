'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { BadgeCheck, BookOpen, CheckCircle2, ChevronRight, Plus, X } from 'lucide-react';
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
  return <section className="knowledge-grid" aria-label="Brand knowledge and verified facts">
    <div className="panel knowledge-panel">
      <div className="panel-head knowledge-header"><div><h2><BookOpen size={17}/> Brand guidelines</h2><p>{guidelines.length} standards · custom phrase rules are applied in New Audit.</p><div className="knowledge-sync"><span className="pulse"/>Synced with Acme Cloud workspace <small><BadgeCheck size={12}/> Changes saved on this device</small></div></div><button className="secondary-btn" onClick={() => setAdding((value) => !value)}>{adding ? <><X size={15}/> Cancel</> : <><Plus size={15}/> Add guideline</>}</button></div>
      {adding && <form className="guideline-form" onSubmit={addGuideline}><label>Guideline name<input autoFocus required maxLength={72} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Approved product name"/></label><label>Phrase to flag<input required maxLength={120} value={phrase} onChange={(event) => setPhrase(event.target.value)} placeholder="e.g. guaranteed results"/></label><label>Preferred replacement<input required maxLength={120} value={replacement} onChange={(event) => setReplacement(event.target.value)} placeholder="e.g. designed for reliable results"/></label><label>Rule category<select value={category} onChange={(event) => setCategory(event.target.value as typeof category)}><option value="terminology">Terminology</option><option value="fact_claim">Fact claim</option><option value="tone">Tone</option></select></label><label>Why this rule applies<textarea required maxLength={400} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Explain the approved wording or evidence behind this rule"/></label>{formMessage && <p role="alert" className="form-message">{formMessage}</p>}<button className="primary-btn" type="submit" disabled={saving}>{saving ? 'Saving rule…' : 'Save audit rule'}</button></form>}
      {guidelines.map((item) => <div className="guideline-row" key={item.id}><span className="rule-id">{item.id}</span><span><b>{item.name}</b><small>{item.phrase ? 'Flag “' + item.phrase + '” → use “' + item.replacement + '”. ' : ''}{item.description}</small></span><ChevronRight size={16}/></div>)}
    </div>
    <div className="knowledge-side">
      <div className="panel fact-panel"><div className="panel-head"><div><h2>Approved facts</h2><p>Verified claims only</p></div><CheckCircle2 size={17}/></div>{facts.map(([fact, label]) => <div className="fact-row" key={fact}><b>{fact}</b><span>{label}</span><CheckCircle2 size={14}/></div>)}</div>
      <div className="panel terminology-panel"><h2>Terminology guardrails</h2><p>BANNED → PREFERRED</p>{terminology.map(([bad, good]) => <div key={bad}><del>{bad}</del><span>→</span><b>{good}</b></div>)}</div>
    </div>
  </section>;
}
