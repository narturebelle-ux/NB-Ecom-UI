import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { DocumentContent } from '../documents/document-pdf.service';
import { SUPPORT_CONTACTS, legalDocument } from './legal-documents';

/**
 * Where the public policies' text comes from. Today: the list in legal-documents.ts, in code. Later (F27-S2
 * item 1) this switches to the Care API's versioned documents; pages only call get(), which already returns
 * an Observable, so nothing else changes.
 */
@Injectable({ providedIn: 'root' })
export class LegalDocumentService {
  get(slug: string): Observable<DocumentContent> {
    const doc = legalDocument(slug);
    if (!doc) return throwError(() => new Error(`Unknown legal document: ${slug}`));
    return of({
      title: doc.title,
      version: doc.version,
      effectiveDate: doc.effectiveDate,
      // Every policy ends with how to reach us, so the page and its PDF both carry it.
      body: `${doc.body.trim()}\n\n${contactSection()}`
    });
  }
}

function contactSection(): string {
  return [
    '## Contact us',
    '',
    `- WhatsApp Care Desk: ${SUPPORT_CONTACTS.whatsapp}`,
    `- Care Team: [${SUPPORT_CONTACTS.email}](mailto:${SUPPORT_CONTACTS.email})`
  ].join('\n');
}
