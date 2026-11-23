import type { AuditFinding, Submission } from '@/types/governance';
import { CUSTOM_GUIDELINES_KEY, normalizeCustomRules } from '@/lib/custom-guidelines';

const SUBMISSIONS_KEY = 'veribrand-ai:submissions:v1';
const PASSPORTS_KEY = 'veribrand-ai:passports:v1';
const DRAFT_KEY = 'veribrand-ai:passport-draft:v1';

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try { const value = window.localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
}
function write<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage can be unavailable in private browsing or at quota. */ }
}

export function readDraft() {
  const value = read<unknown>(DRAFT_KEY, null);
  if (!value || typeof value !== 'object') return { text: '', accepted: [] as string[] };
  const draft = value as Record<string, unknown>;
  return { text: typeof draft.text === 'string' ? draft.text.slice(0, 100_000) : '', accepted: Array.isArray(draft.accepted) ? draft.accepted.filter((entry): entry is string => typeof entry === 'string').slice(0, 100) : [] };
}
export function writeDraft(value: { text: string; accepted: string[] }) { write(DRAFT_KEY, value); }
function normalizeSubmission(value: unknown): Submission | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const statuses = new Set(['draft', 'audited', 'changes_requested', 'approved']);
  if (typeof item.id !== 'string' || !item.id.trim() || typeof item.title !== 'string' || typeof item.body_text !== 'string') return null;
  const submissionId = item.id;
  const findings: AuditFinding[] = Array.isArray(item.findings) ? item.findings.flatMap((candidate): AuditFinding[] => {
    if (!candidate || typeof candidate !== 'object') return [];
    const finding = candidate as Record<string, unknown>;
    if (typeof finding.id !== 'string' || typeof finding.rule_citation !== 'string' || typeof finding.exact_span !== 'string' || typeof finding.suggested_fix !== 'string') return [];
    const categories = new Set(['tone', 'terminology', 'fact_claim', 'visual', 'accessibility']);
    const severities = new Set(['high', 'medium', 'low']);
    const reviewStatuses = new Set(['pending', 'accepted', 'overridden', 'rejected']);
    return [{
      id: finding.id.slice(0, 128), submission_id: submissionId,
      category: (categories.has(String(finding.category)) ? finding.category : 'tone') as AuditFinding['category'],
      severity: (severities.has(String(finding.severity)) ? finding.severity : 'medium') as AuditFinding['severity'],
      exact_span: finding.exact_span.slice(0, 1000), start_index: Number.isFinite(finding.start_index) ? Number(finding.start_index) : 0,
      end_index: Number.isFinite(finding.end_index) ? Number(finding.end_index) : 0, rule_citation: finding.rule_citation.slice(0, 80),
      source_excerpt: typeof finding.source_excerpt === 'string' ? finding.source_excerpt.slice(0, 2000) : '',
      explanation: typeof finding.explanation === 'string' ? finding.explanation.slice(0, 2000) : '',
      suggested_fix: finding.suggested_fix.slice(0, 1000), intent_preservation_score: Number.isFinite(finding.intent_preservation_score) ? Number(finding.intent_preservation_score) : 0,
      reviewer_status: (reviewStatuses.has(String(finding.reviewer_status)) ? finding.reviewer_status : 'pending') as AuditFinding['reviewer_status'],
      ...(typeof finding.override_reason === 'string' ? { override_reason: finding.override_reason.slice(0, 1000) } : {}),
    }];
  }) : [];
  const created = typeof item.created_at === 'string' && Number.isFinite(Date.parse(item.created_at)) ? item.created_at : new Date().toISOString();
  return {
    id: item.id.slice(0, 128), title: item.title.trim().slice(0, 160) || 'Untitled submission',
    content_type: typeof item.content_type === 'string' ? item.content_type.slice(0, 80) : 'Copy', body_text: item.body_text.slice(0, 100_000),
    status: (statuses.has(String(item.status)) ? item.status : findings.length ? 'audited' : 'draft') as Submission['status'],
    author_name: typeof item.author_name === 'string' ? item.author_name.slice(0, 80) : 'Workspace member',
    ...(typeof item.reviewer_name === 'string' ? { reviewer_name: item.reviewer_name.slice(0, 80) } : {}), created_at: created,
    findings, comments: Array.isArray(item.comments) ? item.comments.filter((entry): entry is string => typeof entry === 'string').slice(0, 100).map((entry) => entry.slice(0, 1000)) : [],
    history: Array.isArray(item.history) ? item.history.filter((entry): entry is string => typeof entry === 'string').slice(0, 200).map((entry) => entry.slice(0, 500)) : [],
    ...(item.governance && typeof item.governance === 'object' && (item.governance as { schema?: number }).schema === 1 ? { governance: item.governance as Submission['governance'] } : {}),
    ...(item.image_meta && typeof item.image_meta === 'object' ? { image_meta: item.image_meta as Submission['image_meta'] } : {}),
    ...(item.image_inspection && typeof item.image_inspection === 'object' ? { image_inspection: item.image_inspection as Submission['image_inspection'] } : {}),
  };
}
export function readSubmissions(): Submission[] {
  const value = read<unknown>(SUBMISSIONS_KEY, []);
  return Array.isArray(value) ? value.flatMap((item) => { const normalized = normalizeSubmission(item); return normalized ? [normalized] : []; }).slice(0, 500) : [];
}
export function readCustomGuidelines() { return normalizeCustomRules(read<unknown>(CUSTOM_GUIDELINES_KEY, [])); }
export function readSubmission(id: string) { return readSubmissions().find((item) => item.id === id); }
export function saveSubmission(record: Submission) {
  const normalized = normalizeSubmission(record);
  if (!normalized) return;
  const records = readSubmissions();
  const index = records.findIndex((item) => item.id === normalized.id);
  if (index < 0) records.unshift(normalized); else records[index] = normalized;
  write(SUBMISSIONS_KEY, records);
}
export function savePassport(passport: unknown) {
  const stored = read<unknown>(PASSPORTS_KEY, []);
  const passports = Array.isArray(stored) ? stored : [];
  passports.unshift(passport);
  write(PASSPORTS_KEY, passports.slice(0, 50));
}
