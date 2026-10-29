import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CommerceService } from '../../services/commerce.service';
import { Plan } from '../../models/commerce.models';

/**
 * Plan comparison page (roadmap §Phase 2 UI). Public — no guard — since comparing plans
 * doesn't need a signed-in user; checkout is where verifiedGuard kicks in.
 */
@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [MatIconModule, CommonModule],
  template: `
    <div class="plans-page">
      <div class="container">
        <div class="plans-header">
          <h1>Choose Your Care Plan</h1>
          <p>Every plan includes access to your care coordination team — pick the level of support that fits you.</p>
        </div>

        <div class="draft-notice">
          <mat-icon class="icon-sm">info</mat-icon> Pricing and inclusions shown here are illustrative, pending final product/legal review.
          Payments on this prototype are simulated — no real charge is made.
        </div>

        <div class="billing-toggle">
          <button type="button" [class.active]="!installment()" (click)="installment.set(false)">Pay in full</button>
          <button type="button" [class.active]="installment()" (click)="installment.set(true)">Installments (+20%)</button>
        </div>

        <div class="plans-grid">
          @for (plan of plans; track plan.id) {
            <div class="plan-card card" [class.featured]="!!plan.badge">
              @if (plan.badge) {
                <span class="plan-badge">{{ plan.badge }}</span>
              }
              <h2>{{ plan.name }}</h2>
              <p class="tagline">{{ plan.tagline }}</p>

              <div class="price-block">
                <span class="price">₹{{ (installment() ? commerce.installmentPrice(plan) : plan.priceOneTime) | number }}</span>
                <span class="price-note">{{ installment() ? 'total, in installments' : 'one-time' }}</span>
              </div>

              <div class="session-count">{{ plan.totalSessions }} sessions · valid {{ plan.validityMonths }} months</div>

              <ul class="feature-list">
                @for (item of plan.inclusions; track item) {
                  <li class="included"><mat-icon class="icon-sm">check</mat-icon> <span>{{ item }}</span></li>
                }
                @for (item of plan.exclusions; track item) {
                  <li class="excluded"><mat-icon class="icon-sm">remove</mat-icon> <span>{{ item }}</span></li>
                }
              </ul>

              <button class="btn btn-primary full-w" (click)="choosePlan(plan)">Choose {{ plan.name }}</button>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .plans-page { padding: 3.5rem 0 5rem; }
    .plans-header { text-align: center; max-width: 620px; margin: 0 auto 1.5rem; }
    .plans-header h1 { font-size: 2.1rem; color: var(--sage-900); margin-bottom: 0.5rem; }
    .plans-header p { color: var(--text-secondary); font-size: 1rem; }

    .draft-notice {
      max-width: 720px;
      margin: 0 auto 1.75rem;
      font-size: 0.8rem;
      color: #92610a;
      background: #fff8eb;
      border: 1px solid #fbd38d;
      border-radius: var(--radius-md);
      padding: 0.7rem 1rem;
      text-align: center;
    }

    .billing-toggle {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
      margin-bottom: 2.5rem;
    }
    .billing-toggle button {
      padding: 0.6rem 1.25rem;
      border-radius: var(--radius-full);
      border: 1.5px solid var(--border-color);
      background: #fff;
      font-size: 0.88rem;
      font-weight: 700;
      color: var(--text-secondary);
      cursor: pointer;
    }
    .billing-toggle button.active {
      background: var(--sage-900);
      color: #fff;
      border-color: var(--sage-900);
    }

    .plans-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.75rem;
      max-width: 1100px;
      margin: 0 auto;
    }
    .plan-card {
      position: relative;
      padding: 2rem;
      border-radius: var(--radius-xl);
      border: 1px solid var(--border-light);
      background: #fff;
      display: flex;
      flex-direction: column;
    }
    .plan-card.featured {
      border-color: var(--sage-700);
      box-shadow: 0 12px 32px rgba(46,79,62,0.12);
    }
    .plan-badge {
      position: absolute;
      top: -12px;
      left: 2rem;
      background: var(--blush-700);
      color: #fff;
      font-size: 0.68rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.3rem 0.75rem;
      border-radius: var(--radius-full);
    }
    .plan-card h2 { font-size: 1.4rem; color: var(--sage-900); margin-bottom: 0.4rem; }
    .tagline { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem; min-height: 2.5rem; }

    .price-block { margin-bottom: 0.35rem; }
    .price { font-size: 2rem; font-weight: 800; color: var(--sage-900); }
    .price-note { font-size: 0.78rem; color: var(--text-muted); margin-left: 0.35rem; }
    .session-count {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--blush-700);
      margin-bottom: 1.5rem;
    }

    .feature-list { list-style: none; display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1.75rem; flex: 1; }
    .feature-list li { font-size: 0.85rem; line-height: 1.4; display: flex; align-items: flex-start; gap: 0.45rem; }
    .feature-list li mat-icon { flex-shrink: 0; margin-top: 0.05rem; }
    .feature-list li.included mat-icon { color: var(--sage-600); }
    .feature-list li.included { color: var(--text-primary); }
    .feature-list li.excluded { color: var(--text-muted); }

    .full-w { width: 100%; }

    @media (max-width: 992px) {
      .plans-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class PlansComponent {
  commerce = inject(CommerceService);
  router = inject(Router);

  plans = this.commerce.getPlans();
  installment = signal(false);

  choosePlan(plan: Plan) {
    this.router.navigate(['/checkout'], { queryParams: { plan: plan.id, installment: this.installment() } });
  }
}
