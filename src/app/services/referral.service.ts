import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';

export interface Referral {
  code: string;
  hospitalId: number;
  hospitalName: string;
  createdAt: string;
}

/**
 * Phase 6 (Clinics/hospitals + referral attribution) — client-side only. Generates a
 * referral code when a user requests a hospital tour/callback, so a real backend could
 * later attribute that lead back to NartureBelle. Not synced to any backend yet.
 */
@Injectable({ providedIn: 'root' })
export class ReferralService {
  private api = inject(ApiService);

  createReferral(hospitalId: number, hospitalName: string): Referral {
    const uid = this.api.currentUser()?.id ?? 'guest';
    const code = `NB-${uid}-${hospitalId}-${Date.now().toString(36).toUpperCase()}`;
    const referral: Referral = { code, hospitalId, hospitalName, createdAt: new Date().toISOString() };
    const referrals = this.getReferrals();
    referrals.push(referral);
    localStorage.setItem(this.key(), JSON.stringify(referrals));
    return referral;
  }

  getReferrals(): Referral[] {
    try {
      const raw = localStorage.getItem(this.key());
      return raw ? JSON.parse(raw) as Referral[] : [];
    } catch {
      return [];
    }
  }

  private key(): string {
    return `nb_referrals_${this.api.currentUser()?.id ?? 'guest'}`;
  }
}
