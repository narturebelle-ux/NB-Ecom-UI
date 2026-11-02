import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { ProviderApplicationService, fieldErrors } from '../../services/provider-application.service';
import {
  Agreement,
  BankDetails,
  BankDetailsInput,
  ProviderProfile,
  SetupStatus,
  Training,
  TrainingResult
} from '../../models/provider-application.models';
import { PROVIDER_PAGE_STYLES } from '../provider-shared/provider-page.styles';

type SetupStep = 'agreement' | 'bank' | 'training' | 'availability' | 'profile';

/** After approval and before going live: the professional finishes these, then Operations sets them live. */
@Component({
  selector: 'app-provider-setup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule],
  template: `
    <div class="provider-page">
      <div class="container narrow">
        <header class="page-header animate-in">
          <span class="kicker">You’re approved</span>
          <h1>Finish your setup</h1>
          <p>Mothers will see you once these steps are done and our team sets you live.</p>
        </header>

        @if (loading()) {
          <div class="ob-card glass"><div class="skeleton" style="height: 120px"></div></div>
        } @else if (loadError()) {
          <div class="ob-card glass">
            <h2>We couldn’t load your setup</h2>
            <p class="sub">Please check your connection and try again.</p>
            <div class="actions"><button class="btn btn-primary" (click)="load()">Try again</button></div>
          </div>
        } @else {
          <ol class="stepper" aria-label="Setup progress">
            @for (s of steps; track s.key; let i = $index) {
              <li class="step" [class.done]="isDone(s.key)" [class.current]="step() === s.key">
                <button type="button" class="step-btn" (click)="step.set(s.key)">
                  <span class="step-dot">@if (isDone(s.key)) { <mat-icon>check</mat-icon> } @else { {{ i + 1 }} }</span>
                  <span class="step-label">{{ s.label }}</span>
                </button>
              </li>
            }
          </ol>

          @if (status(); as st) {
            @if (st.readyForGoLive) {
              <div class="why-box">
                <strong><mat-icon class="icon-sm">rocket_launch</mat-icon> You’re ready</strong>
                Our Operations team will now set you live and email you.
              </div>
            } @else if (allMineDone()) {
              <div class="why-box">
                <strong><mat-icon class="icon-sm">hourglass_top</mat-icon> Waiting on our team</strong>
                {{ st.missing.join(' · ') }}
              </div>
            }
          }

          <div class="ob-card glass animate-in">
            @switch (step()) {
              @case ('agreement') {
                <h2>Professional agreement</h2>
                <p class="sub">Please read this agreement, then sign with your full legal name.</p>
                @if (agreement(); as a) {
                  @if (a.draft) { <div class="proto"><mat-icon class="icon-sm">edit_note</mat-icon> Draft agreement and placeholder fee, pending final approval.</div> }
                  <div class="doc-body">{{ a.text }}</div>
                  @if (a.signedAt) {
                    <div class="sign-box">
                      <span class="signature">{{ a.typedName }}</span>
                      <p class="muted">Signed on {{ a.signedAt | date:'d MMMM y' }}</p>
                    </div>
                  } @else if (!a.signingEnabled) {
                    <div class="why-box">The final agreement isn’t ready yet. We’ll email you when you can sign.</div>
                  } @else {
                    <div class="sign-box">
                      <div class="field">
                        <label for="typed">Type your full legal name <span class="req">*</span></label>
                        <input id="typed" class="form-control" [(ngModel)]="typedName" />
                        @if (stepErrors()['typedName']; as e) { <span class="field-error">{{ e }}</span> }
                      </div>
                      <label class="agree"><input type="checkbox" [(ngModel)]="agreementAccepted" /> I have read and agree to this agreement.</label>
                      <div class="actions"><button class="btn btn-primary" [disabled]="busy() || !typedName.trim() || !agreementAccepted" (click)="sign()">Sign agreement</button></div>
                    </div>
                  }
                }
              }

              @case ('bank') {
                <h2>Bank and tax details</h2>
                <p class="sub">Your fixed fee is paid to this account. We confirm it with a small test deposit. Your account number is stored encrypted.</p>
                @if (bank(); as b) {
                  <div class="row-item">
                    <mat-icon>account_balance</mat-icon>
                    <span class="row-main"><strong>{{ b.accountHolderName }}</strong><span>Account ending {{ b.accountLast4 }} · {{ b.ifsc }}</span></span>
                    <span class="badge-pill" [class.warn]="b.verificationStatus === 'PENDING'" [class.danger]="b.verificationStatus === 'FAILED'">{{ bankLabel(b.verificationStatus) }}</span>
                  </div>
                  @if (b.verificationStatus === 'FAILED') { <div class="error"><mat-icon class="icon-sm">error</mat-icon> The test deposit failed. Please check your details and enter them again.</div> }
                }
                @if (!bank() || editingBank()) {
                  <div class="field"><label for="holder">Account holder name <span class="req">*</span></label>
                    <input id="holder" class="form-control" [(ngModel)]="bankForm.accountHolderName" />
                    @if (stepErrors()['accountHolderName']; as e) { <span class="field-error">{{ e }}</span> }
                  </div>
                  <div class="row-2">
                    <div class="field"><label for="acct">Account number <span class="req">*</span></label>
                      <input id="acct" class="form-control" inputmode="numeric" autocomplete="off" [(ngModel)]="bankForm.accountNumber" />
                      @if (stepErrors()['accountNumber']; as e) { <span class="field-error">{{ e }}</span> }
                    </div>
                    <div class="field"><label for="acct2">Account number again <span class="req">*</span></label>
                      <input id="acct2" class="form-control" inputmode="numeric" autocomplete="off" [(ngModel)]="bankForm.accountNumberConfirm" />
                      @if (stepErrors()['accountNumberConfirm']; as e) { <span class="field-error">{{ e }}</span> }
                    </div>
                  </div>
                  <div class="row-2">
                    <div class="field"><label for="ifsc">IFSC <span class="req">*</span></label>
                      <input id="ifsc" class="form-control" maxlength="11" placeholder="HDFC0001234" [ngModel]="bankForm.ifsc" (ngModelChange)="bankForm.ifsc = $event.toUpperCase()" />
                      @if (stepErrors()['ifsc']; as e) { <span class="field-error">{{ e }}</span> }
                    </div>
                    <div class="field"><label for="type">Account type <span class="req">*</span></label>
                      <select id="type" class="form-control" [(ngModel)]="bankForm.accountType">
                        <option value="SAVINGS">Savings</option><option value="CURRENT">Current</option>
                      </select>
                    </div>
                  </div>
                  <fieldset>
                    <legend>Are you GST registered? <span class="req">*</span></legend>
                    <div class="choice-row">
                      <button type="button" class="choice" [class.selected]="bankForm.gstRegistered" (click)="bankForm.gstRegistered = true">Yes</button>
                      <button type="button" class="choice" [class.selected]="!bankForm.gstRegistered" (click)="bankForm.gstRegistered = false">No</button>
                    </div>
                  </fieldset>
                  @if (bankForm.gstRegistered) {
                    <div class="field"><label for="gstin">GSTIN <span class="req">*</span></label>
                      <input id="gstin" class="form-control" maxlength="15" [ngModel]="bankForm.gstin" (ngModelChange)="bankForm.gstin = $event.toUpperCase()" />
                      @if (stepErrors()['gstin']; as e) { <span class="field-error">{{ e }}</span> }
                    </div>
                  }
                  <div class="actions"><button class="btn btn-primary" [disabled]="busy()" (click)="saveBank()">Save details</button></div>
                } @else {
                  <div class="actions"><button class="btn btn-outline" (click)="editingBank.set(true)">Change details</button></div>
                }
              }

              @case ('training') {
                <h2>Short training</h2>
                <p class="sub">Please answer every question correctly to pass. You can try as many times as you need.</p>
                @if (training(); as t) {
                  @if (t.draft) { <div class="proto"><mat-icon class="icon-sm">edit_note</mat-icon> Draft training content, pending final approval.</div> }
                  @if (t.passedAt) {
                    <div class="why-box"><strong><mat-icon class="icon-sm">check_circle</mat-icon> Passed</strong> You passed on {{ t.passedAt | date:'d MMMM y' }}.</div>
                  } @else {
                    @for (q of t.questions; track q.id) {
                      <fieldset>
                        <legend>{{ q.text }}</legend>
                        <div class="quiz">
                          @for (o of q.options; track $index) {
                            <button type="button" class="choice" [class.selected]="quiz[q.id] === $index" (click)="quiz[q.id] = $index">{{ o }}</button>
                          }
                        </div>
                      </fieldset>
                    }
                    @if (trainingResult(); as r) {
                      @if (!r.passed) { <div class="error"><mat-icon class="icon-sm">error</mat-icon> You got {{ r.correct }} of {{ r.total }} right. Please review your answers and try again.</div> }
                    }
                    <div class="actions"><button class="btn btn-primary" [disabled]="busy() || !quizComplete()" (click)="submitTraining()">Submit answers</button></div>
                  }
                }
              }

              @case ('availability') {
                <h2>Services and availability</h2>
                <p class="sub">Add at least one service and one available slot. Mothers can’t see these until you’re live.</p>
                <div class="row-item">
                  <mat-icon>{{ status()?.servicesAdded ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                  <span class="row-main"><strong>At least one service</strong></span>
                </div>
                <div class="row-item">
                  <mat-icon>{{ status()?.slotsAdded ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                  <span class="row-main"><strong>At least one available slot</strong></span>
                </div>
                <div class="actions"><a class="btn btn-primary" routerLink="/provider/availability">Manage services and availability</a></div>
              }

              @case ('profile') {
                <h2>Your profile</h2>
                <p class="sub">This is how mothers will see you. If something is wrong, please tell us before going live.</p>
                @if (profile(); as p) {
                  <div class="row-item">
                    <span class="avatar">{{ initials(p.displayName) }}</span>
                    <span class="row-main"><strong>{{ p.displayName }}</strong><span>{{ p.city }} · {{ p.languages.join(', ') }}</span></span>
                  </div>
                  @if (p.bio) { <p class="sub">{{ p.bio }}</p> }
                  <p class="muted">Registration number: {{ p.registrationNumber }} @if (p.council) { ({{ p.council }}) }</p>
                  @if (p.confirmedExperienceYears !== null) { <p class="muted">Confirmed experience: {{ p.confirmedExperienceYears }} years</p> }
                  <p class="muted">{{ p.canPrescribe ? 'You will be able to prescribe once prescribing is available on NartureBelle™.' : 'Your role gives care advice; it doesn’t include prescribing medicines.' }}</p>
                }
                @if (status()?.profileConfirmed) {
                  <div class="why-box"><strong><mat-icon class="icon-sm">check_circle</mat-icon> Confirmed</strong> You’ve confirmed your profile.</div>
                } @else {
                  <div class="actions"><button class="btn btn-primary" [disabled]="busy()" (click)="confirmProfile()">Confirm my profile</button></div>
                }
              }
            }

            @if (errorMsg()) { <div class="error step-error"><mat-icon class="icon-sm">error</mat-icon> {{ errorMsg() }}</div> }
          </div>
        }
      </div>
    </div>
  `,
  styles: [PROVIDER_PAGE_STYLES, `
    .step-btn { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; background: none; border: none; cursor: pointer; padding: 0; }
    .quiz { display: flex; flex-direction: column; gap: 0.5rem; }
    .quiz .choice { text-align: left; }
    .avatar { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--solid-sage-700); color: #fff; font-weight: 800; flex-shrink: 0; }
    .step-error { margin-top: 1rem; }
  `]
})
export class ProviderSetupComponent implements OnInit {
  private applications = inject(ProviderApplicationService);
  private api = inject(ApiService);
  private router = inject(Router);

