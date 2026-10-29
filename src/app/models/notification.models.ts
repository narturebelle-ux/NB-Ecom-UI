/**
 * Phase 5 (Reminders & notifications) — implemented client-side, same reasoning as the
 * other mocked phases. Reminders are derived from the Journey dashboard's nextActions and
 * from Phase 3 bookings — nothing is actually sent over email/SMS/WhatsApp; those channel
 * toggles in Profile are preferences only, with no backend channel adapters behind them yet.
 */

export type ReminderSource = 'NEXT_ACTION' | 'BOOKING';

export interface Reminder {
  id: string;
  title: string;
  body: string;
  source: ReminderSource;
  dueAt: string;
  read: boolean;
  dismissed: boolean;
}

export interface NotificationPreferences {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  inApp: true,
  email: false,
  sms: false,
  whatsapp: false
};
