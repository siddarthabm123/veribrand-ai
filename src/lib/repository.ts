import { guidelines as seedGuidelines, facts as seedFacts, rules as seedRules, submissions as seedSubmissions } from './seed-data';
import { getSupabaseAdmin } from './supabase/server';
import { normalizeCustomRules } from './custom-guidelines';
import type { ApprovedFact, BrandGuideline, BrandRules, CustomAuditRule, Submission, WorkspaceAnalytics } from '@/types/governance';
import { runAudit } from './audit/engine';
import { auditText, contrastRatio } from './audit/deterministic';

let memoryStore: Submission[] | null = null;
let memoryGuidelines: CustomAuditRule[] = [];
const data = () => (memoryStore ??= structuredClone(seedSubmissions));
const field = (value: unknown, max: number, fallback = '') => typeof value === 'string' ? value.slice(0, max) : fallback;
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

function failDatabaseOperation() { throw new Error('The workspace database is unavailable. Please retry shortly.'); }
function ensureNoError(error: { message?: string } | null) { if (error) failDatabaseOperation(); }

function customRuleFromRow(row: Record<string, unknown>): CustomAuditRule | null {
  const sectionCode = field(row.section_code, 64);
  if (!sectionCode.startsWith('BG-C-')) return null;
  try {
    const content = JSON.parse(field(row.content, 1200)) as Record<string, unknown>;
    return normalizeCustomRules([{
      id: sectionCode,
      name: row.title,
      category: row.category,
      phrase: content.phrase,
      replacement: content.replacement,
      explanation: content.explanation,
    }])[0] ?? null;
  } catch { return null; }
}

async function getCustomRules(client = getSupabaseAdmin()): Promise<CustomAuditRule[]> {
  if (!client) return memoryGuidelines;
  const { data: rows, error } = await client.from('brand_guidelines').select('section_code,title,category,content').like('section_code', 'BG-C-%').limit(100);
  ensureNoError(error);
  return (rows ?? []).flatMap((row) => { const rule = customRuleFromRow(row as Record<string, unknown>); return rule ? [rule] : []; });
}

function makeSeedRows(): Submission[] {
  return structuredClone(data()).map((row) => {
    if (row.status === 'audited' && !row.findings.length) {
      row.findings = auditText(row.body_text, row.id);
      if (row.image_meta) {
        const ratio = contrastRatio(row.image_meta.foreground, row.image_meta.background);
        if (ratio < 4.5) row.findings.push({
          id: crypto.randomUUID(), submission_id: row.id, category: 'accessibility', severity: 'high',
          exact_span: `${row.image_meta.foreground} on ${row.image_meta.background}`, start_index: 0, end_index: 0,
          rule_citation: 'BG-3.2', source_excerpt: 'WCAG AA requires at least 4.5:1 contrast for normal text.',
          explanation: 'This foreground/background pair does not meet the Acme Cloud accessibility threshold.',
          suggested_fix: '#0F172A', intent_preservation_score: 100, reviewer_status: 'pending',
        });
      }
    }
    return row;
  });
}

function parseImageMeta(value: unknown): Submission['image_meta'] {
  if (!value || typeof value !== 'object') return undefined;
  const meta = value as Record<string, unknown>;
  if (typeof meta.foreground !== 'string' || typeof meta.background !== 'string' || typeof meta.button !== 'string') return undefined;
  return { foreground: meta.foreground, background: meta.background, button: meta.button };
}

