import type { Submission } from '@/types/governance';
import { hashContent, readiness } from './governance';

export function textDifference(before: string, after: string) {
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let end = 0;
  while (end < before.length - start && end < after.length - start && before[before.length - 1 - end] === after[after.length - 1 - end]) end++;
  return { prefix: before.slice(0, start), removed: before.slice(start, before.length - end), added: after.slice(start, after.length - end), suffix: end ? before.slice(-end) : '' };
}
export async function publicationChecks(record: Submission, evidenceVersion: string, channel: string, requireVerified = false, expiredCount = 0) {
  const g = record.governance, state = readiness(record);
  const approval = g?.events.findLast(event => event.action === 'approve');
  return [
    { id: 'findings', label: 'Every finding is resolved or documented', pass: state.open === 0 },
    { id: 'approval', label: 'Human sign-off applies to this version', pass: state.approved },
    { id: 'identity', label: requireVerified ? 'Approver identity verified by the server' : 'Demo identity (not authenticated)', pass: !requireVerified || approval?.actor.verified === true },
    { id: 'content', label: 'Saved content matches the approved fingerprint', pass: Boolean(g && g.contentHash === await hashContent(record, g.visual)) },
    { id: 'evidence', label: 'Evidence pack is still current', pass: g?.knowledgeVersion === evidenceVersion },
    { id: 'expiry', label: 'No expired sources in the evidence pack', pass: expiredCount === 0 },
    { id: 'channel', label: 'Target channel matches the approval', pass: g?.channel === channel },
    { id: 'publication', label: 'No outstanding difference in the last published snapshot', pass: g?.publication?.status !== 'drift' },
  ];
}
