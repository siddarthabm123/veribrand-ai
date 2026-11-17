export type WorkspaceRole = 'Content Creator' | 'Brand Reviewer' | 'Brand Admin';
export interface ActiveSession { name: string; role: WorkspaceRole; workspace: string; entered: boolean }

const KEY = 'veribrand-ai:active-session:v1';
const CHANGE_EVENT = 'veribrand-ai:session-change';
let cachedRaw: string | null | undefined;
let cachedSession: ActiveSession | null = null;

export function readSession(): ActiveSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === cachedRaw) return cachedSession;
    cachedRaw = raw;
    cachedSession = raw ? JSON.parse(raw) as ActiveSession : null;
    return cachedSession;
  } catch { return null; }
}
export function saveSession(session: ActiveSession) {
  if (typeof window === 'undefined') return;
  try { cachedRaw = JSON.stringify(session); cachedSession = session; window.localStorage.setItem(KEY, cachedRaw); } catch { /* The demo remains available if browser storage is unavailable. */ }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
export function clearSession() {
  if (typeof window === 'undefined') return;
  cachedRaw = null; cachedSession = null;
  try { window.localStorage.removeItem(KEY); } catch { /* Sign out still returns to the welcome screen. */ }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
export function sessionChangeEvent() { return CHANGE_EVENT; }
