import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { DocumentViewComponent } from '../documents/document-view.component';
import { DocumentContent } from '../documents/document-pdf.service';
import { LegalDocumentService } from './legal-document.service';
import { COMPANY_LEGAL_NAME, LEGAL_HUB_TITLE, legalDocument } from './legal-documents';

/** One public document at /legal/<slug>: readable without signing in, with its PDF. */
@Component({
  selector: 'app-legal-page',
  standalone: true,
  imports: [RouterLink, MatIconModule, DocumentViewComponent],
  template: `
    <div class="legal-page">
      <div class="container narrow">
        <a routerLink="/legal" class="back"><mat-icon class="icon-sm">arrow_back</mat-icon> {{ hubTitle }}</a>
        <div class="card-surface">
          @if (doc(); as d) {
            <app-document-view [doc]="d" />
          } @else if (failed()) {
            <h1>{{ title }}</h1>
            <p class="muted">We couldn’t load this document right now. Please check your connection and try again.</p>
            <button type="button" class="btn btn-outline btn-sm" (click)="load()">Try again</button>
          } @else {
            <h1>{{ title }}</h1>
            <p class="muted">Loading…</p>
          }
        </div>
        <p class="company">{{ company }}</p>
      </div>
    </div>
  `,
  styles: [`
    .legal-page { padding: 1.5rem 0 3rem; }
    .back { display: inline-flex; align-items: center; gap: 0.3rem; min-height: 44px; color: var(--trust-700); text-decoration: none; font-weight: 600; }
    .card-surface { background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: clamp(1.25rem, 4vw, 2.5rem); box-shadow: var(--shadow-sm); }
    h1 { font-family: var(--font-serif); color: var(--sage-900); margin: 0 0 0.75rem; }
    .muted { color: var(--text-muted); }
    .company { text-align: center; color: var(--text-muted); font-size: 0.85rem; margin-top: 1.25rem; }
  `]
})
export class LegalPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private documents = inject(LegalDocumentService);

  readonly slug: string = this.route.snapshot.data['slug'];
  readonly title = legalDocument(this.slug)?.title ?? '';
  readonly hubTitle = LEGAL_HUB_TITLE;
  readonly company = COMPANY_LEGAL_NAME;
  doc = signal<DocumentContent | null>(null);
  failed = signal(false);

  ngOnInit() { this.load(); }

  load() {
    this.failed.set(false);
    this.documents.get(this.slug).subscribe({
      next: d => this.doc.set(d),
      error: () => this.failed.set(true)
    });
  }
}
