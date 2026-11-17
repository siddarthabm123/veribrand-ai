import type { AuditFinding, CustomAuditRule } from '@/types/governance';

export function auditCustomRules(text: string, submissionId: string, rules: CustomAuditRule[]): AuditFinding[] {
  const findings: AuditFinding[] = [];
  for (const rule of rules) {
    const phrase = rule.phrase.trim();
    if (!phrase) continue;
    let from = 0;
    while (from < text.length) {
      const start = text.toLowerCase().indexOf(phrase.toLowerCase(), from);
      if (start < 0) break;
      const end = start + phrase.length;
      const finding: AuditFinding = {
        id: crypto.randomUUID(),
        submission_id: submissionId,
        category: rule.category,
        severity: 'high',
        exact_span: text.slice(start, end),
        start_index: start,
        end_index: end,
        rule_citation: rule.id,
        source_excerpt: rule.name + ': avoid “' + phrase + '”; use “' + rule.replacement + '”.',
        explanation: rule.explanation || 'This phrase conflicts with the custom “' + rule.name + '” guideline.',
        suggested_fix: rule.replacement,
        intent_preservation_score: 92,
        reviewer_status: 'pending',
      };
      // A workspace rule should supply the citation when it matches the same span as a built-in rule.
      for (let index = findings.length - 1; index >= 0; index--) {
        if (findings[index].start_index === start && findings[index].end_index === end) findings.splice(index, 1);
      }
      findings.push(finding);
      from = end;
    }
  }
  return findings;
}
