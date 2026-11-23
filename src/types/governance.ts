import type { Governance } from '@/lib/governance';
export type Status='draft'|'audited'|'changes_requested'|'approved'; export type FindingCategory='tone'|'terminology'|'fact_claim'|'visual'|'accessibility'; export type Severity='high'|'medium'|'low'; export interface BrandGuideline{section_code:string;title:string;category:string;content:string} export interface ApprovedFact{fact_key:string;claim_statement:string;exact_value:string;source_doc:string} export interface BrandRules{banned_terms:Record<string,string>;preferred_terms:Record<string,string>;approved_hex_colors:string[];min_wcag_ratio:number} export interface AuditFinding{id:string;submission_id:string;category:FindingCategory;severity:Severity;exact_span:string;start_index:number;end_index:number;rule_citation:string;source_excerpt:string;explanation:string;suggested_fix:string;intent_preservation_score:number;reviewer_status:'pending'|'accepted'|'overridden'|'rejected';override_reason?:string} export interface Submission{id:string;title:string;content_type:string;body_text:string;image_meta?:{foreground:string;background:string;button:string};image_inspection?:{dominantColors:string[];paletteMatches:Array<{color:string;approved:string;deltaE:number}>;contrastRatio:number;aspectRatio:number;clearSpacePercent:number};status:Status;author_name:string;reviewer_name?:string;created_at:string;findings:AuditFinding[];comments:string[];history:string[];governance?:Governance}

export interface CustomAuditRule {
  id: string;
  name: string;
  phrase: string;
  replacement: string;
  category: FindingCategory;
  explanation: string;
}

export interface AnalyticsCategory {
  name: string;
  count: number;
}

export interface WorkspaceAnalytics {
  days: number;
  totalSubmissions: number;
  auditedSubmissions: number;
  openFindings: number;
  findings: number;
  categories: AnalyticsCategory[];
  topRules: Array<{ citation: string; count: number }>;
}
