import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommerceService } from '../../services/commerce.service';
import { Order, Plan } from '../../models/commerce.models';

/**
 * Mock checkout page — literally what the roadmap's Phase 2 API section describes:
 * "a simulated checkout page with 'Pay successfully' / 'Fail payment' buttons that fires
 * the same webhook flow." Implemented client-side (see CommerceService) since there's no
 * real PaymentProvider yet. Route is guarded by verifiedGuard (app.routes.ts).
 */
@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="checkout-page">
      <div class="checkout-card card glass">
        @if (!plan()) {
          <p class="error-msg">That plan couldn't be found.</p>
          <a routerLink="/plans" class="btn btn-outline">Back to Plans</a>
        } @else if (order()?.status === 'PAID') {
          <!-- Shouldn't normally land here since we navigate away on success, but guard anyway -->
          <p>This order is already paid.</p>
          <a [routerLink]="['/orders', order()!.id]" class="btn btn-primary">View Receipt</a>
        } @else {
          <h1>Checkout</h1>
          <div class="order-summary">
            <div class="summary-row">
              <span>Plan</span>
              <strong>{{ plan()!.name }}</strong>
            </div>
            <div class="summary-row">
              <span>Sessions</span>
              <strong>{{ plan()!.totalSessions }}</strong>
            </div>
            <div class="summary-row">
              <span>Billing</span>
              <strong>{{ order()!.installment ? 'Installments' : 'Pay in full' }}</strong>
            </div>
            <div class="summary-row total">
              <span>Total</span>
              <strong>₹{{ order()!.amount | number }}</strong>
            </div>
          </div>

          <p class="sim-notice">⚠️ This is a simulated checkout — no real payment gateway is connected yet. Use the buttons below to simulate the outcome.</p>

          @if (order()?.status === 'FAILED') {
            <div class="status-banner is-error">Payment failed (simulated). You can try again below.</div>
          }

          <div class="pay-actions">
            <button class="btn btn-primary full-w" [disabled]="processing()" (click)="pay(true)">
              {{ processing() ? 'Processing…' : '✅ Pay Successfully' }}
            </button>
            <button class="btn btn-outline full-w" [disabled]="processing()" (click)="pay(false)">
              ❌ Simulate Failed Payment
            </button>
          </div>

          <a routerLink="/plans" class="back-link">← Back to Plans</a>
        }
      </div>
    </div>
  `,
  styles: [`
    .checkout-page { min-height: calc(100vh - 160px); display: flex; align-items: center; justify-content: center; padding: 3rem 1rem; }
    .checkout-card { max-width: 480px; width: 100%; padding: 2.5rem; border-radius: var(--radius-xl); background: #fff; box-shadow: 0 20px 45px rgba(27,51,39,0.08); border: 1px solid var(--border-light); }
    h1 { font-size: 1.5rem; color: var(--primary-deep); margin-bottom: 1.5rem; text-align: center; }

    .order-summary { background: var(--sage-50); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.25rem; }
    .summary-row { display: flex; justify-content: space-between; font-size: 0.9rem; color: var(--text-secondary); padding: 0.4rem 0; }
    .summary-row strong { color: var(--sage-900); }
    .summary-row.total { border-top: 1px solid var(--border-light); margin-top: 0.4rem; padding-top: 0.75rem; font-size: 1.05rem; }

    .sim-notice { font-size: 0.78rem; color: #92610a; background: #fff8eb; border: 1px solid #fbd38d; border-radius: var(--radius-md); padding: 0.65rem 0.9rem; margin-bottom: 1.25rem; }

    .status-banner { padding: 0.75rem 1rem; border-radius: 10px; margin-bottom: 1.25rem; font-size: 0.85rem; font-weight: 600; }
    .status-banner.is-error { background: #fdecea; color: #a0281c; border: 1px solid #f5b7b1; }

    .pay-actions { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.25rem; }
    .btn { padding: 0.8rem 1.25rem; border-radius: 10px; font-weight: 700; font-size: 0.95rem; cursor: pointer; border: none; transition: all 0.2s; }
    .btn-primary { background: #2e4f3e; color: #fff; }
    .btn-primary:hover:not(:disabled) { background: #1b3327; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-outline { background: transparent; border: 1.5px solid var(--border-color); color: var(--text-secondary); }
    .btn-outline:hover:not(:disabled) { background: var(--sage-50); }
    .full-w { width: 100%; }

    .error-msg { text-align: center; color: var(--text-secondary); margin-bottom: 1rem; }
    .back-link { display: block; text-align: center; font-size: 0.85rem; color: var(--text-muted); }
  `]
})
export class CheckoutComponent implements OnInit {
  private commerce = inject(CommerceService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  plan = signal<Plan | undefined>(undefined);
  order = signal<Order | undefined>(undefined);
  processing = signal(false);

  ngOnInit() {
    const params = this.route.snapshot.queryParamMap;
    const planId = Number(params.get('plan'));
    const installment = params.get('installment') === 'true';

    const plan = this.commerce.getPlan(planId);
    this.plan.set(plan);
    if (!plan) return;

    const order = this.commerce.createOrder(plan.id, installment);
    this.order.set(order);
  }

  pay(succeed: boolean) {
    const order = this.order();
    if (!order) return;
    this.processing.set(true);

    // No real network call exists yet — this just simulates the latency a webhook round-trip would have.
    setTimeout(() => {
      const updated = this.commerce.completePayment(order.id, succeed);
      this.order.set(updated);
      this.processing.set(false);
      if (updated.status === 'PAID') {
        this.router.navigate(['/orders', updated.id]);
      }
    }, 500);
  }
}
