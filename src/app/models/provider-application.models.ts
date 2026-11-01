/**
 * Care professional onboarding, against NB-Ecom-Providers-API (its UI_INTEGRATION_GUIDE.md).
 * The application form is defined by the API, so these types describe what it sends rather than the questions.
 */

export type ProfessionRole = 'GYNECOLOGIST' | 'PEDIATRICIAN' | 'CLINICAL_PSYCHOLOGIST' | 'REGISTERED_NURSE'
  | 'POSTPARTUM_PHYSIOTHERAPIST' | 'NUTRITIONIST' | 'LACTATION_CONSULTANT';

export const PROFESSION_LABELS: Record<ProfessionRole, string> = {
  GYNECOLOGIST: 'Gynecologist',
  PEDIATRICIAN: 'Pediatrician',
  CLINICAL_PSYCHOLOGIST: 'Clinical Psychologist',
  REGISTERED_NURSE: 'Registered Nurse',
  POSTPARTUM_PHYSIOTHERAPIST: 'Postpartum Physiotherapist',
  NUTRITIONIST: 'Nutritionist',
  LACTATION_CONSULTANT: 'Lactation Consultant'
};

export type ApplicationStatus = 'DRAFT' | 'CHANGES_REQUESTED' | 'OPERATIONS_REVIEW' | 'MEDICAL_REVIEW' | 'VERIFIED'
  | 'ACTIVE' | 'PAUSED' | 'SUSPENDED' | 'REJECTED' | 'WITHDRAWN' | 'CLOSED';

/** The names the approved document uses. */
export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  DRAFT: 'Documents pending',
  CHANGES_REQUESTED: 'Changes needed',
  OPERATIONS_REVIEW: 'Under review',
  MEDICAL_REVIEW: 'Under review',
  VERIFIED: 'Verified',
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  SUSPENDED: 'Suspended',
  REJECTED: 'Not approved',
  WITHDRAWN: 'Withdrawn',
  CLOSED: 'Closed'
};

export function isApprovedStatus(status: ApplicationStatus | null | undefined): boolean {
  return status === 'VERIFIED' || status === 'ACTIVE' || status === 'PAUSED' || status === 'SUSPENDED';
}

export type QuestionType = 'TEXT' | 'LONG_TEXT' | 'NUMBER' | 'YEAR' | 'DATE' | 'YES_NO' | 'SELECT' | 'MULTI_SELECT' | 'FILE' | 'CONFIRM';

export interface FormOption { value: string; label: string; }

export interface FormQuestion {
  key: string;
  label: string;
  type: QuestionType;
  options: FormOption[];
  required: boolean;
  sensitive: boolean;
  hint: string | null;
  /** Show only when this question's answer is one of showWhenValues. */
  showWhenKey: string | null;
  showWhenValues: string[];
  pattern: string | null;
  patternMessage: string | null;
}

export interface FormSection { key: string; title: string; description: string; questions: FormQuestion[]; }

export interface ApplyInfo {
  professions: { value: ProfessionRole; label: string }[];
  termsVersion: string;
  termsText: string;
  draft: boolean;
}

export interface ApplicationEntry {
  hasApplication: boolean;
  status: ApplicationStatus | null;
  motherAccount: boolean;
  blocked: boolean;
  reapplyAfter: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
}

export interface ApplicationDocument { id: number; questionKey: string; fileName: string; sizeBytes: number; uploadedAt: string; }

export interface RequestedChange { questionKey: string; note: string | null; }

export interface MissingAnswer { key: string; label: string; section: string; }

export type AnswerValue = string | string[];

export interface ProviderApplication {
  id: number;
  profession: ProfessionRole;
  status: ApplicationStatus;
  answers: Record<string, AnswerValue>;
  /** Sensitive answers on file. Their values are never sent back. */
  sensitiveSaved: string[];
  documents: ApplicationDocument[];
  requestedChanges: RequestedChange[];
  submittedAt: string | null;
  rejectionReason: string | null;
  reapplyAfter: string | null;
  verifiedAt: string | null;
  activatedAt: string | null;
  canPrescribe: boolean;
  confirmedExperienceYears: number | null;
  providerId: number | null;
  licenceExpiresOn: string | null;
  licenceLapsed: boolean;
  contactVerified: boolean;
}

// ---------- setup ----------

export type BankVerification = 'PENDING' | 'PASSED' | 'FAILED';

export interface SetupStatus {
  agreementSigned: boolean;
  bankAdded: boolean;
  bankVerification: BankVerification | null;
  taxCompleted: boolean;
  trainingPassed: boolean;
  servicesAdded: boolean;
  slotsAdded: boolean;
  profileConfirmed: boolean;
  recheckRequired: boolean;
  readyForGoLive: boolean;
  missing: string[];
}

export interface Agreement {
  version: string;
  text: string;
  feePerSession: number;
  draft: boolean;
  signingEnabled: boolean;
  typedName: string | null;
  signedAt: string | null;
}

export interface BankDetails {
  accountHolderName: string;
  accountLast4: string;
  ifsc: string;
  accountType: 'SAVINGS' | 'CURRENT';
  gstRegistered: boolean;
  gstin: string | null;
  verificationStatus: BankVerification;
}

export interface BankDetailsInput {
  accountHolderName: string;
  accountNumber: string;
  accountNumberConfirm: string;
  ifsc: string;
  accountType: 'SAVINGS' | 'CURRENT';
  gstRegistered: boolean;
  gstin: string;
}

