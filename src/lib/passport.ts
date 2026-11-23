import type { Submission } from '@/types/governance';
import { readiness, type EvidencePack } from './governance';
import { evidenceFor } from './evidence';

export function buildPassport(record: Submission, pack: EvidencePack) {
  const g = record.governance;
  const state = readiness(record);
  const currentEvidence = g?.knowledgeVersion === pack.version;
  return {
    product: 'VeriBrand AI', schemaVersion: 1, workspace: 'Acme Cloud demo',
    recordId: record.id, title: record.title, channel: g?.channel || record.content_type, author: record.author_name,
    createdAt: record.created_at, contentVersion: g?.version ?? null, reviewRevision: g?.revision ?? null,
    status: state.approved && currentEvidence ? 'approved_for_this_version' : 'needs_review',
    approvedBy: state.approved && currentEvidence ? g?.approvedBy : null, approvedAt: state.approved && currentEvidence ? g?.approvedAt : null,
    contentHash: g?.contentHash ?? null, evidencePackVersion: g?.knowledgeVersion ?? null, evidencePackCurrent: currentEvidence,
    readiness: { ...state, approved: state.approved && currentEvidence, label: !currentEvidence ? 'Evidence pack changed; rescan required' : state.label }, originalContent: g?.original ?? record.body_text, currentContent: record.body_text,
    checks: g?.checks ?? [], visualInputs: g?.visual ?? null,
    findings: record.findings.map(finding => ({ ...finding, evidence: evidenceFor(finding, g?.evidence ?? pack), engine: 'deterministic', confidence: null })),
    decisions: g?.events ?? [], comments: record.comments,
    scope: 'Covers the listed deterministic checks and recorded human decisions. Unrun checks are not passes. This demo does not authenticate reviewer identity or certify legal or full WCAG compliance. The content hash is a fingerprint, not a digital signature.',
  };
}
export type BrandPassport = ReturnType<typeof buildPassport>;
export function passportMarkdown(p: BrandPassport) {
  const lines = [`# Brand Passport: ${p.title}`, '', `Status: ${p.status}`, `Author: ${p.author}`, `Channel: ${p.channel}`, `Content version: ${p.contentVersion ?? 'unversioned'}`, `Content SHA-256: ${p.contentHash ?? 'not recorded'}`, `Evidence pack: ${p.evidencePackVersion ?? 'not recorded'}`, `Approved by: ${p.approvedBy ?? 'not approved'}`, `Approved at: ${p.approvedAt ?? 'not approved'}`, '', '## Checks', ...p.checks.map(c => `- ${c.id}: ${c.status} — ${c.title}. ${c.detail} Source: ${c.source}`), '', '## Original content', p.originalContent, '', '## Current content', p.currentContent, '', '## Current findings'];
  for (const f of p.findings) lines.push(`### ${f.rule_citation}: ${f.exact_span}`, `Severity: ${f.severity}; decision: ${f.reviewer_status}`, f.explanation, `Suggested fix: ${f.suggested_fix}`, `Source: ${f.source_excerpt}`, `Evidence pack: ${f.evidence.packVersion}`, f.override_reason ? `Reason: ${f.override_reason}` : '');
  if (!p.findings.length) lines.push('None in the supported checks. See the recorded decisions and unrun checks below.');
  lines.push('', '## Decision trail');
  for (const e of p.decisions) lines.push(`### ${e.at}: ${e.action} by ${e.actor.name} (${e.actor.role}), v${e.version}`, e.finding ? `Finding: ${e.finding.rule_citation} — ${e.finding.exact_span}. Source: ${e.finding.source_excerpt}` : '', e.reason ? `Reason: ${e.reason}` : '', e.before !== undefined ? `Before:\n${e.before}` : '', e.after !== undefined ? `After:\n${e.after}` : '');
  lines.push('', '## Comments', ...p.comments, '', '## Scope', p.scope);
  return lines.join('\n');
}
