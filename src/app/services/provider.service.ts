import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Booking, Provider, ProviderFilters, Slot } from '../models/provider.models';

/** Phase 3 (Providers, booking & sessions) against the real API — UI_INTEGRATION_GUIDE.md §9. */
@Injectable({ providedIn: 'root' })
export class ProviderService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /** Public; the API only ever lists VERIFIED/ACTIVE providers. Filtering is server-side. */
  getProviders(filters: ProviderFilters = {}): Observable<Provider[]> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) params = params.set(key, value);
    }
    return this.http.get<Provider[]>(`${this.baseUrl}/providers`, { params });
  }

  getProvider(id: number): Observable<Provider> {
    return this.http.get<Provider>(`${this.baseUrl}/providers/${id}`);
  }

  /** OPEN, future-only, ordered. */
  getSlots(providerId: number): Observable<Slot[]> {
    return this.http.get<Slot[]>(`${this.baseUrl}/providers/${providerId}/slots`);
  }

  /** No Idempotency-Key needed: a duplicate claim on the same slot comes back 409 SLOT_NOT_AVAILABLE. */
  book(providerId: number, serviceOfferingId: number, slotId: number): Observable<Booking> {
    return this.http.post<Booking>(`${this.baseUrl}/bookings`, { providerId, serviceOfferingId, slotId });
  }

  getBookings(): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.baseUrl}/bookings`);
  }

  cancel(id: number, reason: string): Observable<Booking> {
    return this.http.post<Booking>(`${this.baseUrl}/bookings/${id}/cancel`, { reason });
  }

  /** The old booking becomes RESCHEDULED and a new one is returned, linked via rescheduledFromBookingId. */
  reschedule(id: number, newSlotId: number, reason: string): Observable<Booking> {
    return this.http.post<Booking>(`${this.baseUrl}/bookings/${id}/reschedule`, { newSlotId, reason });
  }

  /** A user may only report that the PROVIDER didn't attend; reporting their own side is a 403. */
  reportProviderNoShow(id: number, reason: string): Observable<Booking> {
    return this.http.post<Booking>(`${this.baseUrl}/bookings/${id}/no-show`, { party: 'PROVIDER', reason });
  }

  /** Only after COMPLETED, only once (409 FEEDBACK_NOT_ALLOWED otherwise). */
  submitFeedback(id: number, rating: number, comment: string): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/bookings/${id}/feedback`, { rating, comment: comment || null });
  }
}
