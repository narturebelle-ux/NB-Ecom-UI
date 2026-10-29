import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, concat, forkJoin, map, of, switchMap, tap, toArray } from 'rxjs';
import { ApiService } from './api.service';
import { CommerceService } from './commerce.service';
import { environment } from '../../environments/environment';
import { Plan } from '../models/commerce.models';
import { Journey } from '../models/maternal.models';
import {
  ConsultationMode,
  IntakeAnswers,
  OnboardingCallSlot,
  OnboardingDocument,
  OnboardingSignature,
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
type LocalState = Pick<OnboardingState, 'recommendedPlanCode' | 'paidOrderId' | 'onboardedAt'>;

/**
 * Drives the post-signup onboarding flow (see onboarding.models.ts).
 * - Stage/EDD: Journey API. Intake, call, documents and completion: onboarding API (§11).
 * - Payment: read from the Orders API.
 * Health answers are never written to localStorage; they're re-read from the server via sync().
 * completedAt is cached locally so guards can answer instantly, but the server stays authoritative:
 * the first guarded navigation of a session runs sync() (see ensureSynced()).
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
    if (!s.documentsSigned) return 'documents';
    return 'welcome';
  });

  readonly onboarded = computed(() => this.step() === 'done');

  /** User id whose state has been synced from the server this session. */
  private syncedFor: number | null = null;

  constructor() {
    effect(() => {
      const id = this.api.currentUser()?.id;
      this.syncedFor = null;
      this.state.set(id ? this.readLocal(id) : {});
    });
  }

  /** Syncs once per session/user; afterwards resolves immediately from memory. Errors fall back to the local cache. */
  ensureSynced(): Observable<void> {
    const id = this.api.currentUser()?.id;
    if (!id || this.syncedFor === id) return of(undefined);
    return this.sync().pipe(catchError(() => of(undefined)));
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
          callRequested: !!status.callbackRequestedAt,
          documentsSigned: status.documentsSigned
        });
        // Server is authoritative: this also drops a completion recorded only in the browser before Part B.
        this.patchLocal({ onboardedAt: status.completedAt ?? undefined });
        this.syncedFor = this.api.currentUser()?.id ?? null;
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

  /**
   * Fallback when no call slot suits: POST /me/onboarding/callback-request creates a server record
   * a coordinator acts on; GET /me/onboarding reports it back as callbackRequestedAt.
   */
  requestCallback(note?: string): Observable<void> {
    return this.http.post(`${this.baseUrl}/me/onboarding/callback-request`, note ? { note } : {}).pipe(
      tap(() => this.state.set({ ...this.state(), callRequested: true })),
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

  getDocuments(): Observable<OnboardingDocument[]> {
    return this.http.get<OnboardingDocument[]>(`${this.baseUrl}/me/onboarding/documents`);
  }

  /** Signs every unsigned document with the same typed name (the API signs one at a time; re-signing is idempotent). */
  signDocuments(docs: OnboardingDocument[], typedName: string): Observable<void> {
    const unsigned = docs.filter(d => !d.signed);
    const signs = unsigned.map(d =>
      this.http.post<OnboardingSignature>(`${this.baseUrl}/me/onboarding/documents/sign`, { documentId: d.id, typedName })
    );
    return (signs.length ? concat(...signs).pipe(toArray()) : of([])).pipe(
      tap(() => this.state.set({ ...this.state(), documentsSigned: true })),
      map(() => undefined)
    );
  }

  /**
   * POST /me/onboarding/complete — idempotent. A 409 ONBOARDING_INCOMPLETE carries
   * error.missingSteps; the caller shows those.
   */
  complete(): Observable<void> {
    return this.http.post<{ completedAt: string }>(`${this.baseUrl}/me/onboarding/complete`, {}).pipe(
      tap(({ completedAt }) => this.patchLocal({ onboardedAt: completedAt })),
      map(() => undefined)
    );
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
      recommendedPlanCode: next.recommendedPlanCode,
      paidOrderId: next.paidOrderId,
      onboardedAt: next.onboardedAt
    };
    try { localStorage.setItem(this.key(id), JSON.stringify(local)); } catch { /* storage blocked */ }
  }

  private readLocal(id: number): OnboardingState {
    try {
      const raw = localStorage.getItem(this.key(id));
      if (!raw) return {};
      const { recommendedPlanCode, paidOrderId, onboardedAt } = JSON.parse(raw);
      return { recommendedPlanCode, paidOrderId, onboardedAt };
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
