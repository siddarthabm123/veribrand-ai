import type { CustomAuditRule, FindingCategory } from '@/types/governance';

export const CUSTOM_GUIDELINES_KEY = 'veribrand-ai:guidelines:v1';

const categories = new Set<FindingCategory>(['tone', 'terminology', 'fact_claim', 'visual', 'accessibility']);

export function normalizeCustomRules(input: unknown): CustomAuditRule[] {
  if (!Array.isArray(input)) return [];
  return input.flatMap((value): CustomAuditRule[] => {
    if (!value || typeof value !== 'object') return [];
    const item = value as Record<string, unknown>;
    const id = typeof item.id === 'string' ? item.id.slice(0, 64) : '';
    const name = typeof item.name === 'string' ? item.name.trim().slice(0, 72) : '';
    const phrase = typeof item.phrase === 'string' ? item.phrase.trim().slice(0, 120) : '';
    const replacement = typeof item.replacement === 'string' ? item.replacement.trim().slice(0, 120) : '';
    const rawExplanation = item.explanation ?? item.description;
    const explanation = typeof rawExplanation === 'string' ? rawExplanation.trim().slice(0, 400) : '';
    const category = typeof item.category === 'string' && categories.has(item.category as FindingCategory)
      ? item.category as FindingCategory
      : 'terminology';
    if (!id || !name || !phrase || !replacement || phrase.toLowerCase() === replacement.toLowerCase()) return [];
    return [{ id, name, phrase, replacement, explanation, category }];
  }).slice(0, 100);
}
