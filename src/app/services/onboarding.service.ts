import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Observable, map, of, switchMap, tap } from 'rxjs';
import { ApiService } from './api.service';
import { CommerceService } from './commerce.service';
import { Plan } from '../models/commerce.models';
import {
  IntakeAnswers,
  ONBOARDING_DOCUMENTS,
  OnboardingCall,
  OnboardingState,
  OnboardingStep,
  RISK_FACTOR_LABELS,
  SUPPORT_NEED_LABELS
} from '../models/onboarding.models';

export interface PlanRecommendation {
  planCode: string;
  reasons: string[];
}

/**
 * Drives the post-signup onboarding flow (see onboarding.models.ts). Stage/EDD go to the real
 * Journey API and payment is read from the real Orders API; everything else is held per user
 * in localStorage until the onboarding API (API_Integration.md §18) exists.
 */
@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private api = inject(ApiService);
  private commerce = inject(CommerceService);

  readonly state = signal<OnboardingState>({});

  readonly step = computed<OnboardingStep>(() => {
    const s = this.state();
    if (s.onboardedAt) return 'done';
    if (!s.intake) return 'intake';
    if (!s.paidOrderId) return 'plan';
    if (!s.call) return 'call';
    if (!s.documents) return 'documents';
    return 'welcome';
  });

  readonly onboarded = computed(() => this.step() === 'done');

  constructor() {
    // Reload whenever the signed-in user changes (sign in / out / switch account).
    effect(() => {
      const id = this.api.currentUser()?.id;
      this.state.set(id ? this.read(id) : {});
    });
  }

  /** Persists stage + EDD to the real Journey API (create, or update the active one), then the rest locally. */
  saveIntake(answers: IntakeAnswers): Observable<void> {
    return this.api.getJourneys().pipe(
      switchMap(journeys => {
        const active = journeys.find(j => j.status !== 'CLOSED');
        return active
          ? this.api.updateJourney(active.id, { status: answers.stage, expectedDeliveryDate: answers.expectedDeliveryDate })
          : this.api.createJourney(answers.stage, answers.expectedDeliveryDate);
      }),
      tap(() => this.patch({ intake: { ...answers, savedAt: new Date().toISOString() } })),
      map(() => undefined)
    );
  }

  /**
   * Transparent rule-based suggestion from the intake answers. Not a clinical judgement —
   * the UI says so, lets the user pick any plan, and the care coordinator reviews it on the call.
   */
  recommend(plans: Plan[]): PlanRecommendation | null {
    const intake = this.state().intake;
    if (!intake || !plans.length) return null;

    const codes = new Set(plans.map(p => p.code));
    const pick = (code: string) => (codes.has(code) ? code : plans[0].code);

    const premiumReasons: string[] = [];
    if (intake.multiples) premiumReasons.push('You’re expecting more than one baby');
    for (const r of intake.riskFactors) premiumReasons.push(`You mentioned: ${RISK_FACTOR_LABELS[r].toLowerCase()}`);
    if (premiumReasons.length) {
      return { planCode: pick('PREMIUM'), reasons: [...premiumReasons, 'Premium has the most sessions and a dedicated care coordinator'] };
    }

    const careReasons: string[] = [];
    const careNeeds = intake.supportNeeds.filter(n => ['BREASTFEEDING', 'POSTPARTUM_RECOVERY', 'EMOTIONAL_WELLBEING'].includes(n));
    for (const n of careNeeds) careReasons.push(`You’d like support with ${SUPPORT_NEED_LABELS[n].toLowerCase()}`);
    if (intake.stage === 'POSTPARTUM' || intake.stage === 'DELIVERY_COMPLETED') careReasons.push('You’re in the postpartum stage');
    if (intake.firstPregnancy) careReasons.push('This is your first pregnancy');
    if (careReasons.length) {
      return { planCode: pick('CARE'), reasons: [...careReasons, 'Care adds lactation and postpartum sessions to routine check-ups'] };
    }

    return { planCode: pick('STANDARD'), reasons: ['Your answers suggest routine, stage-by-stage care', 'Standard covers check-ups and nutrition guidance'] };
  }

  setRecommendedPlan(code: string) {
    this.patch({ recommendedPlanCode: code });
  }

  /** Marks payment done if the user has any PAID order (real GET /orders). */
  refreshPayment(): Observable<boolean> {
    if (this.state().paidOrderId) return of(true);
    return this.commerce.getOrders().pipe(
      map(orders => orders.find(o => o.status === 'PAID')),
      tap(paid => { if (paid) this.patch({ paidOrderId: paid.id }); }),
      map(paid => !!paid)
    );
  }

  scheduleCall(call: OnboardingCall) {
    this.patch({ call });
  }

  signDocuments(signedName: string) {
    this.patch({
      documents: {
        signedName,
        signedAt: new Date().toISOString(),
        documentIds: ONBOARDING_DOCUMENTS.map(d => d.id)
      }
    });
  }

  complete() {
    this.patch({ onboardedAt: new Date().toISOString() });
  }

  private patch(partial: Partial<OnboardingState>) {
    const id = this.api.currentUser()?.id;
    const next = { ...this.state(), ...partial };
    this.state.set(next);
    if (id) {
      try { localStorage.setItem(this.key(id), JSON.stringify(next)); } catch { /* storage full/blocked */ }
    }
  }

  private read(id: number): OnboardingState {
    try {
      const raw = localStorage.getItem(this.key(id));
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private key(id: number): string {
    return `nb_onboarding_${id}`;
  }
}
