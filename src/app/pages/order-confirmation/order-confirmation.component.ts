import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CommerceService } from '../../services/commerce.service';
import { Entitlement, Order, planDisplayName } from '../../models/commerce.models';
import { PROFESSIONAL_TYPE_LABELS } from '../../models/maternal.models';

@Component({
  selector: 'app-order-confirmation',
  standalone: true,
  imports: [MatIconModule, CommonModule, RouterLink],
  template: `
    <div class="confirmation-page">
      <div class="confirmation-card glass animate-in">
        @if (loading()) {
          <div class="skeleton" style="height: 260px"></div>
        } @else if (!order()) {
          <mat-icon class="hero-icon">search_off</mat-icon>
          <p class="error-msg">That order couldn't be found.</p>
          <a routerLink="/plans" class="btn btn-outline">Back to Plans</a>
        } @else if (order()!.status !== 'PAID') {
          <mat-icon class="hero-icon">hourglass_empty</mat-icon>
          <p class="error-msg">
            This order hasn't been paid yet (status: {{ statusLabel(order()!.status) }}).
          </p>
          <a routerLink="/plans" class="btn btn-outline">Back to Plans</a>
        } @else {
          <mat-icon class="hero-icon">task_alt</mat-icon>
          <h1>Payment Successful</h1>
          <p class="lead">Your {{ planName(order()!.planCode) }} plan is now active.</p>

          <div class="receipt">
            <div class="receipt-row"><span>Order</span><strong>#{{ order()!.id }}</strong></div>
            <div class="receipt-row"><span>Plan</span><strong>{{ planName(order()!.planCode) }}</strong></div>
            <div class="receipt-row"><span>Amount</span><strong>₹{{ order()!.price | number:'1.0-2' }}</strong></div>
            <div class="receipt-row"><span>Billing</span><strong>{{ order()!.paymentMode === 'INSTALLMENT' ? 'Installments' : 'Pay in full' }}</strong></div>
            <div class="receipt-row"><span>Order date</span><strong>{{ order()!.createdAt | date:'mediumDate' }}</strong></div>
          </div>

          @if (granted().length) {
            <div class="granted">
              <h3>Sessions added to your plan</h3>
              @for (e of granted(); track e.id) {
                <div class="granted-row">
                  <span>{{ professionalLabel(e.professionalType) }}</span>
                  <strong>{{ e.totalSessions }} sessions</strong>
                </div>
              }
              <span class="field-hint">Valid until {{ granted()[0].expiresAt | date:'mediumDate' }}</span>
            </div>
          }

          <p class="sim-notice"><mat-icon class="icon-sm">info</mat-icon> Simulated payment — no real gateway was charged, and this isn't a tax invoice.</p>

          <div class="actions">
            <a routerLink="/care" class="btn btn-primary">Book your first session</a>
            <a routerLink="/journey" class="btn btn-outline">View My Care Plan</a>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .confirmation-page { min-height: calc(100vh - 160px); display: flex; align-items: center; justify-content: center; padding: 3rem 1rem; }
    .confirmation-card { max-width: 500px; width: 100%; padding: 2.5rem; text-align: center; border-radius: var(--radius-xl); }
    h1 { font-size: 1.5rem; color: var(--sage-900); margin-bottom: 0.5rem; }
    .lead { font-size: 0.92rem; color: var(--text-secondary); margin-bottom: 1.5rem; }

    .receipt { background: var(--sage-50); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.25rem; text-align: left; }
    .receipt-row { display: flex; justify-content: space-between; font-size: 0.88rem; color: var(--text-secondary); padding: 0.4rem 0; }
    .receipt-row strong { color: var(--sage-900); }

    .granted { text-align: left; background: var(--trust-50); border: 1px solid var(--trust-200); border-radius: var(--radius-md); padding: 1rem 1.25rem; margin-bottom: 1.25rem; }
    .granted h3 { font-family: var(--font-sans); font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--trust-900); margin-bottom: 0.5rem; }
    .granted-row { display: flex; justify-content: space-between; font-size: 0.86rem; color: var(--text-secondary); padding: 0.25rem 0; }
    .granted-row strong { color: var(--trust-900); }
    .field-hint { display: block; margin-top: 0.4rem; font-size: 0.75rem; color: var(--text-muted); }

    .sim-notice { font-size: 0.78rem; color: var(--warn-text); background: var(--warn-bg); border: 1px solid var(--warn-border); border-radius: var(--radius-md); padding: 0.65rem 0.9rem; margin-bottom: 1.5rem; text-align: left; }

    .actions { display: flex; flex-direction: column; gap: 0.75rem; }
    .error-msg { color: var(--text-secondary); margin-bottom: 1rem; }
  `]
})
export class OrderConfirmationComponent implements OnInit {
  private commerce = inject(CommerceService);
  private route = inject(ActivatedRoute);

  loading = signal(true);
  order = signal<Order | undefined>(undefined);
  granted = signal<Entitlement[]>([]);

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    forkJoin({
      order: this.commerce.getOrder(id),
      entitlements: this.commerce.loadEntitlements()
    }).subscribe({
      next: ({ order, entitlements }) => {
        this.order.set(order);
        this.granted.set(entitlements.filter(e => e.orderId === order.id));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  planName(code: string): string {
    return planDisplayName(code);
  }

  professionalLabel(type: string): string {
    return (PROFESSIONAL_TYPE_LABELS as Record<string, string>)[type] ?? type;
  }

  statusLabel(status: string): string {
    return status.toLowerCase().replace(/_/g, ' ');
  }
}
