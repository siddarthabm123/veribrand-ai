import type { ApprovedFact, AuditFinding, BrandGuideline, BrandRules, CustomAuditRule, Submission } from '@/types/governance';

export type ReviewActor = { name: string; role: 'Content Creator' | 'Brand Reviewer' | 'Brand Admin' };
export type VisualInput = { foreground?: string; background?: string; largeText?: boolean; imagePurpose: 'none' | 'informative' | 'decorative'; altText: string };
export type CheckedRule = { id: string; title: string; status: 'pass' | 'fail' | 'not_run'; detail: string; source: string; engine: 'deterministic' | 'not_run' };
export type EvidencePack = { version: string; facts: ApprovedFact[]; guidelines: BrandGuideline[]; rules: BrandRules; customGuidelines: CustomAuditRule[] };
export type ReviewEvent = { id: string; action: string; actor: ReviewActor; at: string; version: number; evidenceVersion?: string; finding?: AuditFinding; reason?: string; before?: string; after?: string };
export type Governance = { schema: 1; revision: number; version: number; original: string; contentHash: string; knowledgeVersion: string; evidence?: EvidencePack; checks: CheckedRule[]; visual: VisualInput; events: ReviewEvent[]; channel: string; approvedHash?: string; approvedAt?: string; approvedBy?: string };
export type ReviewCommand = { action: 'accept' | 'edit' | 'reject' | 'override' | 'revise' | 'approve' | 'request_changes' | 'comment' | 'rescan'; expectedRevision: number; actor: ReviewActor; findingId?: string; replacement?: string; reason?: string; text?: string; visual?: VisualInput };

