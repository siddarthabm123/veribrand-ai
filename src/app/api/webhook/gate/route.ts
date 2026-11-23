import { publicationChecks } from '@/lib/publishing';
import { getEvidencePack, getSubmission } from '@/lib/repository';
import { hashContent, readiness, expiredEvidence } from '@/lib/governance';

export async function POST(request: Request) {
  let input: { submissionId?: unknown; targetChannel?: unknown };
  try { input = await request.json(); if (!input || typeof input !== 'object') throw new Error(); }
  catch { return Response.json({ status: 'INVALID', error: 'Expected a JSON gate request.' }, { status: 400 }); }
  const submissionId = typeof input.submissionId === 'string' ? input.submissionId.trim().slice(0, 128) : '';
  const targetChannel = typeof input.targetChannel === 'string' ? input.targetChannel.trim().slice(0, 80) : '';
  if (!submissionId || !targetChannel) return Response.json({ status: 'INVALID', error: 'submissionId and targetChannel are required.' }, { status: 400 });
  try {
    const record = await getSubmission(submissionId);
    if (!record) return Response.json({ status: 'NOT_FOUND', submissionId, error: 'No saved server record was found. Browser-only records cannot pass this gate.' }, { status: 404 });
    const state = readiness(record), g = record.governance;
    const pack = await getEvidencePack();
    const checklist = await publicationChecks(record, pack.version, targetChannel, request.headers.get('x-veribrand-mode') === 'authenticated', expiredEvidence(pack).length);
    const hashMatches = g && g.contentHash === await hashContent(record, g.visual);
    const knowledgeMatches = g?.knowledgeVersion === pack.version;
    if (checklist.some(check => !check.pass) || !state.approved || !hashMatches || !knowledgeMatches || targetChannel !== g?.channel) return Response.json({ status: 'BLOCKED', submissionId, targetChannel, readiness: state, checklist, error: checklist.find(check => !check.pass)?.label || (!g ? 'This legacy record needs a versioned review.' : !knowledgeMatches ? 'The evidence pack changed. Rescan and obtain approval again.' : targetChannel !== g.channel ? `Approval is scoped to ${g.channel}. Submit a separate review for another channel.` : !hashMatches ? 'Content differs from the reviewed version. Rescan and obtain approval again.' : state.label), unresolvedFindings: record.findings.filter(f => ['pending', 'rejected'].includes(f.reviewer_status)).map(f => ({ citation: f.rule_citation, phrase: f.exact_span, severity: f.severity })) }, { status: 403 });
    return Response.json({ status: 'APPROVED', submissionId, targetChannel, checklist, contentVersion: g!.version, certificateId: `VB-${g!.contentHash.slice(0, 16).toUpperCase()}`, contentHash: g!.contentHash, sha256Signature: g!.contentHash, approvedBy: g!.approvedBy, timestamp: g!.approvedAt, note: 'SHA-256 is a content fingerprint, not a cryptographic signature. Approver identity provenance is recorded in the review trail.' });
  } catch { return Response.json({ status: 'UNAVAILABLE', submissionId, error: 'The authoritative review store is unavailable. Publication remains blocked.' }, { status: 503 }); }
}
