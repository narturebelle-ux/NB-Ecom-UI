export type PregnancyStage = 'MONTH_3' | 'MONTH_6' | 'MONTH_9' | 'BABY_CARE';
export type NecessityTier = 'MANDATORY' | 'OPTIONAL' | 'SKIP';

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  stage: PregnancyStage;
  tier: NecessityTier;
  clinicalRationale: string;
  imageUrl: string;
  rating: number;
  reviewCount: number;
  doctorApproved: boolean;
  category: string;
  keyBenefits: string[];
  targetSymptoms: string[];
}

export interface ChecklistTask {
  id: number;
  stage: PregnancyStage;
  testName: string;
  weeksDue: string;
  description: string;
  isMandatoryMedicalTest: boolean;
  category: string;
  recommendedFacilityType: string;
  sponsoredPartnerName?: string;
  sponsoredPartnerBadge?: string;
  partnerDiscountCode?: string;
  partnerBookingUrl?: string;
}

export interface HospitalPartner {
  id: number;
  name: string;
  city: string;
  pincode: string;
  address: string;
  specialty: string;
  rating: number;
  reviewCount: number;
  phone: string;
  consultationUrl: string;
  discountDetails: string;
  partnerTier: string;
  imageUrl: string;
}

export interface NursePackage {
  id: number;
  name: string;
  tagLine: string;
  price: number;
  originalPrice?: number;
  duration: string;
  badge?: string;
  description: string;
  features: string[];
}

export interface DoctorSession {
  id: number;
  doctorName: string;
  doctorTitle: string;
  hospitalAffiliation: string;
  topic: string;
  description: string;
  targetStage: PregnancyStage;
  sessionDate: string;
  durationMinutes: number;
  attendeeCount: number;
  bannerUrl: string;
  meetingUrl: string;
  status: string;
}

export interface LeadProfile {
  id?: number;
  name?: string;
  email?: string;
  phone: string;
  stage?: PregnancyStage;
  dueDate?: string;
  city?: string;
  pincode?: string;
  reportedSymptoms?: string[];
}

export interface User {
  id: number;
  firebaseUid?: string;
  firstName?: string;
  lastName?: string;
  name: string;
  email?: string;
  emailVerified?: boolean;
  phone?: string;
  phoneVerified?: boolean;
  authProvider: string;
  stage?: PregnancyStage;
  dueDate?: string;
  /** @deprecated single-role string from the old model — use `roles` instead. */
  role: string;
  /** Roadmap Phase 0 §0.6 role model — a user can hold more than one role (defaults to ["MOTHER"]). */
  roles?: string[];
  /** Only present on GET/PATCH /api/v1/me — required consent document types not yet granted. */
  pendingConsents?: string[];
  /** Only present on GET/PATCH /api/v1/me — whether a non-CLOSED Journey already exists. */
  hasActiveJourney?: boolean;
  createdAt?: string;
}

/** True if the user can access verified-only features (update profile, checkout, orders). */
export function isVerifiedUser(user: User | null | undefined): boolean {
  return !!user && (user.emailVerified === true || user.phoneVerified === true);
}

/** True if the user holds any admin-type role (roadmap §0.6 — any `*_ADMIN` role, not a single "ADMIN" string). */
export function isAdminUser(user: User | null | undefined): boolean {
  return !!user?.roles?.some(r => r.endsWith('_ADMIN'));
}

export interface CartItem {
  product: Product;
  quantity: number;
}

// --- Phase 1: Consent (roadmap §1.1) ---

export type ConsentDocumentType = 'TERMS' | 'PRIVACY';

export interface ConsentDocument {
  id: number;
  type: ConsentDocumentType;
  version: number;
  title: string;
  bodyMarkdown: string;
  effectiveAt?: string;
  active: boolean;
}

export interface Consent {
  id: number;
  userId: number;
  documentType: ConsentDocumentType;
  documentVersion: number;
  grantedAt?: string;
  revokedAt?: string | null;
}

export interface ConsentStatus {
  history: Consent[];
  pending: string[];
}

// --- Phase 1: Journey (roadmap §1.2) ---

export type JourneyStatus =
  | 'PREGNANCY'
  | 'PRE_DELIVERY'
  | 'DELIVERY_COMPLETED'
  | 'POSTPARTUM'
  | 'CHILDCARE_0_7'
  | 'CLOSED';

export interface Journey {
  id: number;
  status: JourneyStatus;
  expectedDeliveryDate?: string | null;
  startedAt: string;
  closedAt?: string | null;
  /** Computed, never persisted — only present for an active PREGNANCY journey with an EDD on file. */
  gestationalWeek?: number;
  trimester?: number;
}

export const JOURNEY_STATUS_LABELS: Record<JourneyStatus, string> = {
  PREGNANCY: 'Pregnancy',
  PRE_DELIVERY: 'Pre-Delivery',
  DELIVERY_COMPLETED: 'Delivery Completed',
  POSTPARTUM: 'Postpartum',
  CHILDCARE_0_7: 'Early Childcare (0–7 years)',
  CLOSED: 'Closed'
};

// --- Phase 1: Dashboard (roadmap §1.3) ---

export type ProfessionalType =
  | 'GYNECOLOGIST'
  | 'NUTRITIONIST'
  | 'LACTATION_CONSULTANT'
  | 'PEDIATRICIAN'
  | 'POSTPARTUM_PHYSIOTHERAPIST'
  | 'CLINICAL_PSYCHOLOGIST';

export const PROFESSIONAL_TYPE_LABELS: Record<ProfessionalType, string> = {
  GYNECOLOGIST: 'Gynecologist',
  NUTRITIONIST: 'Nutritionist',
  LACTATION_CONSULTANT: 'Lactation Consultant',
  PEDIATRICIAN: 'Pediatrician',
  POSTPARTUM_PHYSIOTHERAPIST: 'Postpartum Physiotherapist',
  CLINICAL_PSYCHOLOGIST: 'Clinical Psychologist'
};

export interface NextAction {
  professionalType: ProfessionalType;
  title: string;
  description: string;
  /** Always "PENDING_CLINICAL_REVIEW" today — this content hasn't been clinically signed off yet. */
  reviewStatus: string;
  optional: boolean;
}

export interface Dashboard {
  profile: { firstName?: string; lastName?: string };
  pendingConsents: string[];
  journey: Journey | null;
  nextActions: NextAction[];
  journeySetupRequired: boolean;
}
