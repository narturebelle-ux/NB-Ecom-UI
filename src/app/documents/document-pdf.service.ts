import { Injectable } from '@angular/core';
import type { jsPDF as JsPdf } from 'jspdf';
import { Block, Inline, parseMarkdown, plainText } from './markdown';

/**
 * Every document the UI shows and lets people download (owner decision D54): the footer policies now, and the
 * mother, provider and coordinator onboarding documents later (F27-S3 to S5), including signed copies. The API
 * only supplies the text, version and signature details; the UI makes the PDF from the same text it shows.
 */
export interface DocumentSignature {
  /** The name the person typed to sign. */
  typedName: string;
  /** When they signed, as an ISO date-time from the API. */
  signedAt: string;
}

export interface DocumentContent {
  title: string;
  version: string;
  /** ISO date, e.g. 2026-11-12. */
  effectiveDate: string;
  /** Markdown. */
  body: string;
  signature?: DocumentSignature | null;
}

export const BRAND = 'NartureBelle™';

/** "Terms of Service", "1" → NartureBelle-Terms-of-Service-v1.pdf */
export function documentFileName(doc: Pick<DocumentContent, 'title' | 'version'>): string {
  const title = doc.title.replace(/&/g, 'and').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const version = doc.version.replace(/[^A-Za-z0-9.]+/g, '-');
  return `NartureBelle-${title}-v${version}.pdf`;
}

