import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { JoyCircleEvent, JoyCircleRsvp } from '../models/joy-circle.models';

/** Phase 6 — Joy Circle events (public) and the user's RSVPs (auth + consent). */
@Injectable({ providedIn: 'root' })
export class JoyCircleService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /** Upcoming events only. */
  getEvents(): Observable<JoyCircleEvent[]> {
    return this.http.get<JoyCircleEvent[]>(`${this.baseUrl}/joy-circle/events`);
  }

  getMyRsvps(): Observable<JoyCircleRsvp[]> {
    return this.http.get<JoyCircleRsvp[]>(`${this.baseUrl}/me/joy-circle/rsvps`);
  }

  /** Idempotent. 409 EVENT_FULL / EVENT_NOT_OPEN. */
  rsvp(eventId: number): Observable<JoyCircleRsvp> {
    return this.http.post<JoyCircleRsvp>(`${this.baseUrl}/joy-circle/events/${eventId}/rsvp`, {});
  }

  cancelRsvp(eventId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/joy-circle/events/${eventId}/rsvp`);
  }
}
