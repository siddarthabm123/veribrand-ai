'use client';

import { useEffect, useRef, useState } from 'react';
import mammoth from 'mammoth/mammoth.browser';
import NextImage from 'next/image';
import { ArrowUpRight, Check, FileCheck2, FileText, ImagePlus, LockKeyhole, ScanEye, ShieldAlert, Upload } from 'lucide-react';
import { readCustomGuidelines, saveSubmission } from '@/lib/client-state';
import type { AuditFinding, Submission } from '@/types/governance';
import { auditCustomRules } from '@/lib/audit/custom';
import { auditText } from '@/lib/audit/deterministic';

type ImageReport = { width: number; height: number; aspectRatio: number; dominantColors: string[]; paletteMatches: Array<{ color: string; approved: string; deltaE: number }>; foreground: string; background: string; contrastRatio: number; clearSpacePercent: number; findings: AuditFinding[] };
const palette = ['#4F46E5', '#0F172A', '#10B981', '#F8FAFC'];
const maxUploadBytes = 12 * 1024 * 1024;
const demoBrief = `Q4 Acme Cloud campaign brief\n\nAudience: growing teams who need predictable, secure cloud tools.\n\nApproved claims: 99.95% uptime SLA, 15-minute enterprise response, and 10 GB free storage.\n\nVoice: clear, confident, helpful and human. Avoid hype, absolute promises, and unapproved product names.\n\nVisual direction: use the approved palette #4F46E5, #0F172A, #10B981, and #F8FAFC. Maintain readable text contrast and generous breathing room.\n\nCall to action: Explore Acme Cloud.`;

function rgb(hex: string) { const value = hex.replace('#', ''); return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16)); }
function hex(values: number[]) { return '#' + values.map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('').toUpperCase(); }
function lab(color: string) {
  const [r, g, b] = rgb(color).map((value) => value / 255).map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  const x = (r * .4124 + g * .3576 + b * .1805) / .95047, y = (r * .2126 + g * .7152 + b * .0722), z = (r * .0193 + g * .1192 + b * .9505) / 1.08883;
  const f = (value: number) => value > .008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116;
  const fx = f(x), fy = f(y), fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
function deltaE(a: string, b: string) { const one = lab(a), two = lab(b); return Math.hypot(one[0] - two[0], one[1] - two[1], one[2] - two[2]); }
function contrast(a: string, b: string) {
  const luminance = (color: string) => rgb(color).map((value) => value / 255).map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  const first = luminance(a), second = luminance(b);
  return (Math.max(first, second) + .05) / (Math.min(first, second) + .05);
}
function finding(id: string, code: string, category: AuditFinding['category'], span: string, explanation: string, fix: string): AuditFinding {
  return { id: `visual-${crypto.randomUUID()}`, submission_id: id, category, severity: 'high', exact_span: span, start_index: 0, end_index: 0, rule_citation: code, source_excerpt: code === 'BG-3.2' ? 'WCAG 2.1 AA requires a minimum contrast ratio of 4.5:1 for normal text.' : 'Approved Acme Cloud palette: ' + palette.join(', '), explanation, suggested_fix: fix, intent_preservation_score: 100, reviewer_status: 'pending' };
}

async function inspectImage(file: File, submissionId: string): Promise<ImageReport> {
  const image = new window.Image();
  const url = URL.createObjectURL(file);
  try {
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 128 / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale)), height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas inspection is unavailable in this browser.');
    context.drawImage(image, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    const counts = new Map<string, { count: number; totals: number[] }>();
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 3] < 180) continue;
      const values = [pixels[index], pixels[index + 1], pixels[index + 2]];
      const key = values.map((value) => Math.round(value / 16)).join(':');
      const item = counts.get(key) ?? { count: 0, totals: [0, 0, 0] };
      item.count += 1; item.totals = item.totals.map((total, channel) => total + values[channel]); counts.set(key, item);
    }
    const dominantColors = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 5).map((item) => hex(item.totals.map((total) => total / item.count)));
    const edgeWidth = Math.max(1, Math.round(width * .05)), edgeHeight = Math.max(1, Math.round(height * .05));
    let edgeCount = 0, uniformCount = 0;
    const edgeReference = dominantColors[0] || '#FFFFFF';
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (x >= edgeWidth && x < width - edgeWidth && y >= edgeHeight && y < height - edgeHeight) continue;
      const index = (y * width + x) * 4;
      if (pixels[index + 3] < 180) { uniformCount++; edgeCount++; continue; }
      edgeCount++;
      const [r, g, b] = rgb(edgeReference);
      if (Math.abs(r - pixels[index]) < 28 && Math.abs(g - pixels[index + 1]) < 28 && Math.abs(b - pixels[index + 2]) < 28) uniformCount++;
    }
    const clearSpacePercent = edgeCount ? Math.round(uniformCount / edgeCount * 100) : 0;
    const paletteMatches = dominantColors.slice(0, 3).map((color) => ({ color, ...palette.map((approved) => ({ approved, deltaE: deltaE(color, approved) })).sort((a, b) => a.deltaE - b.deltaE)[0] }));
    const background = dominantColors[0] || '#F8FAFC';
    const foreground = dominantColors[1] || '#0F172A';
    const contrastRatio = contrast(foreground, background);
    const aspectRatio = image.naturalWidth / image.naturalHeight;
    const findings: AuditFinding[] = [];
    if (paletteMatches.some((item) => item.deltaE > 12)) findings.push(finding(submissionId, 'BG-3.1', 'visual', paletteMatches.filter((item) => item.deltaE > 12).map((item) => item.color).join(', '), 'Dominant banner color is outside the approved palette tolerance (CIELAB ΔE 12).', paletteMatches.map((item) => item.approved).join(', ')));
    if (contrastRatio < 4.5) findings.push(finding(submissionId, 'BG-3.2', 'accessibility', `${contrastRatio.toFixed(2)}:1 contrast`, 'The strongest contrast pair among sampled dominant colors is below the 4.5:1 WCAG AA threshold.', '#0F172A on #F8FAFC'));
    if (aspectRatio < 1.7 || aspectRatio > 2.1) findings.push(finding(submissionId, 'BG-3.1', 'visual', `${aspectRatio.toFixed(2)}:1 aspect ratio`, 'Campaign banner is outside the recommended 1.7:1–2.1:1 wide format.', 'Use a 1.91:1 banner canvas'));
    if (clearSpacePercent < 30) findings.push(finding(submissionId, 'BG-3.1', 'visual', `${clearSpacePercent}% edge clear-space estimate`, 'The sampled outer 5% edge band has little consistent breathing room; check logo and text padding.', 'Keep key content at least 5% inside each edge'));
    return { width: image.naturalWidth, height: image.naturalHeight, aspectRatio, dominantColors, paletteMatches, foreground, background, contrastRatio, clearSpacePercent, findings };
  } finally { URL.revokeObjectURL(url); }
}

