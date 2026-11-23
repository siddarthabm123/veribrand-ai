import { authFetch } from '@/lib/auth-fetch';
import { auditCustomRules } from '@/lib/audit/custom';
import { auditText } from '@/lib/audit/deterministic';
import { saveSubmission } from '@/lib/client-state';
import type { CustomAuditRule, Submission } from '@/types/governance';

export async function submitWorkspaceCopy(text: string, customRules: CustomAuditRule[]): Promise<Submission> {
  const body = text.trim();
  if (!body) throw new Error('Add campaign copy before running the audit.');
  if (body.length > 100_000) throw new Error('Drafts must be 100,000 characters or fewer.');
  const id = crypto.randomUUID();
  try {
    const response = await authFetch('/api/submissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, title: 'Untitled copy audit', content_type: 'Copy', body_text: body, author_name: 'Maya Chen', customRules }) });
    if (!response.ok) throw new Error('The review service is temporarily unavailable.');
    const record = await response.json() as Submission;
    if (record.id !== id || !Array.isArray(record.findings)) throw new Error('The review service returned an invalid record.');
    saveSubmission(record);
    return record;
  } catch {
    const localId = `local-${id}`;
    const automatic = auditText(body, localId);
    const custom = auditCustomRules(body, localId, customRules);
    const customSpans = new Set(custom.map((finding) => `${finding.start_index}:${finding.end_index}`));
    const findings = [...automatic.filter((finding) => !customSpans.has(`${finding.start_index}:${finding.end_index}`)), ...custom].sort((a, b) => a.start_index - b.start_index);
    const record: Submission = { id: localId, title: 'Untitled copy audit', content_type: 'Copy', body_text: body, status: findings.length ? 'audited' : 'draft', author_name: 'Maya Chen', created_at: new Date().toISOString(), findings, comments: [], history: ['Audit created and saved in this browser'] };
    saveSubmission(record);
    return record;
  }
}
