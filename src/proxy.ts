import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { workspaceActor, canMutate } from '@/lib/access';

export async function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.delete('x-veribrand-actor'); headers.delete('x-veribrand-mode');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const demo = process.env.VERIBRAND_AUTH_MODE === 'demo' || (!url && process.env.VERIBRAND_AUTH_MODE !== 'required');
  headers.set('x-veribrand-mode', demo ? 'demo' : 'authenticated');
  const next = () => { const response = NextResponse.next({ request: { headers } }); response.headers.set('Cache-Control', 'no-store'); return response; };
  if (demo) return next();
  const context = request.nextUrl.pathname === '/api/access';
  let signedIn = false;
  const fail = (message: string, status: number) => context ? NextResponse.json({ mode: 'authenticated', actor: null, signedIn, status, error: message }, { status: 200, headers: { 'Cache-Control': 'no-store' } }) : NextResponse.json({ error: message, signedIn }, { status, headers: { 'Cache-Control': 'no-store' } });
  if (!url || !key) return fail('Authentication configuration is incomplete. Access is blocked.', 503);
  if (process.env.NODE_ENV === 'production' && !process.env.SUPABASE_SECRET_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) return fail('Persistent workspace storage is not configured. Ask the project owner to finish database setup.', 503);
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return fail('Sign in to access this workspace.', 401);
  try {
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return fail('Your session is invalid or expired. Sign in again.', 401);
    signedIn = true;
    const actor = workspaceActor(data.user, process.env.VERIBRAND_WORKSPACE_ID || 'veribrand');
    if (!actor) return fail('Your account has no membership in this workspace. Ask the workspace owner to grant access.', 403);
    if (!canMutate(request.nextUrl.pathname, request.method, actor.role)) return fail('Your assigned role cannot perform this action.', 403);
    headers.set('x-veribrand-actor', encodeURIComponent(JSON.stringify(actor)));
    return next();
  } catch { return fail('Identity verification is unavailable. Access is blocked.', 503); }
}
export const config = { matcher: '/api/:path*' };
