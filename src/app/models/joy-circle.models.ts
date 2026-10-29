/**
 * Phase 6 — Joy Circle: non-clinical community events (host, not doctor), against the API's
 * planned contract (/joy-circle/events; final version in UI_INTEGRATION_GUIDE.md).
 * A new model on purpose — not the old DoctorSession/doctors-live code, whose medical-credential
 * framing would misrepresent a community event.
 */

export interface JoyCircleEvent {
  id: number;
  title: string;
  description: string;
  hostName: string;
  hostBio: string;
  category: string;
  startsAt: string;
  endsAt: string;
  modality: 'VIRTUAL' | 'PHYSICAL';
  location: string | null;
  /** null = unlimited. */
  capacity: number | null;
  rsvpCount: number;
  /** null when capacity is unlimited. */
  spotsLeft: number | null;
  status: 'SCHEDULED' | 'CANCELLED';
  disclaimer: string;
}

/** joinUrl is only ever on an RSVP, never on the public event. */
export interface JoyCircleRsvp {
  eventId: number;
  event: JoyCircleEvent;
  joinUrl: string | null;
  rsvpAt: string;
}
