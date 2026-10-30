/**
 * Phase 6 — child profile + vaccination tracker, against the API's planned contract
 * (nb-ecomm-api-a5, 2026-10-29; final version in UI_INTEGRATION_GUIDE.md).
 * The vaccine schedule is served by the API as PENDING_CLINICAL_REVIEW — the UI says so and tells
 * the user to confirm with their pediatrician.
 */

export type ChildSex = 'FEMALE' | 'MALE' | 'UNDISCLOSED';

export interface Child {
  id: number;
  name: string;
  dateOfBirth: string;
  sex: ChildSex | null;
  createdAt: string;
}

export type VaccinationStatus = 'DONE' | 'OVERDUE' | 'DUE' | 'UPCOMING';

export interface VaccinationItem {
  scheduleItemId: number;
  vaccineName: string;
  dueAgeDays: number;
  dueAgeLabel: string;
  dueDate: string;
  status: VaccinationStatus;
  givenAt: string | null;
  givenWhere: string | null;
}

export interface VaccinationSchedule {
  childId: number;
  schedule: { id: number; version: number; title: string; reviewStatus: string } | null;
  items: VaccinationItem[];
}

export const CHILD_SEX_LABELS: Record<ChildSex, string> = {
  FEMALE: 'Girl',
  MALE: 'Boy',
  UNDISCLOSED: 'Prefer not to say'
};
