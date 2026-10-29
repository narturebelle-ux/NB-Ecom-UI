import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Entitlement, MOCK_PLANS, Order, Plan, installmentTotal } from '../models/commerce.models';

/**
 * Phase 2 (Plans, checkout & entitlements), implemented entirely client-side — no
 * GET /plans, POST /orders, POST /payments/* or GET /entitlements exist on the API yet
 * (requested, see API_Integration.md §13/14). Orders/entitlements persist to localStorage,
 * scoped per signed-in user id, same pattern as ApiService's cart. This is a real,
 * usable prototype of the roadmap's "MockPaymentProvider" — not a placeholder — but it is
 * NOT synced to any backend; it disappears if the user clears site data, and nothing here
 * should be treated as a source of truth once the real Order/Payment API ships.
 */
@Injectable({ providedIn: 'root' })
export class CommerceService {
  private api = inject(ApiService);

  getPlans(): Plan[] {
    return MOCK_PLANS;
  }

  getPlan(id: number): Plan | undefined {
    return MOCK_PLANS.find(p => p.id === id);
  }

  installmentPrice(plan: Plan): number {
    return installmentTotal(plan);
  }

  getOrders(): Order[] {
    return this.readJson<Order[]>(this.ordersKey(), []);
  }

  getOrder(id: string): Order | undefined {
    return this.getOrders().find(o => o.id === id);
  }

  getEntitlements(): Entitlement[] {
    return this.readJson<Entitlement[]>(this.entitlementsKey(), []);
  }

  createOrder(planId: number, installment: boolean): Order {
    const plan = this.getPlan(planId);
    if (!plan) {
      throw new Error('Unknown plan.');
    }
    const order: Order = {
      id: 'ord_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      planId: plan.id,
      planName: plan.name,
      amount: installment ? this.installmentPrice(plan) : plan.priceOneTime,
      installment,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };
    const orders = this.getOrders();
    orders.push(order);
    this.writeJson(this.ordersKey(), orders);
    return order;
  }

  /** Simulates the webhook flow a real PaymentProvider would fire — succeed=false models "Fail payment". */
  completePayment(orderId: string, succeed: boolean): Order {
    const orders = this.getOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      throw new Error('Order not found.');
    }
    order.status = succeed ? 'PAID' : 'FAILED';
    if (succeed) {
      order.paidAt = new Date().toISOString();
      this.grantEntitlement(order);
    }
    this.writeJson(this.ordersKey(), orders);
    return order;
  }

  private grantEntitlement(order: Order) {
    const plan = this.getPlan(order.planId);
    if (!plan) return;
    const purchasedAt = new Date();
    const expiresAt = new Date(purchasedAt);
    expiresAt.setMonth(expiresAt.getMonth() + plan.validityMonths);

    const entitlements = this.getEntitlements();
    entitlements.push({
      id: 'ent_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      planId: plan.id,
      planName: plan.name,
      totalSessions: plan.totalSessions,
      usedSessions: 0,
      purchasedAt: purchasedAt.toISOString(),
      expiresAt: expiresAt.toISOString()
    });
    this.writeJson(this.entitlementsKey(), entitlements);
  }

  /** True if any non-expired entitlement still has at least one session left. */
  hasAvailableSession(): boolean {
    return this.getEntitlements().some(e => this.sessionsRemaining(e) > 0 && !this.isExpired(e));
  }

  sessionsRemaining(e: Entitlement): number {
    return e.totalSessions - e.usedSessions;
  }

  isExpired(e: Entitlement): boolean {
    return new Date(e.expiresAt).getTime() < Date.now();
  }

  /** Consumes one session from the oldest non-expired entitlement that still has one. Used when a booking is confirmed. */
  consumeSession(): Entitlement | null {
    const entitlements = this.getEntitlements();
    const target = entitlements
      .filter(e => this.sessionsRemaining(e) > 0 && !this.isExpired(e))
      .sort((a, b) => new Date(a.purchasedAt).getTime() - new Date(b.purchasedAt).getTime())[0];
    if (!target) return null;
    target.usedSessions += 1;
    this.writeJson(this.entitlementsKey(), entitlements);
    return target;
  }

  /** Reverses consumeSession() — used when a booking is cancelled. */
  refundSession(entitlementId: string | null) {
    if (!entitlementId) return;
    const entitlements = this.getEntitlements();
    const target = entitlements.find(e => e.id === entitlementId);
    if (target && target.usedSessions > 0) {
      target.usedSessions -= 1;
      this.writeJson(this.entitlementsKey(), entitlements);
    }
  }

  private ordersKey(): string {
    return `nb_orders_${this.api.currentUser()?.id ?? 'guest'}`;
  }

  private entitlementsKey(): string {
    return `nb_entitlements_${this.api.currentUser()?.id ?? 'guest'}`;
  }

  private readJson<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) as T : fallback;
    } catch {
      return fallback;
    }
  }

  private writeJson(key: string, value: unknown) {
    localStorage.setItem(key, JSON.stringify(value));
  }
}
