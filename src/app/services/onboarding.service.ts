import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { ApiService } from './api.service';
import { CommerceService } from './commerce.service';
import { environment } from '../../environments/environment';
import { Plan } from '../models/commerce.models';
import { Journey } from '../models/maternal.models';
import {
  ConsultationMode,
  IntakeAnswers,
  ONBOARDING_DOCUMENTS,
  OnboardingCallSlot,
  OnboardingState,
  OnboardingStep,
  RISK_FACTOR_LABELS,
  SUPPORT_NEED_LABELS,
  ServerIntake,
  ServerOnboardingCall,
  ServerOnboardingStatus,
  SupportNeed
} from '../models/onboarding.models';

export interface PlanRecommendation {
  planCode: string;
  reasons: string[];
}

/** Fields that may be kept in the browser — nothing health-related. */
type LocalState = Pick<OnboardingState, 'callRequested' | 'recommendedPlanCode' | 'paidOrderId' | 'documents' | 'onboardedAt'>;

/**
 * Drives the post-signup onboarding flow (see onboarding.models.ts).
 * - Stage/EDD: Journey API. Other intake answers + call booking: onboarding API Part A (§11).
 * - Payment: read from the Orders API.
 * - Document signing + completion: browser-local until onboarding Part B ships.
 * Health answers are never written to localStorage; they're re-read from the server via sync().
 */
