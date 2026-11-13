import { Component, computed, inject, input, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Inline, parseMarkdown } from './markdown';
import { DocumentContent, DocumentPdfService, signatureLines, versionLine } from './document-pdf.service';

/**
 * Shows a document (title, version, effective date, Markdown body, optional signature) with a "Download PDF"
 * button that saves the same text. Used by the footer policies now and by the onboarding documents later
 * (F27-S3 to S5), so it knows nothing about where the document came from.
 */
@Component({
  selector: 'app-document-view',
  standalone: true,
  imports: [NgTemplateOutlet, RouterLink, MatIconModule],
  template: `
    @let d = doc();
    <article class="document">
      <header class="doc-head">
        <h1>{{ d.title }}</h1>
        <p class="doc-meta">{{ meta() }}</p>
        <button type="button" class="btn btn-outline btn-sm pdf-btn" [disabled]="busy()" (click)="downloadPdf()">
          <mat-icon class="icon-sm">picture_as_pdf</mat-icon> {{ busy() ? 'Preparing PDF…' : 'Download PDF' }}
        </button>
        @if (error()) { <p class="doc-error" role="alert">{{ error() }}</p> }
      </header>

      <div class="doc-body">
        @for (block of blocks(); track $index) {
          @switch (block.type) {
            @case ('heading') {
              @switch (block.level) {
                @case (1) { <h2><ng-container [ngTemplateOutlet]="inline" [ngTemplateOutletContext]="{ $implicit: block.inlines }" /></h2> }
                @case (2) { <h3><ng-container [ngTemplateOutlet]="inline" [ngTemplateOutletContext]="{ $implicit: block.inlines }" /></h3> }
                @default { <h4><ng-container [ngTemplateOutlet]="inline" [ngTemplateOutletContext]="{ $implicit: block.inlines }" /></h4> }
              }
            }
            @case ('paragraph') { <p><ng-container [ngTemplateOutlet]="inline" [ngTemplateOutletContext]="{ $implicit: block.inlines }" /></p> }
            @case ('list') {
              @if (block.ordered) {
                <ol>@for (item of block.items; track $index) { <li><ng-container [ngTemplateOutlet]="inline" [ngTemplateOutletContext]="{ $implicit: item }" /></li> }</ol>
              } @else {
                <ul>@for (item of block.items; track $index) { <li><ng-container [ngTemplateOutlet]="inline" [ngTemplateOutletContext]="{ $implicit: item }" /></li> }</ul>
              }
            }
          }
        }
      </div>

      @if (d.signature; as signature) {
        <section class="doc-signature">
          <h3>Signature</h3>
          @for (line of signatureText(signature); track $index) { <p>{{ line }}</p> }
        </section>
      }
    </article>

    <ng-template #inline let-inlines>
      @for (part of asInlines(inlines); track $index) {
        @if (part.href) {
          @if (part.href.startsWith('/')) { <a [routerLink]="part.href">{{ part.text }}</a> }
          @else { <a [href]="part.href" rel="noopener" target="_blank">{{ part.text }}</a> }
        } @else if (part.bold) { <strong>{{ part.text }}</strong> }
        @else if (part.italic) { <em>{{ part.text }}</em> }
        @else { {{ part.text }} }
      }
    </ng-template>
  `,
  styles: [`
    :host { display: block; }
    .document { color: var(--text-primary); }
    .doc-head { display: flex; flex-direction: column; align-items: flex-start; gap: 0.5rem; padding-bottom: 1.25rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-light); }
    h1 { font-family: var(--font-serif); font-size: clamp(1.7rem, 6vw, 2.4rem); line-height: 1.15; margin: 0; color: var(--sage-900); }
    .doc-meta { margin: 0; color: var(--text-muted); font-size: 0.9rem; }
    .pdf-btn { min-height: 44px; margin-top: 0.25rem; }
    .doc-error { margin: 0; color: var(--danger-text); font-size: 0.9rem; }
    .doc-body { font-size: 1rem; line-height: 1.7; overflow-wrap: anywhere; }
    .doc-body h2, .doc-body h3, .doc-body h4 { font-family: var(--font-serif); color: var(--sage-900); margin: 1.75rem 0 0.6rem; line-height: 1.3; }
    .doc-body h2 { font-size: 1.4rem; }
    .doc-body h3 { font-size: 1.2rem; }
    .doc-body h4 { font-size: 1.05rem; }
    .doc-body p { margin: 0 0 1rem; color: var(--text-secondary); }
    .doc-body ul, .doc-body ol { margin: 0 0 1rem; padding-left: 1.4rem; color: var(--text-secondary); }
    .doc-body li { margin-bottom: 0.4rem; }
    .doc-body a { color: var(--trust-700); text-decoration: underline; text-underline-offset: 2px; }
    .doc-signature { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--border-light); }
    .doc-signature h3 { margin: 0 0 0.5rem; font-size: 1.1rem; color: var(--sage-900); }
    .doc-signature p { margin: 0 0 0.25rem; color: var(--text-secondary); }
  `]
})
export class DocumentViewComponent {
  private pdf = inject(DocumentPdfService);

  doc = input.required<DocumentContent>();
  blocks = computed(() => parseMarkdown(this.doc().body));
  meta = computed(() => versionLine(this.doc()));
  busy = signal(false);
  error = signal<string | null>(null);

  signatureText = signatureLines;
  asInlines(value: unknown): Inline[] { return value as Inline[]; }

  async downloadPdf() {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.pdf.download(this.doc());
    } catch {
      this.error.set('We couldn’t make the PDF. Please try again.');
    } finally {
      this.busy.set(false);
    }
  }
}
