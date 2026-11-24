import { getSupabaseAdmin } from '@/lib/supabase/server';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: 'Send valid signup details.' }, { status: 400 });
  }

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return Response.json({ error: 'Send valid signup details.' }, { status: 400 });
  }

  const body = input as Record<string, unknown>;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  const brandName = typeof body.brandName === 'string' ? body.brandName.trim() : '';

  if (!emailPattern.test(email) || email.length > 254) {
    return Response.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }
  if (password.length < 12 || password.length > 128) {
    return Response.json({ error: 'Use a password between 12 and 128 characters.' }, { status: 400 });
  }
  if (!fullName || fullName.length > 80 || !brandName || brandName.length < 2 || brandName.length > 80) {
    return Response.json({ error: 'Enter your name and a brand name between 2 and 80 characters.' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return Response.json({ error: 'Instant signup is not configured on this deployment. Ask the workspace owner to configure the server-side Supabase admin key.' }, { status: 503 });
  }

  try {
    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, brand_name: brandName },
    });

    if (error) {
      // Keep account-existence and provider details private from unauthenticated callers.
      return Response.json({ error: 'We could not create this account. Try signing in, or use a different email address.' }, { status: 400 });
    }

    return Response.json({ ok: true }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Account creation is temporarily unavailable. Please try again.' }, { status: 503 });
  }
}