function mapSubmission(row: Record<string, unknown>, findings: Submission['findings'], comments: string[], history: string[]): Submission {
  const meta = row.image_meta && typeof row.image_meta === 'object' ? row.image_meta as Record<string, unknown> : null;
  const inspection = meta?.inspection;
  return {
    id: field(row.id, 128), title: field(row.title, 160, 'Untitled submission'), content_type: field(row.content_type, 80, 'Copy'),
    body_text: field(row.body_text, 100_000), status: ['draft', 'audited', 'changes_requested', 'approved'].includes(String(row.status)) ? row.status as Submission['status'] : 'draft',
    author_name: field(row.author_name, 80, 'Workspace member'), ...(typeof row.reviewer_name === 'string' ? { reviewer_name: row.reviewer_name.slice(0, 80) } : {}),
    created_at: typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
    findings, comments, history, ...(parseImageMeta(row.image_meta) ? { image_meta: parseImageMeta(row.image_meta) } : {}),
    ...(inspection && typeof inspection === 'object' ? { image_inspection: inspection as Submission['image_inspection'] } : {}),
  };
}

function commentParts(comment: string, fallbackAuthor: string) {
  const match = comment.match(/^([^:]{1,80}):\s*([\s\S]+)$/);
  return { author_name: match?.[1].trim() || fallbackAuthor, body: (match?.[2] ?? comment).trim() };
}

async function writeSubmission(client: NonNullable<ReturnType<typeof getSupabaseAdmin>>, row: Submission): Promise<Submission> {
  const findings = row.findings.map((finding) => ({ ...finding, id: isUuid(finding.id) ? finding.id : crypto.randomUUID(), submission_id: row.id }));
  const imageMeta = row.image_meta ? { ...row.image_meta, ...(row.image_inspection ? { inspection: row.image_inspection } : {}) } : row.image_inspection ? { inspection: row.image_inspection } : null;
  const submissionRow = {
    id: row.id, title: row.title, content_type: row.content_type, body_text: row.body_text, image_meta: imageMeta,
    status: row.status, author_name: row.author_name, reviewer_name: row.reviewer_name ?? null, created_at: row.created_at,
  };
  const saved = await client.from('submissions').upsert(submissionRow, { onConflict: 'id' });
  ensureNoError(saved.error);

  const removedFindings = await client.from('audit_findings').delete().eq('submission_id', row.id);
  ensureNoError(removedFindings.error);
  if (findings.length) {
    const result = await client.from('audit_findings').insert(findings);
    ensureNoError(result.error);
  }

  const removedComments = await client.from('review_comments').delete().eq('submission_id', row.id);
  ensureNoError(removedComments.error);
  const comments = row.comments.map((comment) => ({ submission_id: row.id, ...commentParts(comment, row.reviewer_name || row.author_name) }));
  if (comments.length) { const result = await client.from('review_comments').insert(comments); ensureNoError(result.error); }

  const removedHistory = await client.from('revision_history').delete().eq('submission_id', row.id);
  ensureNoError(removedHistory.error);
  const history = row.history.map((action) => ({ submission_id: row.id, actor: row.reviewer_name || row.author_name, action }));
  if (history.length) { const result = await client.from('revision_history').insert(history); ensureNoError(result.error); }

  return { ...row, findings };
}

async function loadDatabaseSubmissions(client: NonNullable<ReturnType<typeof getSupabaseAdmin>>): Promise<Submission[]> {
  const { data: rawRows, error } = await client.from('submissions').select('*').order('created_at', { ascending: false }).limit(1000);
  ensureNoError(error);
  const rows = rawRows ?? [];
  if (!rows.length) return [];
  const ids = rows.map((row) => String(row.id));
  const [findingResult, commentResult, historyResult] = await Promise.all([
    client.from('audit_findings').select('*').in('submission_id', ids).order('start_index', { ascending: true }).limit(5000),
    client.from('review_comments').select('*').in('submission_id', ids).order('created_at', { ascending: true }).limit(5000),
    client.from('revision_history').select('*').in('submission_id', ids).order('created_at', { ascending: true }).limit(5000),
  ]);
  ensureNoError(findingResult.error); ensureNoError(commentResult.error); ensureNoError(historyResult.error);
  return rows.map((row) => {
    const id = String(row.id);
    const findings = (findingResult.data ?? []).filter((finding) => finding.submission_id === id).map((finding) => ({
      id: String(finding.id), submission_id: id, category: finding.category, severity: finding.severity,
      exact_span: finding.exact_span, start_index: finding.start_index, end_index: finding.end_index,
      rule_citation: finding.rule_citation, source_excerpt: finding.source_excerpt ?? '', explanation: finding.explanation ?? '',
      suggested_fix: finding.suggested_fix ?? '', intent_preservation_score: finding.intent_preservation_score ?? 0,
      reviewer_status: finding.reviewer_status ?? 'pending', ...(finding.override_reason ? { override_reason: finding.override_reason } : {}),
    })) as Submission['findings'];
    const comments = (commentResult.data ?? []).filter((comment) => comment.submission_id === id).map((comment) => `${comment.author_name || 'Reviewer'}: ${comment.body}`);
    const history = (historyResult.data ?? []).filter((entry) => entry.submission_id === id).map((entry) => entry.action);
    return mapSubmission(row as Record<string, unknown>, findings, comments, history);
  });
}

