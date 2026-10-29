import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { CommerceService } from '../../services/commerce.service';
import { OnboardingService, PlanRecommendation } from '../../services/onboarding.service';
import { JOURNEY_STATUS_LABELS, JourneyStatus, PROFESSIONAL_TYPE_LABELS } from '../../models/maternal.models';
import { Plan } from '../../models/commerce.models';
import {
  ConsultationMode,
  IntakeAnswers,
  ONBOARDING_DOCUMENTS,
  ONBOARDING_STEPS,
  OnboardingCallSlot,
  RISK_FACTOR_LABELS,
  RiskFactor,
  SUPPORT_NEED_LABELS,
  SupportNeed
} from '../../models/onboarding.models';

const STAGES: JourneyStatus[] = ['PREGNANCY', 'PRE_DELIVERY', 'POSTPARTUM', 'CHILDCARE_0_7'];

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="onboarding-page">
      <div class="container narrow">
        <header class="ob-header animate-in">
          <span class="kicker">Welcome to NartureBelle</span>
          <h1>Let’s set up your care</h1>
          <p>A few short steps so we can understand your needs, suggest the right plan, and introduce you to your care team.</p>
        </header>

        <!-- Progress -->
        <ol class="stepper" aria-label="Onboarding progress">
          @for (s of steps; track s.key; let i = $index) {
            <li class="step" [class.done]="stepIndex() > i" [class.current]="stepIndex() === i">
              <span class="step-dot">
                @if (stepIndex() > i) { <mat-icon>check</mat-icon> } @else { {{ i + 1 }} }
              </span>
              <span class="step-label">{{ s.label }}</span>
            </li>
          }
        </ol>

        <div class="ob-card glass animate-in">
          @if (loading()) {
            <div class="skeleton" style="height: 22px; width: 55%; margin-bottom: 14px"></div>
            <div class="skeleton" style="height: 14px; width: 80%; margin-bottom: 28px"></div>
            <div class="skeleton" style="height: 120px"></div>
          } @else if (loadError()) {
            <h2>We couldn’t load your progress</h2>
            <p class="sub">{{ loadError() }}</p>
            <div class="actions"><button class="btn btn-primary" (click)="load()"><mat-icon class="icon-sm">refresh</mat-icon> Try again</button></div>
          } @else {
          @switch (current()) {

            <!-- ======== 1. INTAKE ======== -->
            @case ('intake') {
              <h2>Tell us about you</h2>
              <p class="sub">This helps us tailor your care and suggest a plan. Only your care team sees it.</p>

              <fieldset>
                <legend>Where are you in your journey? <span class="req">*</span></legend>
                <div class="choice-grid">
                  @for (st of stages; track st) {
                    <button type="button" class="choice" [class.selected]="form.stage === st" (click)="form.stage = st">{{ stageLabel(st) }}</button>
                  }
                </div>
              </fieldset>

              @if (needsEdd()) {
                <div class="field">
                  <label for="edd">Expected due date <span class="req">*</span></label>
                  <input id="edd" type="date" class="form-control" [(ngModel)]="form.expectedDeliveryDate" />
                  <span class="hint">Your best estimate is fine — you can change it any time.</span>
                </div>
                <div class="row-2">
                  <fieldset>
                    <legend>Is this your first pregnancy?</legend>
                    <div class="choice-row">
                      <button type="button" class="choice" [class.selected]="form.firstPregnancy === true" (click)="form.firstPregnancy = true">Yes</button>
                      <button type="button" class="choice" [class.selected]="form.firstPregnancy === false" (click)="form.firstPregnancy = false">No</button>
                    </div>
                  </fieldset>
                  <fieldset>
                    <legend>Are you expecting</legend>
                    <div class="choice-row">
                      <button type="button" class="choice" [class.selected]="!form.multiples" (click)="form.multiples = false">One baby</button>
                      <button type="button" class="choice" [class.selected]="form.multiples" (click)="form.multiples = true">Twins or more</button>
                    </div>
                  </fieldset>
                </div>
              }

              <fieldset>
                <legend>Does any of this apply to you? <span class="opt">optional</span></legend>
                <div class="check-grid">
                  @for (r of riskFactors; track r) {
                    <label class="check" [class.on]="form.riskFactors.includes(r)">
                      <input type="checkbox" [checked]="form.riskFactors.includes(r)" (change)="toggle(form.riskFactors, r)" />
                      {{ riskLabel(r) }}
                    </label>
                  }
                </div>
              </fieldset>

              <fieldset>
                <legend>What would you like support with?</legend>
                <div class="check-grid">
                  @for (n of supportNeeds; track n) {
                    <label class="check" [class.on]="form.supportNeeds.includes(n)">
                      <input type="checkbox" [checked]="form.supportNeeds.includes(n)" (change)="toggle(form.supportNeeds, n)" />
                      {{ needLabel(n) }}
                    </label>
                  }
                </div>
              </fieldset>

              <div class="row-2">
                <div class="field">
                  <label for="city">City</label>
                  <input id="city" class="form-control" placeholder="e.g. Bengaluru" [(ngModel)]="form.city" />
                </div>
                <div class="field">
                  <label for="lang">Preferred language</label>
                  <input id="lang" class="form-control" placeholder="e.g. English, Hindi" [(ngModel)]="form.language" />
                </div>
              </div>

              <div class="row-2">
                <fieldset>
                  <legend>Consultations</legend>
                  <div class="choice-row">
                    @for (m of modes; track m.value) {
                      <button type="button" class="choice" [class.selected]="form.consultationMode === m.value" (click)="form.consultationMode = m.value">{{ m.label }}</button>
                    }
                  </div>
                </fieldset>
                <div class="field">
                  <label for="phone">Mobile number for your onboarding call <span class="req">*</span></label>
                  <div class="phone-row"><span>+91</span><input id="phone" class="form-control" maxlength="10" inputmode="numeric" [(ngModel)]="form.phone" placeholder="10-digit number" /></div>
                </div>
              </div>

              <div class="field">
                <label for="notes">Anything else your care team should know? <span class="opt">optional</span></label>
                <textarea id="notes" class="form-control" rows="2" [(ngModel)]="form.notes"></textarea>
              </div>

              @if (errorMsg()) { <div class="error"><mat-icon class="icon-sm">error_outline</mat-icon> {{ errorMsg() }}</div> }

              <div class="actions">
                <button class="btn btn-primary btn-lg" [disabled]="saving() || !intakeValid()" (click)="saveIntake()">
                  @if (saving()) { Saving… } @else { Continue <mat-icon class="icon-sm">arrow_forward</mat-icon> }
                </button>
              </div>
            }

            <!-- ======== 2. PLAN ======== -->
            @case ('plan') {
              <h2>Your recommended plan</h2>
              <p class="sub">Based on what you told us. You can choose any plan — your care coordinator will review it with you on your onboarding call.</p>

              @if (plansLoading()) {
                <div class="skeleton" style="height: 260px"></div>
              } @else {
                @if (recommendation(); as rec) {
                  <div class="why-box">
                    <strong><mat-icon class="icon-sm">lightbulb</mat-icon> Why we suggest {{ planName(rec.planCode) }}</strong>
                    <ul>@for (r of rec.reasons; track r) { <li>{{ r }}</li> }</ul>
                    <span class="hint">A suggestion from your answers, not medical advice.</span>
                  </div>
                }

                <div class="billing-toggle">
                  <button type="button" [class.active]="!installment()" (click)="installment.set(false)">Pay in full</button>
                  <button type="button" [class.active]="installment()" (click)="installment.set(true)">Installments</button>
                </div>

                <div class="plan-list">
                  @for (p of plans(); track p.id) {
                    <div class="plan-row" [class.recommended]="p.code === recommendation()?.planCode">
                      @if (p.code === recommendation()?.planCode) { <span class="rec-badge">Recommended for you</span> }
                      <div class="plan-info">
                        <h3>{{ p.name }}</h3>
                        <span class="hint">{{ p.totalSessions }} sessions · {{ allocationSummary(p) }}</span>
                      </div>
                      <div class="plan-buy">
                        <span class="price">₹{{ (installment() ? p.installmentTotalPrice : p.oneTimePrice) | number:'1.0-0' }}</span>
                        <button class="btn btn-sm" [class.btn-primary]="p.code === recommendation()?.planCode" [class.btn-outline]="p.code !== recommendation()?.planCode" (click)="choosePlan(p)">Choose</button>
                      </div>
                    </div>
                  }
                </div>
              }
              <div class="actions split">
                <button class="btn-link" (click)="editIntake()"><mat-icon class="icon-sm">edit</mat-icon> Edit my details</button>
                <button class="btn-link" (click)="checkPayment()"><mat-icon class="icon-sm">refresh</mat-icon> I’ve already paid</button>
              </div>
            }

            <!-- ======== 3. CALL ======== -->
            @case ('call') {
              <h2>Schedule your onboarding call</h2>
              <p class="sub">A short call with your care coordinator to review your details and plan, and answer your questions.</p>

              @if (slotsLoading()) {
                <div class="skeleton" style="height: 64px; margin: 16px 0"></div>
              } @else if (callDays().length) {
                <span class="label">Choose a day</span>
                <div class="chip-row">
                  @for (d of callDays(); track d) {
                    <button type="button" class="day-chip" [class.selected]="callDay() === d" (click)="callDay.set(d); callSlotId.set(null)">
                      <span>{{ d | date:'EEE' }}</span><strong>{{ d | date:'d' }}</strong><span>{{ d | date:'MMM' }}</span>
                    </button>
                  }
                </div>

                @if (callDay()) {
                  <span class="label">Choose a time</span>
                  <div class="chip-row wrap">
                    @for (s of slotsForDay(); track s.id) {
                      <button type="button" class="time-chip" [class.selected]="callSlotId() === s.id" (click)="callSlotId.set(s.id)">{{ s.startAt | date:'h:mm a' }}</button>
                    }
                  </div>
                }

                @if (errorMsg()) { <p class="error-msg">{{ errorMsg() }}</p> }

                <div class="actions split">
                  <button class="btn-link" (click)="requestCallback()"><mat-icon class="icon-sm">phone_callback</mat-icon> None of these work — call me instead</button>
                  <button class="btn btn-primary btn-lg" [disabled]="!callSlotId() || saving()" (click)="confirmCall()">Confirm call <mat-icon class="icon-sm">arrow_forward</mat-icon></button>
                </div>
              } @else {
                <div class="callback-box">
                  <mat-icon>phone_callback</mat-icon>
                  <div>
                    <strong>We’ll call you to find a time</strong>
                    <p class="hint">Our care coordinators haven’t published open call times yet. Ask for a call and they’ll ring you on {{ ob.state().intake?.phone ? '+91 ' + ob.state().intake?.phone : 'the number you gave us' }} within one working day.</p>
                  </div>
                </div>
                <div class="actions">
                  <button class="btn btn-primary btn-lg" (click)="requestCallback()">Ask for a call <mat-icon class="icon-sm">arrow_forward</mat-icon></button>
                </div>
              }
            }

            <!-- ======== 4. DOCUMENTS ======== -->
            @case ('documents') {
              <h2>Review and sign your onboarding documents</h2>
              <p class="sub">Please read each document. Signing confirms you agree to how your care will work.</p>

              <div class="doc-list">
                @for (d of documents; track d.id) {
                  <details class="doc">
                    <summary>
                      <mat-icon class="doc-icon">description</mat-icon>
                      <span><strong>{{ d.title }}</strong><span class="hint">{{ d.summary }}</span></span>
                      <mat-icon class="chev">expand_more</mat-icon>
                    </summary>
                    <p>{{ d.body }}</p>
                  </details>
                }
              </div>

              <div class="sign-box">
                <div class="field">
                  <label for="signname">Type your full name to sign</label>
                  <input id="signname" class="form-control signature" [(ngModel)]="signName" placeholder="Full name" />
                </div>
                <label class="agree">
                  <input type="checkbox" [(ngModel)]="signAgree" />
                  I have read and agree to the documents above.
                </label>
                <p class="hint">Signed on {{ today | date:'mediumDate' }}. Email delivery of your signed copies is coming soon.</p>
              </div>

              <div class="actions">
                <button class="btn btn-primary btn-lg" [disabled]="signName.trim().length < 3 || !signAgree" (click)="sign()">Sign documents <mat-icon class="icon-sm">draw</mat-icon></button>
              </div>
            }

            <!-- ======== 5. WELCOME ======== -->
            @case ('welcome') {
              <mat-icon class="hero-icon">celebration</mat-icon>
              <h2 class="center">You’re all set, {{ firstName() }}</h2>
              <p class="sub center">Welcome to NartureBelle. Here’s a summary of your onboarding.</p>
              <div class="summary">
                <div><mat-icon>eco</mat-icon><span>Stage</span><strong>{{ stageLabel(ob.state().intake!.stage) }}</strong></div>
                <div><mat-icon>workspace_premium</mat-icon><span>Plan</span><strong>Paid · order #{{ ob.state().paidOrderId }}</strong></div>
                <div><mat-icon>call</mat-icon><span>Onboarding call</span><strong>{{ ob.state().call ? (ob.state().call!.startsAt | date:'EEE, MMM d · h:mm a') : 'We’ll call you to arrange it' }}</strong></div>
                <div><mat-icon>draw</mat-icon><span>Documents</span><strong>Signed {{ ob.state().documents!.signedAt | date:'mediumDate' }}</strong></div>
              </div>
              <div class="actions center">
                <button class="btn btn-primary btn-lg" (click)="finish()">Go to my journey <mat-icon class="icon-sm">arrow_forward</mat-icon></button>
              </div>
            }
          }
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .onboarding-page { padding: 3rem 0 5rem; }
    .narrow { max-width: 780px; }
    .ob-header { text-align: center; margin-bottom: 2rem; }
    .kicker { font-size: 0.78rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--blush-700); }
    .ob-header h1 { font-size: clamp(1.8rem, 3.5vw, 2.4rem); margin: 0.5rem 0; }
    .ob-header p { color: var(--text-secondary); max-width: 560px; margin: 0 auto; }

    .stepper { list-style: none; display: flex; justify-content: space-between; margin: 0 auto 2rem; max-width: 640px; position: relative; }
    .stepper::before { content: ''; position: absolute; top: 17px; left: 8%; right: 8%; height: 2px; background: var(--border-light); }
    .step { position: relative; display: flex; flex-direction: column; align-items: center; gap: 0.4rem; flex: 1; }
    .step-dot { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #fff; border: 2px solid var(--border-light); font-weight: 700; font-size: 0.85rem; color: var(--text-muted); transition: all var(--transition-smooth); z-index: 1; }
    .step-dot mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
    .step.current .step-dot { border-color: var(--sage-700); color: var(--sage-900); box-shadow: var(--shadow-glow-trust); }
    .step.done .step-dot { background: var(--sage-700); border-color: var(--sage-700); color: #fff; }
    .step-label { font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-align: center; }
    .step.current .step-label { color: var(--sage-900); }

    .ob-card { border-radius: var(--radius-xl); padding: 2.25rem; }
    .ob-card h2 { font-size: 1.5rem; margin-bottom: 0.35rem; }
    .sub { color: var(--text-secondary); margin-bottom: 1.75rem; font-size: 0.95rem; }
    .center { text-align: center; }

    fieldset { border: none; margin-bottom: 1.4rem; }
    legend, .label, .field label { display: block; font-size: 0.85rem; font-weight: 700; color: var(--sage-900); margin-bottom: 0.55rem; }
    .req { color: var(--blush-700); }
    .opt { font-weight: 500; color: var(--text-muted); font-size: 0.78rem; }
    .field { margin-bottom: 1.25rem; }
    .hint { display: block; font-size: 0.78rem; color: var(--text-muted); margin-top: 0.3rem; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }

    .choice-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.6rem; }
    .choice-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .choice { padding: 0.7rem 1rem; border-radius: var(--radius-md); border: 1.5px solid var(--border-light); background: #fff; font-weight: 600; font-size: 0.88rem; color: var(--text-secondary); transition: all var(--transition-fast); }
    .choice:hover { border-color: var(--sage-500); }
    .choice.selected { border-color: var(--sage-700); background: var(--sage-50); color: var(--sage-900); box-shadow: var(--shadow-glow-trust); }

    .check-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
    .check { display: flex; align-items: center; gap: 0.55rem; padding: 0.6rem 0.8rem; border-radius: var(--radius-md); border: 1.5px solid var(--border-light); background: #fff; font-size: 0.86rem; color: var(--text-secondary); cursor: pointer; transition: all var(--transition-fast); }
    .check.on { border-color: var(--sage-600); background: var(--sage-50); color: var(--sage-900); }
    .check input { accent-color: var(--sage-700); }

    .phone-row { display: flex; align-items: stretch; }
    .phone-row span { display: flex; align-items: center; padding: 0 0.75rem; background: var(--sage-50); border: 1.5px solid var(--border-light); border-right: none; border-radius: var(--radius-md) 0 0 var(--radius-md); font-weight: 700; color: var(--sage-800); font-size: 0.9rem; }
    .phone-row .form-control { border-radius: 0 var(--radius-md) var(--radius-md) 0; }

    .error { display: flex; align-items: center; gap: 0.4rem; padding: 0.75rem 1rem; border-radius: var(--radius-md); background: #fdecea; color: #a0281c; border: 1px solid #f5b7b1; font-size: 0.86rem; margin-bottom: 1rem; }
    .actions { display: flex; justify-content: flex-end; margin-top: 1.5rem; }
    .actions.split { justify-content: space-between; }
    .actions.center { justify-content: center; }
    .btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
    .btn-link { font-size: 0.85rem; font-weight: 600; color: var(--sage-800); }

    .why-box { background: var(--trust-50); border: 1px solid var(--trust-200); border-radius: var(--radius-md); padding: 1rem 1.25rem; margin-bottom: 1.5rem; }
    .why-box strong { display: flex; align-items: center; gap: 0.35rem; color: var(--trust-900); margin-bottom: 0.5rem; }
    .why-box ul { margin: 0 0 0.25rem 1.25rem; color: var(--text-secondary); font-size: 0.88rem; display: flex; flex-direction: column; gap: 0.2rem; }
    .billing-toggle { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
    .billing-toggle button { padding: 0.45rem 1rem; border-radius: var(--radius-full); border: 1.5px solid var(--border-light); background: #fff; font-size: 0.82rem; font-weight: 700; color: var(--text-secondary); }
    .billing-toggle button.active { background: var(--sage-900); color: #fff; border-color: var(--sage-900); }
    .plan-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .plan-row { position: relative; display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 1.1rem 1.25rem; border-radius: var(--radius-lg); border: 1.5px solid var(--border-light); background: #fff; flex-wrap: wrap; }
    .plan-row.recommended { border-color: var(--sage-600); box-shadow: var(--shadow-md); }
    .rec-badge { position: absolute; top: -10px; left: 1rem; background: var(--sage-700); color: #fff; font-size: 0.66rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; padding: 0.2rem 0.6rem; border-radius: var(--radius-full); }
    .plan-info h3 { font-size: 1.1rem; margin-bottom: 0.15rem; }
    .plan-buy { display: flex; align-items: center; gap: 1rem; }
    .price { font-size: 1.35rem; font-weight: 800; color: var(--sage-900); }

    .chip-row { display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.25rem; margin-bottom: 1.25rem; }
    .chip-row.wrap { flex-wrap: wrap; overflow: visible; }
    .day-chip { display: flex; flex-direction: column; align-items: center; min-width: 64px; padding: 0.6rem 0.4rem; border-radius: var(--radius-md); border: 1.5px solid var(--border-light); background: #fff; font-size: 0.72rem; color: var(--text-muted); transition: all var(--transition-fast); }
    .day-chip strong { font-size: 1.2rem; color: var(--sage-900); }
    .day-chip.selected, .time-chip.selected { border-color: var(--sage-700); background: var(--sage-50); box-shadow: var(--shadow-glow-trust); }
    .time-chip { padding: 0.5rem 0.8rem; border-radius: var(--radius-sm); border: 1.5px solid var(--border-light); background: #fff; font-size: 0.82rem; font-weight: 600; color: var(--sage-900); }
    .callback-box { display: flex; gap: 0.9rem; align-items: flex-start; background: var(--sage-50); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1.1rem 1.25rem; margin: 1rem 0; }
    .callback-box mat-icon { color: var(--sage-700); }
    .callback-box p { margin: 0.25rem 0 0; }
    .proto { display: flex; align-items: center; gap: 0.35rem; font-size: 0.78rem; color: #92610a; background: #fff8eb; border: 1px solid #fbd38d; border-radius: var(--radius-md); padding: 0.55rem 0.8rem; }

    .doc-list { display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1.5rem; }
    .doc { border: 1.5px solid var(--border-light); border-radius: var(--radius-md); background: #fff; }
    .doc summary { list-style: none; display: flex; align-items: center; gap: 0.75rem; padding: 0.9rem 1rem; cursor: pointer; }
    .doc summary::-webkit-details-marker { display: none; }
    .doc summary > span { flex: 1; }
    .doc summary strong { display: block; color: var(--sage-900); font-size: 0.92rem; }
    .doc-icon { color: var(--trust-700); }
    .chev { color: var(--text-muted); transition: transform var(--transition-smooth); }
    .doc[open] .chev { transform: rotate(180deg); }
    .doc p { padding: 0 1rem 1rem 3.1rem; font-size: 0.86rem; color: var(--text-secondary); line-height: 1.6; }
    .sign-box { background: var(--sage-50); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1.25rem; }
    .signature { font-family: var(--font-serif); font-style: italic; font-size: 1.25rem; }
    .agree { display: flex; align-items: center; gap: 0.55rem; font-size: 0.88rem; color: var(--text-secondary); cursor: pointer; }
    .agree input { accent-color: var(--sage-700); }

    .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin: 1.5rem 0; }
    .summary > div { display: grid; grid-template-columns: auto 1fr; column-gap: 0.65rem; align-items: center; padding: 0.85rem 1rem; border-radius: var(--radius-md); background: #fff; border: 1px solid var(--border-light); }
    .summary mat-icon { grid-row: span 2; color: var(--sage-700); }
    .summary span { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
    .summary strong { font-size: 0.9rem; color: var(--sage-900); }

    @media (max-width: 640px) {
      .ob-card { padding: 1.5rem; }
      .row-2, .check-grid, .summary { grid-template-columns: 1fr; }
      .step-label { display: none; }
    }
  `]
})
export class OnboardingComponent implements OnInit {
  private api = inject(ApiService);
  private commerce = inject(CommerceService);
  private router = inject(Router);
  ob = inject(OnboardingService);

  steps = ONBOARDING_STEPS;
  stages = STAGES;
  riskFactors = Object.keys(RISK_FACTOR_LABELS) as RiskFactor[];
  supportNeeds = Object.keys(SUPPORT_NEED_LABELS) as SupportNeed[];
  modes: { value: ConsultationMode; label: string }[] = [
    { value: 'VIRTUAL', label: 'Virtual' },
    { value: 'IN_PERSON', label: 'In person' },
    { value: 'EITHER', label: 'Either' }
  ];
  documents = ONBOARDING_DOCUMENTS;
  today = new Date();

  // While editing intake from the plan step, show the intake form even though it's saved.
  private editing = signal(false);
  current = computed(() => (this.editing() ? 'intake' : this.ob.step()));
  stepIndex = computed(() => Math.max(0, this.steps.findIndex(s => s.key === this.current())));

  saving = signal(false);
  errorMsg = signal<string | null>(null);
  form: IntakeAnswers = this.blankForm();

  plans = signal<Plan[]>([]);
  plansLoading = signal(false);
  recommendation = signal<PlanRecommendation | null>(null);
  installment = signal(false);

  loading = signal(true);
  loadError = signal<string | null>(null);

  slots = signal<OnboardingCallSlot[]>([]);
  slotsLoading = signal(false);
  /** Distinct local days (yyyy-MM-dd) that have an open slot. */
  callDays = computed(() => [...new Set(this.slots().map(s => this.dayKey(s.startAt)))]);
  callDay = signal<string | null>(null);
  callSlotId = signal<number | null>(null);
  slotsForDay = computed(() => this.slots().filter(s => this.dayKey(s.startAt) === this.callDay()));

  signName = '';
  signAgree = false;

  ngOnInit() {
    if (this.ob.step() === 'done') {
      this.router.navigateByUrl('/journey');
      return;
    }
    const user = this.api.currentUser();
    this.signName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
    this.load();
  }

  /** Pulls intake + call from the server, then prepares whichever step the user is on. */
  load() {
    this.loading.set(true);
    this.loadError.set(null);
    this.ob.sync().subscribe({
      next: () => {
        const saved = this.ob.state().intake;
        if (saved) {
          const { savedAt, ...answers } = saved;
          this.form = { ...answers, riskFactors: [...answers.riskFactors], supportNeeds: [...answers.supportNeeds] };
        }
        this.loading.set(false);
        if (this.ob.step() === 'done') { this.router.navigateByUrl('/journey'); return; }
        this.enterStep();
      },
      error: (err) => {
        this.loading.set(false);
        if (err?.status === 401 || err?.status === 403) return; // interceptor handles consent/verify redirects
        this.loadError.set('Please check your connection and try again.');
      }
    });
  }

  private enterStep() {
    const step = this.ob.step();
    if (step === 'plan') this.enterPlanStep();
    if (step === 'call') this.loadSlots();
  }

  // ---------- intake ----------
  needsEdd(): boolean {
    return this.form.stage === 'PREGNANCY' || this.form.stage === 'PRE_DELIVERY';
  }

  phoneValid(p: string): boolean {
    return /^[6-9]\d{9}$/.test((p || '').trim());
  }

  intakeValid(): boolean {
    if (!this.form.stage || !this.phoneValid(this.form.phone)) return false;
    return !this.needsEdd() || !!this.form.expectedDeliveryDate;
  }

  toggle<T>(list: T[], value: T) {
    const i = list.indexOf(value);
    if (i >= 0) list.splice(i, 1); else list.push(value);
  }

  saveIntake() {
    if (!this.intakeValid()) return;
    this.saving.set(true);
    this.errorMsg.set(null);
    const answers: IntakeAnswers = {
      ...this.form,
      expectedDeliveryDate: this.needsEdd() ? this.form.expectedDeliveryDate : null,
      firstPregnancy: this.needsEdd() ? this.form.firstPregnancy : null,
      multiples: this.needsEdd() ? this.form.multiples : false,
      phone: this.form.phone.trim(),
      city: this.form.city.trim(),
      language: this.form.language.trim(),
      notes: this.form.notes.trim()
    };
    this.ob.saveIntake(answers).subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(false);
        this.enterStep();
      },
      error: (err) => {
        this.saving.set(false);
        if (err?.status === 401 || err?.status === 403) return; // interceptor handles consent/verify redirects
        this.errorMsg.set(err?.error?.message || 'We couldn’t save your details. Please try again.');
      }
    });
  }

  editIntake() {
    this.editing.set(true);
  }

  // ---------- plan ----------
  private enterPlanStep() {
    this.ob.refreshPayment().subscribe({ error: () => {} });
    this.plansLoading.set(true);
    this.commerce.getPlans().subscribe({
      next: (plans) => {
        this.plans.set(plans);
        const rec = this.ob.recommend(plans);
        this.recommendation.set(rec);
        if (rec) this.ob.setRecommendedPlan(rec.planCode);
        this.plansLoading.set(false);
      },
      error: () => this.plansLoading.set(false)
    });
  }

  allocationSummary(p: Plan): string {
    return p.allocations
      .map(a => `${a.sessionCount} × ${(PROFESSIONAL_TYPE_LABELS as Record<string, string>)[a.professionalType] ?? a.professionalType}`)
      .join(', ');
  }

  planName(code: string): string {
    return this.plans().find(p => p.code === code)?.name ?? code;
  }

  choosePlan(p: Plan) {
    this.router.navigate(['/checkout'], {
      queryParams: { plan: p.id, mode: this.installment() ? 'INSTALLMENT' : 'ONE_TIME', from: 'onboarding' }
    });
  }

  checkPayment() {
    this.ob.refreshPayment().subscribe({
      next: (paid) => {
        if (!paid) this.api.showToast('We couldn’t find a completed payment yet.');
        else this.enterStep();
      },
      error: () => this.api.showToast('Couldn’t check your payment right now.')
    });
  }

  // ---------- call ----------
  private loadSlots() {
    this.slotsLoading.set(true);
    this.ob.getCallSlots().subscribe({
      next: (slots) => {
        const now = Date.now();
        this.slots.set(
          slots
            .filter(s => (!s.status || s.status === 'OPEN') && new Date(s.startAt).getTime() > now)
            .sort((a, b) => a.startAt.localeCompare(b.startAt))
        );
        this.callDay.set(this.callDays()[0] ?? null);
        this.slotsLoading.set(false);
      },
      error: () => { this.slots.set([]); this.slotsLoading.set(false); }
    });
  }

  private dayKey(iso: string): string {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  confirmCall() {
    const slotId = this.callSlotId();
    if (!slotId) return;
    this.saving.set(true);
    this.errorMsg.set(null);
    this.ob.bookCall(slotId).subscribe({
      next: () => {
        this.saving.set(false);
        this.api.showToast('Your onboarding call is booked.');
      },
      error: (err) => {
        this.saving.set(false);
        const code = err?.error?.code;
        if (code === 'ONBOARDING_CALL_ALREADY_BOOKED') { this.load(); return; }
        if (code === 'ONBOARDING_CALL_SLOT_NOT_AVAILABLE') {
          this.errorMsg.set('That time was just taken. Please pick another.');
          this.callSlotId.set(null);
          this.loadSlots();
          return;
        }
        if (err?.status === 401 || err?.status === 403) return;
        this.errorMsg.set(err?.error?.message || 'We couldn’t book that call. Please try again.');
      }
    });
  }

  requestCallback() {
    this.ob.requestCallback();
    this.api.showToast('Thanks — your care coordinator will call you.');
  }

  // ---------- documents ----------
  sign() {
    if (this.signName.trim().length < 3 || !this.signAgree) return;
    this.ob.signDocuments(this.signName.trim());
    this.api.showToast('Documents signed. Thank you.');
  }

  // ---------- welcome ----------
  firstName(): string {
    return this.api.currentUser()?.firstName || 'there';
  }

  finish() {
    this.ob.complete();
    this.router.navigateByUrl('/journey');
  }

  stageLabel(s: JourneyStatus): string {
    return JOURNEY_STATUS_LABELS[s];
  }

  riskLabel(r: RiskFactor): string {
    return RISK_FACTOR_LABELS[r];
  }

  needLabel(n: SupportNeed): string {
    return SUPPORT_NEED_LABELS[n];
  }

  private blankForm(): IntakeAnswers {
    return {
      stage: 'PREGNANCY',
      expectedDeliveryDate: null,
      firstPregnancy: null,
      multiples: false,
      riskFactors: [],
      supportNeeds: [],
      city: '',
      language: 'English',
      consultationMode: 'EITHER',
      phone: (this.api.currentUser()?.phone || '').replace(/^\+?91/, ''),
      notes: ''
    };
  }
}
