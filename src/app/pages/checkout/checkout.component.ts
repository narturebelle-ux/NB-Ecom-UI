import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { CommerceService } from '../../services/commerce.service';
import { Order, Payment, PaymentMode, Plan } from '../../models/commerce.models';

type Stage = 'loading' | 'review' | 'creating' | 'pay' | 'paying' | 'failed' | 'error';

/**
 * Checkout against the real Phase 2 API (UI_INTEGRATION_GUIDE.md §8):
 * review → POST /orders (Idempotency-Key) → POST /payments/create → simulated pay via the
 * mockSucceedPath/mockFailPath the API returns. The pay step is a temporary prototype
 * affordance; those mock endpoints disappear when Phase 7 ships a real gateway.
 */
@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [MatIconModule, CommonModule, RouterLink],
  template: `
    <div class="checkout-page">
      <div class="checkout-card glass animate-in">
        @switch (stage()) {
          @case ('loading') {
            <div class="skeleton" style="height: 220px"></div>
          }
          @case ('error') {
            <mat-icon class="hero-icon">error_outline</mat-icon>
            <p class="center-msg">{{ errorMsg() }}</p>
            <div class="stack">
              @if (plan()) {
                <button class="btn btn-primary full-w" (click)="confirmOrder()">Try again</button>
              }
              <a routerLink="/plans" class="btn btn-outline full-w">Back to Plans</a>
            </div>
          }
          @case ('failed') {
            <mat-icon class="hero-icon failed-icon">credit_card_off</mat-icon>
            <h1>Payment didn't go through</h1>
            <p class="center-msg">This was a simulated failure — nothing was charged. You can start a fresh attempt.</p>
            <div class="stack">
              <button class="btn btn-primary full-w" (click)="startOver()">Try again</button>
              <a routerLink="/plans" class="btn btn-outline full-w">Back to Plans</a>
            </div>
          }
          @default {
            <h1>Checkout</h1>
            <div class="steps">
              <span class="step" [class.done]="stage() !== 'review' && stage() !== 'creating'">1 · Review</span>
              <span class="step-line"></span>
              <span class="step" [class.current]="stage() === 'pay' || stage() === 'paying'">2 · Pay</span>
            </div>

            <div class="order-summary">
              <div class="summary-row"><span>Plan</span><strong>{{ plan()?.name }}</strong></div>
              <div class="summary-row"><span>Sessions</span><strong>{{ plan()?.totalSessions }}</strong></div>
              <div class="summary-row"><span>Billing</span><strong>{{ mode === 'INSTALLMENT' ? 'Installments' : 'Pay in full' }}</strong></div>
              @if (order(); as o) {
                <div class="summary-row total">
                  <span>Total <span class="verified-tag"><mat-icon class="icon-sm">verified</mat-icon> confirmed by server</span></span>
                  <strong>₹{{ o.price | number:'1.0-2' }}</strong>
                </div>
                @if (o.installmentSchedule.length) {
                  <div class="schedule">
                    @for (inst of o.installmentSchedule; track inst.installmentNumber) {
                      <div class="schedule-row">
                        <span>Installment {{ inst.installmentNumber }} · due {{ inst.dueDate | date:'mediumDate' }}</span>
                        <span>₹{{ inst.amount | number:'1.0-2' }}</span>
                      </div>
                    }
                    <p class="field-hint">In this prototype the simulated payment settles the full amount at once.</p>
                  </div>
                }
              } @else {
                <div class="summary-row total">
                  <span>Estimated total</span>
                  <strong>₹{{ estimatedPrice() | number:'1.0-0' }}</strong>
                </div>
              }
            </div>

            @if (stage() === 'review' || stage() === 'creating') {
              <button class="btn btn-primary full-w" [disabled]="stage() === 'creating'" (click)="confirmOrder()">
                @if (stage() === 'creating') { Confirming… } @else { Confirm order <mat-icon class="icon-sm">arrow_forward</mat-icon> }
              </button>
            } @else {
              <p class="sim-notice"><mat-icon class="icon-sm">info</mat-icon> Simulated payment — no real gateway is connected yet and nothing is charged.</p>
              <div class="stack">
                <button class="btn btn-primary full-w" [disabled]="stage() === 'paying'" (click)="pay(true)">
                  @if (stage() === 'paying') { Processing… } @else { <mat-icon class="icon-sm">lock</mat-icon> Pay ₹{{ order()?.price | number:'1.0-2' }} }
                </button>
                <button class="btn btn-outline full-w" [disabled]="stage() === 'paying'" (click)="pay(false)">
                  <mat-icon class="icon-sm">block</mat-icon> Simulate failed payment
                </button>
              </div>
            }

            <a routerLink="/plans" class="back-link">← Back to Plans</a>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .checkout-page { min-height: calc(100vh - 160px); display: flex; align-items: center; justify-content: center; padding: 3rem 1rem; }
    .checkout-card { max-width: 500px; width: 100%; padding: 2.5rem; border-radius: var(--radius-xl); }
    h1 { font-size: 1.5rem; color: var(--primary-deep, var(--sage-900)); margin-bottom: 1.25rem; text-align: center; }

    .steps { display: flex; align-items: center; justify-content: center; gap: 0.6rem; margin-bottom: 1.5rem; font-size: 0.78rem; font-weight: 700; color: var(--text-muted); }
    .step.done { color: var(--sage-600); }
    .step.current { color: var(--sage-900); }
    .step-line { width: 36px; height: 1px; background: var(--border-light); }

    .order-summary { background: var(--sage-50); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.25rem; }
    .summary-row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; font-size: 0.9rem; color: var(--text-secondary); padding: 0.4rem 0; }
    .summary-row strong { color: var(--sage-900); }
    .summary-row.total { border-top: 1px solid var(--border-light); margin-top: 0.4rem; padding-top: 0.75rem; font-size: 1.05rem; }
    .verified-tag { display: inline-flex; align-items: center; gap: 0.2rem; font-size: 0.7rem; font-weight: 700; color: var(--trust-700); margin-left: 0.35rem; }

    .schedule { margin-top: 0.6rem; border-top: 1px dashed var(--border-light); padding-top: 0.6rem; }
    .schedule-row { display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-secondary); padding: 0.2rem 0; }
    .field-hint { display: block; margin-top: 0.4rem; font-size: 0.75rem; color: var(--text-muted); }

    .sim-notice { font-size: 0.78rem; color: #92610a; background: #fff8eb; border: 1px solid #fbd38d; border-radius: var(--radius-md); padding: 0.65rem 0.9rem; margin-bottom: 1.25rem; }

    .stack { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.25rem; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
    .full-w { width: 100%; }

    .center-msg { text-align: center; color: var(--text-secondary); margin-bottom: 1.25rem; font-size: 0.92rem; }
    .failed-icon { color: var(--blush-700); background: var(--blush-50); }
    .back-link { display: block; text-align: center; font-size: 0.85rem; color: var(--text-muted); }
  `]
})
export class CheckoutComponent implements OnInit {
  private commerce = inject(CommerceService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  stage = signal<Stage>('loading');
  errorMsg = signal<string | null>(null);
  plan = signal<Plan | undefined>(undefined);
  order = signal<Order | undefined>(undefined);
  payment = signal<Payment | undefined>(undefined);

  mode: PaymentMode = 'ONE_TIME';
  private planId = 0;
  // One key per checkout attempt; reused on retries of the same attempt so a double-tap or
  // network retry returns the original order instead of creating a duplicate.
  private idempotencyKey = '';

  ngOnInit() {
    const params = this.route.snapshot.queryParamMap;
    this.planId = Number(params.get('plan'));
    this.mode = params.get('mode') === 'INSTALLMENT' ? 'INSTALLMENT' : 'ONE_TIME';
    this.idempotencyKey = this.commerce.newIdempotencyKey();

    this.commerce.getPlan(this.planId).subscribe({
      next: (plan) => {
        this.plan.set(plan);
        this.stage.set('review');
      },
      error: () => this.fail("That plan couldn't be found or isn't available right now.")
    });
  }

  estimatedPrice(): number {
    const p = this.plan();
    if (!p) return 0;
    return this.mode === 'INSTALLMENT' ? p.installmentTotalPrice : p.oneTimePrice;
  }

  confirmOrder() {
    this.stage.set('creating');
    this.errorMsg.set(null);
    this.commerce.createOrder(this.planId, this.mode, this.idempotencyKey).pipe(
      switchMap(order => {
        this.order.set(order);
        return this.commerce.createPayment(order.id);
      })
    ).subscribe({
      next: (payment) => {
        this.payment.set(payment);
        this.stage.set('pay');
      },
      error: (err) => {
        if (err?.status === 401 || err?.status === 403) return; // interceptor handles redirects
        if (err?.error?.code === 'PAYMENT_NOT_ALLOWED') {
          // The order from this key is no longer PENDING (e.g. already paid/failed) — start fresh.
          this.startOver();
          return;
        }
        this.fail(err?.error?.message || "We couldn't confirm your order. Please try again.");
      }
    });
  }

  pay(succeed: boolean) {
    const payment = this.payment();
    const order = this.order();
    if (!payment || !order) return;
    this.stage.set('paying');
    this.commerce.completeMockPayment(succeed ? payment.mockSucceedPath : payment.mockFailPath).subscribe({
      next: (res) => {
        if (res.status === 'PAYMENT_SUCCEEDED') {
          this.router.navigate(['/orders', order.id]);
        } else {
          this.stage.set('failed');
        }
      },
      error: (err) => {
        if (err?.status === 401 || err?.status === 403) return;
        this.stage.set('pay');
        this.fail(err?.error?.message || 'Payment could not be completed. Please try again.');
      }
    });
  }

  startOver() {
    this.idempotencyKey = this.commerce.newIdempotencyKey();
    this.order.set(undefined);
    this.payment.set(undefined);
    this.errorMsg.set(null);
    this.stage.set(this.plan() ? 'review' : 'loading');
  }

  private fail(msg: string) {
    this.errorMsg.set(msg);
    this.stage.set('error');
  }
}
