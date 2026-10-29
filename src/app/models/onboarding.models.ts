import { JourneyStatus } from './maternal.models';

/**
 * Post-signup onboarding (product-owner flow, 2026-10-29):
 * intake → recommended plan → payment → onboarding call → signed documents → onboarded.
 *
 * Stage + EDD persist to the Journey API, the other intake answers and the call booking to the
 * onboarding API (Part A, UI_INTEGRATION_GUIDE.md §11), payment to the Orders API. Document
 * signing and completion stay client-side until onboarding Part B ships.
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

// --- Server shapes (UI_INTEGRATION_GUIDE.md §11, onboarding Part A) ---

export interface ServerIntake {
  id: number;
  firstPregnancy: boolean | null;
  multiples: boolean | null;
  riskFactors: RiskFactor[];
  supportWanted: string[];
  city: string | null;
  language: string | null;
  preferredModality: 'VIRTUAL' | 'PHYSICAL' | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServerOnboardingCall {
  id: number;
  slotId: number;
  scheduledStart: string;
  scheduledEnd: string;
  createdAt: string;
}

export interface ServerOnboardingStatus {
  intake: ServerIntake | null;
  call: ServerOnboardingCall | null;
  /** createdAt of the user's most recent callback request, or null. */
  callbackRequestedAt?: string | null;
  /** Always false until the API ships onboarding Part B (documents/sign/complete). */
  documentsSigned: boolean;
  completedAt: string | null;
}

export interface OnboardingCallSlot {
  id: number;
  startAt: string;
  endAt: string;
  status: string;
}

export interface SignedDocuments {
  signedName: string;
  signedAt: string;
  documentIds: string[];
}

export interface OnboardingState {
  /** From the server (GET /me/onboarding + the active Journey) — never persisted in the browser. */
  intake?: IntakeAnswers & { savedAt: string };
  /** From the server (GET /me/onboarding). */
  call?: OnboardingCall;
  /** From the server (callbackRequestedAt): the user asked the care team to call them instead of booking a slot. */
  callRequested?: boolean;
  recommendedPlanCode?: string;
  paidOrderId?: number;
  /** Local until onboarding Part B ships. */
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
