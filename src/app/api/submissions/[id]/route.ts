import { getGovernedSubmission, reviewSubmission } from '@/lib/repository';
import { GovernanceError, normalizeVisual, type ReviewCommand } from '@/lib/governance';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const record = await getGovernedSubmission(id);
    if (!record) return Response.json({ error: 'Submission not found.' }, { status: 404 });
    return Response.json(record, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'The review service is temporarily unavailable.' }, { status: 503 }); }
}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let input: ReviewCommand;
  try {
    input = await request.json();
    if (!input || typeof input !== 'object' || Array.isArray(input) || !['accept', 'edit', 'reject', 'override', 'revise', 'approve', 'request_changes', 'comment', 'rescan'].includes(input.action)) throw new GovernanceError('Use a named review action; direct status/findings patches are not accepted.');
    if (!Number.isInteger(input.expectedRevision) || typeof input.actor?.name !== 'string' || !['Content Creator', 'Brand Reviewer', 'Brand Admin'].includes(input.actor?.role)) throw new GovernanceError('Include the current revision and a named demo role.');
    for (const key of ['findingId', 'replacement', 'reason', 'text'] as const) if (input[key] !== undefined && typeof input[key] !== 'string') throw new GovernanceError(`Provide ${key} as text.`);
    if (input.visual !== undefined) input.visual = normalizeVisual(input.visual);
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Send a valid review action.' }, { status: 400 }); }
  try {
    const record = await reviewSubmission(id, input);
    return record ? Response.json(record) : Response.json({ error: 'Submission not found.' }, { status: 404 });
  } catch (error) { return Response.json({ error: error instanceof GovernanceError ? error.message : 'The review could not be saved. Reload before retrying.' }, { status: error instanceof GovernanceError ? error.status : 503 }); }
}
