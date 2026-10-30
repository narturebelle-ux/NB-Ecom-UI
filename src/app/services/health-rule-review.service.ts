import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { RiskFactor } from '../models/onboarding.models';

export type HealthRuleStatus = 'PENDING_CLINICAL_REVIEW' | 'APPROVED' | 'REJECTED';

/** Part D (API 88879af): a rule that hides (AVOID) or promotes (PREFER) products with a tag for mothers with a risk factor. */
export interface ProductHealthRule {
  id: number;
  riskFactor: RiskFactor;
  tag: string;
  effect: 'AVOID' | 'PREFER';
  /** Shown to mothers in whyRecommended for PREFER rules. */
  reason: string;
  status: HealthRuleStatus;
  createdByUserId: number;
  createdAt: string;
  reviewedByUserId: number | null;
  reviewedByName: string | null;
  /** "MEDICAL_REVIEWER" or the reviewer's professional type. */
  reviewedByRole: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
}

/**
 * Clinical review of product health rules. Allowed for MEDICAL_REVIEWER, or a GYNECOLOGIST / NUTRITIONIST /
 * REGISTERED_NURSE whose provider account is VERIFIED or ACTIVE (403 otherwise).
 */
@Injectable({ providedIn: 'root' })
export class HealthRuleReviewService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/review/product-health-rules`;

  /** No status → the pending queue, oldest first. */
  list(status?: HealthRuleStatus): Observable<ProductHealthRule[]> {
    const params = status ? new HttpParams().set('status', status) : undefined;
    return this.http.get<ProductHealthRule[]>(this.baseUrl, { params });
  }

  /** 409 RULE_SELF_REVIEW_NOT_ALLOWED / RULE_ALREADY_REVIEWED. */
  approve(id: number): Observable<ProductHealthRule> {
    return this.http.post<ProductHealthRule>(`${this.baseUrl}/${id}/approve`, {});
  }

  reject(id: number, reason: string): Observable<ProductHealthRule> {
    return this.http.post<ProductHealthRule>(`${this.baseUrl}/${id}/reject`, { reason });
  }
}
