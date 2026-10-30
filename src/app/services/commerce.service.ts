import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Entitlement, Order, Payment, PaymentMode, Plan, PlanQuote } from '../models/commerce.models';

/** Phase 2 (Plans, checkout & entitlements) against the real API — UI_INTEGRATION_GUIDE.md §8. */
@Injectable({ providedIn: 'root' })
export class CommerceService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  readonly entitlements = signal<Entitlement[]>([]);
  /** A paying member: at least one unexpired entitlement. Filled by loadEntitlements() (the navbar loads it on sign-in). */
  readonly hasActivePlan = computed(() => this.entitlements().some(e => !this.isExpired(e)));
  /**
   * Share an Idea opens once she has used a session from a plan. Interim: usedSessions also counts booked sessions and
   * referral reward plans, which don't qualify. To be replaced by the API's canPostIdeas (API_Integration.md §33).
   */
  readonly canShareIdeas = computed(() => this.entitlements().some(e => e.usedSessions > 0));

  getPlans(): Observable<Plan[]> {
    return this.http.get<Plan[]>(`${this.baseUrl}/plans`);
  }

  /**
   * Prices for the signed-in user (prorated to her due date). POST /orders charges exactly this.
   * Falls back to the public 9-month list only if the API has no quote endpoint yet (404).
   */
  getQuote(): Observable<PlanQuote> {
    return this.http.get<PlanQuote>(`${this.baseUrl}/me/plans/quote`).pipe(
      catchError(err => err?.status === 404
        ? this.getPlans().pipe(map(plans => ({ months: 9, basis: 'FULL_PLAN' as const, plans })))
        : throwError(() => err))
    );
  }

  getPlan(id: number): Observable<Plan> {
    return this.http.get<Plan>(`${this.baseUrl}/plans/${id}`);
  }

  /** Reuse the same idempotencyKey when retrying the same attempt; the server returns the original order. */
  createOrder(planId: number, paymentMode: PaymentMode, idempotencyKey: string): Observable<Order> {
    return this.http.post<Order>(
      `${this.baseUrl}/orders`,
      { planId, paymentMode },
      { headers: new HttpHeaders({ 'Idempotency-Key': idempotencyKey }) }
    );
  }

  getOrder(id: number): Observable<Order> {
    return this.http.get<Order>(`${this.baseUrl}/orders/${id}`);
  }

  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.baseUrl}/orders`);
  }

  createPayment(orderId: number): Observable<Payment> {
    return this.http.post<Payment>(`${this.baseUrl}/payments/create`, { orderId });
  }

  /** Posts to the mockSucceedPath/mockFailPath the API handed back (temporary until Phase 7's real gateway). */
  completeMockPayment(apiPath: string): Observable<{ status: string }> {
    const origin = this.baseUrl.replace(/\/api\/v1\/?$/, '');
    return this.http.post<{ status: string }>(`${origin}${apiPath}`, {});
  }

  loadEntitlements(): Observable<Entitlement[]> {
    return this.http.get<Entitlement[]>(`${this.baseUrl}/entitlements`).pipe(
      tap(list => this.entitlements.set(list))
    );
  }

  newIdempotencyKey(): string {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  // Sessions are consumed server-side when a provider completes a booking (API Phase 3),
  // so remainingSessions is authoritative — no client-side bookkeeping.
  effectiveRemaining(e: Entitlement): number {
    return e.remainingSessions;
  }

  isExpired(e: Entitlement): boolean {
    return new Date(e.expiresAt).getTime() < Date.now();
  }

  /** Soonest-expiring usable entitlement of this professional type, if any. Needs loadEntitlements() first. */
  findAvailable(professionalType: string): Entitlement | undefined {
    return this.entitlements()
      .filter(e => e.professionalType === professionalType && !this.isExpired(e) && e.remainingSessions > 0)
      .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())[0];
  }
}
