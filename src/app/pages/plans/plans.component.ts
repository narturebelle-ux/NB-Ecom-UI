import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { map, tap } from 'rxjs';
import { CommerceService } from '../../services/commerce.service';
import { PLAN_PRESENTATION, Plan, PlanQuote } from '../../models/commerce.models';
import { PROFESSIONAL_TYPE_LABELS } from '../../models/maternal.models';

/** Plan comparison — public (GET /api/v1/plans needs no auth); checkout is where verifiedGuard applies. */
@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [MatIconModule, CommonModule],
  template: `
    <div class="plans-page">
      <div class="container">
        <div class="plans-header animate-in">
          <h1>Choose Your Care Plan</h1>
          <p>Every plan includes access to your care coordination team — pick the level of support that fits you.</p>
          @if (quote(); as q) {
            <p class="quote-note">
              <mat-icon class="icon-sm">event</mat-icon>
              @if (q.basis === 'DUE_DATE') { Priced for <strong>{{ q.months }} {{ q.months === 1 ? 'month' : 'months' }}</strong> until your due date. Sessions are adjusted to match. }
              @else { Full 9-month plans. Add your due date on My Journey to pay only for the months you need. }
            </p>
          } @else if (!api.currentUser()) {
            <p class="quote-note"><mat-icon class="icon-sm">info</mat-icon> Prices below are for 9 months. Sign in and add your due date to pay only for the months until your baby arrives.</p>
          }
        </div>

        <div class="draft-notice">
          <mat-icon class="icon-sm">info</mat-icon> Session allocations, validity and inclusions are provisional and may change before launch.
          Payments on this prototype are simulated — no real charge is made.
        </div>

        <div class="billing-toggle">
          <button type="button" [class.active]="!installment()" (click)="installment.set(false)">Pay in full</button>
          <button type="button" [class.active]="installment()" (click)="installment.set(true)">Installments</button>
        </div>

        @if (loading()) {
          <div class="plans-grid">
            @for (i of [1, 2, 3]; track i) {
              <div class="plan-card skeleton-card"><div class="skeleton" style="height: 340px"></div></div>
            }
          </div>
        } @else if (errorMsg()) {
          <div class="error-box">
            <mat-icon class="icon-sm">error_outline</mat-icon> {{ errorMsg() }}
            <button class="btn-link" (click)="load()">Try again</button>
          </div>
        } @else {
          <div class="plans-grid">
            @for (plan of plans(); track plan.id; let i = $index) {
              <div class="plan-card card animate-in" [class.featured]="!!badge(plan)" [style.animation-delay.ms]="i * 80">
                @if (badge(plan)) {
                  <span class="plan-badge">{{ badge(plan) }}</span>
                }
                <h2>{{ plan.name }}</h2>
                <p class="tagline">{{ tagline(plan) }}</p>

                <div class="price-block">
                  <span class="price">₹{{ (installment() ? plan.installmentTotalPrice : plan.oneTimePrice) | number:'1.0-0' }}</span>
                  <span class="price-note">{{ installment() ? 'total, in ' + plan.installmentCount + ' installments' : 'one-time' }}</span>
                </div>

                @if (plan.months && plan.months < 9 && plan.fullOneTimePrice) {
                  <div class="prorated">₹{{ plan.monthlyPrice | number:'1.0-0' }}/month × {{ plan.months }} · full 9 months ₹{{ plan.fullOneTimePrice | number:'1.0-0' }}</div>
                }
                <div class="session-count">{{ plan.totalSessions }} sessions · valid {{ validityLabel(plan.validityDays) }}</div>

                <div class="allocations">
                  @for (a of plan.allocations; track a.professionalType) {
                    <span class="allocation-chip">{{ a.sessionCount }} × {{ professionalLabel(a.professionalType) }}</span>
                  }
                </div>

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
        }
      </div>
    </div>
  `,
  styles: [`
    .quote-note { display: inline-flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; justify-content: center; margin-top: 0.75rem; font-size: 0.88rem; color: var(--sage-900); background: var(--sage-50); border: 1px solid var(--border-subtle); border-radius: var(--radius-full); padding: 0.4rem 0.9rem; }
    .prorated { font-size: 0.78rem; color: var(--text-muted); margin-top: 0.15rem; }
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
      border: 1.5px solid var(--border-light);
      background: var(--bg-glass-strong);
      font-size: 0.88rem;
      font-weight: 700;
      color: var(--text-secondary);
      cursor: pointer;
      transition: background-color var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
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
      background: var(--bg-glass-strong);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      display: flex;
      flex-direction: column;
      overflow: visible;
    }
    .plan-card.featured {
      border-color: var(--sage-600);
      box-shadow: var(--shadow-lg);
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
      margin-bottom: 0.85rem;
    }

    .allocations { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 1.25rem; }
    .allocation-chip {
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--sage-800);
      background: var(--sage-50);
      border: 1px solid var(--border-light);
      padding: 0.25rem 0.6rem;
      border-radius: var(--radius-full);
    }

    .feature-list { list-style: none; display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1.75rem; flex: 1; }
    .feature-list li { font-size: 0.85rem; line-height: 1.4; display: flex; align-items: flex-start; gap: 0.45rem; }
    .feature-list li mat-icon { flex-shrink: 0; margin-top: 0.05rem; }
    .feature-list li.included mat-icon { color: var(--sage-600); }
    .feature-list li.included { color: var(--text-primary); }
    .feature-list li.excluded { color: var(--text-muted); }

    .full-w { width: 100%; }

    .skeleton-card { padding: 0; border: none; background: transparent; backdrop-filter: none; }
    .error-box {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      flex-wrap: wrap;
      max-width: 560px;
      margin: 0 auto;
      padding: 1rem 1.25rem;
      border-radius: var(--radius-md);
      background: #fdecea;
      color: #a0281c;
      border: 1px solid #f5b7b1;
      font-size: 0.9rem;
    }
    .btn-link { color: #a0281c; font-weight: 700; text-decoration: underline; }

    @media (max-width: 992px) {
      .plans-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class PlansComponent implements OnInit {
  private commerce = inject(CommerceService);
  api = inject(ApiService);
  quote = signal<PlanQuote | null>(null);
  private router = inject(Router);

  plans = signal<Plan[]>([]);
  loading = signal(true);
  errorMsg = signal<string | null>(null);
  installment = signal(false);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.errorMsg.set(null);
    // Signed in: her own prorated prices. Visitors: the public 9-month list.
    const plans$ = this.api.currentUser()
      ? this.commerce.getQuote().pipe(tap(q => this.quote.set(q)), map(q => q.plans))
      : this.commerce.getPlans();
    plans$.subscribe({
      next: (plans) => {
        this.plans.set(plans);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMsg.set("We couldn't load care plans right now.");
      }
    });
  }

  badge(plan: Plan): string | undefined {
    return PLAN_PRESENTATION[plan.code]?.badge;
  }

  tagline(plan: Plan): string {
    return PLAN_PRESENTATION[plan.code]?.tagline ?? '';
  }

  validityLabel(days: number): string {
    const months = Math.round(days / 30.4);
    return months >= 1 ? `${months} months` : `${days} days`;
  }

  professionalLabel(type: string): string {
    return (PROFESSIONAL_TYPE_LABELS as Record<string, string>)[type] ?? type;
  }

  choosePlan(plan: Plan) {
    this.router.navigate(['/checkout'], {
      queryParams: { plan: plan.id, mode: this.installment() ? 'INSTALLMENT' : 'ONE_TIME' }
    });
  }
}
