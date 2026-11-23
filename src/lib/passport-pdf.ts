import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { passportMarkdown, type BrandPassport } from './passport';

export async function passportPdf(passport: BrandPassport) {
  const document = await PDFDocument.create();
  const body = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(.09, .16, .13), muted = rgb(.31, .38, .34);
  let page = document.addPage([595, 842]), y = 780, pageNumber = 1;
  const footer = () => { page.drawText(`VeriBrand AI | ${passport.recordId.slice(0, 16)} | Page ${pageNumber}`, { x: 44, y: 28, size: 8, font: body, color: muted }); };
  const nextPage = () => { footer(); page = document.addPage([595, 842]); pageNumber++; y = 790; };
  const ascii = (text: string) => text.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[–—]/g, '-').replace(/→/g, ' to ').replace(/…/g, '...').replace(/[^\x20-\x7e\n\r\t]/gu, char => `[U+${char.codePointAt(0)!.toString(16).toUpperCase()}]`);
  const lines = passportMarkdown(passport).split('\n');
  for (const raw of lines) {
    const heading = raw.startsWith('#'), text = ascii(raw.replace(/^#+\s*/, ''));
    if (heading && y < 120) nextPage();
    const font = heading ? bold : body, size = raw.startsWith('# ') ? 19 : heading ? 12 : 10;
    const lineHeight = heading ? size + 9 : 15;
    if (!text) { y -= 8; continue; }
    let line = '';
    const paint = () => { if (y < 60) nextPage(); page.drawText(line, { x: 44, y, size, font, color: heading ? ink : muted }); y -= lineHeight; line = ''; };
    for (const word of text.split(/\s+/)) {
      const candidate = line ? line + ' ' + word : word;
      if (font.widthOfTextAtSize(candidate, size) <= 507) { line = candidate; continue; }
      if (line) paint();
      for (const char of word) { if (font.widthOfTextAtSize(line + char, size) > 507) paint(); line += char; }
    }
    if (line) paint();
    if (heading) y -= 6;
  }
  y -= 10;
  if (y < 70) nextPage();
  page.drawText('Unicode outside the PDF font is shown as U+ codes. JSON and the web view preserve the original text.', { x: 44, y, size: 8, font: body, color: muted });
  footer();
  document.setTitle(`Brand Passport: ${ascii(passport.title)}`);
  document.setAuthor('VeriBrand AI');
  return document.save();
}
