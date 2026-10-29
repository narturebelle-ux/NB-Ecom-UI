import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { NextAction } from '../models/maternal.models';
import { Booking } from '../models/provider.models';
import { DEFAULT_NOTIFICATION_PREFERENCES, NotificationPreferences, Reminder } from '../models/notification.models';

/**
 * Phase 5 (Reminders & notifications) — client-side only. Reminders are generated (not
 * fetched from any API) from the Journey dashboard's nextActions and from Phase 3 bookings.
 * Not synced to a backend; nothing is actually sent by any channel.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private api = inject(ApiService);

  readonly unreadCount = signal(0);

  getReminders(): Reminder[] {
    const list = this.readJson<Reminder[]>(this.remindersKey(), [])
      .filter(r => !r.dismissed)
      .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
    this.unreadCount.set(list.filter(r => !r.read).length);
    return list;
  }

  /** Merges one reminder per non-optional next action, keyed stably so re-syncing doesn't duplicate. */
  syncFromNextActions(actions: NextAction[]) {
    const existing = this.readJson<Reminder[]>(this.remindersKey(), []);
    const existingIds = new Set(existing.map(r => r.id));

    for (const action of actions) {
      if (action.optional) continue;
      const id = 'rem_action_' + this.slug(action.title);
      if (existingIds.has(id)) continue;
      existing.push({
        id,
        title: action.title,
        body: action.description,
        source: 'NEXT_ACTION',
        dueAt: new Date().toISOString(),
        read: false,
        dismissed: false
      });
    }
    this.writeJson(this.remindersKey(), existing);
  }

  /** One reminder per upcoming BOOKED session, due 1 day before it. providerNames maps providerId → display name. */
  syncFromBookings(bookings: Booking[], providerNames: Map<number, string> = new Map()) {
    const existing = this.readJson<Reminder[]>(this.remindersKey(), []);
    const existingIds = new Set(existing.map(r => r.id));

    for (const booking of bookings) {
      if (booking.status !== 'BOOKED') continue;
      const id = 'rem_booking_' + booking.id;
      if (existingIds.has(id)) continue;
      const dueAt = new Date(booking.scheduledStart);
      dueAt.setDate(dueAt.getDate() - 1);
      existing.push({
        id,
        title: `Upcoming session with ${providerNames.get(booking.providerId) ?? 'your care provider'}`,
        body: `Your session is coming up on ${new Date(booking.scheduledStart).toLocaleString()}.`,
        source: 'BOOKING',
        dueAt: dueAt.toISOString(),
        read: false,
        dismissed: false
      });
    }
    this.writeJson(this.remindersKey(), existing);
  }

  markRead(id: string) {
    const reminders = this.readJson<Reminder[]>(this.remindersKey(), []);
    const reminder = reminders.find(r => r.id === id);
    if (reminder) {
      reminder.read = true;
      this.writeJson(this.remindersKey(), reminders);
      this.getReminders();
    }
  }

  dismiss(id: string) {
    const reminders = this.readJson<Reminder[]>(this.remindersKey(), []);
    const reminder = reminders.find(r => r.id === id);
    if (reminder) {
      reminder.dismissed = true;
      this.writeJson(this.remindersKey(), reminders);
      this.getReminders();
    }
  }

  getPreferences(): NotificationPreferences {
    return this.readJson<NotificationPreferences>(this.preferencesKey(), DEFAULT_NOTIFICATION_PREFERENCES);
  }

  savePreferences(prefs: NotificationPreferences) {
    this.writeJson(this.preferencesKey(), prefs);
  }

  private slug(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40);
  }

  private remindersKey(): string {
    return `nb_reminders_${this.api.currentUser()?.id ?? 'guest'}`;
  }

  private preferencesKey(): string {
    return `nb_notification_prefs_${this.api.currentUser()?.id ?? 'guest'}`;
  }

  private readJson<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) as T : fallback;
    } catch {
      return fallback;
    }
  }

  private writeJson(key: string, value: unknown) {
    localStorage.setItem(key, JSON.stringify(value));
  }
}