function extractBasicPdfText(buffer: ArrayBuffer) {
  const raw = new TextDecoder('latin1').decode(buffer);
  const decode = (value: string) => value.replace(/\\([\\()])/g, '$1').replace(/\\n/g, '\n').replace(/\\r/g, '\n').replace(/\\t/g, ' ').replace(/\\([0-7]{1,3})/g, (_, octal: string) => String.fromCharCode(parseInt(octal, 8)));
  const strings = [...raw.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)].map((match) => decode(match[1]));
  for (const operation of raw.matchAll(/\[((?:.|\n)*?)\]\s*TJ/g)) strings.push(...[...operation[1].matchAll(/\(((?:\\.|[^\\)])*)\)/g)].map((match) => decode(match[1])));
  return strings.join(' ').replace(/\s+/g, ' ').trim();
}

export default function CampaignInspector() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [report, setReport] = useState<ImageReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [fileBusy, setFileBusy] = useState(false);
  const [sampleBusy, setSampleBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState<Submission | null>(null);
  const [altText, setAltText] = useState('');
  const [imagePurpose, setImagePurpose] = useState<'informative' | 'decorative'>('informative');
  const fileLock = useRef(false);
  const submitLock = useRef(false);
  const sampleLock = useRef(false);

  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);

  function setContrastColor(key: 'foreground' | 'background', color: string) {
    setReport((current) => {
      if (!current) return current;
      const colors = { ...current, [key]: color };
      const contrastRatio = contrast(colors.foreground, colors.background);
      const findings = current.findings.filter((item) => item.rule_citation !== 'BG-3.2');
      if (contrastRatio < 4.5) findings.push(finding('image', 'BG-3.2', 'accessibility', `${contrastRatio.toFixed(2)}:1 contrast`, 'The selected foreground/background pair is below the 4.5:1 WCAG AA threshold.', '#0F172A on #F8FAFC'));
      return { ...colors, contrastRatio, findings };
    });
  }

  async function loadFile(file: File) {
    if (fileLock.current) return;
    fileLock.current = true; setFileBusy(true); setMessage(''); setSaved(null); setReport(null); setText('');
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(''); setFileName('');
    try {
      if (!file.size) throw new Error('This file is empty. Choose a non-empty campaign file.');
      if (file.size > maxUploadBytes) throw new Error('Files must be 12 MB or smaller.');
      const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
      const allowed = new Set(['txt', 'md', 'docx', 'pdf', 'png', 'jpg', 'jpeg', 'webp']);
      if (!allowed.has(extension)) throw new Error('Choose a TXT, Markdown, DOCX, PDF, PNG, JPG or WebP file.');
      const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
      const ascii = String.fromCharCode(...header);
      const validImage = extension === 'png' ? header[0] === 137 && ascii.slice(1, 4) === 'PNG'
        : extension === 'jpg' || extension === 'jpeg' ? header[0] === 255 && header[1] === 216 && header[2] === 255
          : extension === 'webp' ? ascii.slice(0, 4) === 'RIFF' && ascii.slice(8, 12) === 'WEBP' : false;
      if ((['png', 'jpg', 'jpeg', 'webp'].includes(extension)) !== validImage) throw new Error('The file contents do not match its image extension, or the image is damaged.');
      if (extension === 'pdf' && !ascii.startsWith('%PDF-')) throw new Error('This PDF is damaged or has the wrong file extension.');
      if (extension === 'docx' && !(header[0] === 80 && header[1] === 75)) throw new Error('This DOCX is damaged or has the wrong file extension.');
      if ((extension === 'txt' || extension === 'md') && header.includes(0)) throw new Error('This text file contains binary data.');
      setFileName(file.name);
      if (['png', 'jpg', 'jpeg', 'webp'].includes(extension)) {
        const preview = URL.createObjectURL(file); setImageUrl(preview);
        try {
          const inspection = await inspectImage(file, crypto.randomUUID());
          if (inspection.width > 12_000 || inspection.height > 12_000 || inspection.width * inspection.height > 60_000_000) throw new Error('This image is too large to inspect safely. Resize it below 12,000px per side and 60 megapixels.');
          setReport(inspection); setMessage('Canvas sampled this banner and compared it with BG-3.1 and BG-3.2.');
        } catch (cause) { URL.revokeObjectURL(preview); setImageUrl(''); throw cause; }
        return;
      }
      let extracted = '';
      if (extension === 'docx') {
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() }); extracted = result.value;
      } else if (extension === 'pdf') extracted = extractBasicPdfText(await file.arrayBuffer());
      else {
        try { extracted = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()); }
        catch { throw new Error('This text file is not valid UTF-8. Save it as UTF-8 and try again.'); }
      }
      if (!extracted.trim()) { setText(''); setMessage(extension === 'pdf' ? 'No selectable PDF text was found. Scanned PDFs need OCR; paste the brief text here to audit it.' : 'This document contains no readable text. Check the file and try again.'); }
      else { setText(extracted); setMessage(`Extracted ${extracted.trim().split(/\s+/).length} words. Review the text, then run the audit.`); }
    } catch (cause) { setFileName(''); setReport(null); setText(''); setMessage(cause instanceof Error ? cause.message : 'This file could not be read.'); }
    finally { fileLock.current = false; setFileBusy(false); }
  }

  async function loadSampleDocx() {
    if (sampleLock.current) return;
    sampleLock.current = true; setSampleBusy(true);
    try {
      const response = await fetch('/samples/sample-campaign-brief.docx');
      if (!response.ok) throw new Error('The sample DOCX is temporarily unavailable.');
      await loadFile(new File([await response.blob()], 'sample-campaign-brief.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
    } catch (cause) { setText(demoBrief); setFileName('sample-campaign-brief.docx'); setMessage(cause instanceof Error ? cause.message : 'The sample brief could not be loaded.'); }
    finally { sampleLock.current = false; setSampleBusy(false); }
  }

  async function loadSampleBanner() {
    if (sampleLock.current) return;
    sampleLock.current = true; setSampleBusy(true);
    try {
      const response = await fetch('/samples/sample-promo-banner.png');
      if (!response.ok) throw new Error('The sample PNG is temporarily unavailable.');
      await loadFile(new File([await response.blob()], 'sample-promo-banner.png', { type: 'image/png' }));
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'The sample banner could not be loaded.'); }
    finally { sampleLock.current = false; setSampleBusy(false); }
  }

  async function createAudit() {
    if (submitLock.current || (!report && !text.trim())) { setMessage('Choose an image or enter campaign text before running the audit.'); return; }
    submitLock.current = true; setBusy(true); setMessage('');
    const id = crypto.randomUUID();
    const imageFindings = report?.findings.map((item) => ({ ...item, id: `visual-${crypto.randomUUID()}`, submission_id: id })) ?? [];
    try {
      const customRules = readCustomGuidelines();
      try {
        const response = await fetch('/api/submissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, title: fileName.replace(/\.[^.]+$/, '') || 'Campaign asset audit', content_type: report ? 'Campaign banner' : 'Campaign brief', body_text: text, author_name: 'Demo creator', customRules, visual: report ? { foreground: report.foreground, background: report.background, imagePurpose, altText } : undefined, channel: 'Website CMS', visualFindings: imageFindings, imageInspection: report ? { dominantColors: report.dominantColors, paletteMatches: report.paletteMatches, contrastRatio: report.contrastRatio, aspectRatio: report.aspectRatio, clearSpacePercent: report.clearSpacePercent } : undefined }) });
        if (!response.ok) throw new Error('The review service could not save this audit.');
        const record = await response.json() as Submission; saveSubmission(record); setSaved(record); setMessage(`Audit saved with ${record.findings.length} cited finding${record.findings.length === 1 ? '' : 's'}.`);
      } catch {
        const deterministic = auditText(text, id);
        const custom = auditCustomRules(text, id, customRules);
        const customSpans = new Set(custom.map((item) => `${item.start_index}:${item.end_index}`));
        const findings = [...deterministic.filter((item) => !customSpans.has(`${item.start_index}:${item.end_index}`)), ...custom, ...imageFindings].sort((a, b) => a.start_index - b.start_index);
        const local: Submission = { id, title: fileName.replace(/\.[^.]+$/, '') || 'Campaign asset audit', content_type: report ? 'Campaign banner' : 'Campaign brief', body_text: text.trim(), status: findings.length ? 'audited' : 'draft', author_name: 'Demo creator', created_at: new Date().toISOString(), findings, comments: [], history: ['Campaign asset audited in this browser'], ...(report ? { image_inspection: { dominantColors: report.dominantColors, paletteMatches: report.paletteMatches, contrastRatio: report.contrastRatio, aspectRatio: report.aspectRatio, clearSpacePercent: report.clearSpacePercent } } : {}) };
        saveSubmission(local); setSaved(local); setMessage(`Saved locally with ${findings.length} cited finding${findings.length === 1 ? '' : 's'}.`);
      }
    } catch { setMessage('The audit could not be completed. Check the content and try again.'); }
    finally { submitLock.current = false; setBusy(false); }
  }

  return <section id="file-banner-inspector" className="campaign-inspector panel">
    <div className="campaign-head"><div><span><ScanEye size={17}/></span><div><h2>Campaign document & banner inspector</h2><p>Audit briefs and visual assets together before they reach a reviewer.</p></div></div><span className="privacy-badge"><LockKeyhole size={13}/> Image sampling in browser</span></div>
    <div className="campaign-upload-row"><label className="campaign-drop" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) void loadFile(file); }}><Upload size={18}/><b>Choose or drop a campaign file</b><small>TXT · MD · DOCX · PDF · PNG · JPG · WebP</small><input ref={inputRef} type="file" disabled={fileBusy || sampleBusy} accept=".txt,.md,.docx,.pdf,.png,.jpg,.jpeg,.webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadFile(file); }}/></label><div className="campaign-samples"><span>Try a sample</span><button className="secondary-btn" onClick={loadSampleDocx} disabled={fileBusy || sampleBusy}><FileText size={14}/> Load Sample Campaign Brief (.docx)</button><button className="secondary-btn" onClick={loadSampleBanner} disabled={fileBusy || sampleBusy}><ImagePlus size={14}/> Load Sample Promo Banner (PNG)</button></div></div>
    {fileName && <p className="campaign-file"><FileCheck2 size={14}/> {fileName}</p>}
    {!report && <label className="campaign-text-label">Extracted campaign text<textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Upload a document or paste campaign copy here. Text is checked against your approved brand rules."/></label>}
    {report && imageUrl && <div className="image-report-grid"><div className="image-annotated"><NextImage src={imageUrl} alt="Uploaded campaign banner being visually inspected" width={report.width} height={report.height} unoptimized/><span className="image-overlay-tag">Canvas sampled · BG-3.1 / BG-3.2</span><span className="safe-area-overlay"/></div><div className="image-report"><h3>Visual inspection report</h3><p>{report.width} × {report.height}px · {report.aspectRatio.toFixed(2)}:1 aspect ratio</p><div className="dominant-palette">{report.dominantColors.map((color) => <span key={color}><i style={{ background: color }}/><code>{color}</code></span>)}</div><div className="contrast-selectors"><label>Foreground<select value={report.foreground} onChange={(event) => setContrastColor("foreground", event.target.value)}>{report.dominantColors.map((color) => <option key={color}>{color}</option>)}</select></label><label>Background<select value={report.background} onChange={(event) => setContrastColor("background", event.target.value)}>{report.dominantColors.map((color) => <option key={color}>{color}</option>)}</select></label><small>Choose the actual text and surface colors from sampled pixels.</small></div><ul>{report.paletteMatches.map((item) => <li key={item.color}><span style={{ background: item.color }}/> <code>{item.color}</code> → nearest {item.approved} <b>ΔE {item.deltaE.toFixed(1)}</b></li>)}</ul><div className="image-checks"><span className={report.contrastRatio >= 4.5 ? 'pass' : 'fail'}>{report.contrastRatio.toFixed(2)}:1 dominant-pair contrast · {report.contrastRatio >= 4.5 ? 'WCAG AA pass' : 'below WCAG AA'}</span><span className={report.clearSpacePercent >= 30 ? 'pass' : 'fail'}>{report.clearSpacePercent}% edge clear-space estimate</span><span className={report.aspectRatio >= 1.7 && report.aspectRatio <= 2.1 ? 'pass' : 'fail'}>Banner ratio {report.aspectRatio >= 1.7 && report.aspectRatio <= 2.1 ? 'in range' : 'needs review'}</span></div>{report.findings.length > 0 && <div className="campaign-findings">{report.findings.map((item) => <p key={item.id}><ShieldAlert size={14}/><b>{item.rule_citation}</b> {item.explanation}</p>)}</div>}{report.findings.length === 0 && <p className="campaign-clear"><Check size={14}/> No sampled palette, contrast, aspect-ratio or edge-space issues. Alt-text checks are evaluated when the audit is saved.</p>}</div></div>}
    {report && <div className="campaign-text-label"><label>Image purpose<select value={imagePurpose} onChange={event => setImagePurpose(event.target.value as typeof imagePurpose)}><option value="informative">Informative image</option><option value="decorative">Decorative image</option></select></label>{imagePurpose === "informative" && <label>Image description (alt text)<textarea value={altText} onChange={event => setAltText(event.target.value)} maxLength={1000} placeholder="Describe the meaning of this image. Missing descriptions are flagged."/></label>}<small>The selected foreground/background pair and alt-text declaration are included in the server review. Image sampling remains an estimate.</small></div>}
    {message && <p className="campaign-message" role="status">{message}</p>}
    <div className="campaign-actions"><span>Documents are extracted locally; image pixels never leave this browser.</span><button className="primary-btn" disabled={busy || fileBusy || sampleBusy || (!report && !text.trim())} onClick={createAudit}>{busy ? 'Saving audit…' : fileBusy || sampleBusy ? 'Loading campaign…' : 'Run campaign audit'} <ArrowUpRight size={14}/></button></div>
    {saved && <p className="campaign-saved"><Check size={14}/> Saved to local review history. <a href={`/impact/review/${saved.id}`}>Open review room <ArrowUpRight size={13}/></a></p>}
  </section>;
}
