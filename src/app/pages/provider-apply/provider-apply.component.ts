import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Observable, catchError, forkJoin, of, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { RecaptchaVerifier } from 'firebase/auth';
import { ApiService } from '../../services/api.service';
import { FirebaseAuthService } from '../../services/firebase-auth.service';
import { ProviderApplicationService, fieldErrors } from '../../services/provider-application.service';
import { isProfessionalUser } from '../../models/maternal.models';
import {
  APPLICATION_STATUS_LABELS,
  AnswerValue,
  ApplicationEntry,
  ApplyInfo,
  DOCUMENT_ACCEPT,
  DOCUMENT_MAX_BYTES,
  FormQuestion,
  FormSection,
  MissingAnswer,
  ProfessionRole,
  ProviderApplication,
  isApprovedStatus
} from '../../models/provider-application.models';
import { PROVIDER_PAGE_STYLES } from '../provider-shared/provider-page.styles';

const AUTOSAVE_MS = 900;

/**
 * The common application for every profession. Questions come from the API and show only when their
 * parent has a matching answer. Answers save as they change; documents upload as they are chosen.
 */
@Component({
  selector: 'app-provider-apply',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="provider-page">
      <div class="container narrow">
        <header class="page-header animate-in">
          <span class="kicker">For care professionals</span>
          <h1>{{ title() }}</h1>
          <p>{{ subtitle() }}</p>
        </header>

        @if (view() === 'form') {
          <ol class="stepper" aria-label="Application progress">
            @for (s of sections(); track s.key; let i = $index) {
              <li class="step" [class.done]="stepIndex() > i" [class.current]="stepIndex() === i">
                <span class="step-dot">@if (stepIndex() > i) { <mat-icon>check</mat-icon> } @else { {{ i + 1 }} }</span>
                <span class="step-label">{{ shortTitle(s) }}</span>
              </li>
            }
            <li class="step" [class.current]="stepIndex() === sections().length">
              <span class="step-dot">{{ sections().length + 1 }}</span>
              <span class="step-label">Submit</span>
            </li>
          </ol>
        }

        <div class="ob-card glass animate-in">
          @switch (view()) {
            @case ('loading') {
              <div class="skeleton" style="height: 22px; width: 55%; margin-bottom: 14px"></div>
              <div class="skeleton" style="height: 14px; width: 80%; margin-bottom: 28px"></div>
              <div class="skeleton" style="height: 120px"></div>
            }

            @case ('error') {
              <h2>We couldn’t load your application</h2>
              <p class="sub">Please check your connection and try again.</p>
              <div class="actions"><button class="btn btn-primary" (click)="load()"><mat-icon class="icon-sm">refresh</mat-icon> Try again</button></div>
            }

            @case ('mother') {
              <h2>Please apply with a different email</h2>
              <p class="sub">This is a member account, and one account can’t be both a member and a professional. Sign out, then apply with an email you don’t use as a member.</p>
              <div class="actions"><button class="btn btn-primary" (click)="signOut()">Sign out</button></div>
            }

            @case ('blocked') {
              <h2>This account can’t apply</h2>
              <p class="sub">Please contact support if you think this is a mistake.</p>
            }

            @case ('start') {
              <h2>Before you begin</h2>
              <p class="sub">Choose your profession and accept the terms. You can save and come back at any time.</p>
              @if (info(); as i) {
                <div class="field">
                  <label for="profession">What is your profession? <span class="req">*</span></label>
                  <select id="profession" class="form-control" [(ngModel)]="chosenProfession">
                    <option [ngValue]="null" disabled>Choose your profession</option>
                    @for (p of i.professions; track p.value) { <option [ngValue]="p.value">{{ p.label }}</option> }
                  </select>
                  <span class="hint">Don’t see yours? We don’t support other professions yet.</span>
                </div>
                @if (i.draft) { <div class="proto"><mat-icon class="icon-sm">edit_note</mat-icon> Draft terms, pending legal review.</div> }
                <div class="doc-body">{{ i.termsText }}</div>
                <label class="agree"><input type="checkbox" [(ngModel)]="termsAccepted" /> I accept the application terms.</label>
                <label class="agree"><input type="checkbox" [(ngModel)]="verificationConsent" /> I consent to NartureBelle™ checking my details with registers, institutes and my references.</label>
              }
              @if (errorMsg()) { <div class="error"><mat-icon class="icon-sm">error</mat-icon> {{ errorMsg() }}</div> }
              <div class="actions">
                <button class="btn btn-primary" [disabled]="busy() || !chosenProfession || !termsAccepted || !verificationConsent" (click)="begin()">
                  {{ busy() ? 'Starting…' : 'Start application' }}
                </button>
              </div>
            }

            @case ('form') {
              @if (currentSection(); as section) {
                <h2>{{ section.title }}</h2>
                <p class="sub">{{ section.description }}</p>

                @if (stepIndex() === 0) {
                  <div class="field">
                    <label for="profession-change">What is your profession? <span class="req">*</span></label>
                    <select id="profession-change" class="form-control" [disabled]="busy()" (change)="changeProfession($event)">
                      @for (p of info()?.professions ?? []; track p.value) { <option [value]="p.value" [selected]="p.value === application()?.profession">{{ p.label }}</option> }
                    </select>
                  </div>
                }

                @for (q of section.questions; track q.key) {
                  @if (isVisible(q)) { <ng-container [ngTemplateOutlet]="field" [ngTemplateOutletContext]="{ $implicit: q }"></ng-container> }
                }

                @if (needsLicenceWarning()) {
                  <div class="proto"><mat-icon class="icon-sm">warning</mat-icon> You can still apply, but an application without a current registration can’t be approved.</div>
                }
              } @else {
                <h2>Review and submit</h2>
                <p class="sub">Please check you’ve finished every section. After you submit, your answers are locked while we review them.</p>

                @if (application() && !application()!.contactVerified) {
                  <div class="why-box">
                    <strong><mat-icon class="icon-sm">verified_user</mat-icon> Verify your contact details</strong>
                    @if (entry() && !entry()!.emailVerified) {
                      We need a verified email address too. Please sign out, and sign up using your email.
                    } @else if (phoneStep() === 'idle') {
                      <p class="muted">We need a verified mobile number before you can submit.</p>
                      <div class="row-2">
                        <div class="field">
                          <label for="phone">Mobile number</label>
                          <input id="phone" class="form-control" inputmode="numeric" maxlength="10" placeholder="10-digit number" [(ngModel)]="phoneNumber" />
                        </div>
                      </div>
                      <button class="btn btn-outline btn-sm" [disabled]="busy() || phoneNumber.length !== 10" (click)="sendOtp()">Send code</button>
                    } @else {
                      <div class="row-2">
                        <div class="field">
                          <label for="otp">Enter the code we sent</label>
                          <input id="otp" class="form-control" inputmode="numeric" maxlength="6" [(ngModel)]="otpCode" />
                        </div>
                      </div>
                      <button class="btn btn-outline btn-sm" [disabled]="busy() || otpCode.length !== 6" (click)="confirmOtp()">Verify</button>
                      <button class="btn-link" [disabled]="busy()" (click)="changeNumber()">Use a different number</button>
                    }
                  </div>
                }

                @if (missing().length) {
                  <div class="error"><mat-icon class="icon-sm">error</mat-icon> A few questions still need an answer.</div>
                  @for (m of missing(); track m.key) {
                    <button type="button" class="row-item missing" (click)="goToMissing(m)">
                      <span class="row-main"><strong>{{ m.label }}</strong><span>{{ m.section }}</span></span>
                      <mat-icon class="icon-sm">chevron_right</mat-icon>
                    </button>
                  }
                }
              }

              @if (errorMsg()) { <div class="error"><mat-icon class="icon-sm">error</mat-icon> {{ errorMsg() }}</div> }

              <div class="actions split">
                <button type="button" class="btn btn-outline" [disabled]="stepIndex() === 0" (click)="back()">Back</button>
                <span class="save-state">{{ saving() ? 'Saving…' : savedOnce() ? 'All changes saved' : '' }}</span>
                @if (currentSection()) {
                  <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="next()">Continue</button>
                } @else {
                  <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="submit()">{{ busy() ? 'Submitting…' : 'Submit application' }}</button>
                }
              </div>
              <div class="actions center"><button type="button" class="btn-link" (click)="withdraw()">Withdraw application</button></div>
            }

            @case ('changes') {
              <h2>Please update these details</h2>
              <p class="sub">Our reviewers need a change before they can continue. Only these details can be edited.</p>
              @for (q of requestedQuestions(); track q.key) {
                @if (noteFor(q.key); as note) { <div class="proto"><mat-icon class="icon-sm">info</mat-icon> {{ note }}</div> }
                <ng-container [ngTemplateOutlet]="field" [ngTemplateOutletContext]="{ $implicit: q }"></ng-container>
              }
              @if (missing().length) {
                <div class="error"><mat-icon class="icon-sm">error</mat-icon> Still needed: {{ missingLabels() }}</div>
              }
              @if (errorMsg()) { <div class="error"><mat-icon class="icon-sm">error</mat-icon> {{ errorMsg() }}</div> }
              <div class="actions split">
                <button type="button" class="btn-link" (click)="withdraw()">Withdraw application</button>
                <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="submit()">{{ busy() ? 'Sending…' : 'Send for review' }}</button>
              </div>
            }

            @case ('review') {
              <h2>{{ statusLabel() }}</h2>
              <p class="sub">Thank you for applying. We’ll email you as soon as there’s news.</p>
              <ol class="track">
                <li class="done"><mat-icon class="icon-sm">check_circle</mat-icon> Application submitted</li>
                <li [class.done]="application()?.status === 'MEDICAL_REVIEW'" [class.current]="application()?.status === 'OPERATIONS_REVIEW'">
                  <mat-icon class="icon-sm">{{ application()?.status === 'MEDICAL_REVIEW' ? 'check_circle' : 'pending' }}</mat-icon> Identity and licence check
                </li>
                <li [class.current]="application()?.status === 'MEDICAL_REVIEW'">
                  <mat-icon class="icon-sm">{{ application()?.status === 'MEDICAL_REVIEW' ? 'pending' : 'radio_button_unchecked' }}</mat-icon> Medical review
                </li>
                <li><mat-icon class="icon-sm">radio_button_unchecked</mat-icon> Setup, then go live</li>
              </ol>
              <div class="actions center"><button type="button" class="btn-link" (click)="withdraw()">Withdraw application</button></div>
            }

            @case ('closed') {
              <h2>{{ application()?.status === 'REJECTED' ? 'We’re unable to approve your application' : 'Your application is closed' }}</h2>
              @if (application()?.rejectionReason) { <p class="sub"><strong>Reason:</strong> {{ application()?.rejectionReason }}</p> }
              @if (application()?.status === 'CLOSED') { <p class="sub">We didn’t receive the changes we asked for in time.</p> }
              @if (entry()?.blocked) {
                <p class="sub">This account can’t apply again. Please contact support if you think this is a mistake.</p>
              } @else if (canReapply()) {
                <div class="actions"><button class="btn btn-primary" (click)="startAgain()">Apply again</button></div>
              } @else {
                <p class="sub">You can apply again from {{ application()?.reapplyAfter | date:'d MMMM y' }}.</p>
              }
              <p class="muted">To use NartureBelle™ as a member, please sign up with a different email.</p>
            }
          }
        </div>
      </div>
    </div>
    <!-- Outside every step, so the phone check's reCAPTCHA keeps its container when the applicant moves between steps. -->
    <div id="apply-recaptcha-container"></div>

    <ng-template #field let-q>
      @switch (q.type) {
        @case ('YES_NO') {
          <fieldset>
            <legend>{{ q.label }} @if (q.required) { <span class="req">*</span> }</legend>
            <div class="choice-row">
              @for (o of q.options; track o.value) {
                <button type="button" class="choice" [class.selected]="values[q.key] === o.value" (click)="setValue(q.key, o.value)">{{ o.label }}</button>
              }
            </div>
            @if (q.hint) { <span class="hint">{{ q.hint }}</span> }
            @if (errors()[q.key]; as e) { <span class="field-error">{{ e }}</span> }
          </fieldset>
        }
        @case ('MULTI_SELECT') {
          <fieldset>
            <legend>{{ q.label }} @if (q.required) { <span class="req">*</span> }</legend>
            <div class="check-grid">
              @for (o of q.options; track o.value) {
                <label class="check" [class.on]="isChecked(q.key, o.value)">
                  <input type="checkbox" [checked]="isChecked(q.key, o.value)" (change)="toggleValue(q.key, o.value)" /> {{ o.label }}
                </label>
              }
            </div>
            @if (q.hint) { <span class="hint">{{ q.hint }}</span> }
            @if (errors()[q.key]; as e) { <span class="field-error">{{ e }}</span> }
          </fieldset>
        }
        @case ('CONFIRM') {
          <label class="agree"><input type="checkbox" [checked]="values[q.key] === 'true'" (change)="setValue(q.key, values[q.key] === 'true' ? '' : 'true')" /> {{ q.label }}</label>
          @if (errors()[q.key]; as e) { <span class="field-error">{{ e }}</span> }
        }
        @case ('FILE') {
          <div class="field">
            <label>{{ q.label }} @if (q.required) { <span class="req">*</span> }</label>
            @if (documentFor(q.key); as doc) {
              <div class="row-item">
                <mat-icon class="doc-icon">description</mat-icon>
                <span class="row-main"><strong>{{ doc.fileName }}</strong><span>{{ doc.sizeBytes / 1024 | number:'1.0-0' }} KB</span></span>
                <label class="btn btn-outline btn-sm file-btn">Replace<input type="file" [accept]="documentAccept" (change)="upload(q.key, $event)" /></label>
                <button type="button" class="btn-link" (click)="removeDocument(q.key)">Remove</button>
              </div>
            } @else {
              <label class="btn btn-outline btn-sm file-btn" [class.is-busy]="uploading() === q.key">
                <mat-icon class="icon-sm">upload</mat-icon> {{ uploading() === q.key ? 'Uploading…' : 'Choose a file' }}
                <input type="file" [accept]="documentAccept" [disabled]="uploading() === q.key" (change)="upload(q.key, $event)" />
              </label>
            }
            <span class="hint">{{ q.hint || 'PDF, JPG or PNG, up to 4 MB.' }}</span>
            @if (errors()[q.key]; as e) { <span class="field-error">{{ e }}</span> }
          </div>
        }
        @default {
          <div class="field">
            <label [for]="q.key">{{ q.label }} @if (q.required) { <span class="req">*</span> } @else { <span class="opt">optional</span> }</label>
            @switch (q.type) {
              @case ('SELECT') {
                <select [id]="q.key" class="form-control" [ngModel]="values[q.key]" (ngModelChange)="setValue(q.key, $event)">
                  <option value="" disabled>Please choose</option>
                  @for (o of q.options; track o.value) { <option [value]="o.value">{{ o.label }}</option> }
                </select>
              }
              @case ('LONG_TEXT') {
                <textarea [id]="q.key" class="form-control" rows="3" maxlength="2000" [ngModel]="values[q.key]" (ngModelChange)="setValue(q.key, $event)"></textarea>
              }
              @case ('DATE') {
                <input [id]="q.key" type="date" class="form-control" [ngModel]="values[q.key]" (ngModelChange)="setValue(q.key, $event)" />
              }
              @case ('NUMBER') {
                <input [id]="q.key" type="number" min="0" class="form-control" [ngModel]="values[q.key]" (ngModelChange)="setValue(q.key, $event === null ? '' : '' + $event)" />
              }
              @case ('YEAR') {
                <input [id]="q.key" inputmode="numeric" maxlength="4" class="form-control" placeholder="YYYY" [ngModel]="values[q.key]" (ngModelChange)="setValue(q.key, $event)" />
              }
              @default {
                <input [id]="q.key" class="form-control" maxlength="2000" [placeholder]="isSensitiveSaved(q.key) ? 'Saved. Enter again to change it.' : ''" [ngModel]="values[q.key]" (ngModelChange)="setValue(q.key, $event)" />
              }
            }
            @if (q.hint) { <span class="hint">{{ q.hint }}</span> }
            @if (errors()[q.key]; as e) { <span class="field-error">{{ e }}</span> }
          </div>
        }
      }
    </ng-template>
  `,
  styles: [PROVIDER_PAGE_STYLES, `
    .save-state { align-self: center; font-size: 0.78rem; color: var(--text-muted); }
    .field label.file-btn { position: relative; overflow: hidden; cursor: pointer; display: inline-flex; width: auto; margin: 0; }
    .file-btn input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
    .doc-icon { color: var(--trust-700); }
    .missing { width: 100%; text-align: left; cursor: pointer; }
    .track { list-style: none; padding: 0; margin: 0 0 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; color: var(--text-muted); font-size: 0.92rem; }
    .track li { display: flex; align-items: center; gap: 0.6rem; }
    .track li.done { color: var(--sage-700); }
    .track li.current { color: var(--sage-900); font-weight: 700; }
  `]
})
export class ProviderApplyComponent implements OnInit, OnDestroy {
  private applications = inject(ProviderApplicationService);
  private api = inject(ApiService);
  private firebaseAuth = inject(FirebaseAuthService);
  private router = inject(Router);

  documentAccept = DOCUMENT_ACCEPT;

  loading = signal(true);
  loadFailed = signal(false);
  busy = signal(false);
  saving = signal(false);
  savedOnce = signal(false);
  uploading = signal<string | null>(null);
  errorMsg = signal<string | null>(null);
  errors = signal<Record<string, string>>({});
  missing = signal<MissingAnswer[]>([]);
  startingOver = signal(false);

  entry = signal<ApplicationEntry | null>(null);
  info = signal<ApplyInfo | null>(null);
  application = signal<ProviderApplication | null>(null);
  sections = signal<FormSection[]>([]);
  stepIndex = signal(0);
  phoneStep = signal<'idle' | 'otp'>('idle');

  /** The form's current answers. A plain object, since [ngModel] writes keep it in step with the inputs. */
  values: Record<string, AnswerValue> = {};
  chosenProfession: ProfessionRole | null = null;
  termsAccepted = false;
  verificationConsent = false;
  phoneNumber = '';
  otpCode = '';

  private dirty = new Set<string>();
  private lastSave: Observable<unknown> = of(null);
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private appVerifier: RecaptchaVerifier | null = null;
  private confirmation: unknown = null;

  view = computed<'loading' | 'error' | 'mother' | 'blocked' | 'start' | 'form' | 'changes' | 'review' | 'closed'>(() => {
    if (this.loading()) return 'loading';
    if (this.loadFailed()) return 'error';
    const status = this.application()?.status;
    if (this.startingOver() || !status) {
      if (this.entry()?.blocked) return 'blocked';
      return this.entry()?.motherAccount ? 'mother' : 'start';
    }
    if (status === 'DRAFT') return 'form';
    if (status === 'CHANGES_REQUESTED') return 'changes';
    if (status === 'OPERATIONS_REVIEW' || status === 'MEDICAL_REVIEW') return 'review';
    return 'closed';
  });

  currentSection = computed(() => this.sections()[this.stepIndex()] ?? null);
  statusLabel = computed(() => {
    const status = this.application()?.status;
    return status ? APPLICATION_STATUS_LABELS[status] : '';
  });

  title = computed(() => ({
    form: 'Your application', changes: 'A few changes needed', review: 'We’re reviewing your application', closed: 'Your application',
    mother: 'Join as a professional', blocked: 'Join as a professional', start: 'Join as a professional', loading: 'Your application', error: 'Your application'
  })[this.view()]);
  subtitle = computed(() => this.view() === 'form' ? 'Your answers save automatically, so you can stop and come back any time.' : 'One application for every care profession.');

  ngOnInit() {
    this.load();
  }

  ngOnDestroy() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.flush().subscribe({ error: () => {} });
  }

  load() {
    this.loading.set(true);
    this.loadFailed.set(false);
    this.startingOver.set(false);
    forkJoin({ entry: this.applications.loadEntry(), info: this.applications.applyInfo() }).subscribe({
      next: ({ entry, info }) => {
        this.info.set(info);
        this.entry.set(entry);
        if (entry.hasApplication) {
          this.loadApplication();
        } else {
          this.loading.set(false);
        }
      },
      error: () => { this.loading.set(false); this.loadFailed.set(true); }
    });
  }

  private loadApplication() {
    this.applications.current().subscribe({
      next: application => {
        if (application.status === 'VERIFIED') {
          this.router.navigate(['/provider/setup']);
          return;
        }
        if (isApprovedStatus(application.status)) {
          this.enterDashboard();
          return;
        }
        this.adopt(application);
        this.applications.form(application.profession).subscribe({
          next: sections => { this.sections.set(sections); this.loading.set(false); },
          error: () => { this.loading.set(false); this.loadFailed.set(true); }
        });
      },
      error: () => { this.loading.set(false); this.loadFailed.set(true); }
    });
  }

  /** Someone still signed in when they went live has a stale user without their role, and the dashboard's guard would send them back here. */
  private enterDashboard() {
    this.applications.syncAccount().subscribe(user => {
      if (isProfessionalUser(user)) {
        this.router.navigate(['/provider']);
      } else {
        this.loading.set(false);
        this.loadFailed.set(true);
      }
    });
  }

  private adopt(application: ProviderApplication) {
    this.application.set(application);
    this.values = { ...application.answers };
    this.dirty.clear();
  }

  // ---------- starting ----------

  begin() {
    if (!this.chosenProfession) return;
    this.busy.set(true);
    this.errorMsg.set(null);
    this.applications.start(this.chosenProfession).subscribe({
      next: application => {
        this.startingOver.set(false);
        this.adopt(application);
        this.applications.form(application.profession).subscribe({
          next: sections => { this.sections.set(sections); this.stepIndex.set(0); this.busy.set(false); },
          error: () => { this.busy.set(false); this.loadFailed.set(true); }
        });
      },
      error: err => {
        this.busy.set(false);
        this.errorMsg.set(err?.error?.message || 'We couldn’t start your application. Please try again.');
      }
    });
  }

  startAgain() {
    this.chosenProfession = this.application()?.profession ?? null;
    this.termsAccepted = false;
    this.verificationConsent = false;
    this.startingOver.set(true);
  }

  canReapply(): boolean {
    const after = this.application()?.reapplyAfter;
    return !after || new Date(after) <= new Date();
  }

  changeProfession(event: Event) {
    const select = event.target as HTMLSelectElement;
    const profession = select.value as ProfessionRole;
    const current = this.application();
    if (!current || profession === current.profession) return;
    if (!window.confirm('Changing your profession clears your answers and documents for your current profession. Continue?')) {
      select.value = current.profession;
      return;
    }
    this.busy.set(true);
    this.flush().subscribe({
      next: () => this.applications.changeProfession(profession).subscribe({
        next: application => {
          this.adopt(application);
          this.applications.form(profession).subscribe({
            next: sections => { this.sections.set(sections); this.busy.set(false); },
            error: () => this.busy.set(false)
          });
        },
        error: err => { this.busy.set(false); this.errorMsg.set(err?.error?.message || 'We couldn’t change your profession.'); }
      }),
      error: () => this.busy.set(false)
    });
  }

  // ---------- answers ----------

  isVisible(question: FormQuestion): boolean {
    if (!question.showWhenKey) return true;
    const parent = this.allQuestions().find(q => q.key === question.showWhenKey);
    if (!parent || !this.isVisible(parent)) return false;
    const answer = this.values[question.showWhenKey];
    const answers = Array.isArray(answer) ? answer : answer ? [answer] : [];
    return answers.some(a => question.showWhenValues.includes(a));
  }

  private allQuestions(): FormQuestion[] {
    return this.sections().flatMap(s => s.questions);
  }

  setValue(key: string, value: AnswerValue) {
    this.values[key] = value;
    this.dirty.add(key);
    this.clearError(key);
    this.scheduleSave();
  }

  isChecked(key: string, option: string): boolean {
    const value = this.values[key];
    return Array.isArray(value) && value.includes(option);
  }

  toggleValue(key: string, option: string) {
    const value = Array.isArray(this.values[key]) ? (this.values[key] as string[]) : [];
    this.setValue(key, value.includes(option) ? value.filter(v => v !== option) : [...value, option]);
  }

  private clearError(key: string) {
    if (this.errors()[key]) {
      const next = { ...this.errors() };
      delete next[key];
      this.errors.set(next);
    }
  }

  private scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush().subscribe({ error: () => {} }), AUTOSAVE_MS);
  }

  /** Saves run one at a time, so a submit always waits for any autosave already on its way. */
  private flush(): Observable<unknown> {
    if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTimer = null; }
    const run = this.lastSave.pipe(
      catchError(() => of(null)),
      switchMap(() => this.sendDirty()),
      shareReplay(1)
    );
    this.lastSave = run;
    return run;
  }

  /** Sends changed answers. A blank sensitive field means "unchanged", since the saved value is never shown. */
  private sendDirty(): Observable<unknown> {
    const changed: Record<string, AnswerValue> = {};
    for (const key of this.dirty) {
      const question = this.allQuestions().find(q => q.key === key);
      if (question?.sensitive && !this.values[key]) continue;
      changed[key] = this.values[key];
    }
    this.dirty.clear();
    if (!Object.keys(changed).length) return of(null);
    this.saving.set(true);
    return this.applications.saveAnswers(changed).pipe(
      tap(application => {
        this.saving.set(false);
        this.savedOnce.set(true);
        this.application.update(current => current ? { ...current, sensitiveSaved: application.sensitiveSaved } : current);
      }),
      catchError(err => {
        this.saving.set(false);
        Object.keys(changed).forEach(key => this.dirty.add(key));
        const fields = fieldErrors(err);
        if (fields) return this.handleBadAnswers(fields, err);
        this.errorMsg.set(err?.error?.message || 'We couldn’t save your last change. Please try again.');
        return throwError(() => err);
      })
    );
  }

  /**
   * One bad answer stops the whole save. A hidden one no longer matters, so it's cleared and the save retried.
   * A visible one may be on another step, so go there: otherwise Continue would seem to do nothing.
   */
  private handleBadAnswers(fields: Record<string, string>, err: unknown): Observable<unknown> {
    const questions = this.allQuestions();
    const visibleKeys = Object.keys(fields).filter(key => {
      const question = questions.find(q => q.key === key);
      return !!question && this.isVisible(question);
    });
    if (!visibleKeys.length) {
      Object.keys(fields).forEach(key => { this.values[key] = ''; });
      return this.sendDirty();
    }
    this.errors.set({ ...this.errors(), ...fields });
    this.errorMsg.set('Please correct the highlighted answer to continue.');
    const index = this.sections().findIndex(section => section.questions.some(q => q.key === visibleKeys[0]));
    if (index >= 0 && index !== this.stepIndex()) this.moveTo(index);
    return throwError(() => err);
  }

  isSensitiveSaved(key: string): boolean {
    return !!this.application()?.sensitiveSaved.includes(key);
  }

  needsLicenceWarning(): boolean {
    return this.currentSection()?.key === 'eligibility' && this.values['holdsRegistration'] === 'NO';
  }

  // ---------- documents ----------

  documentFor(key: string) {
    return this.application()?.documents.find(d => d.questionKey === key) ?? null;
  }

  upload(key: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > DOCUMENT_MAX_BYTES) {
      this.errors.set({ ...this.errors(), [key]: 'Please choose a file of 4 MB or less.' });
      return;
    }
    this.uploading.set(key);
    this.clearError(key);
    this.applications.uploadDocument(key, file).subscribe({
      next: document => {
        this.uploading.set(null);
        this.application.update(current => current
          ? { ...current, documents: [...current.documents.filter(d => d.questionKey !== key), document] }
          : current);
      },
      error: err => {
        this.uploading.set(null);
        this.errors.set({ ...this.errors(), [key]: err?.error?.message || 'We couldn’t upload that file. Please try again.' });
      }
    });
  }

  removeDocument(key: string) {
    this.applications.removeDocument(key).subscribe({
      next: () => this.application.update(current => current
        ? { ...current, documents: current.documents.filter(d => d.questionKey !== key) }
        : current),
      error: err => this.errors.set({ ...this.errors(), [key]: err?.error?.message || 'We couldn’t remove that file. Please try again.' })
    });
  }

  // ---------- moving through the form ----------

  next() {
    const section = this.currentSection();
    if (!section || !this.validate(section.questions)) return;
    this.errorMsg.set(null);
    this.busy.set(true);
    this.flush().subscribe({
      next: () => { this.busy.set(false); this.errorMsg.set(null); this.moveTo(this.stepIndex() + 1); },
      error: () => this.busy.set(false)
    });
  }

  back() {
    this.flush().subscribe({ error: () => {} });
    this.missing.set([]);
    this.moveTo(this.stepIndex() - 1);
  }

  goToMissing(item: MissingAnswer) {
    const index = this.sections().findIndex(s => s.title === item.section);
    if (index >= 0) this.moveTo(index);
  }

  private moveTo(index: number) {
    this.stepIndex.set(Math.max(0, index));
    window.scrollTo({ top: 0 });
  }

  /** The API checks all of this again on submit; here it just points to the problem before moving on. */
  private validate(questions: FormQuestion[]): boolean {
    const problems: Record<string, string> = {};
    for (const question of questions) {
      if (!this.isVisible(question)) continue;
      if (question.type === 'FILE') {
        if (question.required && !this.documentFor(question.key)) problems[question.key] = 'Please upload this file.';
        continue;
      }
      const value = this.values[question.key];
      const empty = !value || (Array.isArray(value) && !value.length);
      if (empty) {
        if (question.required && !this.isSensitiveSaved(question.key)) problems[question.key] = question.type === 'CONFIRM' ? 'Please confirm this.' : 'Please answer this.';
      } else if (question.pattern && typeof value === 'string' && !new RegExp(question.pattern).test(question.key === 'pan' ? value.toUpperCase() : value)) {
        problems[question.key] = question.patternMessage || 'Please check this.';
      }
    }
    this.errors.set(problems);
    return !Object.keys(problems).length;
  }

  submit() {
    this.busy.set(true);
    this.errorMsg.set(null);
    this.missing.set([]);
    this.flush().subscribe({
      next: () => this.applications.submit().subscribe({
        next: application => {
          this.busy.set(false);
          this.adopt(application);
          window.scrollTo({ top: 0 });
          this.api.showToast('Your application has been sent for review.');
        },
        error: err => {
          this.busy.set(false);
          if (err?.error?.code === 'APPLICATION_INCOMPLETE') this.missing.set(err.error.missing ?? []);
          else this.errorMsg.set(err?.error?.message || 'We couldn’t submit your application. Please try again.');
        }
      }),
      error: () => this.busy.set(false)
    });
  }

  withdraw() {
    if (!window.confirm('Withdraw your application? You can apply again later.')) return;
    this.applications.withdraw().subscribe({
      next: application => this.adopt(application),
      error: err => this.errorMsg.set(err?.error?.message || 'We couldn’t withdraw your application.')
    });
  }

  // ---------- changes requested ----------

  requestedQuestions(): FormQuestion[] {
    const keys = this.application()?.requestedChanges.map(c => c.questionKey) ?? [];
    return this.allQuestions().filter(q => keys.includes(q.key));
  }

  noteFor(key: string): string | null {
    return this.application()?.requestedChanges.find(c => c.questionKey === key)?.note ?? null;
  }

  missingLabels(): string {
    return this.missing().map(m => m.label).join(', ');
  }

  // ---------- phone verification ----------

  async sendOtp() {
    this.busy.set(true);
    this.errorMsg.set(null);
    try {
      if (this.firebaseAuth.isConfigured() && !this.appVerifier) {
        this.appVerifier = this.firebaseAuth.initRecaptcha('apply-recaptcha-container');
      }
      this.confirmation = await this.firebaseAuth.linkPhoneToAccount(this.phoneNumber, this.appVerifier);
      this.phoneStep.set('otp');
    } catch (err: any) {
      this.resetRecaptcha();
      this.errorMsg.set(err?.message || 'We couldn’t send a code. Please try again.');
    } finally {
      this.busy.set(false);
    }
  }

  changeNumber() {
    this.otpCode = '';
    this.confirmation = null;
    this.resetRecaptcha();
    this.phoneStep.set('idle');
  }

  /** A used or failed verifier can't send again, so the next attempt builds a fresh one. */
  private resetRecaptcha() {
    this.appVerifier?.clear();
    this.appVerifier = null;
  }

  async confirmOtp() {
    this.busy.set(true);
    this.errorMsg.set(null);
    try {
      await this.firebaseAuth.confirmPhoneLink(this.confirmation, this.otpCode);
      this.api.loginWithFirebase().subscribe({ next: user => { if (user) this.api.setUser(user); }, error: () => {} });
      this.applications.current().subscribe({
        next: application => { this.application.update(current => current ? { ...current, contactVerified: application.contactVerified } : current); this.busy.set(false); },
        error: () => this.busy.set(false)
      });
    } catch (err: any) {
      this.busy.set(false);
      this.errorMsg.set(err?.message || 'That code didn’t work. Please try again.');
    }
  }

  signOut() {
    this.firebaseAuth.logout().finally(() => {
      this.api.logout();
      this.router.navigate(['/provider/join']);
    });
  }

  shortTitle(section: FormSection): string {
    return section.title.split(' ')[0];
  }
}
