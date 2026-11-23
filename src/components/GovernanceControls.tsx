'use client';

import { contrast, readiness, type VisualInput } from '@/lib/governance';
import type { Submission } from '@/types/governance';

export function AccessibilityFields({ value, onChange, disabled = false }: { value: VisualInput; onChange: (value: VisualInput) => void; disabled?: boolean }) {
  const valid = (color: string | undefined) => Boolean(color && /^#[0-9a-f]{6}$/i.test(color));
  const ratio = valid(value.foreground) && valid(value.background) ? contrast(value.foreground!, value.background!) : null;
  return <fieldset className="gv-accessibility" disabled={disabled}><legend>Visual accessibility</legend><p>Optional: declare the actual text colors and image purpose. These checks do not certify full accessibility.</p><div className="gv-fields"><label>Foreground color<input value={value.foreground || ''} onChange={e => onChange({ ...value, foreground: e.target.value })} placeholder="#0F172A" maxLength={7}/></label><label>Background color<input value={value.background || ''} onChange={e => onChange({ ...value, background: e.target.value })} placeholder="#F8FAFC" maxLength={7}/></label><label>Text size<select value={value.largeText ? 'large' : 'normal'} onChange={e => onChange({ ...value, largeText: e.target.value === 'large' })}><option value="normal">Normal text (4.5:1)</option><option value="large">Large text (3:1)</option></select><small>Large means at least 24px, or 18.5px bold.</small></label><label>Image purpose<select value={value.imagePurpose} onChange={e => onChange({ ...value, imagePurpose: e.target.value as VisualInput['imagePurpose'] })}><option value="none">No image in this content</option><option value="informative">Informative image</option><option value="decorative">Decorative image</option></select></label></div>{value.imagePurpose === 'informative' && <label>Image description (alt text)<textarea value={value.altText} onChange={e => onChange({ ...value, altText: e.target.value })} placeholder="Describe what this image communicates." maxLength={1000}/></label>}{value.imagePurpose === 'decorative' && <p>Use an empty alt attribute for decoration; the reviewer must verify the published markup.</p>}{ratio !== null && <output className="gv-ratio">{ratio.toFixed(3)}:1 contrast — {ratio >= (value.largeText ? 3 : 4.5) ? 'Meets the selected contrast threshold' : 'Below the selected contrast threshold'}</output>}<small>References: <a href="https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html" target="_blank" rel="noreferrer">WCAG text contrast</a> and <a href="https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html" target="_blank" rel="noreferrer">text alternatives</a>. Semantic appropriateness requires human review.</small></fieldset>;
}

export function ReadinessCard({ record }: { record: Submission }) {
  const state = readiness(record);
  return <section className="gv-readiness" aria-label="Brand readiness"><div><strong>{state.score}<span>/100</span></strong><div><h2>{state.label}</h2><p>{state.open} open findings, {state.overrides} documented exceptions. Content v{record.governance?.version ?? 'unversioned'}.</p></div></div><details><summary>How this score works</summary><p>{state.formula}</p></details><small>Content fingerprint: <code>{record.governance?.contentHash ?? 'Not recorded'}</code></small></section>;
}

export function CheckLedger({ record }: { record: Submission }) {
  return <section className="gv-panel"><h2>Checks run and not run</h2><p>Evidence pack {record.governance?.knowledgeVersion ?? 'not recorded'}. Exact rule matches have no AI confidence score.</p><div className="gv-checks">{record.governance?.checks.map(check => <article key={check.id}><div><b>{check.title}</b><span className={`gv-status ${check.status}`}>{check.status.replace('_', ' ')}</span></div><p>{check.detail}</p><small>{check.id} / {check.engine === 'not_run' ? 'Not run' : 'Deterministic'} / {check.source.startsWith('https://') ? <a href={check.source} target="_blank" rel="noreferrer">View reference</a> : check.source}</small></article>)}</div></section>;
}

export function PassportLinks({ record }: { record: Submission }) {
  const base = `/api/submissions/${encodeURIComponent(record.id)}/passport`;
  return <nav className="gv-exports" aria-label="Brand Passport exports"><a href={`${base}?format=pdf`}>Download PDF</a><a href={`${base}?format=json`}>Download JSON</a><a href={`${base}?format=markdown`}>Download Markdown</a><a href={`/passport/${encodeURIComponent(record.id)}?version=${record.governance?.version ?? 0}`}>Open shareable passport</a></nav>;
}
