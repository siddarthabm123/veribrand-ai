'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import { BadgeCheck, BookOpen, CheckCircle2, ChevronRight, Plus, X } from 'lucide-react';
import { CUSTOM_GUIDELINES_KEY } from '@/lib/custom-guidelines';

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
    return JSON.stringify(saved ? [...defaults, ...JSON.parse(saved)] : defaults);
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
  function addGuideline(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = {
      id: 'BG-C-' + crypto.randomUUID().slice(0, 8).toUpperCase(),
      name: name.trim(),
      description: description.trim(),
      phrase: phrase.trim(),
      replacement: replacement.trim(),
      category,
    };
    if (!next.name || !next.description || !next.phrase || !next.replacement) return;
    const custom = [...guidelines.filter((item) => !defaults.some((base) => base.id === item.id)), next];
    try { localStorage.setItem(CUSTOM_GUIDELINES_KEY, JSON.stringify(custom)); } catch { /* Keep the new item for this session. */ }
    window.dispatchEvent(new Event(changeEvent));
    setName('');
    setDescription('');
    setPhrase('');
    setReplacement('');
    setAdding(false);
  }
  return <div className="knowledge-grid">
    <div className="panel knowledge-panel">
      <div className="panel-head"><div><h2><BookOpen size={17}/> Brand guidelines</h2><p>{guidelines.length} standards · custom phrase rules are applied in New Audit.</p></div><button className="secondary-btn" onClick={() => setAdding((value) => !value)}>{adding ? <><X size={15}/> Cancel</> : <><Plus size={15}/> Add guideline</>}</button></div>
      {adding && <form className="guideline-form" onSubmit={addGuideline}><label>Guideline name<input autoFocus required maxLength={72} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Approved product name"/></label><label>Phrase to flag<input required maxLength={120} value={phrase} onChange={(event) => setPhrase(event.target.value)} placeholder="e.g. guaranteed results"/></label><label>Preferred replacement<input required maxLength={120} value={replacement} onChange={(event) => setReplacement(event.target.value)} placeholder="e.g. designed for reliable results"/></label><label>Rule category<select value={category} onChange={(event) => setCategory(event.target.value as typeof category)}><option value="terminology">Terminology</option><option value="fact_claim">Fact claim</option><option value="tone">Tone</option></select></label><label>Why this rule applies<textarea required maxLength={400} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Explain the approved wording or evidence behind this rule"/></label><button className="primary-btn" type="submit">Save audit rule</button></form>}
      {guidelines.map((item) => <div className="guideline-row" key={item.id}><span className="rule-id">{item.id}</span><span><b>{item.name}</b><small>{item.phrase ? 'Flag “' + item.phrase + '” → use “' + item.replacement + '”. ' : ''}{item.description}</small></span><ChevronRight size={16}/></div>)}
    </div>
    <div className="knowledge-side">
      <div className="panel fact-panel"><div className="panel-head"><div><h2>Approved facts</h2><p>Verified claims only</p></div><CheckCircle2 size={17}/></div>{facts.map(([fact, label]) => <div className="fact-row" key={fact}><b>{fact}</b><span>{label}</span><CheckCircle2 size={14}/></div>)}</div>
      <div className="panel terminology-panel"><h2>Terminology guardrails</h2><p>BANNED → PREFERRED</p>{terminology.map(([bad, good]) => <div key={bad}><del>{bad}</del><span>→</span><b>{good}</b></div>)}</div>
      <div className="knowledge-footer"><span className="pulse"/> Synced with Acme Cloud workspace <small><BadgeCheck size={12}/> Local changes saved on this device</small></div>
    </div>
  </div>;
}