export interface TrainingQuestion { id: string; topic: string; text: string; options: string[]; }
export interface Training { questions: TrainingQuestion[]; draft: boolean; passedAt: string | null; }
export interface TrainingResult { passed: boolean; correct: number; total: number; }

// ---------- workspace ----------

export type WorkspaceModality = 'VIRTUAL' | 'PHYSICAL';

export interface WorkspaceService { id: number; name: string; description: string | null; modality: WorkspaceModality; durationMinutes: number; active: boolean; }
export interface WorkspaceSlot { id: number; startAt: string; endAt: string; status: string; }

export interface Earnings {
  feePerSession: number;
  totalEarned: number;
  /** Always zero today: earnings are recorded, but bank payments are a later phase. */
  paidOutTotal: number;
  completedSessions: number;
  feeIsDraft: boolean;
  items: { bookingId: number; amount: number; status: string; createdAt: string }[];
}

export interface ProductActivity { productName: string; priority: string; note: string | null; createdAt: string; }

export interface ProviderProfile {
  providerId: number;
  profession: ProfessionRole;
  providerStatus: string;
  legalName: string | null;
  displayName: string | null;
  bio: string | null;
  city: string | null;
  languages: string[];
  council: string | null;
  registrationNumber: string | null;
  licenceExpiresOn: string | null;
  confirmedExperienceYears: number | null;
  clearedStages: string[];
  canPrescribe: boolean;
  bank: BankDetails | null;
}

export type ChangeType = 'PROFILE' | 'NAME' | 'LICENCE' | 'BANK';

export interface ChangeRequest { id: number; type: ChangeType; status: 'PENDING' | 'APPROVED' | 'REJECTED'; decisionReason: string | null; createdAt: string; decidedAt: string | null; documentRequired: boolean; documentAttached: boolean; }

export interface PublicCredentials { profession: ProfessionRole; council: string | null; registrationNumber: string | null; confirmedExperienceYears: number | null; }

// ---------- staff review ----------

export interface QueueItem { id: number; applicantName: string | null; profession: ProfessionRole; status: ApplicationStatus; submittedAt: string | null; flags: string[]; recheckRequired: boolean; }

export const FLAG_LABELS: Record<string, string> = {
  NO_REGISTRATION: 'No licence held',
  DUPLICATE_REGISTRATION: 'Registration number on another account',
  LICENCE_EXPIRED: 'Licence has expired',
  PAST_SUSPENSION: 'Past suspension',
  CRIMINAL_CASE: 'Criminal case declared',
  NOT_PRACTISING: 'Not currently practising',
  SPECIALIST_NOT_RECORDED: 'Specialist degree not recorded with council',
  QUALIFIED_ABROAD: 'Qualified outside India',
  FINANCIAL_TIES: 'Financial ties declared'
};

export interface ReviewHistoryItem { stage: 'OPERATIONS' | 'MEDICAL'; reviewerUserId: number; decision: string; reason: string | null; checklist: Record<string, boolean>; createdAt: string; }

export interface ChangeRequestForReview { id: number; applicationId: number; type: ChangeType; status: string; values: Record<string, unknown>; pendingDocumentId: number | null; createdAt: string; }

export interface ReviewDetail {
  id: number;
  userId: number;
  email: string | null;
  phone: string | null;
  profession: ProfessionRole;
  status: ApplicationStatus;
  flags: string[];
  sections: { title: string; answers: { key: string; label: string; value: string | null }[] }[];
  documents: ApplicationDocument[];
  requestedChanges: RequestedChange[];
  history: ReviewHistoryItem[];
  operationsReviewerId: number | null;
  confirmedExperienceYears: number | null;
  clearedStages: string[];
  canPrescribe: boolean;
  registrationNumber: string | null;
  licenceExpiresOn: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
  recheckRequired: boolean;
  setup: SetupStatus | null;
  bank: { accountHolderName: string; accountNumber: string; ifsc: string; accountType: string; gstRegistered: boolean; gstin: string | null; verificationStatus: BankVerification } | null;
  changeRequests: ChangeRequestForReview[];
}

/** The approved checklists (document section 5). */
export const OPERATIONS_CHECKLIST: { key: string; label: string }[] = [
  { key: 'nameMatches', label: 'The name, photo and PAN match across all documents' },
  { key: 'identityCall', label: 'The person on the identity call matches the ID' },
  { key: 'licenceOnRegister', label: 'The licence is on the official register, active, and matches in number and council' },
  { key: 'documentsClean', label: 'The documents are readable and free of signs of editing' },
  { key: 'numberUnique', label: 'The registration number is unused by any other account' },
  { key: 'referenceConfirmed', label: 'The reference confirmed their work' }
];

export const MEDICAL_CHECKLIST: { key: string; label: string }[] = [
  { key: 'qualificationsFit', label: 'The qualifications fit the chosen profession' },
  { key: 'experienceHoldsUp', label: 'The claimed experience holds up' },
  { key: 'declarationsAcceptable', label: 'Any declared suspensions, cases or financial ties are acceptable' },
  { key: 'clinicalConversation', label: 'Any clinical conversation needed has been held' },
  { key: 'prescribingCorrect', label: 'Prescribing rights are correct for this profession' }
];

export const CARE_STAGE_OPTIONS: FormOption[] = [
  { value: 'PREGNANCY', label: 'Pregnancy' },
  { value: 'POSTPARTUM', label: 'Postpartum' },
  { value: 'CHILD', label: 'Child 0-7' }
];

/** 4 MB: the API is hosted on Vercel, which rejects request bodies over 4.5 MB. */
export const DOCUMENT_MAX_BYTES = 4 * 1024 * 1024;
export const DOCUMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';
