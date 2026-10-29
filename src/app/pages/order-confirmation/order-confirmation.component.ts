import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommerceService } from '../../services/commerce.service';
import { Order } from '../../models/commerce.models';

@Component({
  selector: 'app-order-confirmation',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="confirmation-page">
      <div class="confirmation-card card glass">
        @if (!order()) {
          <p class="error-msg">That order couldn't be found.</p>
          <a routerLink="/plans" class="btn btn-outline">Back to Plans</a>
        } @else if (order()!.status !== 'PAID') {
          <p class="error-msg">
            This order hasn't been paid yet (status: {{ order()!.status === 'FAILED' ? 'payment failed' : 'pending' }}).
          </p>
          <a routerLink="/plans" class="btn btn-outline">Back to Plans</a>
        } @else {
          <span class="icon">🎉</span>
          <h1>Payment Successful</h1>
          <p class="lead">Your {{ order()!.planName }} plan is now active.</p>

          <div class="receipt">
            <div class="receipt-row"><span>Order ID</span><strong>{{ order()!.id }}</strong></div>
            <div class="receipt-row"><span>Plan</span><strong>{{ order()!.planName }}</strong></div>
            <div class="receipt-row"><span>Amount Paid</span><strong>₹{{ order()!.amount | number }}</strong></div>
            <div class="receipt-row"><span>Billing</span><strong>{{ order()!.installment ? 'Installments' : 'Pay in full' }}</strong></div>
            <div class="receipt-row"><span>Paid On</span><strong>{{ order()!.paidAt | date:'mediumDate' }}</strong></div>
          </div>

          <p class="sim-notice">⚠️ This receipt is simulated — no real payment gateway is connected yet, and this isn't a tax invoice.</p>

          <div class="actions">
            <a routerLink="/journey" class="btn btn-primary">View My Care Plan</a>
            <a routerLink="/profile" class="btn btn-outline">Go to Profile &amp; Privacy</a>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .confirmation-page { min-height: calc(100vh - 160px); display: flex; align-items: center; justify-content: center; padding: 3rem 1rem; }
    .confirmation-card { max-width: 480px; width: 100%; padding: 2.5rem; text-align: center; border-radius: var(--radius-xl); background: #fff; box-shadow: 0 20px 45px rgba(27,51,39,0.08); border: 1px solid var(--border-light); }
    .icon { font-size: 2.5rem; display: block; margin-bottom: 0.75rem; }
    h1 { font-size: 1.5rem; color: var(--primary-deep); margin-bottom: 0.5rem; }
    .lead { font-size: 0.92rem; color: var(--text-secondary); margin-bottom: 1.5rem; }

    .receipt { background: var(--sage-50); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.25rem; text-align: left; }
    .receipt-row { display: flex; justify-content: space-between; font-size: 0.88rem; color: var(--text-secondary); padding: 0.4rem 0; }
    .receipt-row strong { color: var(--sage-900); }

    .sim-notice { font-size: 0.78rem; color: #92610a; background: #fff8eb; border: 1px solid #fbd38d; border-radius: var(--radius-md); padding: 0.65rem 0.9rem; margin-bottom: 1.5rem; text-align: left; }

    .actions { display: flex; flex-direction: column; gap: 0.75rem; }
    .btn { padding: 0.8rem 1.25rem; border-radius: 10px; font-weight: 700; font-size: 0.95rem; cursor: pointer; border: none; transition: all 0.2s; text-decoration: none; display: inline-block; }
    .btn-primary { background: #2e4f3e; color: #fff; }
    .btn-primary:hover { background: #1b3327; }
    .btn-outline { background: transparent; border: 1.5px solid var(--border-color); color: var(--text-secondary); }
    .btn-outline:hover { background: var(--sage-50); }

    .error-msg { color: var(--text-secondary); margin-bottom: 1rem; }
  `]
})
export class OrderConfirmationComponent implements OnInit {
  private commerce = inject(CommerceService);
  private route = inject(ActivatedRoute);

  order = signal<Order | undefined>(undefined);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.order.set(this.commerce.getOrder(id));
  }
}
