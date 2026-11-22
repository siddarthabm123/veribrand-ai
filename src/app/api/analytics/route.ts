import { analytics, getSubmissions } from '@/lib/repository';
import type { Submission } from '@/types/governance';

const boundedDays = (value: unknown) => {
  const days = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(days) ? Math.max(1, Math.min(365, Math.floor(days))) : 30;
};
function safeSubmissions(value: unknown): Submission[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 500).flatMap((candidate): Submission[] => {
    if (!candidate || typeof candidate !== 'object') return [];
    const item = candidate as Record<string, unknown>;
    if (typeof item.id !== 'string' || typeof item.created_at !== 'string' || !Number.isFinite(Date.parse(item.created_at))) return [];
    const statuses = new Set(['draft', 'audited', 'changes_requested', 'approved']);
    const findings = Array.isArray(item.findings) ? item.findings.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return [];
      const finding = entry as Record<string, unknown>;
      if (typeof finding.rule_citation !== 'string') return [];
      const category = ['tone', 'terminology', 'fact_claim', 'visual', 'accessibility'].includes(String(finding.category)) ? finding.category as Submission['findings'][number]['category'] : 'tone';
      return [{ id: typeof finding.id === 'string' ? finding.id.slice(0, 120) : crypto.randomUUID(), submission_id: item.id as string, category, severity: 'low' as const, exact_span: typeof finding.exact_span === 'string' ? finding.exact_span.slice(0, 500) : '', start_index: 0, end_index: 0, rule_citation: finding.rule_citation.slice(0, 80), source_excerpt: '', explanation: '', suggested_fix: '', intent_preservation_score: 0, reviewer_status: ['accepted', 'overridden', 'pending'].includes(String(finding.reviewer_status)) ? finding.reviewer_status as Submission['findings'][number]['reviewer_status'] : 'pending' as const }];
    }) : [];
    return [{ id: item.id.slice(0, 128), title: typeof item.title === 'string' ? item.title.slice(0, 160) : 'Untitled', content_type: 'Copy', body_text: '', status: (statuses.has(String(item.status)) ? item.status : 'draft') as Submission['status'], author_name: 'Workspace member', created_at: item.created_at, findings, comments: [], history: [] }];
  });
}

export async function GET(request: Request) {
  const days = boundedDays(new URL(request.url).searchParams.get('days'));
  try { return Response.json(analytics(await getSubmissions(), days), { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return Response.json({ error: 'Analytics are temporarily unavailable.' }, { status: 503 }); }
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return Response.json({ error: 'Send valid JSON analytics options.' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return Response.json({ error: 'Send an analytics options object.' }, { status: 400 });
  const input = body as Record<string, unknown>;
  try {
    const stored = await getSubmissions();
    const merged = new Map(stored.map((submission) => [submission.id, submission]));
    safeSubmissions(input.submissions).forEach((submission) => merged.set(submission.id, submission));
    return Response.json(analytics([...merged.values()], boundedDays(input.days)));
  } catch { return Response.json({ error: 'Analytics are temporarily unavailable.' }, { status: 503 }); }
}
