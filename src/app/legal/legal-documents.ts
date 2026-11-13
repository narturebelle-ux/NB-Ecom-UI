/**
 * Every public document (F27-S2, BUG-18, owner decision 12 Nov): the "Terms & Privacy" hub at /legal, each
 * document's page at /legal/<slug>, its text and its PDF all come from this one list. Adding a document is one
 * entry here. The text lives in code, not in separate files (owner, 12 Nov); `body` uses Markdown for headings
 * and lists, and the page and the PDF are both made from it.
 *
 * These are the public, unsigned versions. A person's own signed copies stay private under "My documents"
 * after sign-in (F27-S3 to S5). IDs match legal-drafts/README.md.
 */
export type LegalSection = 'mothers' | 'payments' | 'privacy' | 'grievances' | 'general' | 'providers' | 'team';

export interface LegalDocumentInfo {
  /** P1–P8, M1–M7, PR0–PR7, C1–C4 (legal-drafts/README.md). */
  id: string;
  /** Route /legal/<slug>. */
  slug: string;
  title: string;
  section: LegalSection;
  version: string;
  /** ISO date. */
  effectiveDate: string;
  /** The document's text (Markdown). */
  body: string;
  /** Older short route that redirects here, e.g. /terms. */
  shortPath?: string;
}

/**
 * Until the owner publishes lawyer-approved text, every document shows only this notice (no draft text).
 * Version 0, so the first approved text can be version 1.
 */
const BEING_FINALISED = {
  version: '0',
  effectiveDate: '2026-11-12',
  body: 'This document is being finalised and will be published here soon. For questions, contact us using the details on this page.'
};

export const LEGAL_SECTIONS: { key: LegalSection; title: string }[] = [
  { key: 'mothers', title: 'For mothers' },
  { key: 'payments', title: 'Payments and refunds' },
  { key: 'privacy', title: 'Privacy' },
  { key: 'grievances', title: 'Grievances and contact' },
  { key: 'general', title: 'General' },
  { key: 'providers', title: 'For providers' },
  { key: 'team', title: 'For employees and coordinators' }
];

export const LEGAL_DOCUMENTS: LegalDocumentInfo[] = [
  { id: 'M1', slug: 'care-plan-agreement', title: 'Care Plan Agreement', section: 'mothers', ...BEING_FINALISED },
  { id: 'M2', slug: 'online-consultation-consent', title: 'Consent to Online Consultations', section: 'mothers', ...BEING_FINALISED },
  { id: 'M3', slug: 'health-details-consent', title: 'Health Details Consent', section: 'mothers', ...BEING_FINALISED },
  { id: 'M4', slug: 'records-storage-consent', title: 'Health Records Storage Consent', section: 'mothers', ...BEING_FINALISED },
  { id: 'M5', slug: 'product-recommendation-disclosure', title: 'Product Recommendation Disclosure', section: 'mothers', ...BEING_FINALISED },
  { id: 'M6', slug: 'emergency-and-limits', title: 'Emergency and Limits of Service', section: 'mothers', ...BEING_FINALISED },
  { id: 'M7', slug: 'child-data-consent', title: 'Child Data Consent', section: 'mothers', ...BEING_FINALISED },

  { id: 'P3', slug: 'refund-policy', title: 'Refund and Cancellation Policy', section: 'payments', ...BEING_FINALISED, shortPath: 'refund-policy' },
  { id: 'P5', slug: 'shipping-returns', title: 'Shipping and Returns', section: 'payments', ...BEING_FINALISED, shortPath: 'shipping-returns' },

  { id: 'P2', slug: 'privacy', title: 'Privacy Notice', section: 'privacy', ...BEING_FINALISED, shortPath: 'privacy' },
  { id: 'P7', slug: 'cookies', title: 'Cookie Notice', section: 'privacy', ...BEING_FINALISED },

  { id: 'P6', slug: 'grievance', title: 'Grievance Redressal', section: 'grievances', ...BEING_FINALISED, shortPath: 'grievance' },
  { id: 'P8', slug: 'contact', title: 'Contact and Company Details', section: 'grievances', ...BEING_FINALISED, shortPath: 'contact' },

  { id: 'P1', slug: 'terms', title: 'Terms of Service', section: 'general', ...BEING_FINALISED, shortPath: 'terms' },
  { id: 'P4', slug: 'medical-disclaimer', title: 'Medical Disclaimer and Emergencies', section: 'general', ...BEING_FINALISED, shortPath: 'medical-disclaimer' },

  { id: 'PR0', slug: 'provider-agreement', title: 'Provider Services Agreement', section: 'providers', ...BEING_FINALISED },
  { id: 'PR7', slug: 'provider-data-processing', title: 'Data Processing Terms', section: 'providers', ...BEING_FINALISED },
  { id: 'PR1', slug: 'provider-annex-gynecologist', title: 'Annex: Gynecologist / Obstetrician', section: 'providers', ...BEING_FINALISED },
  { id: 'PR2', slug: 'provider-annex-pediatrician', title: 'Annex: Pediatrician', section: 'providers', ...BEING_FINALISED },
  { id: 'PR3', slug: 'provider-annex-nutritionist', title: 'Annex: Nutritionist / Dietitian', section: 'providers', ...BEING_FINALISED },
  { id: 'PR4', slug: 'provider-annex-mental-wellness', title: 'Annex: Mental Wellness', section: 'providers', ...BEING_FINALISED },
  { id: 'PR5', slug: 'provider-annex-lactation', title: 'Annex: Lactation Consultant', section: 'providers', ...BEING_FINALISED },
  { id: 'PR6', slug: 'provider-annex-physiotherapist', title: 'Annex: Physiotherapist', section: 'providers', ...BEING_FINALISED },

  { id: 'C1', slug: 'coordinator-engagement-agreement', title: 'Engagement Agreement', section: 'team', ...BEING_FINALISED },
  { id: 'C2', slug: 'coordinator-confidentiality', title: 'Confidentiality and Data Access Policy', section: 'team', ...BEING_FINALISED },
  { id: 'C3', slug: 'coordinator-code-of-conduct', title: 'Code of Conduct', section: 'team', ...BEING_FINALISED },
  { id: 'C4', slug: 'coordinator-escalation', title: 'Escalation Procedure', section: 'team', ...BEING_FINALISED }
];

export function legalDocument(slug: string): LegalDocumentInfo | undefined {
  return LEGAL_DOCUMENTS.find(d => d.slug === slug);
}

export const LEGAL_HUB_TITLE = 'Terms & Privacy';

/** The footer's direct links (the most used ones); everything else is one click away in the hub. */
export const FOOTER_LEGAL_LINKS: { slug: string; label: string }[] = [
  { slug: 'terms', label: 'Terms of Service' },
  { slug: 'privacy', label: 'Privacy Notice' },
  { slug: 'refund-policy', label: 'Refunds' },
  { slug: 'grievance', label: 'Grievance Officer' },
  { slug: 'contact', label: 'Contact' }
];

/**
 * The support contacts already shown in the footer. BUG-21 (the real support email and phone) is still open,
 * so these stay as they are until the owner gives new ones; don't add others.
 */
export const SUPPORT_CONTACTS = {
  whatsapp: '+91 99880 12345',
  email: 'support-care@narturebelle.com'
};

export const COMPANY_LEGAL_NAME = 'NartureBelle™ Pvt Ltd';
