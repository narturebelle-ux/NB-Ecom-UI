import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { DocumentPdfService, documentFileName, pdfText } from '../documents/document-pdf.service';
import { parseInline, parseMarkdown, splitFrontMatter } from '../documents/markdown';
import { FooterComponent } from '../components/footer/footer.component';
import { ApiService } from '../services/api.service';
import { CommerceService } from '../services/commerce.service';
import { FeatureToggleService } from '../services/feature-toggle.service';
import { LegalHubComponent } from './legal-hub.component';
import { FOOTER_LEGAL_LINKS, LEGAL_DOCUMENTS, LEGAL_SECTIONS } from './legal-documents';

async function pdfBytes(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let s = '';
  bytes.forEach(b => s += String.fromCharCode(b));
  return s;
}

const settle = async () => { for (let i = 0; i < 10; i++) await new Promise(r => setTimeout(r, 0)); };

describe('Terms & Privacy (F27-S2)', () => {
  describe('the registry', () => {
    it('has the 27 documents, each once, in the owner\'s sections', () => {
      expect(LEGAL_DOCUMENTS.length).toBe(27);
      expect(new Set(LEGAL_DOCUMENTS.map(d => d.slug)).size).toBe(27);
      expect(new Set(LEGAL_DOCUMENTS.map(d => d.id)).size).toBe(27);
      const count = (s: string) => LEGAL_DOCUMENTS.filter(d => d.section === s).length;
      expect(LEGAL_SECTIONS.map(s => [s.key, count(s.key)])).toEqual([
        ['mothers', 7], ['payments', 2], ['privacy', 2], ['grievances', 2], ['general', 2], ['providers', 8], ['team', 4]
      ]);
      const ids = LEGAL_DOCUMENTS.map(d => d.id).sort();
      const expected = [
        ...[1, 2, 3, 4, 5, 6, 7, 8].map(n => `P${n}`), ...[1, 2, 3, 4, 5, 6, 7].map(n => `M${n}`),
        ...[0, 1, 2, 3, 4, 5, 6, 7].map(n => `PR${n}`), ...[1, 2, 3, 4].map(n => `C${n}`)
      ].sort();
      expect(ids).toEqual(expected);
    });

    it('names PDFs like NartureBelle-Terms-of-Service-v1.pdf', () => {
      expect(documentFileName({ title: 'Terms of Service', version: '1' })).toBe('NartureBelle-Terms-of-Service-v1.pdf');
      expect(documentFileName({ title: 'Annex: Gynecologist / Obstetrician', version: '0' }))
        .toBe('NartureBelle-Annex-Gynecologist-Obstetrician-v0.pdf');
    });
  });

  describe('routes', () => {
    let harness: RouterTestingHarness;

    beforeEach(async () => {
      TestBed.configureTestingModule({ providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()] });
      harness = await RouterTestingHarness.create();
    });

    it('need no sign-in and have ™ in every title', () => {
      const legal = routes.filter(r => r.path === 'legal' || r.path?.startsWith('legal/'));
      expect(legal.length).toBe(28);
      for (const r of legal) {
        expect(r.canActivate).toBeUndefined();
        expect(r.canMatch).toBeUndefined();
        expect(String(r.title)).toMatch(/ \| NartureBelle™$/);
      }
      expect(routes.find(r => r.path === 'legal')!.title).toBe('Terms & Privacy | NartureBelle™');
    });

    it('render every document page with its version, date and PDF button', async () => {
      for (const d of LEGAL_DOCUMENTS) {
        await harness.navigateByUrl(`/legal/${d.slug}`);
        await settle();
        harness.detectChanges();
        const el: HTMLElement = harness.routeNativeElement!;
        expect(el.querySelector('h1')?.textContent?.trim()).withContext(d.slug).toBe(d.title);
        expect(el.textContent).toContain('Version 0 · Effective 12 November 2026');
        expect(el.textContent).toContain('being finalised');
        expect(el.textContent).toContain('support-care@narturebelle.com');
        expect(el.querySelector('.pdf-btn')?.textContent).toContain('Download PDF');
        expect(document.title).toBe(`${d.title} | NartureBelle™`);
      }
    });

    it('redirect the short footer paths to the matching /legal page', async () => {
      const shorts = LEGAL_DOCUMENTS.filter(d => d.shortPath);
      expect(shorts.map(d => d.shortPath).sort()).toEqual(
        ['contact', 'grievance', 'medical-disclaimer', 'privacy', 'refund-policy', 'shipping-returns', 'terms']);
      for (const d of shorts) {
        await harness.navigateByUrl(`/${d.shortPath}`);
        expect(TestBed.inject(Router).url).toBe(`/legal/${d.slug}`);
      }
    });
  });

  describe('the hub', () => {
    let saved: string[];

    beforeEach(() => {
      TestBed.configureTestingModule({ imports: [LegalHubComponent], providers: [provideRouter([])] });
      saved = [];
      spyOn(TestBed.inject(DocumentPdfService), 'save').and.callFake((_blob: Blob, name: string) => { saved.push(name); });
    });

    it('lists all 27 documents in the right sections, each with View and Download PDF', () => {
      const fixture = TestBed.createComponent(LegalHubComponent);
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelectorAll('.doc-row').length).toBe(27);
      for (const d of LEGAL_DOCUMENTS) {
        const row = el.querySelector(`[data-section="${d.section}"] [data-slug="${d.slug}"]`);
        expect(row).withContext(d.slug).not.toBeNull();
        expect(row!.querySelector('a')!.getAttribute('href')).toBe(`/legal/${d.slug}`);
        expect(row!.textContent).toContain('Download PDF');
      }
      expect([...el.querySelectorAll('h2')].map(h => h.textContent?.trim())).toEqual(LEGAL_SECTIONS.map(s => s.title));
    });

    it('downloads a PDF for every document', async () => {
      const hub = TestBed.createComponent(LegalHubComponent).componentInstance;
      for (const d of LEGAL_DOCUMENTS) {
        await hub.downloadPdf(d);
        expect(hub.failed()).withContext(d.slug).toBeNull();
      }
      expect(saved).toEqual(LEGAL_DOCUMENTS.map(d => documentFileName({ title: d.title, version: '0' })));
    });

    it('keeps every document\'s text in code, with only the neutral notice for now', () => {
      for (const d of LEGAL_DOCUMENTS) {
        expect(d.body).withContext(d.slug).toBe(
          'This document is being finalised and will be published here soon. For questions, contact us using the details on this page.');
        expect(d.body).not.toMatch(/\[\[|LAWYER|MEDICAL REVIEWER|OWNER DECISION/);
        expect(`${d.version}|${d.effectiveDate}`).toBe('0|2026-11-12');
      }
    });
  });

  describe('the PDF', () => {
    it('has the brand, title, version, date, page numbers, text and signature', async () => {
      const blob = await TestBed.inject(DocumentPdfService).build({
        title: 'Terms of Service', version: '1', effectiveDate: '2026-11-12',
        body: '## Who we are\n\nWe coordinate care.\n\n- Item one\n- Item two',
        signature: { typedName: 'Asha Rao', signedAt: '2026-11-12T10:15:00Z' }
      });
      expect(blob.type).toBe('application/pdf');
      const pdf = await pdfBytes(blob);
      expect(pdf.startsWith('%PDF-')).toBeTrue();
      expect(pdf).toContain('(NartureBelle\x99) Tj'); // ™ in the PDF font's encoding
      expect(pdf).toContain('(Terms of Service) Tj');
      expect(pdf).toContain('Version 1 \xb7 Effective 12 November 2026');
      expect(pdf).toContain('(Page 1 of 1) Tj');
      expect(pdf).toContain('(We coordinate care.) Tj');
      expect(pdf).toContain('(Item two) Tj');
      expect(pdf).toContain('Asha Rao');
      expect(pdf).toContain('3:45 pm IST');
    });

    it('numbers every page of a long document', async () => {
      const body = Array.from({ length: 120 }, (_, i) => `Paragraph ${i + 1} of a long agreement.`).join('\n\n');
      const pdf = await pdfBytes(await TestBed.inject(DocumentPdfService).build({ title: 'Long', version: '1', effectiveDate: '2026-11-12', body }));
      const pages = /\(Page 1 of (\d+)\)/.exec(pdf)?.[1];
      expect(Number(pages)).toBeGreaterThan(1);
      expect(pdf).toContain(`(Page ${pages} of ${pages}) Tj`);
    });

    it('keeps text the PDF fonts can\'t print from garbling the line', () => {
      expect(pdfText('Fee ₹500 — NartureBelle™ ’ok’')).toBe('Fee Rs. 500 — NartureBelle™ ’ok’');
      expect(pdfText('नमस्ते a')).toBe('?????? a');
    });
  });

  describe('Markdown', () => {
    it('reads front matter, headings, lists and safe links only', () => {
      const { meta, body } = splitFrontMatter('---\ntitle: Annex: Pediatrician\nversion: 2\n---\n# Hi\n');
      expect(meta).toEqual({ title: 'Annex: Pediatrician', version: '2' });
      expect(parseMarkdown(body)[0]).toEqual({ type: 'heading', level: 1, inlines: [{ text: 'Hi' }] });
      expect(parseMarkdown('1. a\n2. b')[0]).toEqual({ type: 'list', ordered: true, items: [[{ text: 'a' }], [{ text: 'b' }]] });
      expect(parseInline('[x](javascript:alert)')).toEqual([{ text: 'x' }]);
      expect(parseInline('[x](javascript:alert(1)) [y](//evil.test)').some(part => part.href)).toBeFalse();
      expect(parseInline('see [terms](/legal/terms) **now**')).toEqual(
        [{ text: 'see ' }, { text: 'terms', href: '/legal/terms' }, { text: ' ' }, { text: 'now', bold: true }]);
    });
  });

  describe('the footer', () => {
    it('links the hub and the most used documents, with no "#" links', () => {
      TestBed.configureTestingModule({
        imports: [FooterComponent],
        providers: [
          provideRouter([]),
          { provide: ApiService, useValue: { currentUser: signal(null) } },
          { provide: CommerceService, useValue: { canShareIdeas: () => false } },
          { provide: FeatureToggleService, useValue: { isEnabled: () => false, enabled: () => false } }
        ]
      });
      const fixture = TestBed.createComponent(FooterComponent);
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      const hrefs = [...el.querySelectorAll('a')].map(a => a.getAttribute('href'));
      expect(hrefs).not.toContain('#');
      expect(hrefs.filter(h => !h)).toEqual([]);
      const legal = [...el.querySelectorAll('.legal-anchors a')].map(a => [a.getAttribute('href'), a.textContent?.trim()]);
      expect(legal).toEqual([
        ['/legal', 'Terms & Privacy'],
        ...FOOTER_LEGAL_LINKS.map(l => [`/legal/${l.slug}`, l.label])
      ]);
      expect(legal.map(l => l[1])).toContain('Grievance Officer');
      expect(el.textContent).toContain('NartureBelle™ Pvt Ltd');
      expect(el.textContent).not.toContain('admin-info-team');
    });
  });
});

