import { getEvidencePack, getSubmission } from '@/lib/repository';
import { buildPassport, passportMarkdown } from '@/lib/passport';
import { passportPdf } from '@/lib/passport-pdf';
import { hashContent } from '@/lib/governance';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const format = new URL(request.url).searchParams.get('format') || 'json';
  if (!['json', 'pdf', 'markdown'].includes(format)) return Response.json({ error: 'Choose JSON, PDF, or Markdown.' }, { status: 400 });
  try {
    const record = await getSubmission(id);
    if (!record) return Response.json({ error: 'No saved server review was found. Save the draft before exporting.' }, { status: 404 });
    const requestedVersion = new URL(request.url).searchParams.get('version');
    if (requestedVersion !== null && (!/^\d+$/.test(requestedVersion) || Number(requestedVersion) !== (record.governance?.version ?? 0))) return Response.json({ error: 'The live record has advanced beyond this linked version. Open the review to view its current status; the old approval is not reused.' }, { status: 409 });
    if (record.governance && record.governance.contentHash !== await hashContent(record, record.governance.visual)) return Response.json({ error: 'The content does not match its recorded scan. Rescan before exporting.' }, { status: 409 });
    const passport = buildPassport(record, await getEvidencePack());
    const filename = `VeriBrand-Passport-${id.replace(/[^a-z0-9-]/gi, '').slice(0, 80)}-v${passport.contentVersion ?? 0}`;
    const headers = { 'Cache-Control': 'no-store', 'Content-Disposition': `attachment; filename="${filename}.${format === 'markdown' ? 'md' : format}"`, 'X-Content-Type-Options': 'nosniff' };
    if (format === 'pdf') { const bytes = await passportPdf(passport); return new Response(new Uint8Array(bytes).buffer, { headers: { ...headers, 'Content-Type': 'application/pdf' } }); }
    if (format === 'markdown') return new Response(passportMarkdown(passport), { headers: { ...headers, 'Content-Type': 'text/markdown; charset=utf-8' } });
    return Response.json(passport, { headers });
  } catch { return Response.json({ error: 'The passport could not be generated. Reload the saved review and retry.' }, { status: 503 }); }
}
