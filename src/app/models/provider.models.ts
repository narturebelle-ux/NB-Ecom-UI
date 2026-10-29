/**
 * Phase 3 (Providers, booking & sessions) — implemented client-side, same approach as
 * Phase 2's CommerceService: no Provider/Booking endpoints exist on the API yet, so this
 * is a self-authored mock, not synced to any backend. See API_Integration.md.
 */

export type ProfessionalTypeKey =
  | 'GYNECOLOGIST'
  | 'NUTRITIONIST'
  | 'LACTATION_CONSULTANT'
  | 'PEDIATRICIAN'
  | 'POSTPARTUM_PHYSIOTHERAPIST'
  | 'CLINICAL_PSYCHOLOGIST';

export interface Provider {
  id: number;
  name: string;
  type: ProfessionalTypeKey;
  credentialsSummary: string;
  languages: string[];
  city: string;
  virtual: boolean;
  rating: number;
  bio: string;
}

export interface Slot {
  id: string;
  providerId: number;
  startsAt: string;
  durationMinutes: number;
  booked: boolean;
}

export type BookingStatus = 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface Booking {
  id: string;
  providerId: number;
  providerName: string;
  providerType: ProfessionalTypeKey;
  slotId: string;
  startsAt: string;
  durationMinutes: number;
  status: BookingStatus;
  entitlementId: string | null;
  createdAt: string;
}

export const MOCK_PROVIDERS: Provider[] = [
  { id: 1, name: 'Dr. Ananya Sharma', type: 'GYNECOLOGIST', credentialsSummary: 'MD (OB-GYN) · 18 yrs', languages: ['English', 'Hindi'], city: 'Bengaluru', virtual: true, rating: 4.9, bio: 'Senior consultant obstetrician focused on high-risk pregnancy care.' },
  { id: 2, name: 'Dr. Priya Ramanathan', type: 'GYNECOLOGIST', credentialsSummary: 'MD, DNB · Fetal Medicine', languages: ['English', 'Tamil'], city: 'Mumbai', virtual: true, rating: 4.8, bio: 'Fetal medicine specialist, 4D ultrasound expert.' },
  { id: 3, name: 'Kavita Rao', type: 'NUTRITIONIST', credentialsSummary: 'RD · Maternal Nutrition', languages: ['English', 'Kannada'], city: 'Bengaluru', virtual: true, rating: 4.7, bio: 'Clinical dietitian specialising in trimester-specific nutrition planning.' },
  { id: 4, name: 'Sister Meenakshi Sundaram', type: 'LACTATION_CONSULTANT', credentialsSummary: 'RN, RM, IBCLC', languages: ['English', 'Tamil', 'Telugu'], city: 'Hyderabad', virtual: true, rating: 4.9, bio: 'Certified nurse-midwife and international board lactation consultant.' },
  { id: 5, name: 'Dr. Rohan Mehta', type: 'PEDIATRICIAN', credentialsSummary: 'MD (Pediatrics) · 12 yrs', languages: ['English', 'Hindi'], city: 'Delhi', virtual: true, rating: 4.8, bio: 'Newborn and early-childhood care specialist.' },
  { id: 6, name: 'Divya Krishnan', type: 'POSTPARTUM_PHYSIOTHERAPIST', credentialsSummary: 'BPT · Postpartum Recovery', languages: ['English', 'Malayalam'], city: 'Kochi', virtual: false, rating: 4.6, bio: 'Postpartum core & pelvic floor recovery specialist.' },
  { id: 7, name: 'Dr. Arjun Nair', type: 'CLINICAL_PSYCHOLOGIST', credentialsSummary: 'PhD, Clinical Psychology', languages: ['English', 'Malayalam', 'Hindi'], city: 'Bengaluru', virtual: true, rating: 4.9, bio: 'Perinatal mental health support — entirely optional, never required.' }
];

/** Professional initials for profile circles, ignoring honorifics like 'Dr.'/'Sister'. */
export function providerInitials(name: string): string {
  return name
    .replace(/^(Dr\.|Sister)\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

export function generateUpcomingSlots(providerId: number): Slot[] {
  const slots: Slot[] = [];
  const now = new Date();
  for (let day = 1; day <= 10; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() + day);
    // Two slots/day, deterministic per provider so the list doesn't reshuffle on reload.
    for (const hour of [10, 16]) {
      date.setHours(hour, 0, 0, 0);
      slots.push({
        id: `slot_${providerId}_${date.toISOString()}`,
        providerId,
        startsAt: date.toISOString(),
        durationMinutes: 30,
        booked: false
      });
    }
  }
  return slots;
}
