import { getSubmission, updateSubmission } from '@/lib/repository';
import type { AuditFinding, Submission } from '@/types/governance';

const statuses = new Set(['draft', 'audited', 'changes_requested', 'approved']);
const reviewStatuses = new Set(['pending', 'accepted', 'overridden']);
function safeFindings(value: unknown, submissionId: string): AuditFinding[] | null {
  if (!Array.isArray(value) || value.length > 500) return null;
  const findings: AuditFinding[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') return null;
    const item = entry as Record<string, unknown>;
    if (typeof item.id !== 'string' || typeof item.rule_citation !== 'string' || typeof item.exact_span !== 'string' || typeof item.suggested_fix !== 'string' || typeof item.explanation !== 'string' || !reviewStatuses.has(String(item.reviewer_status))) return null;
    if (!['tone', 'terminology', 'fact_claim', 'visual', 'accessibility'].includes(String(item.category)) || !['high', 'medium', 'low'].includes(String(item.severity))) return null;
    findings.push({ id: item.id.slice(0, 128), submission_id: submissionId, category: item.category as AuditFinding['category'], severity: item.severity as AuditFinding['severity'], exact_span: item.exact_span.slice(0, 1000), start_index: Number.isFinite(item.start_index) ? Number(item.start_index) : 0, end_index: Number.isFinite(item.end_index) ? Number(item.end_index) : 0, rule_citation: item.rule_citation.slice(0, 80), source_excerpt: typeof item.source_excerpt === 'string' ? item.source_excerpt.slice(0, 2000) : '', explanation: item.explanation.slice(0, 2000), suggested_fix: item.suggested_fix.slice(0, 1000), intent_preservation_score: Number.isFinite(item.intent_preservation_score) ? Number(item.intent_preservation_score) : 0, reviewer_status: item.reviewer_status as AuditFinding['reviewer_status'], ...(typeof item.override_reason === 'string' ? { override_reason: item.override_reason.slice(0, 1000) } : {}) });
  }
  return findings;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const submission = await getSubmission(id.slice(0, 128));
    return submission ? Response.json(submission, { headers: { 'Cache-Control': 'no-store' } }) : Response.json({ error: 'Submission not found.' }, { status: 404 });
  } catch { return Response.json({ error: 'The review service is temporarily unavailable.' }, { status: 503 }); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let input: Record<string, unknown>;
  try { input = await request.json() as Record<string, unknown>; }
  catch { return Response.json({ error: 'Send a valid JSON review update.' }, { status: 400 }); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return Response.json({ error: 'Send a review update object.' }, { status: 400 });
  const allowed = new Set(['status', 'body_text', 'reviewer_name', 'findings', 'comments']);
  if (Object.keys(input).some((key) => !allowed.has(key))) return Response.json({ error: 'This review update contains unsupported fields.' }, { status: 400 });
  const patch: Partial<Submission> = {};
  if ('status' in input) {
    if (!statuses.has(String(input.status))) return Response.json({ error: 'Choose a supported review status.' }, { status: 400 });
    patch.status = input.status as Submission['status'];
  }
  if ('body_text' in input) {
    if (typeof input.body_text !== 'string' || !input.body_text.trim()) return Response.json({ error: 'Review content cannot be blank.' }, { status: 400 });
    if (input.body_text.length > 100_000) return Response.json({ error: 'Review content must be 100,000 characters or fewer.' }, { status: 413 });
    patch.body_text = input.body_text;
  }
  if ('reviewer_name' in input) {
    if (typeof input.reviewer_name !== 'string' || !input.reviewer_name.trim()) return Response.json({ error: 'Reviewer name cannot be blank.' }, { status: 400 });
    patch.reviewer_name = input.reviewer_name.trim().slice(0, 80);
  }
  if ('findings' in input) {
    const findings = safeFindings(input.findings, id);
    if (!findings) return Response.json({ error: 'Review findings are malformed.' }, { status: 400 });
    patch.findings = findings;
  }
  if ('comments' in input) {
    if (!Array.isArray(input.comments) || input.comments.length > 100 || input.comments.some((comment) => typeof comment !== 'string' || !comment.trim() || comment.length > 1000)) return Response.json({ error: 'Comments must contain 1–1000 characters.' }, { status: 400 });
    patch.comments = input.comments.map((comment) => (comment as string).trim());
  }
  if (!Object.keys(patch).length) return Response.json({ error: 'No review changes were provided.' }, { status: 400 });
  try {
    const current = await getSubmission(id);
    if (!current) return Response.json({ error: 'Submission not found.' }, { status: 404 });
    const resultingFindings = patch.findings ?? current.findings;
    if (patch.status === 'approved' && resultingFindings.some((finding) => finding.reviewer_status === 'pending')) return Response.json({ error: 'Resolve or override every finding before approval.' }, { status: 409 });
    const updated = await updateSubmission(id, patch);
    return updated ? Response.json(updated) : Response.json({ error: 'Submission not found.' }, { status: 404 });
  } catch { return Response.json({ error: 'The review could not be saved. Please retry shortly.' }, { status: 503 }); }
}