export class GovernanceError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export async function fingerprint(value: unknown): Promise<string> {
  const canonical = (input: unknown): unknown => Array.isArray(input) ? input.map(canonical) : input && typeof input === 'object' ? Object.fromEntries(Object.entries(input).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)])) : input;
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(canonical(value))));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}
export function sourceDetails(source: string) {
  try { const value = JSON.parse(source); if (value && typeof value.title === 'string') return { title: value.title as string, url: typeof value.url === 'string' ? value.url : '', approvedBy: typeof value.approvedBy === 'string' ? value.approvedBy : 'Not recorded', at: typeof value.at === 'string' ? value.at : '' }; } catch { /* Older sources are plain document titles. */ }
  return { title: source, url: '', approvedBy: 'Not recorded', at: '' };
}
export function normalizeVisual(value: unknown): VisualInput {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const hex = (v: unknown) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v.toUpperCase() : undefined;
  const foreground = hex(input.foreground), background = hex(input.background);
  if (('foreground' in input && input.foreground && !foreground) || ('background' in input && input.background && !background) || Boolean(foreground) !== Boolean(background)) throw new GovernanceError('Enter both colors as six-digit hex values.');
  if (input.imagePurpose !== undefined && !['none', 'informative', 'decorative'].includes(String(input.imagePurpose))) throw new GovernanceError('Choose an image purpose.');
  return { ...(foreground && background ? { foreground, background } : {}), largeText: input.largeText === true, imagePurpose: input.imagePurpose === 'informative' || input.imagePurpose === 'decorative' ? input.imagePurpose : 'none', altText: typeof input.altText === 'string' ? input.altText.trim().slice(0, 1000) : '' };
}
export function contrast(foreground: string, background: string) {
  const luminance = (hex: string) => {
    const channels = hex.slice(1).match(/../g)!.map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  };
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
const normalMetric = (text: string) => text.toLowerCase().replace(/-/g, ' ').replace(/\bminute\b/g, 'minutes').replace(/\s+/g, '').trim();
const findingKey = (finding: AuditFinding) => [finding.rule_citation, finding.exact_span, finding.category].join('\u0000');
export function scanGovernance(text: string, id: string, pack: EvidencePack, visual: VisualInput) {
  const findings: AuditFinding[] = [];
  const checks: CheckedRule[] = [];
  const add = (rule: string, span: string, index: number, fix: string, source: string, explanation: string, category: AuditFinding['category'] = 'terminology', severity: AuditFinding['severity'] = 'high') => {
    findings.push({ id: crypto.randomUUID(), submission_id: id, category, severity, exact_span: span, start_index: index, end_index: index + span.length, rule_citation: rule, source_excerpt: source, explanation, suggested_fix: fix, intent_preservation_score: 0, reviewer_status: 'pending' });
  };
  const terminology = new Map(Object.entries(pack.rules.banned_terms).map(([phrase, replacement]) => [phrase.toLowerCase(), { phrase, replacement, id: 'BG-1.2', source: 'Product Terminology guideline', explanation: 'Use the approved wording from the brand rulebook.', category: 'terminology' as AuditFinding['category'] }]));
  for (const rule of pack.customGuidelines) terminology.set(rule.phrase.toLowerCase(), { phrase: rule.phrase, replacement: rule.replacement, id: rule.id, source: rule.name, explanation: rule.explanation, category: rule.category });
  for (const rule of terminology.values()) {
    const escaped = rule.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const match of text.matchAll(new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, 'giu'))) {
      const claim = rule.id === 'BG-1.2' && /\d/.test(rule.phrase);
      add(claim ? 'BG-2.1' : rule.id, match[0], match.index!, rule.replacement, rule.source, rule.explanation, claim ? 'fact_claim' : rule.category);
    }
  }
  for (const match of text.matchAll(/\b\d+(?:\.\d+)?%|\b\d+(?:\.\d+)?\s*-?\s*minutes?\b|\b\d+(?:\.\d+)?\s*GB\b/gi)) {
    const index = match.index!;
    if (findings.some(f => index >= f.start_index && index + match[0].length <= f.end_index)) continue;
    if (pack.facts.some(f => normalMetric(f.exact_value) === normalMetric(match[0]))) continue;
    const family = /%/.test(match[0]) ? /%/ : /minutes?/i.test(match[0]) ? /minutes?/i : /GB/i;
    const fact = pack.facts.find(f => family.test(f.exact_value));
    add('BG-2.1', match[0], index, fact?.exact_value ?? 'Add an approved metric to the evidence library', fact ? sourceDetails(fact.source_doc).title : 'Approved fact library', 'This numeric value is not listed in the approved evidence pack. Semantic context is not assessed by this check.', 'fact_claim');
  }
  checks.push({ id: 'BG-1.2', title: 'Approved terminology', status: findings.some(f => f.category === 'terminology') ? 'fail' : 'pass', detail: 'Exact phrase matching with word boundaries.', source: 'Product Terminology guideline', engine: 'deterministic' });
  checks.push({ id: 'BG-2.1', title: 'Approved numeric claims', status: findings.some(f => f.category === 'fact_claim') ? 'fail' : 'pass', detail: 'Percentages, response minutes, and GB values are compared to the evidence pack; other claim types require human review.', source: 'Approved fact library', engine: 'deterministic' });
  for (const rule of pack.customGuidelines) checks.push({ id: rule.id, title: rule.name, status: findings.some(f => f.rule_citation === rule.id) ? 'fail' : 'pass', detail: rule.explanation, source: rule.name, engine: 'deterministic' });
  const contrastSource = 'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html';
  if (visual.foreground && visual.background) {
    const ratio = contrast(visual.foreground, visual.background), minimum = visual.largeText ? 3 : Math.max(4.5, pack.rules.min_wcag_ratio);
    const passed = ratio >= minimum;
    checks.push({ id: 'BG-3.2', title: 'Text contrast', status: passed ? 'pass' : 'fail', detail: `${ratio.toFixed(3)}:1; required ${minimum}:1 for the declared text size. Based on the supplied color pair, not full-image analysis.`, source: contrastSource, engine: 'deterministic' });
    if (!passed) add('BG-3.2', `${visual.foreground} on ${visual.background}`, 0, 'Choose a pair meeting the contrast threshold, or document an exception', contrastSource, `Computed contrast is ${ratio.toFixed(3)}:1; the declared text requires ${minimum}:1.`, 'accessibility');
    const outside = [visual.foreground, visual.background].filter(color => !pack.rules.approved_hex_colors.some(approved => approved.toUpperCase() === color));
    checks.push({ id: 'BG-3.1', title: 'Declared brand colors', status: outside.length ? 'fail' : 'pass', detail: 'Exact match of supplied colors to the approved palette; logo placement and font recognition are not checked.', source: 'Brand Color Palette guideline', engine: 'deterministic' });
    if (outside.length) add('BG-3.1', outside.join(', '), 0, pack.rules.approved_hex_colors.join(', '), 'Brand Color Palette guideline', 'The supplied colors include values outside the approved palette.', 'visual', 'medium');
  } else {
    for (const [rule, title] of [['BG-3.2', 'Text contrast'], ['BG-3.1', 'Declared brand colors']]) checks.push({ id: rule, title, status: 'not_run', detail: 'No foreground/background pair supplied.', source: rule === 'BG-3.2' ? contrastSource : 'Brand Color Palette guideline', engine: 'not_run' });
  }
  const altSource = 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html';
  const altMissing = visual.imagePurpose === 'informative' && !visual.altText;
  checks.push({ id: 'BG-3.3', title: 'Image text alternative', status: visual.imagePurpose === 'none' ? 'not_run' : altMissing ? 'fail' : 'pass', detail: visual.imagePurpose === 'none' ? 'No image declared.' : visual.imagePurpose === 'decorative' ? 'Declared decorative: use empty alt text in the published markup. Rendering and semantic appropriateness require human review.' : visual.altText ? 'A description was supplied; its accuracy and the published markup require human review.' : 'An informative image needs a text alternative.', source: altSource, engine: visual.imagePurpose === 'none' ? 'not_run' : 'deterministic' });
  if (altMissing) add('BG-3.3', 'Missing alt text', 0, 'Describe the image’s meaning and purpose', altSource, 'An informative image was declared without a text alternative.', 'accessibility');
  checks.push({ id: 'AI-SEMANTIC', title: 'AI semantic and tone review', status: 'not_run', detail: 'This flow uses deterministic findings. No AI confidence is estimated or presented.', source: 'Verification scope', engine: 'not_run' });
  return { findings, checks };
}
export async function hashContent(record: Submission, visual: VisualInput) {
  return fingerprint({ text: record.body_text, image: record.image_meta ?? null, inspection: record.image_inspection ?? null, visual });
}
export async function initializeGovernance(record: Submission, pack: EvidencePack, visual: VisualInput = normalizeVisual(undefined), channel = 'Website') {
  const scan = scanGovernance(record.body_text, record.id, pack, visual);
  const actor: ReviewActor = { name: record.author_name, role: 'Content Creator' };
  const governance: Governance = { schema: 1, revision: 1, version: 1, original: record.body_text, contentHash: await hashContent(record, visual), knowledgeVersion: pack.version, evidence: pack, checks: scan.checks, visual, channel, events: [{ id: crypto.randomUUID(), action: 'submitted', actor, at: record.created_at, version: 1, evidenceVersion: pack.version, after: record.body_text }] };
  return { ...record, status: (scan.findings.length ? 'audited' : 'draft') as Submission['status'], findings: scan.findings, governance };
}
export function readiness(record: Submission) {
  const open = record.findings.filter(f => f.reviewer_status === 'pending' || f.reviewer_status === 'rejected');
  const penalties = { high: 25, medium: 10, low: 5 };
  const score = Math.max(0, 100 - open.reduce((sum, f) => sum + penalties[f.severity], 0));
  const governance = record.governance;
  const approved = Boolean(governance && record.status === 'approved' && governance.approvedHash === governance.contentHash && governance.approvedAt && !open.length);
  return { score, open: open.length, overrides: record.findings.filter(f => f.reviewer_status === 'overridden').length, approved, label: approved ? 'Approved for this version' : open.length ? 'Resolve findings' : 'Awaiting human approval', formula: '100 minus 25 per open high, 10 per open medium, and 5 per open low finding, floored at 0. Unrun checks do not imply a pass. A score of 100 does not grant approval.' };
}
export async function applyReview(record: Submission, command: ReviewCommand, pack: EvidencePack): Promise<Submission> {
  const current = record.governance ? structuredClone(record) : await initializeGovernance(record, pack);
  const g = current.governance!;
  if (!Number.isInteger(command.expectedRevision) || command.expectedRevision !== g.revision) throw new GovernanceError('This review changed. Reload the latest version before making a decision.', 409);
  if (!command.actor?.name?.trim() || !['Content Creator', 'Brand Reviewer', 'Brand Admin'].includes(command.actor.role)) throw new GovernanceError('Choose a named demo reviewer.');
  const actor = { name: command.actor.name.trim().slice(0, 80), role: command.actor.role };
  if (['approve', 'request_changes', 'override', 'reject'].includes(command.action) && actor.role === 'Content Creator') throw new GovernanceError('A demo Brand Reviewer or Brand Admin must make this decision.', 403);
  if (g.events.length >= 500) throw new GovernanceError('This record has reached its demo history limit. Create a new draft.');
  const at = new Date().toISOString();
  const event: ReviewEvent = { id: crypto.randomUUID(), action: command.action, actor, at, version: g.version, evidenceVersion: g.knowledgeVersion };
  let bodyChanged = false;
  if (['accept', 'edit', 'reject', 'override'].includes(command.action)) {
    const finding = current.findings.find(f => f.id === command.findingId);
    if (!finding || !['pending', 'rejected'].includes(finding.reviewer_status)) throw new GovernanceError('This finding is no longer open. Reload the review.', 409);
    event.finding = structuredClone(finding);
    if (command.action === 'override' || command.action === 'reject') {
      if (!command.reason?.trim()) throw new GovernanceError('Record a reason for this decision.');
      finding.reviewer_status = command.action === 'override' ? 'overridden' : 'rejected';
      finding.override_reason = command.reason.trim().slice(0, 1000); event.reason = finding.override_reason;
    } else {
      if (finding.category === 'accessibility' || finding.category === 'visual') throw new GovernanceError('Update the declared accessibility inputs and rescan, or record a reviewer exception.');
      const replacement = command.action === 'edit' ? command.replacement?.trim() : finding.suggested_fix;
      if (!replacement || replacement.length > 1000) throw new GovernanceError('Enter a replacement between 1 and 1000 characters.');
      const index = current.body_text.indexOf(finding.exact_span);
      if (index < 0) throw new GovernanceError('The flagged phrase changed. Rescan the current content.', 409);
      event.before = current.body_text;
      current.body_text = current.body_text.slice(0, index) + replacement + current.body_text.slice(index + finding.exact_span.length);
      event.after = current.body_text; bodyChanged = true;
    }
  } else if (command.action === 'revise') {
    if (typeof command.text !== 'string' || !command.text.trim() || command.text.length > 100_000) throw new GovernanceError('Enter non-blank content of at most 100,000 characters.');
    event.before = current.body_text; current.body_text = command.text.trim(); event.after = current.body_text; bodyChanged = true;
    if (command.visual) g.visual = normalizeVisual(command.visual);
  } else if (command.action === 'comment') {
    if (!command.reason?.trim() || command.reason.length > 1000) throw new GovernanceError('Enter a comment of 1–1000 characters.');
    event.reason = command.reason.trim(); current.comments.push(`${actor.name}: ${event.reason}`);
  } else if (command.action === 'approve') {
    if (g.contentHash !== await hashContent(current, g.visual)) throw new GovernanceError('The content no longer matches its scan. Rescan before approving.', 409);
    if (g.knowledgeVersion !== pack.version) throw new GovernanceError('The evidence pack changed. Rescan before approving.', 409);
    if (readiness(current).open) throw new GovernanceError('Resolve or explicitly override every open finding before approval.', 409);
    current.status = 'approved'; current.reviewer_name = actor.name; g.approvedHash = g.contentHash; g.approvedAt = at; g.approvedBy = actor.name;
  } else if (command.action === 'request_changes') current.status = 'changes_requested';
  else if (command.action !== 'rescan') throw new GovernanceError('Choose a supported review action.');
  if (bodyChanged || command.action === 'rescan') {
    const scanned = scanGovernance(current.body_text, current.id, pack, g.visual);
    const overrides = new Map(current.findings.filter(f => f.reviewer_status === 'overridden').map(f => [findingKey(f), f]));
    current.findings = scanned.findings.map(f => command.action !== 'revise' && overrides.has(findingKey(f)) ? { ...f, reviewer_status: 'overridden', override_reason: overrides.get(findingKey(f))!.override_reason } : f);
    g.checks = scanned.checks; g.knowledgeVersion = pack.version; g.evidence = pack; event.evidenceVersion = pack.version;
    if (bodyChanged) g.version++;
    g.contentHash = await hashContent(current, g.visual);
    current.status = current.findings.length ? 'audited' : 'draft';
  }
  if (command.action !== 'approve' && command.action !== 'comment') { delete g.approvedHash; delete g.approvedAt; delete g.approvedBy; if (current.status === 'approved') current.status = 'audited'; }
  event.version = g.version; g.events.push(event); g.revision++;
  if (JSON.stringify(g).length > 2_000_000) throw new GovernanceError('This record has reached its demo history size limit. Start a new draft.');
  current.history.push(`${actor.name}: ${command.action} on v${g.version} at ${at}`);
  return current;
}
