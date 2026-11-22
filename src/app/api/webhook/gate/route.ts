import { getSubmission } from '@/lib/repository';
import type { Submission } from '@/types/governance';

export async function POST(request: Request) {
  let input: { submissionId?: unknown; targetChannel?: unknown };
  try { input = await request.json() as { submissionId?: unknown; targetChannel?: unknown }; }
  catch { return Response.json({ status: 'INVALID', error: 'Expected a JSON gate request.' }, { status: 400 }); }

  const submissionId = typeof input.submissionId === 'string' ? input.submissionId.trim().slice(0, 128) : '';
  const targetChannel = typeof input.targetChannel === 'string' ? input.targetChannel.trim().slice(0, 80) : '';
  if (!submissionId || !targetChannel) return Response.json({ status: 'INVALID', error: 'submissionId and targetChannel are required.' }, { status: 400 });

  // The gate reads authoritative server-side state only and fails closed when a
  // serverless instance has not received the submission; browser claims cannot approve content.
  let submission: Submission | undefined;
  try { submission = await getSubmission(submissionId); }
  catch { return Response.json({ status: 'UNAVAILABLE', submissionId, targetChannel, error: 'The review store is temporarily unavailable. Retry in a moment.' }, { status: 503 }); }
  if (!submission) return Response.json({ status: 'NOT_FOUND', submissionId, targetChannel, error: 'This server instance cannot verify the submission. Sync it to the workspace store and retry.' }, { status: 404 });

  const unresolvedFindings = submission.findings.filter((finding) => finding.reviewer_status === 'pending').map(({ rule_citation, exact_span, severity }) => ({ citation: rule_citation, phrase: exact_span, severity }));
  if (submission.status !== 'approved' || unresolvedFindings.length) return Response.json({ status: 'BLOCKED', submissionId, targetChannel, unresolvedFindings }, { status: 403 });

  const timestamp = new Date().toISOString();
  const approvedBy = submission.reviewer_name || 'Brand Reviewer';
  const canonical = JSON.stringify({ submissionId, targetChannel, approvedBy, timestamp, findings: submission.findings.map(({ id, rule_citation, reviewer_status }) => ({ id, rule_citation, reviewer_status })) });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
  const sha256Signature = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return Response.json({ status: 'APPROVED', submissionId, targetChannel, certificateId: `VB-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, sha256Signature, approvedBy, timestamp });
}
