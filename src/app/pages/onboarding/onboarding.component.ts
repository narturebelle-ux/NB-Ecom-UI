import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { CommerceService } from '../../services/commerce.service';
import { OnboardingService, PlanRecommendation } from '../../services/onboarding.service';
import { InviteService } from '../../services/invite.service';
import { DUE_DATE_LOCK_NOTE, JOURNEY_STATUS_LABELS, JourneyStatus, PROFESSIONAL_TYPE_LABELS, eddBounds, eddProblem } from '../../models/maternal.models';
import { Plan, PlanQuote } from '../../models/commerce.models';
import {
  ConsultationMode,
  IntakeAnswers,
  ONBOARDING_STEPS,
  LANGUAGE_OPTIONS,
  OnboardingCallSlot,
  OnboardingDocument,
  OnboardingMissingStep,
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
          <span class="kicker">Welcome to NartureBelle™</span>
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
                  <input id="edd" type="date" class="form-control" [min]="edd.min" [max]="edd.max" [(ngModel)]="form.expectedDeliveryDate" />
                  @if (eddError(); as e) { <span class="field-error">{{ e }}</span> }
                  <span class="hint">Your best estimate is fine — you can change it any time.</span>
                </div>
              }

              <!-- Health details: optional, and stored only with the HEALTH_DATA consent where the API supports it. -->
              <div class="health-box">
                <div class="health-head">
                  <mat-icon class="icon-sm">health_and_safety</mat-icon>
                  <strong>Health details</strong> <span class="opt">optional</span>
                </div>
                @if (healthNeedsConsent()) {
                  <p class="hint">These help your care team and tailor your plan suggestion. We only store them with your permission, and you can withdraw it any time in Profile.</p>
                  @if (ob.healthConsent()?.body) {
                    <details class="consent-doc">
                      <summary>Read the {{ ob.healthConsent()?.title || 'health data agreement' }}</summary>
                      <p class="consent-doc-body">{{ ob.healthConsent()?.body }}</p>
                    </details>
                  }
                  <label class="agree">
                    <input type="checkbox" [(ngModel)]="shareHealth" />
                    I agree to NartureBelle™ storing my health details
                  </label>
                }
                @if (!healthNeedsConsent() || shareHealth) {
              @if (needsEdd()) {
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
                }
              </div>

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
              </div>

              <fieldset>
                <legend>Languages you’re comfortable in <span class="req">*</span></legend>
                <span class="hint">We match your care coordinator and professionals to these.</span>
                <div class="chip-row wrap">
                  @for (l of languageOptions(); track l) {
                    <button type="button" class="lang-chip" [class.selected]="form.languages.includes(l)" [attr.aria-pressed]="form.languages.includes(l)" (click)="toggleLanguage(l)">{{ l }}</button>
                  }
                </div>
                <div class="lang-other">
                  <input class="form-control" placeholder="Another language" [(ngModel)]="otherLanguage" (keyup.enter)="addOtherLanguage()" aria-label="Another language" />
                  <button type="button" class="btn-link" [disabled]="!otherLanguage.trim()" (click)="addOtherLanguage()">Add</button>
                </div>
              </fieldset>

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
              @if (quote(); as q) {
                <p class="quote-note">
                  @if (q.basis === 'DUE_DATE') { Prices cover the <strong>{{ q.months }} {{ q.months === 1 ? 'month' : 'months' }}</strong> until your due date, with sessions adjusted to match. }
                  @else { Prices are for the full 9-month plan. }
                </p>
              }
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
              @if (quote()?.basis === 'DUE_DATE') { <p class="lock-note">{{ dueDateLockNote }}</p> }
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
                      <button type="button" class="time-chip" [class.selected]="callSlotId() === s.id" (click)="callSlotId.set(s.id)">
                        {{ s.startAt | date:'h:mm a' }}@if (s.coordinator) { <span class="with">with {{ s.coordinator.displayName }}</span> }
                      </button>
                    }
                  </div>
                  @if (selectedCoordinator(); as c) {
                    <div class="coordinator-card">
                      @if (c.photoUrl) { <img [src]="c.photoUrl" [alt]="c.displayName" /> } @else { <span class="coord-avatar">{{ c.displayName.charAt(0) }}</span> }
                      <div>
                        <strong>{{ c.displayName }}</strong> <span class="hint">· your care coordinator</span>
                        @if (c.languages.length) { <span class="hint block"><mat-icon class="icon-sm">translate</mat-icon> Speaks {{ c.languages.join(', ') }}</span> }
                      </div>
                    </div>
                  }
                }

                @if (errorMsg()) { <p class="error-msg">{{ errorMsg() }}</p> }

                <div class="actions split">
                  <button class="btn-link" [disabled]="saving()" (click)="requestCallback()"><mat-icon class="icon-sm">phone_callback</mat-icon> None of these work — call me instead</button>
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
                @if (errorMsg()) { <p class="error-msg">{{ errorMsg() }}</p> }
                <div class="actions">
                  <button class="btn btn-primary btn-lg" [disabled]="saving()" (click)="requestCallback()">Ask for a call <mat-icon class="icon-sm">arrow_forward</mat-icon></button>
                </div>
              }
            }

            <!-- ======== 4. DOCUMENTS ======== -->
            @case ('documents') {
              <h2>Review and sign your onboarding documents</h2>
              <p class="sub">Please read each document. Signing confirms you agree to how your care will work.</p>

              @if (docsLoading()) {
                <p class="hint">Loading your documents…</p>
              } @else if (docsError()) {
                <div class="error"><mat-icon class="icon-sm">error_outline</mat-icon> {{ docsError() }}
                  <button class="btn btn-outline btn-sm" (click)="loadDocuments()">Try again</button></div>
              } @else {
                <p class="hint draft-note">These documents are drafts pending legal review.</p>
                <div class="doc-list">
                  @for (d of documents(); track d.id) {
                    <details class="doc">
                      <summary>
                        <mat-icon class="doc-icon">{{ d.signed ? 'task' : 'description' }}</mat-icon>
                        <span><strong>{{ d.title }}</strong><span class="hint">Version {{ d.version }}{{ d.signed ? ' · Signed' : '' }}</span></span>
                        <mat-icon class="chev">expand_more</mat-icon>
                      </summary>
                      <p class="doc-body">{{ d.bodyMarkdown }}</p>
                    </details>
                  }
                </div>
              }

              <div class="sign-box">
                <div class="field">
                  <label for="signname">Type your full name to sign</label>
                  <input id="signname" class="form-control signature" [(ngModel)]="signName" placeholder="Full name" />
                </div>
                <label class="agree">
                  <input type="checkbox" [(ngModel)]="signAgree" />
                  I have read and agree to the documents above.
                </label>
                <p class="hint">Signed on {{ today | date:'mediumDate' }}. A copy of your signed documents will be emailed to you.</p>
              </div>

              @if (errorMsg()) { <p class="error-msg">{{ errorMsg() }}</p> }
              <div class="actions">
                <button class="btn btn-primary btn-lg" [disabled]="signName.trim().length < 3 || !signAgree || saving() || docsLoading() || !!docsError()" (click)="sign()">{{ saving() ? 'Signing…' : 'Sign documents' }} <mat-icon class="icon-sm">draw</mat-icon></button>
              </div>
            }

            <!-- ======== 5. WELCOME ======== -->
            @case ('welcome') {
              <mat-icon class="hero-icon">celebration</mat-icon>
              <h2 class="center">You’re all set, {{ firstName() }}</h2>
              <p class="sub center">Welcome to NartureBelle™. Here’s a summary of your onboarding.</p>
              <div class="summary">
                <div><mat-icon>eco</mat-icon><span>Stage</span><strong>{{ stageLabel(ob.state().intake!.stage) }}</strong></div>
                <div><mat-icon>workspace_premium</mat-icon><span>Plan</span><strong>Paid · order #{{ ob.state().paidOrderId }}</strong></div>
                <div><mat-icon>call</mat-icon><span>Onboarding call</span><strong>{{ ob.state().call ? (ob.state().call!.startsAt | date:'EEE, MMM d · h:mm a') : 'We’ll call you to arrange it' }}@if (ob.state().call?.coordinator; as c) { with {{ c.displayName }} }</strong></div>
                <div><mat-icon>draw</mat-icon><span>Documents</span><strong>Signed</strong></div>
              </div>
              @if (errorMsg()) { <p class="error-msg center">{{ errorMsg() }}</p> }
              <div class="actions center">
                <button class="btn btn-primary btn-lg" [disabled]="saving()" (click)="finish()">{{ saving() ? 'Finishing…' : 'Go to my journey' }} <mat-icon class="icon-sm">arrow_forward</mat-icon></button>
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
    .step-dot { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--bg-surface); border: 2px solid var(--border-light); font-weight: 700; font-size: 0.85rem; color: var(--text-muted); transition: all var(--transition-smooth); z-index: 1; }
    .step-dot mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
    .step.current .step-dot { border-color: var(--sage-700); color: var(--sage-900); box-shadow: var(--shadow-glow-trust); }
    .step.done .step-dot { background: var(--solid-sage-700); border-color: var(--sage-700); color: #fff; }
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
    .choice { padding: 0.7rem 1rem; border-radius: var(--radius-md); border: 1.5px solid var(--border-light); background: var(--bg-surface); font-weight: 600; font-size: 0.88rem; color: var(--text-secondary); transition: all var(--transition-fast); }
    .choice:hover { border-color: var(--sage-500); }
    .choice.selected { border-color: var(--sage-700); background: var(--sage-50); color: var(--sage-900); box-shadow: var(--shadow-glow-trust); }

    .check-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
    .check { display: flex; align-items: center; gap: 0.55rem; padding: 0.6rem 0.8rem; border-radius: var(--radius-md); border: 1.5px solid var(--border-light); background: var(--bg-surface); font-size: 0.86rem; color: var(--text-secondary); cursor: pointer; transition: all var(--transition-fast); }
    .check.on { border-color: var(--sage-600); background: var(--sage-50); color: var(--sage-900); }
    .check input { accent-color: var(--sage-700); }

    .phone-row { display: flex; align-items: stretch; }
    .phone-row span { display: flex; align-items: center; padding: 0 0.75rem; background: var(--sage-50); border: 1.5px solid var(--border-light); border-right: none; border-radius: var(--radius-md) 0 0 var(--radius-md); font-weight: 700; color: var(--sage-800); font-size: 0.9rem; }
    .phone-row .form-control { border-radius: 0 var(--radius-md) var(--radius-md) 0; }

    .error { display: flex; align-items: center; gap: 0.4rem; padding: 0.75rem 1rem; border-radius: var(--radius-md); background: var(--danger-bg); color: var(--danger-text); border: 1px solid var(--danger-border); font-size: 0.86rem; margin-bottom: 1rem; }
    .actions { display: flex; justify-content: flex-end; margin-top: 1.5rem; }
    .actions.split { justify-content: space-between; }
    .actions.center { justify-content: center; }
    .btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
    .btn-link { font-size: 0.85rem; font-weight: 600; color: var(--sage-800); }

    .why-box { background: var(--trust-50); border: 1px solid var(--trust-200); border-radius: var(--radius-md); padding: 1rem 1.25rem; margin-bottom: 1.5rem; }
    .why-box strong { display: flex; align-items: center; gap: 0.35rem; color: var(--trust-900); margin-bottom: 0.5rem; }
    .why-box ul { margin: 0 0 0.25rem 1.25rem; color: var(--text-secondary); font-size: 0.88rem; display: flex; flex-direction: column; gap: 0.2rem; }
    .billing-toggle { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
    .billing-toggle button { padding: 0.45rem 1rem; border-radius: var(--radius-full); border: 1.5px solid var(--border-light); background: var(--bg-surface); font-size: 0.82rem; font-weight: 700; color: var(--text-secondary); }
    .billing-toggle button.active { background: var(--solid-sage-900); color: #fff; border-color: var(--sage-900); }
    .plan-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .plan-row { position: relative; display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 1.1rem 1.25rem; border-radius: var(--radius-lg); border: 1.5px solid var(--border-light); background: var(--bg-surface); flex-wrap: wrap; }
    .plan-row.recommended { border-color: var(--sage-600); box-shadow: var(--shadow-md); }
    .rec-badge { position: absolute; top: -10px; left: 1rem; background: var(--solid-sage-700); color: #fff; font-size: 0.66rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; padding: 0.2rem 0.6rem; border-radius: var(--radius-full); }
    .plan-info h3 { font-size: 1.1rem; margin-bottom: 0.15rem; }
    .plan-buy { display: flex; align-items: center; gap: 1rem; }
    .price { font-size: 1.35rem; font-weight: 800; color: var(--sage-900); }

    .chip-row { display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.25rem; margin-bottom: 1.25rem; }
    .chip-row.wrap { flex-wrap: wrap; overflow: visible; }
    .day-chip { display: flex; flex-direction: column; align-items: center; min-width: 64px; padding: 0.6rem 0.4rem; border-radius: var(--radius-md); border: 1.5px solid var(--border-light); background: var(--bg-surface); font-size: 0.72rem; color: var(--text-muted); transition: all var(--transition-fast); }
    .day-chip strong { font-size: 1.2rem; color: var(--sage-900); }
    .day-chip.selected, .time-chip.selected { border-color: var(--sage-700); background: var(--sage-50); box-shadow: var(--shadow-glow-trust); }
    .time-chip { padding: 0.5rem 0.8rem; border-radius: var(--radius-sm); border: 1.5px solid var(--border-light); background: var(--bg-surface); font-size: 0.82rem; font-weight: 600; color: var(--sage-900); }
    .callback-box { display: flex; gap: 0.9rem; align-items: flex-start; background: var(--sage-50); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1.1rem 1.25rem; margin: 1rem 0; }
    .callback-box mat-icon { color: var(--sage-700); }
    .callback-box p { margin: 0.25rem 0 0; }
    .proto { display: flex; align-items: center; gap: 0.35rem; font-size: 0.78rem; color: var(--warn-text); background: var(--warn-bg); border: 1px solid var(--warn-border); border-radius: var(--radius-md); padding: 0.55rem 0.8rem; }

    .quote-note { font-size: 0.86rem; color: var(--sage-900); background: var(--sage-50); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 0.55rem 0.8rem; margin: 0.5rem 0 1rem; }
    .lock-note { font-size: 0.8rem; color: var(--warn-text); margin-top: 0.5rem; }
    .field-error { display: block; font-size: 0.8rem; color: var(--danger-text); margin-top: 0.25rem; }
    .health-box { border: 1.5px solid var(--border-light); border-radius: var(--radius-md); padding: 1rem 1.1rem; margin: 1rem 0; background: var(--bg-surface); }
    .health-head { display: flex; align-items: center; gap: 0.4rem; color: var(--sage-900); margin-bottom: 0.4rem; }
    .consent-doc { margin: 0.5rem 0; font-size: 0.82rem; }
    .consent-doc summary { cursor: pointer; color: var(--trust-700); font-weight: 600; }
    .consent-doc-body { white-space: pre-line; color: var(--text-secondary); margin-top: 0.4rem; }
    .lang-chip { border: 1.5px solid var(--border-light); background: var(--bg-surface); border-radius: var(--radius-full); padding: 0.35rem 0.8rem; font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); cursor: pointer; }
    .lang-chip.selected { background: var(--solid-sage-700); border-color: var(--sage-700); color: #fff; }
    .lang-other { display: flex; gap: 0.5rem; align-items: center; margin-top: 0.5rem; max-width: 22rem; }
    .time-chip .with { display: block; font-size: 0.7rem; font-weight: 500; opacity: 0.8; }
    .coordinator-card { display: flex; gap: 0.75rem; align-items: center; margin-top: 0.75rem; padding: 0.75rem 0.9rem; border-radius: var(--radius-md); background: var(--sage-50); border: 1px solid var(--border-subtle); }
    .coordinator-card img, .coord-avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
    .coord-avatar { display: flex; align-items: center; justify-content: center; background: var(--solid-sage-700); color: #fff; font-weight: 800; }
    .block { display: flex; align-items: center; gap: 0.25rem; }
    .doc-list { display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1.5rem; }
    .doc { border: 1.5px solid var(--border-light); border-radius: var(--radius-md); background: var(--bg-surface); }
    .doc summary { list-style: none; display: flex; align-items: center; gap: 0.75rem; padding: 0.9rem 1rem; cursor: pointer; }
    .doc summary::-webkit-details-marker { display: none; }
    .doc summary > span { flex: 1; }
    .doc summary strong { display: block; color: var(--sage-900); font-size: 0.92rem; }
    .doc-icon { color: var(--trust-700); }
    .chev { color: var(--text-muted); transition: transform var(--transition-smooth); }
    .doc[open] .chev { transform: rotate(180deg); }
    .doc p { padding: 0 1rem 1rem 3.1rem; font-size: 0.86rem; color: var(--text-secondary); line-height: 1.6; }
    .doc-body { white-space: pre-line; }
    .draft-note { margin-bottom: 0.6rem; }
    .sign-box { background: var(--sage-50); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1.25rem; }
    .signature { font-family: var(--font-serif); font-style: italic; font-size: 1.25rem; }
    .agree { display: flex; align-items: center; gap: 0.55rem; font-size: 0.88rem; color: var(--text-secondary); cursor: pointer; }
    .agree input { accent-color: var(--sage-700); }

    .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin: 1.5rem 0; }
    .summary > div { display: grid; grid-template-columns: auto 1fr; column-gap: 0.65rem; align-items: center; padding: 0.85rem 1rem; border-radius: var(--radius-md); background: var(--bg-surface); border: 1px solid var(--border-light); }
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
  private invite = inject(InviteService);

  steps = ONBOARDING_STEPS;
  stages = STAGES;
  riskFactors = Object.keys(RISK_FACTOR_LABELS) as RiskFactor[];
  supportNeeds = Object.keys(SUPPORT_NEED_LABELS) as SupportNeed[];
  modes: { value: ConsultationMode; label: string }[] = [
    { value: 'VIRTUAL', label: 'Virtual' },
    { value: 'IN_PERSON', label: 'In person' },
    { value: 'EITHER', label: 'Either' }
  ];
  documents = signal<OnboardingDocument[]>([]);
  docsLoading = signal(false);
  docsError = signal<string | null>(null);
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
  edd = eddBounds();
  quote = signal<PlanQuote | null>(null);
  dueDateLockNote = DUE_DATE_LOCK_NOTE;

  /** Ticked when the user agrees to HEALTH_DATA on this form (only asked where the API supports it). */
  shareHealth = false;
  otherLanguage = '';
  private extraLanguages = signal<string[]>([]);
  languageOptions = computed(() => [...new Set([...LANGUAGE_OPTIONS, ...this.extraLanguages()])]);
  selectedCoordinator = computed(() => this.slots().find(s => s.id === this.callSlotId())?.coordinator ?? null);

  healthNeedsConsent(): boolean {
    const hc = this.ob.healthConsent();
    return !!hc?.supported && !hc.granted;
  }

  toggleLanguage(l: string) {
    this.toggle(this.form.languages, l);
  }

  addOtherLanguage() {
    const l = this.otherLanguage.trim();
    if (!l) return;
    const name = l.charAt(0).toUpperCase() + l.slice(1);
    if (!this.form.languages.some(x => x.toLowerCase() === name.toLowerCase())) this.form.languages.push(name);
    this.extraLanguages.update(list => [...list, name]);
    this.otherLanguage = '';
  }

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
        // Consent is granted by the time onboarding loads, so this is where a new mother joins her inviter.
        this.invite.claimIfPending();
        const saved = this.ob.state().intake;
        if (saved) {
          const { savedAt, ...answers } = saved;
          this.form = { ...answers, riskFactors: [...answers.riskFactors], supportNeeds: [...answers.supportNeeds], languages: [...answers.languages] };
          this.extraLanguages.set(answers.languages.filter(l => !LANGUAGE_OPTIONS.includes(l)));
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
    if (step === 'documents') this.loadDocuments();
  }

  // ---------- intake ----------
  needsEdd(): boolean {
    return this.form.stage === 'PREGNANCY' || this.form.stage === 'PRE_DELIVERY';
  }

  phoneValid(p: string): boolean {
    return /^[6-9]\d{9}$/.test((p || '').trim());
  }

  intakeValid(): boolean {
    if (!this.form.stage || !this.phoneValid(this.form.phone) || !this.form.languages.length) return false;
    return !this.needsEdd() || (!!this.form.expectedDeliveryDate && !eddProblem(this.form.expectedDeliveryDate));
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
      languages: [...this.form.languages],
      notes: this.form.notes.trim()
    };
    // Without the health-data agreement (where it's needed), health answers aren't sent at all.
    if (this.healthNeedsConsent() && !this.shareHealth) {
      answers.firstPregnancy = null;
      answers.multiples = false;
      answers.riskFactors = [];
    }
    this.ob.saveIntake(answers, !this.healthNeedsConsent() || this.shareHealth).subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(false);
        this.enterStep();
      },
      error: (err) => {
        this.saving.set(false);
        if (err?.status === 401 || err?.status === 403) return; // interceptor handles consent/verify redirects
        this.errorMsg.set(err?.error?.code === 'DUE_DATE_LOCKED'
          ? DUE_DATE_LOCK_NOTE
          : err?.error?.message || 'We couldn’t save your details. Please try again.');
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
    this.commerce.getQuote().subscribe({
      next: (q) => {
        this.quote.set(q);
        const plans = q.plans;
        this.plans.set(plans);
        const rec = this.ob.recommend(plans);
        this.recommendation.set(rec);
        if (rec) this.ob.setRecommendedPlan(rec.planCode);
        this.plansLoading.set(false);
      },
      error: () => this.plansLoading.set(false)
    });
  }

  eddError(): string | null {
    return this.needsEdd() ? eddProblem(this.form.expectedDeliveryDate) : null;
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
        this.enterStep();
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
    this.saving.set(true);
    this.errorMsg.set(null);
    this.ob.requestCallback().subscribe({
      next: () => {
        this.saving.set(false);
        this.api.showToast('Thanks. Your care coordinator will call you.');
        this.enterStep();
      },
      error: (err) => {
        this.saving.set(false);
        if (err?.status === 401 || err?.status === 403) return;
        this.errorMsg.set('We couldn’t send your request. Please try again.');
      }
    });
  }

  // ---------- documents ----------
  loadDocuments() {
    this.docsLoading.set(true);
    this.docsError.set(null);
    this.ob.getDocuments().subscribe({
      next: docs => { this.documents.set(docs); this.docsLoading.set(false); },
      error: (err) => {
        this.docsLoading.set(false);
        if (err?.status === 401 || err?.status === 403) return;
        this.docsError.set('We couldn’t load your documents.');
      }
    });
  }

  sign() {
    if (this.signName.trim().length < 3 || !this.signAgree) return;
    this.saving.set(true);
    this.errorMsg.set(null);
    this.ob.signDocuments(this.documents(), this.signName.trim()).subscribe({
      next: () => {
        this.saving.set(false);
        this.api.showToast('Documents signed. Thank you.');
      },
      error: (err) => {
        this.saving.set(false);
        if (err?.status === 401 || err?.status === 403) return;
        // Some may have been signed before the failure; refresh so the retry only sends the rest.
        this.loadDocuments();
        this.errorMsg.set(err?.error?.message || 'We couldn’t record your signature. Please try again.');
      }
    });
  }

  // ---------- welcome ----------
  firstName(): string {
    return this.api.currentUser()?.firstName || 'there';
  }

  finish() {
    this.saving.set(true);
    this.errorMsg.set(null);
    this.ob.complete().subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigateByUrl('/journey');
      },
      error: (err) => {
        this.saving.set(false);
        if (err?.status === 401 || err?.status === 403) return;
        if (err?.error?.code === 'ONBOARDING_INCOMPLETE') {
          const missing: OnboardingMissingStep[] = err.error.missingSteps ?? [];
          this.errorMsg.set(missing.length
            ? `A few steps still need finishing: ${missing.join(', ')}.`
            : 'A few onboarding steps still need finishing.');
          // Re-read the server state so the stepper moves back to the first unfinished step.
          this.load();
          return;
        }
        this.errorMsg.set(err?.error?.message || 'We couldn’t finish onboarding. Please try again.');
      }
    });
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
      languages: ['English'],
      consultationMode: 'EITHER',
      phone: (this.api.currentUser()?.phone || '').replace(/^\+?91/, ''),
      notes: ''
    };
  }
}
