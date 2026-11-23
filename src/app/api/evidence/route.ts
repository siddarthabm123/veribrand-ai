import { addApprovedFact, getEvidencePack } from '@/lib/repository';
import { validateFact } from '@/lib/evidence';

export async function GET() {
  try { return Response.json(await getEvidencePack(), { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return Response.json({ error: 'The evidence library is temporarily unavailable.' }, { status: 503 }); }
}
export async function POST(request: Request) {
  let value: Record<string, unknown>;
  try { value = await request.json(); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); }
  catch { return Response.json({ error: 'Provide an evidence entry as JSON.' }, { status: 400 }); }
  // Self-selected demo roles express workflow intent, not authenticated access control.
  if (value.role !== 'Brand Admin') return Response.json({ error: 'Choose the demo Brand Admin role to approve new evidence.' }, { status: 403 });
  let fact;
  try { fact = validateFact(value); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Invalid evidence entry.' }, { status: 400 }); }
  try { return Response.json(await addApprovedFact(fact), { status: 201 }); }
  catch { return Response.json({ error: 'The evidence could not be saved. Please retry.' }, { status: 503 }); }
}
