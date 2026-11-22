import { addCustomGuideline, getKnowledge } from '@/lib/repository';

export async function GET() {
  try { return Response.json(await getKnowledge(), { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return Response.json({ error: 'Brand Knowledge is temporarily unavailable.' }, { status: 503 }); }
}

export async function POST(request: Request) {
  let input: unknown;
  try { input = await request.json(); }
  catch { return Response.json({ error: 'Send a valid JSON guideline.' }, { status: 400 }); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return Response.json({ error: 'Send a guideline object.' }, { status: 400 });
  const entry = input as Record<string, unknown>;
  const name = typeof entry.name === 'string' ? entry.name.trim() : '';
  const phrase = typeof entry.phrase === 'string' ? entry.phrase.trim() : '';
  const replacement = typeof entry.replacement === 'string' ? entry.replacement.trim() : '';
  const explanation = typeof entry.explanation === 'string' ? entry.explanation.trim() : typeof entry.description === 'string' ? entry.description.trim() : '';
  if (!name || !phrase || !replacement || !explanation) return Response.json({ error: 'Name, phrase, replacement, and rationale are required.' }, { status: 400 });
  if (name.length > 72 || phrase.length > 120 || replacement.length > 120 || explanation.length > 400) return Response.json({ error: 'Guideline fields exceed their supported lengths.' }, { status: 413 });
  try {
    const rule = await addCustomGuideline({
      id: typeof entry.id === 'string' ? entry.id.slice(0, 64) : `BG-C-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      name, phrase, replacement, explanation, category: entry.category,
    });
    return Response.json({ ok: true, entry: rule });
  } catch (error) {
    const duplicate = error instanceof Error && error.message.includes('already exists');
    return Response.json({ error: duplicate ? 'A workspace rule already exists for that phrase.' : 'The guideline could not be saved. Retry shortly.' }, { status: duplicate ? 409 : 503 });
  }
}