/** 2026-11-12 → "12 November 2026", read as a calendar date (no time-zone shift). */
export function formatDocumentDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const date = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(iso);
  if (isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** A signing time in India time, e.g. "12 November 2026, 3:45 pm IST". */
export function formatSignedAt(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  const day = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
  const time = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
  return `${day}, ${time.toLowerCase()} IST`;
}

/** "Version 1 · Effective 12 November 2026", the same line on the page and in the PDF. */
export function versionLine(doc: Pick<DocumentContent, 'version' | 'effectiveDate'>): string {
  return `Version ${doc.version} · Effective ${formatDocumentDate(doc.effectiveDate)}`;
}

/** The words of the signature block, on the page and in the PDF. */
export function signatureLines(signature: DocumentSignature): string[] {
  return [`Signed by typing the name: ${signature.typedName}`, `Signed on: ${formatSignedAt(signature.signedAt)}`];
}

// Windows-1252 characters above Latin-1 that the PDF's built-in fonts can print (™ ’ “ ” • – — and so on).
const WIN_ANSI_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';

/**
 * The built-in PDF fonts print Windows-1252 only, and one character outside it garbles the whole line.
 * ₹ becomes "Rs.", other unsupported characters become "?". Text in Indian scripts will need an embedded font.
 */
export function pdfText(text: string): string {
  return text
    .replace(/₹\s?/g, 'Rs. ')
    .replace(/[  ]/g, ' ')
    .replace(/[‐‑]/g, '-')
    .replace(/[^\u0000-ÿ]/g, ch => (WIN_ANSI_EXTRA.includes(ch) ? ch : '?'));
}

// A4 in millimetres.
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 20;
const CONTENT_TOP = 30;
const CONTENT_BOTTOM = PAGE_H - 22;
const TEXT_W = PAGE_W - 2 * MARGIN;
const PT_TO_MM = 0.3528;
const INK: [number, number, number] = [33, 43, 36];
const MUTED: [number, number, number] = [100, 110, 104];

/**
 * Makes and saves document PDFs in the browser, as text (selectable, small, sharp at any zoom), with the
 * NartureBelle™ name, title, version, effective date and "Page n of N" on every page. jsPDF is loaded only
 * when someone downloads, so it adds nothing to page loads.
 */
@Injectable({ providedIn: 'root' })
export class DocumentPdfService {
  /** Builds the PDF. Separate from download() so tests can check the file itself. */
  async build(doc: DocumentContent): Promise<Blob> {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    pdf.setProperties({
      title: pdfText(`${doc.title} | ${BRAND}`),
      subject: pdfText(versionLine(doc)),
      author: pdfText(`${BRAND} Pvt Ltd`),
      creator: pdfText(BRAND)
    });
    new PdfWriter(pdf).write(doc);
    return pdf.output('blob');
  }

  /** Builds the PDF and saves it as NartureBelle-<Title>-v<version>.pdf. Resolves with the file name. */
  async download(doc: DocumentContent): Promise<string> {
    const blob = await this.build(doc);
    const name = documentFileName(doc);
    this.save(blob, name);
    return name;
  }

  /**
   * A link with `download`, clicked from script: Android Chrome saves to Downloads, and iPhone Safari (iOS 13+)
   * shows its download prompt and keeps the file in Files. The link is released a minute later, because
   * Safari reads the file after the click returns.
   */
  save(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}

/** Lays the document out page by page, then stamps the header and footer on each page. */
class PdfWriter {
  private y = CONTENT_TOP;

  constructor(private readonly pdf: JsPdf) {}

  write(doc: DocumentContent) {
    const pdf = this.pdf;
    pdf.setTextColor(...INK);
    this.text(doc.title, 20, 'bold', 0, 2);
    pdf.setTextColor(...MUTED);
    this.text(versionLine(doc), 10, 'normal', 0, 3);
    pdf.setDrawColor(200, 210, 204);
    pdf.line(MARGIN, this.y - 2, PAGE_W - MARGIN, this.y - 2);
    this.y += 4;
    pdf.setTextColor(...INK);

    for (const block of parseMarkdown(doc.body)) this.block(block);

    if (doc.signature) {
      this.ensure(30);
      this.y += 4;
      pdf.line(MARGIN, this.y - 4, PAGE_W - MARGIN, this.y - 4);
      this.text('Signature', 13, 'bold', 0, 1.5);
      for (const line of signatureLines(doc.signature)) this.text(line, 10.5, 'normal', 0, 1);
    }
    this.stamp(doc);
  }

  private block(block: Block) {
    switch (block.type) {
      case 'heading': {
        const size = block.level === 1 ? 16 : block.level === 2 ? 13 : 11.5;
        this.ensure(18); // keep a heading with the first lines under it
        this.y += 2;
        this.text(plainText(block.inlines), size, 'bold', 0, 1.5);
        break;
      }
      case 'paragraph':
        this.text(plainText(block.inlines), 10.5, styleOf(block.inlines), 0, 3);
        break;
      case 'list':
        block.items.forEach((item, i) => this.listItem(block.ordered ? `${i + 1}.` : '•', item));
        this.y += 2;
        break;
    }
  }

  private listItem(marker: string, inlines: Inline[]) {
    const size = 10.5;
    const indent = 7;
    const lineHeight = size * PT_TO_MM * 1.45;
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(size);
    const lines: string[] = this.pdf.splitTextToSize(pdfText(plainText(inlines)), TEXT_W - indent);
    lines.forEach((line, i) => {
      this.ensure(lineHeight);
      if (i === 0) this.pdf.text(pdfText(marker), MARGIN + 1.5, this.y);
      this.pdf.text(line, MARGIN + indent, this.y);
      this.y += lineHeight;
    });
    this.y += 1;
  }

  /** Wraps text to the page width and moves to a new page when needed. */
  private text(text: string, size: number, style: 'normal' | 'bold' | 'italic', indent: number, gapAfter: number) {
    const lineHeight = size * PT_TO_MM * 1.45;
    this.pdf.setFont('helvetica', style);
    this.pdf.setFontSize(size);
    const lines: string[] = this.pdf.splitTextToSize(pdfText(text), TEXT_W - indent);
    for (const line of lines) {
      this.ensure(lineHeight);
      this.pdf.text(line, MARGIN + indent, this.y);
      this.y += lineHeight;
    }
    this.y += gapAfter;
  }

  private ensure(height: number) {
    if (this.y + height > CONTENT_BOTTOM) {
      this.pdf.addPage();
      this.y = CONTENT_TOP;
    }
  }

  /** NartureBelle™ and the title at the top of every page; version, date and "Page n of N" at the bottom. */
  private stamp(doc: DocumentContent) {
    const pdf = this.pdf;
    const pages = pdf.getNumberOfPages();
    for (let n = 1; n <= pages; n++) {
      pdf.setPage(n);
      pdf.setDrawColor(200, 210, 204);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(46, 84, 64);
      pdf.text(pdfText(BRAND), MARGIN, 14);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(...MUTED);
      const title: string[] = pdf.splitTextToSize(pdfText(doc.title), TEXT_W - 40);
      pdf.text(title[0], PAGE_W - MARGIN, 14, { align: 'right' });
      pdf.line(MARGIN, 17, PAGE_W - MARGIN, 17);

      pdf.line(MARGIN, PAGE_H - 15, PAGE_W - MARGIN, PAGE_H - 15);
      pdf.text(pdfText(versionLine(doc)), MARGIN, PAGE_H - 10);
      pdf.text(`Page ${n} of ${pages}`, PAGE_W - MARGIN, PAGE_H - 10, { align: 'right' });
    }
    pdf.setTextColor(...INK);
  }
}

/** A paragraph that is all bold (or all italic) keeps that style in the PDF; mixed text prints plain. */
function styleOf(inlines: Inline[]): 'normal' | 'bold' | 'italic' {
  const words = inlines.filter(i => i.text.trim());
  if (words.length && words.every(i => i.bold)) return 'bold';
  if (words.length && words.every(i => i.italic)) return 'italic';
  return 'normal';
}