export async function getKnowledge() {
  const client = getSupabaseAdmin();
  if (!client) return { guidelines: seedGuidelines, facts: seedFacts, rules: seedRules, customGuidelines: memoryGuidelines };
  const [guidelineResult, factResult, ruleResult] = await Promise.all([
    client.from('brand_guidelines').select('section_code,title,category,content').limit(500),
    client.from('approved_facts').select('fact_key,claim_statement,exact_value,source_doc').limit(500),
    client.from('brand_rules').select('banned_terms,preferred_terms,approved_hex_colors,min_wcag_ratio').order('id', { ascending: false }).limit(1),
  ]);
  ensureNoError(guidelineResult.error); ensureNoError(factResult.error); ensureNoError(ruleResult.error);
  const databaseGuidelines = (guidelineResult.data ?? []) as BrandGuideline[];
  const customGuidelines = databaseGuidelines.flatMap((entry) => { const rule = customRuleFromRow(entry as unknown as Record<string, unknown>); return rule ? [rule] : []; });
  const standardGuidelines = databaseGuidelines.filter((entry) => !entry.section_code.startsWith('BG-C-'));
  const dbFacts = (factResult.data ?? []) as ApprovedFact[];
  const dbRules = ruleResult.data?.[0] as BrandRules | undefined;
  return {
    guidelines: standardGuidelines.length ? standardGuidelines : seedGuidelines,
    facts: dbFacts.length ? dbFacts : seedFacts,
    rules: dbRules ?? seedRules,
    customGuidelines,
  };
}

export async function addCustomGuideline(value: unknown): Promise<CustomAuditRule> {
  const rule = normalizeCustomRules([value])[0];
  if (!rule) throw new Error('A valid custom guideline is required.');
  const client = getSupabaseAdmin();
  if (!client) {
    memoryGuidelines = [...memoryGuidelines.filter((current) => current.id !== rule.id && current.phrase.toLowerCase() !== rule.phrase.toLowerCase()), rule];
    return rule;
  }
  const existing = await getCustomRules(client);
  if (existing.some((current) => current.phrase.toLowerCase() === rule.phrase.toLowerCase() && current.id !== rule.id)) throw new Error('A rule already exists for that phrase.');
  const result = await client.from('brand_guidelines').upsert({
    section_code: rule.id, title: rule.name, category: rule.category,
    content: JSON.stringify({ phrase: rule.phrase, replacement: rule.replacement, explanation: rule.explanation }),
  }, { onConflict: 'section_code' });
  ensureNoError(result.error);
  return rule;
}

export function hasPersistentStorage() { return getSupabaseAdmin() !== null; }

export async function getSubmissions(): Promise<Submission[]> {
  const baseline = makeSeedRows();
  const client = getSupabaseAdmin();
  if (!client) return baseline;
  const stored = await loadDatabaseSubmissions(client);
  const merged = new Map(baseline.map((row) => [row.id, row]));
  stored.forEach((row) => merged.set(row.id, row));
  return [...merged.values()];
}

