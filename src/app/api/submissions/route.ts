import { requestActor } from '@/lib/access';
import { getSubmission, getSubmissions, createSubmission, updateSubmission } from '@/lib/repository';
import { normalizeCustomRules } from '@/lib/custom-guidelines';
import { normalizeVisual } from '@/lib/governance';
import type { AuditFinding, Submission } from '@/types/governance';

const hexColor = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
function safeFinding(value: unknown): AuditFinding | null {
  if (!value || typeof value !== 'object') return null;
  const finding = value as Record<string, unknown>;
  if (!['BG-3.1', 'BG-3.2'].includes(String(finding.rule_citation)) || typeof finding.exact_span !== 'string' || typeof finding.explanation !== 'string' || typeof finding.suggested_fix !== 'string') return null;
  if (!['visual', 'accessibility'].includes(String(finding.category)) || !Number.isFinite(finding.start_index) || !Number.isFinite(finding.end_index)) return null;
  return { id: typeof finding.id === 'string' ? finding.id.slice(0, 120) : crypto.randomUUID(), submission_id: '', category: finding.category as AuditFinding['category'], severity: ['high', 'medium', 'low'].includes(String(finding.severity)) ? finding.severity as AuditFinding['severity'] : 'medium', exact_span: finding.exact_span.slice(0, 500), start_index: 0, end_index: 0, rule_citation: finding.rule_citation as string, source_excerpt: typeof finding.source_excerpt === 'string' ? finding.source_excerpt.slice(0, 1000) : '', explanation: finding.explanation.slice(0, 1000), suggested_fix: finding.suggested_fix.slice(0, 500), intent_preservation_score: 100, reviewer_status: 'pending' };
}
function safeInspection(value: unknown): Submission['image_inspection'] | null {
  if (!value || typeof value !== 'object') return null;
  const report = value as Record<string, unknown>;
  const colors = Array.isArray(report.dominantColors) ? report.dominantColors.filter(hexColor).slice(0, 5) : [];
  const matches = Array.isArray(report.paletteMatches) ? report.paletteMatches.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const pair = entry as Record<string, unknown>;
    return hexColor(pair.color) && hexColor(pair.approved) && typeof pair.deltaE === 'number' && Number.isFinite(pair.deltaE) && pair.deltaE >= 0 && pair.deltaE < 300 ? [{ color: pair.color, approved: pair.approved, deltaE: pair.deltaE }] : [];
  }).slice(0, 5) : [];
  const contrastRatio = Number(report.contrastRatio), aspectRatio = Number(report.aspectRatio), clearSpacePercent = Number(report.clearSpacePercent);
  if (!colors.length || !Number.isFinite(contrastRatio) || contrastRatio < 1 || contrastRatio > 21 || !Number.isFinite(aspectRatio) || aspectRatio <= 0 || aspectRatio > 100 || !Number.isFinite(clearSpacePercent) || clearSpacePercent < 0 || clearSpacePercent > 100) return null;
  return { dominantColors: colors, paletteMatches: matches, contrastRatio, aspectRatio, clearSpacePercent };
}

export async function GET() {
  try { return Response.json(await getSubmissions(), { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return Response.json({ error: 'The review service is temporarily unavailable.' }, { status: 503 }); }
}

export async function POST(request: Request) {
  let input: Partial<Submission> & { customRules?: unknown; visualFindings?: unknown; imageInspection?: unknown; visual?: unknown; channel?: unknown };
  try { input = await request.json() as Partial<Submission> & { customRules?: unknown; visualFindings?: unknown; imageInspection?: unknown; visual?: unknown; channel?: unknown }; }
  catch { return Response.json({ error: 'Send a valid JSON submission.' }, { status: 400 }); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return Response.json({ error: 'Send a submission object.' }, { status: 400 });
  const body = typeof input.body_text === 'string' ? input.body_text.trim() : '';
  if (body.length > 100_000) return Response.json({ error: 'Drafts must be 100,000 characters or fewer.' }, { status: 413 });
  let visual;
  try { visual = normalizeVisual(input.visual); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Invalid visual inputs.' }, { status: 400 }); }
  const imageInspection = safeInspection(input.imageInspection);
  const visualFindings = Array.isArray(input.visualFindings) ? input.visualFindings.flatMap((finding) => { const safe = safeFinding(finding); return safe ? [safe] : []; }).slice(0, 30) : [];
  if (!body && !imageInspection) return Response.json({ error: 'Add non-blank campaign text or a valid image inspection.' }, { status: 400 });
  const id = typeof input.id === 'string' && input.id.trim() ? input.id.trim().slice(0, 128) : crypto.randomUUID();
  try {
    if (await getSubmission(id)) return Response.json({ error: 'That submission ID is already in use. Start a new audit.' }, { status: 409 });
    const submission = await createSubmission({ id, title: typeof input.title === 'string' && input.title.trim() ? input.title.trim().slice(0, 160) : 'Untitled campaign audit', content_type: typeof input.content_type === 'string' ? input.content_type.trim().slice(0, 80) : 'Copy', body_text: body, author_name: requestActor(request)?.name || (typeof input.author_name === 'string' && input.author_name.trim() ? input.author_name.trim().slice(0, 80) : 'Demo creator'), customRules: normalizeCustomRules(input.customRules), visual, channel: typeof input.channel === 'string' ? input.channel.trim().slice(0, 80) : 'Website', ...(imageInspection ? { image_inspection: imageInspection } : {}) });
    if (!visualFindings.length) return Response.json(submission, { status: 201 });
    const updated = await updateSubmission(submission.id, {
      findings: [...submission.findings, ...visualFindings.map((finding) => ({ ...finding, submission_id: submission.id }))],
      status: 'audited',
    });
    return Response.json(updated ?? submission, { status: 201 });
  } catch {
    return Response.json({ error: 'The submission could not be saved. Check the database connection and retry.' }, { status: 503 });
  }
}
