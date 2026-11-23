import { addApprovedFact, replaceApprovedFact, getEvidencePack } from '@/lib/repository';
import { validateFact } from '@/lib/evidence';
import { requestActor } from '@/lib/access';

export async function GET() {
  try { return Response.json(await getEvidencePack(), { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return Response.json({ error: 'The evidence library is temporarily unavailable.' }, { status: 503 }); }
}
export async function POST(request: Request) {
  return save(request, false);
}
export async function PUT(request: Request) {
  return save(request, true);
}
async function save(request: Request, update: boolean) {
  let value: Record<string, unknown>;
  try { value = await request.json(); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); }
  catch { return Response.json({ error: 'Provide an evidence entry as JSON.' }, { status: 400 }); }
  const verified = requestActor(request);
  if (verified) { value.role = verified.role; value.approvedBy = verified.name; }
  if (value.role !== 'Brand Admin') return Response.json({ error: 'Choose the demo Brand Admin role to approve new evidence.' }, { status: 403 });
  let fact;
  try { fact = validateFact(value); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Invalid evidence entry.' }, { status: 400 }); }
  if (update) {
    if (typeof value.factKey !== 'string' || !value.factKey.trim() || value.factKey.length > 128) return Response.json({ error: 'Provide the evidence key to update.' }, { status: 400 });
    fact.fact_key = value.factKey;
  }
  try { return Response.json(await (update ? replaceApprovedFact(fact) : addApprovedFact(fact)), { status: update ? 200 : 201 }); }
  catch { return Response.json({ error: 'The evidence could not be saved. Please retry.' }, { status: 503 }); }
}
