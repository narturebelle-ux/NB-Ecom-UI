import { JourneyStatus } from './maternal.models';

/**
 * Post-signup onboarding (product-owner flow, 2026-10-29):
 * intake → recommended plan → payment → onboarding call → signed documents → onboarded.
 *
 * Stage + EDD persist to the Journey API, everything else to the onboarding API
 * (UI_INTEGRATION_GUIDE.md §11: intake + call in Part A, documents + completion in Part B),
 * payment to the Orders API. Only the plan recommendation is computed client-side.
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
  /** True once every active onboarding document is signed by this user (vacuously true if none). */
  documentsSigned: boolean;
  completedAt: string | null;
}

export interface OnboardingCallSlot {
  id: number;
  startAt: string;
  endAt: string;
  status: string;
}

/** GET /me/onboarding/documents. bodyMarkdown is DRAFT text pending legal review — render as-is. */
export interface OnboardingDocument {
  id: number;
  type: string;
  version: string;
  title: string;
  bodyMarkdown: string;
  effectiveAt: string;
  signed: boolean;
}

/** POST /me/onboarding/documents/sign — idempotent; re-signing returns the original signature. */
export interface OnboardingSignature {
  id: number;
  documentId: number;
  typedName: string;
  signedAt: string;
}

/** 409 ONBOARDING_INCOMPLETE from POST /me/onboarding/complete. */
export type OnboardingMissingStep = 'intake' | 'onboarding call' | 'payment' | 'document signatures';

export interface OnboardingState {
  /** From the server (GET /me/onboarding + the active Journey) — never persisted in the browser. */
  intake?: IntakeAnswers & { savedAt: string };
  /** From the server (GET /me/onboarding). */
  call?: OnboardingCall;
  /** From the server (callbackRequestedAt): the user asked the care team to call them instead of booking a slot. */
  callRequested?: boolean;
  recommendedPlanCode?: string;
  paidOrderId?: number;
  /** From the server (documentsSigned). */
  documentsSigned?: boolean;
  /** From the server (completedAt); cached locally only so guards can answer before the first sync. */
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
