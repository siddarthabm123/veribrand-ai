import type { Submission } from '@/types/governance';
import { CUSTOM_GUIDELINES_KEY, normalizeCustomRules } from '@/lib/custom-guidelines';

const SUBMISSIONS_KEY = 'veribrand-ai:submissions:v1';
const PASSPORTS_KEY = 'veribrand-ai:passports:v1';
const DRAFT_KEY = 'veribrand-ai:passport-draft:v1';

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try { const value = window.localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
}
function write<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage can be unavailable in private browsing or at quota. */ }
}

export function readDraft() { return read(DRAFT_KEY, { text: '', accepted: [] as string[] }); }
export function writeDraft(value: { text: string; accepted: string[] }) { write(DRAFT_KEY, value); }
export function readSubmissions(): Submission[] { return read(SUBMISSIONS_KEY, []); }
export function readCustomGuidelines() { return normalizeCustomRules(read<unknown>(CUSTOM_GUIDELINES_KEY, [])); }
export function readSubmission(id: string) { return readSubmissions().find((item) => item.id === id); }
export function saveSubmission(record: Submission) {
  const records = readSubmissions();
  const index = records.findIndex((item) => item.id === record.id);
  if (index < 0) records.unshift(record); else records[index] = record;
  write(SUBMISSIONS_KEY, records);
}
export function savePassport(passport: unknown) {
  const passports = read<unknown[]>(PASSPORTS_KEY, []);
  passports.unshift(passport);
  write(PASSPORTS_KEY, passports.slice(0, 50));
}
