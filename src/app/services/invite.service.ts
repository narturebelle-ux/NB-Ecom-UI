import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiService } from './api.service';

/**
 * Referral links & the free Premium reward (API UI_INTEGRATION_GUIDE.md §16, branch feature/referrals).
 * 5 friends who join through her link and buy a plan → she gets a free 9-month Premium plan, once.
 * (Not to be confused with ReferralService, which is hospital tour referrals.)
 */

export interface MyReferral {
  code: string;
  target: number;
  invited: number;
  qualified: number;
  rewardGranted: boolean;
  rewardOrderId: number | null;
  friends: { name: string; joinedAt: string; purchased: boolean }[];
}

const STORED_REF_KEY = 'nb_ref';

@Injectable({ providedIn: 'root' })
export class InviteService {
  private http = inject(HttpClient);
  private api = inject(ApiService);
  private readonly baseUrl = environment.apiUrl;

  /** "Asha R." when the visitor arrived through a valid invite link and hasn't claimed it yet. */
  readonly inviterName = signal<string | null>(null);
  private claiming = false;

  me(): Observable<MyReferral> {
    return this.http.get<MyReferral>(`${this.baseUrl}/me/referral`);
  }

  shareLink(code: string): string {
    return `${window.location.origin}/?ref=${encodeURIComponent(code)}`;
  }

  whatsappLink(code: string): string {
    const text = `I use NartureBelle™ for my pregnancy and baby care: verified doctors, nurses and a care coordinator who speaks my language. Join with my link: ${this.shareLink(code)}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  // ---------- arriving with ?ref= ----------

  /** Call once on app start: keeps ?ref= through sign-up and looks up who invited her. */
  captureFromUrl() {
    let code: string | null = null;
    try { code = new URLSearchParams(window.location.search).get('ref'); } catch { /* no URL */ }
    if (code && /^[A-Za-z0-9]{4,32}$/.test(code)) this.store(code);
    const stored = this.stored();
    if (!stored || this.api.currentUser()) return;
    this.http.get<{ referrerName: string }>(`${this.baseUrl}/referrals/${encodeURIComponent(stored)}`).subscribe({
      next: r => this.inviterName.set(r.referrerName),
      error: err => { if (err?.status === 404) this.clear(); }
    });
  }

  /**
   * After sign-in (and TERMS/PRIVACY consent): attach her to the inviter. Clears the stored code on success or any
   * 4xx other than 401/403 (REFERRAL_SELF, REFERRAL_ALREADY_CLAIMED, REFERRAL_NOT_NEW_CUSTOMER, bad code).
   */
  claimIfPending() {
    const code = this.stored();
    if (!code || this.claiming || !this.api.currentUser()) return;
    this.claiming = true;
    this.http.post<{ referrerName: string }>(`${this.baseUrl}/me/referral/claim`, { code }).subscribe({
      next: r => {
        this.claiming = false;
        this.clear();
        this.api.showToast(`Welcome! You joined through ${r.referrerName}’s invite.`);
      },
      error: err => {
        this.claiming = false;
        if (err?.status >= 400 && err?.status < 500 && err?.status !== 401 && err?.status !== 403) this.clear();
      }
    });
  }

  dismissBanner() {
    this.inviterName.set(null);
  }

  private stored(): string | null {
    try { return localStorage.getItem(STORED_REF_KEY); } catch { return null; }
  }

  private store(code: string) {
    try { localStorage.setItem(STORED_REF_KEY, code); } catch { /* storage blocked */ }
  }

  private clear() {
    this.inviterName.set(null);
    try { localStorage.removeItem(STORED_REF_KEY); } catch { /* storage blocked */ }
  }
}
