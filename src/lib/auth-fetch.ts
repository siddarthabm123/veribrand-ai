import { getSupabaseBrowser } from './supabase/browser';

export async function authFetch(input: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (input.startsWith('/api/')) {
    const client = getSupabaseBrowser();
    if (client) {
      const { data } = await client.auth.getSession();
      if (data.session) headers.set('Authorization', `Bearer ${data.session.access_token}`);
    }
  }
  return fetch(input, { ...init, headers });
}
export async function downloadRecord(url: string, filename: string) {
  const response = await authFetch(url);
  if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Download unavailable.'); }
  const blob = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a'); anchor.href = blob; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(blob), 1000);
}
