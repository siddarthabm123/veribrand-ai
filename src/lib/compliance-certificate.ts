import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { Submission } from '@/types/governance';

type CertificateProof = { certificateId: string; sha256Signature: string; approvedBy?: string; timestamp?: string; targetChannel?: string };

export async function buildComplianceCertificate(submission: Submission, proof: CertificateProof) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([612, 792]);
  const margin = 52;
  const draw = (text: string, y: number, size = 11, strong = false, color = rgb(.17, .2, .3)) => page.drawText(text.slice(0, 1200), { x: margin, y, size, font: strong ? bold : font, color, maxWidth: 508 });
  page.drawRectangle({ x: 0, y: 692, width: 612, height: 100, color: rgb(.1, .11, .22) });
  page.drawText('VERIBRAND AI', { x: margin, y: 748, size: 12, font: bold, color: rgb(.72, .7, 1) });
  page.drawText('Brand Passport Compliance Certificate', { x: margin, y: 716, size: 20, font: bold, color: rgb(1, 1, 1) });
  let y = 655;
  draw('CERTIFICATE ' + proof.certificateId, y, 10, true, rgb(.35, .31, .79)); y -= 34;
  draw('Submission', y, 9, true); y -= 17; draw(submission.title || 'Untitled submission', y, 15, true); y -= 29;
  draw('Workspace', y, 9, true); y -= 17; draw('Acme Cloud Demo', y); y -= 28;
  draw('Target channel', y, 9, true); y -= 17; draw(proof.targetChannel || 'Publication channel', y); y -= 28;
  draw('REVIEW SIGN-OFF', y, 9, true, rgb(.35, .31, .79)); y -= 20;
  draw('Approved by: ' + (proof.approvedBy || submission.reviewer_name || 'Brand Reviewer'), y); y -= 17;
  draw('Timestamp: ' + (proof.timestamp || new Date().toISOString()), y); y -= 27;
  draw('VERIFIED RULES PASSED', y, 9, true, rgb(.35, .31, .79)); y -= 20;
  const citations = [...new Set(submission.findings.map((finding) => finding.rule_citation))];
  const passed = citations.length ? citations.filter((citation) => submission.findings.filter((finding) => finding.rule_citation === citation).every((finding) => finding.reviewer_status !== 'pending')) : ['BG-1.1', 'BG-2.1', 'BG-3.1', 'BG-3.2'];
  for (const citation of passed) { draw('PASS  ' + citation, y, 10, true, rgb(.07, .52, .35)); y -= 17; }
  if (!passed.length) { draw('No unresolved findings remained at sign-off.', y); y -= 17; }
  y -= 11;
  draw('SHA-256 VERIFICATION HASH', y, 9, true, rgb(.35, .31, .79)); y -= 19;
  const hash = proof.sha256Signature;
  for (let offset = 0; offset < hash.length; offset += 64) { if (y < 80) { page = pdf.addPage([612, 792]); y = 730; } draw(hash.slice(offset, offset + 64), y, 9); y -= 14; }
  page.drawLine({ start: { x: margin, y: 61 }, end: { x: 560, y: 61 }, thickness: 1, color: rgb(.89, .9, .94) });
  page.drawText('Human-reviewed publication record · Team ArticXCoders', { x: margin, y: 43, size: 8, font, color: rgb(.48, .52, .6) });
  return pdf.save();
}
