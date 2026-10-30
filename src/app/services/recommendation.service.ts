import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Budget, RecommendationsResponse } from '../models/recommendation.models';
import { SessionProductRecommendation } from '../models/session-recommendation.models';

/** Phase 6 — /me/product-recommendations (see recommendation.models.ts). */
@Injectable({ providedIn: 'root' })
export class RecommendationService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/me/product-recommendations`;

  /** Always includes dismissed items so the page can offer "show them again". */
  get(category: string | null, maxPrice: Budget): Observable<RecommendationsResponse> {
    let params = new HttpParams().set('includeDismissed', 'true');
    if (category) params = params.set('category', category);
    if (maxPrice !== null) params = params.set('maxPrice', maxPrice);
    return this.http.get<RecommendationsResponse>(this.baseUrl, { params });
  }

  /** Products the mother's own professionals recommended in completed sessions (not gated by the productRecommendations flag). */
  getCareRecommendations(): Observable<SessionProductRecommendation[]> {
    return this.http.get<SessionProductRecommendation[]>(`${environment.apiUrl}/me/care-recommendations`);
  }

  dismiss(productId: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${productId}/dismiss`, {});
  }

  undismiss(productId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${productId}/dismiss`);
  }
}