@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private http = inject(HttpClient);
  private api = inject(ApiService);
  private commerce = inject(CommerceService);
  private readonly baseUrl = environment.apiUrl;

  readonly state = signal<OnboardingState>({});

  readonly step = computed<OnboardingStep>(() => {
    const s = this.state();
    if (s.onboardedAt) return 'done';
    if (!s.intake) return 'intake';
    if (!s.paidOrderId) return 'plan';
    if (!s.call && !s.callRequested) return 'call';
    if (!s.documents) return 'documents';
    return 'welcome';
  });

  readonly onboarded = computed(() => this.step() === 'done');

  constructor() {
    effect(() => {
      const id = this.api.currentUser()?.id;
      this.state.set(id ? this.readLocal(id) : {});
    });
  }

  /** Loads intake + call from the server and merges them with the local-only progress. */
  sync(): Observable<void> {
    return forkJoin({
      status: this.http.get<ServerOnboardingStatus>(`${this.baseUrl}/me/onboarding`),
      journeys: this.api.getJourneys()
    }).pipe(
      switchMap(({ status, journeys }) => {
        const journey = journeys.find(j => j.status !== 'CLOSED');
        const legacy = this.readLegacyIntake();
        // One-time migration: answers saved before the API existed are pushed up, then dropped locally.
        if (!status.intake && legacy && journey) {
          return this.putIntake(legacy).pipe(map(intake => ({ status: { ...status, intake }, journey })));
        }
        return of({ status, journey });
      }),
      tap(({ status, journey }) => {
        this.clearLegacyIntake();
        this.state.set({
          ...this.state(),
          intake: status.intake && journey ? this.toAnswers(status.intake, journey) : undefined,
          call: status.call ? this.toCall(status.call, status.intake?.phone ?? '') : undefined,
          ...(status.completedAt ? { onboardedAt: status.completedAt } : {})
        });
      }),
      map(() => undefined)
    );
  }

  /** Stage + EDD to the Journey API (create, or update the active one), then the rest to the onboarding API. */
  saveIntake(answers: IntakeAnswers): Observable<void> {
    return this.api.getJourneys().pipe(
      switchMap(journeys => {
        const active = journeys.find(j => j.status !== 'CLOSED');
        return active
          ? this.api.updateJourney(active.id, { status: answers.stage, expectedDeliveryDate: answers.expectedDeliveryDate })
          : this.api.createJourney(answers.stage, answers.expectedDeliveryDate);
      }),
      switchMap(() => this.putIntake(answers)),
      tap(() => this.state.set({ ...this.state(), intake: { ...answers, savedAt: new Date().toISOString() } })),
      map(() => undefined)
    );
  }

  getCallSlots(): Observable<OnboardingCallSlot[]> {
    return this.http.get<OnboardingCallSlot[]>(`${this.baseUrl}/onboarding/call-slots`);
  }

  bookCall(slotId: number): Observable<void> {
    return this.http.post<ServerOnboardingCall>(`${this.baseUrl}/me/onboarding/call`, { slotId }).pipe(
      tap(call => this.state.set({ ...this.state(), call: this.toCall(call, this.state().intake?.phone ?? '') })),
      map(() => undefined)
    );
  }

  /** Fallback when the care team hasn't published any call times yet. */
  requestCallback() {
    this.patchLocal({ callRequested: true });
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
    this.patchLocal({ recommendedPlanCode: code });
  }

  /** Marks payment done if the user has any PAID order (real GET /orders). */
  refreshPayment(): Observable<boolean> {
    if (this.state().paidOrderId) return of(true);
    return this.commerce.getOrders().pipe(
      map(orders => orders.find(o => o.status === 'PAID')),
      tap(paid => { if (paid) this.patchLocal({ paidOrderId: paid.id }); }),
      map(paid => !!paid)
    );
  }

  signDocuments(signedName: string) {
    this.patchLocal({
      documents: { signedName, signedAt: new Date().toISOString(), documentIds: ONBOARDING_DOCUMENTS.map(d => d.id) }
    });
  }

  complete() {
    this.patchLocal({ onboardedAt: new Date().toISOString() });
  }

  // ---------- mapping ----------

  private putIntake(a: IntakeAnswers): Observable<ServerIntake> {
    return this.http.put<ServerIntake>(`${this.baseUrl}/me/onboarding/intake`, {
      firstPregnancy: a.firstPregnancy,
      multiples: a.multiples,
      riskFactors: a.riskFactors,
      supportWanted: a.supportNeeds,
      city: a.city || null,
      language: a.language || null,
      preferredModality: a.consultationMode === 'VIRTUAL' ? 'VIRTUAL' : a.consultationMode === 'IN_PERSON' ? 'PHYSICAL' : null,
      phone: a.phone || null,
      notes: a.notes || null
    });
  }

  private toAnswers(s: ServerIntake, journey: Journey): IntakeAnswers & { savedAt: string } {
    const known = Object.keys(SUPPORT_NEED_LABELS) as SupportNeed[];
    const mode: ConsultationMode = s.preferredModality === 'VIRTUAL' ? 'VIRTUAL' : s.preferredModality === 'PHYSICAL' ? 'IN_PERSON' : 'EITHER';
    return {
      stage: journey.status,
      expectedDeliveryDate: journey.expectedDeliveryDate ?? null,
      firstPregnancy: s.firstPregnancy,
      multiples: !!s.multiples,
      riskFactors: s.riskFactors ?? [],
      supportNeeds: (s.supportWanted ?? []).filter((x): x is SupportNeed => known.includes(x as SupportNeed)),
      city: s.city ?? '',
      language: s.language ?? '',
      consultationMode: mode,
      phone: s.phone ?? '',
      notes: s.notes ?? '',
      savedAt: s.updatedAt
    };
  }

  private toCall(c: ServerOnboardingCall, phone: string) {
    return { startsAt: c.scheduledStart, phone };
  }

  // ---------- browser storage (non-health progress only) ----------

  private patchLocal(partial: LocalState) {
    const id = this.api.currentUser()?.id;
    const next = { ...this.state(), ...partial };
    this.state.set(next);
    if (!id) return;
    const local: LocalState = {
      callRequested: next.callRequested,
      recommendedPlanCode: next.recommendedPlanCode,
      paidOrderId: next.paidOrderId,
      documents: next.documents,
      onboardedAt: next.onboardedAt
    };
    try { localStorage.setItem(this.key(id), JSON.stringify(local)); } catch { /* storage blocked */ }
  }

  private readLocal(id: number): OnboardingState {
    try {
      const raw = localStorage.getItem(this.key(id));
      if (!raw) return {};
      const { intake, call, ...rest } = JSON.parse(raw);
      return rest;
    } catch {
      return {};
    }
  }

  /** Intake answers saved locally by the earlier client-only version, if any. */
  private readLegacyIntake(): IntakeAnswers | null {
    const id = this.api.currentUser()?.id;
    if (!id) return null;
    try {
      const raw = localStorage.getItem(this.key(id));
      return raw ? (JSON.parse(raw).intake ?? null) : null;
    } catch {
      return null;
    }
  }

  private clearLegacyIntake() {
    const id = this.api.currentUser()?.id;
    if (!id) return;
    try {
      const raw = localStorage.getItem(this.key(id));
      if (!raw) return;
      const { intake, call, ...rest } = JSON.parse(raw);
      if (intake || call) localStorage.setItem(this.key(id), JSON.stringify(rest));
    } catch { /* ignore */ }
  }

  private key(id: number): string {
    return `nb_onboarding_${id}`;
  }
}