export async function getSubmission(id: string): Promise<Submission | undefined> {
  return (await getSubmissions()).find((row) => row.id === id);
}

export async function createSubmission(input: Partial<Submission> & { customRules?: CustomAuditRule[] }): Promise<Submission> {
  const id = input.id?.trim() || crypto.randomUUID();
  if (input.body_text !== undefined && !input.body_text.trim() && !input.image_inspection) throw new Error('Submission content cannot be blank.');
  const client = getSupabaseAdmin();
  const storedRules = await getCustomRules(client);
  const ruleMap = new Map([...storedRules, ...(input.customRules ?? [])].map((rule) => [rule.id, rule]));
  const body = input.body_text ?? '';
  const audit = await runAudit(body, id, [...ruleMap.values()]);
  const row: Submission = {
    id, title: input.title?.trim() || 'Untitled', content_type: input.content_type?.trim() || 'Copy', body_text: body,
    status: audit.findings.length ? 'audited' : 'draft', author_name: input.author_name?.trim() || 'Maya Chen',
    created_at: new Date().toISOString(), findings: audit.findings, comments: [], history: ['Draft created', 'Automated brand audit completed'],
    ...(input.image_meta ? { image_meta: input.image_meta } : {}), ...(input.image_inspection ? { image_inspection: input.image_inspection } : {}),
  };
  if (client) return writeSubmission(client, row);
  data().unshift(row);
  return row;
}

export async function updateSubmission(id: string, patch: Partial<Submission>): Promise<Submission | null> {
  const current = await getSubmission(id);
  if (!current) return null;
  const updated: Submission = {
    ...current, ...patch,
    findings: patch.findings ?? current.findings,
    comments: patch.comments ?? current.comments,
    history: [...current.history, `${patch.reviewer_name || current.reviewer_name || current.author_name} updated the review · ${new Date().toISOString()}`],
  };
  const client = getSupabaseAdmin();
  const saved = client ? await writeSubmission(client, updated) : updated;
  const rows = data();
  const index = rows.findIndex((row) => row.id === id);
  if (index < 0) rows.unshift(saved); else rows[index] = saved;
  return saved;
}

export function resetStore() { memoryStore = structuredClone(seedSubmissions); return makeSeedRows(); }

export function analytics(submissions: Submission[] = [], days = 30): WorkspaceAnalytics {
  const boundedDays = Math.max(1, Math.min(365, Math.floor(Number.isFinite(days) ? days : 30)));
  const cutoff = Date.now() - boundedDays * 86_400_000;
  const rows = submissions.filter((row) => Date.parse(row.created_at) >= cutoff);
  const findings = rows.flatMap((row) => row.findings ?? []);
  const labels: Record<string, string> = { terminology: 'Terminology', fact_claim: 'Fact claims', accessibility: 'Accessibility', visual: 'Visual identity', tone: 'Tone' };
  const categoryCounts = new Map<string, number>();
  const ruleCounts = new Map<string, number>();
  for (const finding of findings) {
    categoryCounts.set(finding.category, (categoryCounts.get(finding.category) ?? 0) + 1);
    ruleCounts.set(finding.rule_citation, (ruleCounts.get(finding.rule_citation) ?? 0) + 1);
  }
  return {
    days: boundedDays, totalSubmissions: rows.length, auditedSubmissions: rows.filter((row) => row.status !== 'draft').length,
    openFindings: findings.filter((finding) => finding.reviewer_status === 'pending').length, findings: findings.length,
    categories: Object.entries(labels).map(([key, name]) => ({ name, count: categoryCounts.get(key) ?? 0 })),
    topRules: [...ruleCounts].map(([citation, count]) => ({ citation, count })).sort((a, b) => b.count - a.count).slice(0, 5),
  };
}
