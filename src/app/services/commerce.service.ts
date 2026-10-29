import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { environment } from '../../environments/environment';
import { Entitlement, Order, Payment, PaymentMode, Plan } from '../models/commerce.models';

/**
 * Phase 2 (Plans, checkout & entitlements) against the real API — UI_INTEGRATION_GUIDE.md §8.
 *
 * One deliberate client-side piece remains: session *consumption*. The API's entitlements
 * always report usedSessions=0 because booking/session-completion is its Phase 3, which
 * doesn't exist yet. The UI's Phase 3 booking mock still needs to "spend" a session, so it
 * records usage in a per-user localStorage overlay subtracted from the server's
 * remainingSessions. Drop the overlay once the API consumes sessions itself.
 */
@Injectable({ providedIn: 'root' })
export class CommerceService {
  private http = inject(HttpClient);
  private api = inject(ApiService);
  private readonly baseUrl = environment.apiUrl;

  readonly entitlements = signal<Entitlement[]>([]);

  getPlans(): Observable<Plan[]> {
    return this.http.get<Plan[]>(`${this.baseUrl}/plans`);
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

  // --- Local session-consumption overlay (see class comment) ---

  effectiveRemaining(e: Entitlement): number {
    return Math.max(0, e.remainingSessions - (this.readUsage()[e.id] ?? 0));
  }

  isExpired(e: Entitlement): boolean {
    return new Date(e.expiresAt).getTime() < Date.now();
  }

  /** The soonest-expiring usable entitlement for this professional type, if any. Needs loadEntitlements() first. */
  findAvailable(professionalType: string): Entitlement | undefined {
    return this.entitlements()
      .filter(e => e.professionalType === professionalType && !this.isExpired(e) && this.effectiveRemaining(e) > 0)
      .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())[0];
  }

  consumeSession(professionalType: string): Entitlement | null {
    const target = this.findAvailable(professionalType);
    if (!target) return null;
    const usage = this.readUsage();
    usage[target.id] = (usage[target.id] ?? 0) + 1;
    this.writeUsage(usage);
    this.entitlements.set([...this.entitlements()]);
    return target;
  }

  refundSession(entitlementId: number | string | null) {
    if (entitlementId === null || entitlementId === undefined) return;
    const usage = this.readUsage();
    const key = Number(entitlementId);
    if (!usage[key]) return;
    usage[key] -= 1;
    this.writeUsage(usage);
    this.entitlements.set([...this.entitlements()]);
  }

  private usageKey(): string {
    return `nb_session_usage_${this.api.currentUser()?.id ?? 'guest'}`;
  }

  private readUsage(): Record<number, number> {
    try {
      const raw = localStorage.getItem(this.usageKey());
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private writeUsage(usage: Record<number, number>) {
    localStorage.setItem(this.usageKey(), JSON.stringify(usage));
  }
}
