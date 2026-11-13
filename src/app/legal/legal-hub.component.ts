import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { DocumentPdfService } from '../documents/document-pdf.service';
import { LegalDocumentService } from './legal-document.service';
import { COMPANY_LEGAL_NAME, LEGAL_DOCUMENTS, LEGAL_HUB_TITLE, LEGAL_SECTIONS, LegalDocumentInfo } from './legal-documents';

/** "Terms & Privacy" at /legal: every public document, grouped by who it's for, each with View and Download PDF. */
@Component({
  selector: 'app-legal-hub',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  template: `
    <div class="legal-hub">
      <div class="container narrow">
        <header class="hub-head">
          <h1>{{ hubTitle }}</h1>
          <p>Every policy and agreement for {{ company }}, grouped by who it’s for. Open any document to read it, or download it as a PDF.</p>
        </header>

        @for (section of sections; track section.key) {
          <section class="hub-section" [attr.data-section]="section.key">
            <h2>{{ section.title }}</h2>
            <ul class="doc-list">
              @for (d of documentsIn(section.key); track d.slug) {
                <li class="doc-row" [attr.data-slug]="d.slug">
                  <span class="doc-title">{{ d.title }}</span>
                  <span class="doc-actions">
                    <a class="btn btn-outline btn-sm" [routerLink]="['/legal', d.slug]">View</a>
                    <button type="button" class="btn btn-link pdf-link" [disabled]="busy() === d.slug" (click)="downloadPdf(d)">
                      <mat-icon class="icon-sm">picture_as_pdf</mat-icon> {{ busy() === d.slug ? 'Preparing…' : 'Download PDF' }}
                    </button>
                  </span>
                  @if (failed() === d.slug) { <span class="doc-error" role="alert">We couldn’t make that PDF. Please try again.</span> }
                </li>
              }
            </ul>
          </section>
        }
      </div>
    </div>
  `,
  styles: [`
    .legal-hub { padding: 1.5rem 0 3rem; }
    .hub-head h1 { font-family: var(--font-serif); color: var(--sage-900); font-size: clamp(1.8rem, 6vw, 2.5rem); margin: 0 0 0.5rem; }
    .hub-head p { color: var(--text-secondary); margin: 0 0 1.5rem; }
    .hub-section { background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 1rem clamp(1rem, 4vw, 1.5rem); margin-bottom: 1rem; box-shadow: var(--shadow-xs); }
    .hub-section h2 { font-family: var(--font-serif); font-size: 1.2rem; color: var(--sage-900); margin: 0.25rem 0 0.5rem; }
    .doc-list { list-style: none; margin: 0; padding: 0; }
    .doc-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.5rem 1rem; padding: 0.75rem 0; border-top: 1px solid var(--border-light); }
    .doc-row:first-child { border-top: none; }
    .doc-title { flex: 1 1 14rem; color: var(--text-primary); font-weight: 600; }
    .doc-actions { display: flex; align-items: center; gap: 0.75rem; }
    .doc-actions .btn { min-height: 44px; }
    .pdf-link { display: inline-flex; align-items: center; gap: 0.25rem; }
    .doc-error { flex-basis: 100%; color: var(--danger-text); font-size: 0.85rem; }
  `]
})
export class LegalHubComponent {
  private documents = inject(LegalDocumentService);
  private pdf = inject(DocumentPdfService);

  readonly hubTitle = LEGAL_HUB_TITLE;
  readonly company = COMPANY_LEGAL_NAME;
  readonly sections = LEGAL_SECTIONS;
  busy = signal<string | null>(null);
  failed = signal<string | null>(null);

  documentsIn(section: string): LegalDocumentInfo[] {
    return LEGAL_DOCUMENTS.filter(d => d.section === section);
  }

  /** Downloads the same text the document's page shows. */
  async downloadPdf(d: LegalDocumentInfo) {
    this.busy.set(d.slug);
    this.failed.set(null);
    try {
      await this.pdf.download(await firstValueFrom(this.documents.get(d.slug)));
    } catch {
      this.failed.set(d.slug);
    } finally {
      this.busy.set(null);
    }
  }
}
