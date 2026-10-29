import { JourneyStatus } from './maternal.models';

/**
 * Post-signup onboarding (product-owner flow, 2026-10-29):
 * intake → recommended plan → payment → onboarding call → signed documents → onboarded.
 *
 * Stage + EDD persist to the real Journey API and payment to the real Orders API. The rest
 * (extra intake answers, call booking, document signing, completion) has no API yet and is
 * kept client-side per user until the onboarding endpoints requested in API_Integration.md
 * §18 exist.
 */

export type OnboardingStep = 'intake' | 'plan' | 'call' | 'documents' | 'welcome' | 'done';

export const ONBOARDING_STEPS: { key: Exclude<OnboardingStep, 'done'>; label: string }[] = [
  { key: 'intake', label: 'Your details' },
  { key: 'plan', label: 'Your plan' },
  { key: 'call', label: 'Onboarding call' },
  { key: 'documents', label: 'Documents' },
  { key: 'welcome', label: 'Welcome' }
];

export type RiskFactor =
  | 'HIGH_BLOOD_PRESSURE'
  | 'DIABETES'
  | 'THYROID'
  | 'PREVIOUS_C_SECTION'
  | 'PREVIOUS_COMPLICATIONS';

export type SupportNeed =
  | 'CHECKUPS'
  | 'NUTRITION'
  | 'BREASTFEEDING'
  | 'POSTPARTUM_RECOVERY'
  | 'EMOTIONAL_WELLBEING'
  | 'BABY_CARE';

export type ConsultationMode = 'VIRTUAL' | 'IN_PERSON' | 'EITHER';

export interface IntakeAnswers {
  stage: JourneyStatus;
  expectedDeliveryDate: string | null;
  firstPregnancy: boolean | null;
  multiples: boolean;
  riskFactors: RiskFactor[];
  supportNeeds: SupportNeed[];
  city: string;
  language: string;
  consultationMode: ConsultationMode;
  phone: string;
  notes: string;
}

export interface OnboardingCall {
  startsAt: string;
  phone: string;
}

export interface SignedDocuments {
  signedName: string;
  signedAt: string;
  documentIds: string[];
}

export interface OnboardingState {
  intake?: IntakeAnswers & { savedAt: string };
  recommendedPlanCode?: string;
  paidOrderId?: number;
  call?: OnboardingCall;
  documents?: SignedDocuments;
  onboardedAt?: string;
}

export const RISK_FACTOR_LABELS: Record<RiskFactor, string> = {
  HIGH_BLOOD_PRESSURE: 'High blood pressure',
  DIABETES: 'Diabetes (including gestational)',
  THYROID: 'Thyroid condition',
  PREVIOUS_C_SECTION: 'Previous C-section',
  PREVIOUS_COMPLICATIONS: 'Complications in a previous pregnancy'
};

export const SUPPORT_NEED_LABELS: Record<SupportNeed, string> = {
  CHECKUPS: 'Regular check-ups',
  NUTRITION: 'Nutrition guidance',
  BREASTFEEDING: 'Breastfeeding support',
  POSTPARTUM_RECOVERY: 'Postpartum recovery',
  EMOTIONAL_WELLBEING: 'Emotional wellbeing',
  BABY_CARE: 'Care for my baby'
};

/** Onboarding documents — DRAFT placeholder text pending legal review, same as the consent documents. */
export const ONBOARDING_DOCUMENTS: { id: string; title: string; summary: string; body: string }[] = [
  {
    id: 'care-agreement',
    title: 'Care Coordination Agreement',
    summary: 'What your plan includes, how sessions are booked, and what we expect of each other.',
    body: 'DRAFT — pending legal review. NartureBelle coordinates your care with verified professionals under the plan you chose. Sessions are booked through the app and count against your plan when completed. You can cancel or reschedule a booked session before it starts. NartureBelle does not provide emergency care.'
  },
  {
    id: 'telehealth-consent',
    title: 'Virtual Consultation Consent',
    summary: 'Your agreement to receive care by video or phone where appropriate.',
    body: 'DRAFT — pending legal review. Some sessions may take place by video or phone. Virtual consultations have limits — your professional may ask you to attend in person or seek urgent care when needed. You can ask for an in-person alternative where one is available.'
  },
  {
    id: 'emergency-acknowledgement',
    title: 'Emergency Care Acknowledgement',
    summary: 'Confirms you understand NartureBelle is not an emergency service.',
    // Deliberately generic: the roadmap forbids hard-coding clinical emergency wording (it must be
    // reviewed, versioned config), so no symptom list appears here.
    body: 'DRAFT — pending legal and clinical review. NartureBelle is not an emergency service. In a medical emergency, contact your local emergency services or go to the nearest hospital immediately. Do not wait for a NartureBelle session.'
  }
];
