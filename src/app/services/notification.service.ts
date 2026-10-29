import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { environment } from '../../environments/environment';
import { ChannelPreference, NotificationChannel, Reminder } from '../models/notification.models';

/**
 * Phase 5 — reminders and channel preferences from the API (UI_INTEGRATION_GUIDE.md §12).
 * The API has no "read" flag, so which reminders the user has opened is remembered per
 * browser (ids only, no content) purely to drive the unread badge.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private api = inject(ApiService);
  private readonly baseUrl = environment.apiUrl;

  readonly reminders = signal<Reminder[]>([]);
  private readonly seen = signal<Set<number>>(new Set());
  readonly unreadCount = computed(() => this.reminders().filter(r => !this.seen().has(r.id)).length);

  constructor() {
    effect(() => {
      const id = this.api.currentUser()?.id;
      this.reminders.set([]);
      this.seen.set(id ? this.readSeen(id) : new Set());
    });
  }

  isRead(id: number): boolean {
    return this.seen().has(id);
  }

  /** GET /me/reminders — ACTIVE only, newest first. Failures leave the current list as is. */
  refresh() {
    if (!this.api.currentUser()) return;
    this.http.get<Reminder[]>(`${this.baseUrl}/me/reminders`).subscribe({
      next: list => this.reminders.set(list),
      error: () => { /* consent/verify redirects handled by the interceptor */ }
    });
  }

  markRead(id: number) {
    const next = new Set(this.seen());
    next.add(id);
    this.seen.set(next);
    this.writeSeen();
  }

  dismiss(id: number) {
    const before = this.reminders();
    this.reminders.set(before.filter(r => r.id !== id));
    this.http.post(`${this.baseUrl}/me/reminders/${id}/dismiss`, {}).subscribe({
      error: () => {
        this.reminders.set(before);
        this.api.showToast('Couldn’t dismiss that reminder. Please try again.');
      }
    });
  }

  getPreferences(): Observable<ChannelPreference[]> {
    return this.http.get<ChannelPreference[]>(`${this.baseUrl}/me/notification-preferences`);
  }

  setPreference(channel: NotificationChannel, enabled: boolean): Observable<ChannelPreference> {
    return this.http.put<ChannelPreference>(`${this.baseUrl}/me/notification-preferences/${channel}`, { enabled }).pipe(
      tap(() => { if (channel === 'IN_APP') this.refresh(); })
    );
  }

  private seenKey(id: number) {
    return `nb_reminders_seen_${id}`;
  }

  private readSeen(id: number): Set<number> {
    try {
      // Drop the old client-generated reminder store, which held reminder text.
      localStorage.removeItem(`nb_reminders_${id}`);
      localStorage.removeItem(`nb_notification_prefs_${id}`);
      return new Set(JSON.parse(localStorage.getItem(this.seenKey(id)) || '[]'));
    } catch {
      return new Set();
    }
  }

  private writeSeen() {
    const id = this.api.currentUser()?.id;
    if (!id) return;
    // Keep only ids that are still active so the list can't grow forever.
    const active = new Set(this.reminders().map(r => r.id));
    const ids = [...this.seen()].filter(x => active.has(x));
    try { localStorage.setItem(this.seenKey(id), JSON.stringify(ids)); } catch { /* storage blocked */ }
  }
}
