import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type ReferralStatus = 'REQUESTED' | 'CONFIRMED';

export interface Referral {
  id: number;
  /** "NB-" + 8 characters; carries no user id. */
  code: string;
  hospitalId: number;
  hospitalName: string;
  status: ReferralStatus;
  note: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

/**
 * Phase 6 — hospital referral attribution via /me/hospital-referrals (verified accounts only).
 * Idempotent: an open referral to the same hospital returns the existing one.
 */
@Injectable({ providedIn: 'root' })
export class ReferralService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/me/hospital-referrals`;

  createReferral(hospitalId: number, note?: string): Observable<Referral> {
    return this.http.post<Referral>(this.baseUrl, { hospitalId, note: note || null });
  }

  getReferrals(): Observable<Referral[]> {
    return this.http.get<Referral[]>(this.baseUrl);
  }
}
