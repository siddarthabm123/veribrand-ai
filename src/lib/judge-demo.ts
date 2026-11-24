import { facts, guidelines, rules } from './seed-data';
import { evidencePack } from './evidence';
import { applyReview, initializeGovernance, type EvidencePack, type ReviewActor } from './governance';
import type { Submission } from '@/types/governance';

export const JUDGE_STORAGE_KEY = 'veribrand:judge-sandbox:v1';
export const judgeActor: ReviewActor = { name: 'Judge (fictional reviewer)', role: 'Brand Reviewer' };
export type JudgeWorkspace = { schema: 1; pack: EvidencePack; expiredPack: EvidencePack; records: Submission[] };
export async function createJudgeWorkspace(): Promise<JudgeWorkspace> {
  const now = new Date().toISOString();
  const future = new Date(Date.now() + 90 * 86400000).toISOString();
  const pack = await evidencePack({ facts: facts.map(fact => ({ ...fact, source_doc: JSON.stringify({ title: `${fact.source_doc} (fictional demo source)`, approvedBy: 'Alex Morgan (demo)', owner: 'Acme Cloud demo team', at: now, expiresAt: future, url: '' }) })), guidelines, rules, customGuidelines: [] });
  const expiredPack = await evidencePack({ ...pack, facts: pack.facts.map((fact, index) => index ? fact : { ...fact, source_doc: JSON.stringify({ ...JSON.parse(fact.source_doc), expiresAt: '2000-01-01T00:00:00Z' }) }) });
  const samples = [
    ['demo-launch', 'Launch campaign with risky claims', 'Meet the game-changing ACC platform with 100% uptime and 5-minute support.'],
    ['demo-ready', 'Support email awaiting approval', 'Acme Cloud offers a 99.95% uptime SLA and a 15-minute support response.'],
    ['demo-published', 'Published campaign with an unapproved change', 'Acme Cloud includes 10 GB of free storage.'],
    ['demo-expired', 'Campaign with expired evidence', 'Acme Cloud offers a 99.95% uptime SLA.'],
  ];
  const records: Submission[] = [];
  for (const [id, title, body_text] of samples) {
    let record: Submission = await initializeGovernance({ id, title, body_text, content_type: 'Campaign copy', status: 'draft', author_name: 'Maya Chen (demo)', created_at: now, findings: [], comments: [], history: [] }, id === 'demo-expired' ? expiredPack : pack, undefined, 'Website CMS');
    if (id === 'demo-published') {
      const act = async (action: 'approve' | 'publish' | 'observe', text?: string) => { record = await applyReview(record, { action, text, url: 'https://example.com/fictional-campaign', expectedRevision: record.governance!.revision, actor: judgeActor }, pack); };
      await act('approve'); await act('publish', record.body_text); await act('observe', record.body_text + ' Guaranteed results.');
    }
    records.push(record);
  }
  return { schema: 1, pack, expiredPack, records };
}