  steps: { key: SetupStep; label: string }[] = [
    { key: 'agreement', label: 'Agreement' },
    { key: 'bank', label: 'Bank & tax' },
    { key: 'training', label: 'Training' },
    { key: 'availability', label: 'Availability' },
    { key: 'profile', label: 'Profile' }
  ];

  loading = signal(true);
  loadError = signal(false);
  busy = signal(false);
  errorMsg = signal<string | null>(null);
  stepErrors = signal<Record<string, string>>({});
  step = signal<SetupStep>('agreement');
  editingBank = signal(false);

  status = signal<SetupStatus | null>(null);
  agreement = signal<Agreement | null>(null);
  bank = signal<BankDetails | null>(null);
  training = signal<Training | null>(null);
  trainingResult = signal<TrainingResult | null>(null);
  profile = signal<ProviderProfile | null>(null);

  typedName = '';
  agreementAccepted = false;
  quiz: Record<string, number> = {};
  bankForm: BankDetailsInput = { accountHolderName: '', accountNumber: '', accountNumberConfirm: '', ifsc: '', accountType: 'SAVINGS', gstRegistered: false, gstin: '' };

  allMineDone = computed(() => {
    const s = this.status();
    return !!s && s.agreementSigned && s.bankAdded && s.trainingPassed && s.servicesAdded && s.slotsAdded && s.profileConfirmed;
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.loadError.set(false);
    this.applications.current().subscribe({
      next: application => {
        if (application.status !== 'VERIFIED') {
          // The application page routes every other status, and refreshes the user's role after go-live.
          this.router.navigate(['/provider/apply']);
          return;
        }
        forkJoin({
          status: this.applications.setupStatus(),
          agreement: this.applications.agreement(),
          bank: this.applications.bank(),
          training: this.applications.training(),
          profile: this.applications.profile()
        }).subscribe({
          next: data => {
            this.status.set(data.status);
            this.agreement.set(data.agreement);
            this.bank.set(data.bank);
            this.training.set(data.training);
            this.profile.set(data.profile);
            this.loading.set(false);
            this.step.set(this.firstOpenStep(data.status));
          },
          error: () => { this.loading.set(false); this.loadError.set(true); }
        });
      },
      error: () => { this.loading.set(false); this.loadError.set(true); }
    });
  }

  private firstOpenStep(s: SetupStatus): SetupStep {
    if (!s.agreementSigned) return 'agreement';
    if (!s.bankAdded) return 'bank';
    if (!s.trainingPassed) return 'training';
    if (!s.servicesAdded || !s.slotsAdded) return 'availability';
    return 'profile';
  }

  isDone(key: SetupStep): boolean {
    const s = this.status();
    if (!s) return false;
    return { agreement: s.agreementSigned, bank: s.bankAdded, training: s.trainingPassed, availability: s.servicesAdded && s.slotsAdded, profile: s.profileConfirmed }[key];
  }

  private refreshStatus() {
    this.applications.setupStatus().subscribe({ next: s => this.status.set(s), error: () => {} });
  }

  private fail(err: any, fallback: string) {
    this.busy.set(false);
    const fields = fieldErrors(err);
    if (fields) this.stepErrors.set(fields);
    else this.errorMsg.set(err?.error?.message || fallback);
  }

  private begin() {
    this.busy.set(true);
    this.errorMsg.set(null);
    this.stepErrors.set({});
  }

  sign() {
    this.begin();
    this.applications.signAgreement(this.typedName.trim()).subscribe({
      next: a => { this.busy.set(false); this.agreement.set(a); this.refreshStatus(); this.step.set('bank'); },
      error: err => this.fail(err, 'We couldn’t record your signature. Please try again.')
    });
  }

  saveBank() {
    this.begin();
    this.applications.saveBank(this.bankForm).subscribe({
      next: b => {
        this.busy.set(false);
        this.bank.set(b);
        this.editingBank.set(false);
        this.bankForm = { accountHolderName: '', accountNumber: '', accountNumberConfirm: '', ifsc: '', accountType: 'SAVINGS', gstRegistered: false, gstin: '' };
        this.refreshStatus();
        this.step.set('training');
      },
      error: err => this.fail(err, 'We couldn’t save your details. Please try again.')
    });
  }

  bankLabel(status: string): string {
    return ({ PENDING: 'Test deposit pending', PASSED: 'Verified', FAILED: 'Failed' } as Record<string, string>)[status] ?? status;
  }

  quizComplete(): boolean {
    return !!this.training()?.questions.every(q => this.quiz[q.id] !== undefined);
  }

  submitTraining() {
    this.begin();
    this.applications.submitTraining(this.quiz).subscribe({
      next: result => {
        this.busy.set(false);
        this.trainingResult.set(result);
        if (result.passed) {
          this.api.showToast('You passed the training.');
          this.applications.training().subscribe({ next: t => this.training.set(t), error: () => {} });
          this.refreshStatus();
          this.step.set('availability');
        }
      },
      error: err => this.fail(err, 'We couldn’t check your answers. Please try again.')
    });
  }

  confirmProfile() {
    this.begin();
    this.applications.confirmProfile().subscribe({
      next: s => { this.busy.set(false); this.status.set(s); },
      error: err => this.fail(err, 'We couldn’t confirm your profile. Please try again.')
    });
  }

  initials(name: string | null): string {
    return (name ?? '').replace(/^Dr\.?\s*/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('') || 'NB';
  }
}
