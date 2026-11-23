import type { ApprovedFact, AuditFinding } from '@/types/governance';
import { fingerprint, sourceDetails, type EvidencePack } from './governance';

export async function evidencePack(knowledge: Omit<EvidencePack, 'version'>): Promise<EvidencePack> {
  const ordered = { ...knowledge, facts: knowledge.facts.toSorted((a, b) => a.fact_key.localeCompare(b.fact_key)), guidelines: knowledge.guidelines.toSorted((a, b) => a.section_code.localeCompare(b.section_code)), customGuidelines: knowledge.customGuidelines.toSorted((a, b) => a.id.localeCompare(b.id)) };
  return { ...ordered, version: (await fingerprint(ordered)).slice(0, 16) };
}
export function evidenceFor(finding: AuditFinding, pack: EvidencePack) {
  const fact = finding.category === 'fact_claim' ? pack.facts.find(item => finding.suggested_fix.includes(item.exact_value) || item.exact_value.includes(finding.suggested_fix)) : undefined;
  const guideline = pack.guidelines.find(item => item.section_code === finding.rule_citation);
  const custom = pack.customGuidelines.find(item => item.id === finding.rule_citation);
  return { ruleId: finding.rule_citation, packVersion: pack.version, title: fact?.claim_statement || custom?.name || guideline?.title || finding.rule_citation, approvedWording: fact?.exact_value || custom?.replacement || finding.suggested_fix, source: fact ? sourceDetails(fact.source_doc) : { title: custom?.name || finding.source_excerpt, url: /^https:\/\//.test(finding.source_excerpt) ? finding.source_excerpt : '', approvedBy: 'Not recorded', at: '' } };
}
export function validateFact(value: unknown): ApprovedFact {
  if (!value || typeof value !== 'object') throw new Error('Provide an evidence entry.');
  const input = value as Record<string, unknown>;
  const required = (key: string, max: number) => {
    if (typeof input[key] !== 'string' || !(input[key] as string).trim() || (input[key] as string).length > max) throw new Error(`Provide ${key} of at most ${max} characters.`);
    return (input[key] as string).trim();
  };
  const title = required('claim', 200), exact = required('approvedWording', 200), source = required('sourceTitle', 200), approvedBy = required('approvedBy', 80);
  let url = typeof input.sourceUrl === 'string' ? input.sourceUrl.trim() : '';
  if (url) { try { const parsed = new URL(url); if (parsed.protocol !== 'https:' || parsed.username || parsed.password || url.length > 1000) throw new Error(); url = parsed.href; } catch { throw new Error('Use an HTTPS source URL without embedded credentials.'); } }
  const owner = typeof input.owner === 'string' && input.owner.trim() ? input.owner.trim().slice(0, 80) : approvedBy;
  let expiresAt = '';
  if (input.expiresAt) {
    if (typeof input.expiresAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.expiresAt) || !Number.isFinite(Date.parse(input.expiresAt))) throw new Error('Provide a valid expiry date.');
    expiresAt = new Date(input.expiresAt + 'T23:59:59.999Z').toISOString();
    if (expiresAt.slice(0, 10) !== input.expiresAt) throw new Error('Provide a real calendar date for expiry.');
  }
  return { fact_key: `evidence-${crypto.randomUUID()}`, claim_statement: title, exact_value: exact, source_doc: JSON.stringify({ title: source, url, approvedBy, owner, expiresAt, at: new Date().toISOString() }) };
}
