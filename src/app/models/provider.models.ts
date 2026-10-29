/**
 * Phase 3 (Providers, booking & sessions) — real contract, NB-Ecomm-API
 * UI_INTEGRATION_GUIDE.md §9. `services` (active offerings only) supplies the
 * serviceOfferingId POST /bookings needs; an empty list means nothing is bookable yet.
 */

export type ProfessionalTypeKey =
  | 'GYNECOLOGIST'
  | 'NUTRITIONIST'
  | 'LACTATION_CONSULTANT'
  | 'PEDIATRICIAN'
  | 'POSTPARTUM_PHYSIOTHERAPIST'
  | 'CLINICAL_PSYCHOLOGIST'
  | 'REGISTERED_NURSE';

export type Modality = 'VIRTUAL' | 'PHYSICAL';

export interface ServiceOffering {
  id: number;
  name: string;
  description?: string | null;
  modality: Modality;
  durationMinutes: number;
}

export interface Provider {
  id: number;
  professionalType: ProfessionalTypeKey;
  displayName: string;
  bio?: string | null;
  city?: string | null;
  languages: string[];
  services: ServiceOffering[];
}

export interface Slot {
  id: number;
  startAt: string;
  endAt: string;
  status: string;
}

export type BookingStatus =
  | 'BOOKED'
  | 'CANCELLED'
  | 'RESCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'NO_SHOW_PROVIDER'
  | 'NO_SHOW_USER';

export interface Booking {
  id: number;
  userId: number;
  providerId: number;
  serviceOfferingId: number;
  slotId: number;
  professionalType: ProfessionalTypeKey;
  status: BookingStatus;
  scheduledStart: string;
  scheduledEnd: string;
  providerNote?: string | null;
  noteLockedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  noShowAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  rescheduledFromBookingId?: number | null;
  createdAt: string;
}

export interface ProviderFilters {
  professionalType?: string | null;
  language?: string | null;
  city?: string | null;
  modality?: Modality | null;
}

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  BOOKED: 'Booked',
  CANCELLED: 'Cancelled',
  RESCHEDULED: 'Rescheduled',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  NO_SHOW_PROVIDER: 'Provider didn’t attend',
  NO_SHOW_USER: 'Missed'
};

/** Professional initials for profile circles, ignoring honorifics like 'Dr.'/'Sister'. */
export function providerInitials(name: string): string {
  return (name || '')
    .replace(/^(Dr\.|Sister)\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}
