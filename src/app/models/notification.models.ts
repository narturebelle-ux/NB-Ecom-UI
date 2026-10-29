/**
 * Phase 5 (Reminders & notifications) — real contract, NB-Ecomm-API UI_INTEGRATION_GUIDE.md §12.
 * Reminders are generated server-side (bookings in the next 24h, journeys with pending next
 * actions). Message text is deliberately generic — no clinical detail. EMAIL/SMS/WHATSAPP
 * preferences are stored but no provider is wired in, so nothing is actually sent on them.
 */

export type ReminderType = 'BOOKING_UPCOMING' | 'JOURNEY_NEXT_ACTION';

export interface Reminder {
  id: number;
  type: ReminderType;
  title: string;
  body: string;
  dueAt: string;
  sourceType: 'BOOKING' | 'JOURNEY' | string;
  sourceId: number | null;
  status: 'ACTIVE' | string;
  createdAt: string;
}

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS' | 'WHATSAPP';

export interface ChannelPreference {
  channel: NotificationChannel;
  enabled: boolean;
}

export const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  IN_APP: 'In-app reminders',
  EMAIL: 'Email',
  SMS: 'SMS',
  WHATSAPP: 'WhatsApp'
};

export const DEFAULT_CHANNEL_PREFERENCES: ChannelPreference[] = [
  { channel: 'IN_APP', enabled: true },
  { channel: 'EMAIL', enabled: false },
  { channel: 'SMS', enabled: false },
  { channel: 'WHATSAPP', enabled: false }
];
