/**
 * Phase 6 (Child profile + vaccination tracker) — implemented client-side, same reasoning
 * as the other mocked phases. The vaccine schedule below is a standard reference schedule,
 * NOT clinically reviewed for this product — marked PENDING_CLINICAL_REVIEW throughout,
 * same convention as the Journey dashboard's nextActions. Always verify with a pediatrician.
 */

export interface Child {
  id: string;
  name: string;
  dob: string;
}

export interface VaccinationRecord {
  id: string;
  childId: string;
  vaccineName: string;
  dueAgeMonths: number;
  given: boolean;
  givenAt: string | null;
}

/** Standard reference schedule (age in months). Illustrative — PENDING_CLINICAL_REVIEW. */
export const VACCINE_SCHEDULE: { vaccineName: string; dueAgeMonths: number }[] = [
  { vaccineName: 'BCG', dueAgeMonths: 0 },
  { vaccineName: 'Hepatitis B (Birth Dose)', dueAgeMonths: 0 },
  { vaccineName: 'OPV (Birth Dose)', dueAgeMonths: 0 },
  { vaccineName: 'Pentavalent 1 (DTwP-HepB-Hib)', dueAgeMonths: 1.5 },
  { vaccineName: 'Rotavirus 1', dueAgeMonths: 1.5 },
  { vaccineName: 'PCV 1', dueAgeMonths: 1.5 },
  { vaccineName: 'Pentavalent 2', dueAgeMonths: 2.5 },
  { vaccineName: 'Rotavirus 2', dueAgeMonths: 2.5 },
  { vaccineName: 'PCV 2', dueAgeMonths: 2.5 },
  { vaccineName: 'Pentavalent 3', dueAgeMonths: 3.5 },
  { vaccineName: 'Rotavirus 3', dueAgeMonths: 3.5 },
  { vaccineName: 'PCV Booster', dueAgeMonths: 9 },
  { vaccineName: 'MMR 1', dueAgeMonths: 9 },
  { vaccineName: 'MMR 2', dueAgeMonths: 15 },
  { vaccineName: 'DTwP Booster 1', dueAgeMonths: 16 },
  { vaccineName: 'OPV Booster', dueAgeMonths: 16 }
];
