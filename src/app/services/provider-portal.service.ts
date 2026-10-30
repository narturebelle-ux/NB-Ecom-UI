import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Booking } from '../models/provider.models';
import {
  ProductSuggestions,
  ProviderBooking,
  ProviderSelf,
  RecommendationPriority,
  SessionProductRecommendation
} from '../models/session-recommendation.models';

/**
 * Provider portal: a verified professional's sessions and the products they recommend in them.
 * PROPOSED contract (see session-recommendation.models.ts); start/complete are the existing Phase 3 endpoints.
 */
@Injectable({ providedIn: 'root' })
export class ProviderPortalService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  me(): Observable<ProviderSelf> {
    return this.http.get<ProviderSelf>(`${this.baseUrl}/provider/me`);
  }

  getBookings(): Observable<ProviderBooking[]> {
    return this.http.get<ProviderBooking[]>(`${this.baseUrl}/provider/bookings`);
  }

  getSuggestions(bookingId: number): Observable<ProductSuggestions> {
    return this.http.get<ProductSuggestions>(`${this.baseUrl}/provider/bookings/${bookingId}/product-suggestions`);
  }

  getRecommendations(bookingId: number): Observable<SessionProductRecommendation[]> {
    return this.http.get<SessionProductRecommendation[]>(`${this.baseUrl}/provider/bookings/${bookingId}/product-recommendations`);
  }

  /** Full replacement of this session's picks. */
  saveRecommendations(
    bookingId: number,
    items: { productId: number; priority: RecommendationPriority; note?: string | null }[]
  ): Observable<SessionProductRecommendation[]> {
    return this.http.put<SessionProductRecommendation[]>(`${this.baseUrl}/provider/bookings/${bookingId}/product-recommendations`, { items });
  }

  start(bookingId: number): Observable<Booking> {
    return this.http.post<Booking>(`${this.baseUrl}/bookings/${bookingId}/start`, {});
  }

  complete(bookingId: number, note: string): Observable<Booking> {
    return this.http.post<Booking>(`${this.baseUrl}/bookings/${bookingId}/complete`, { note });
  }
}
