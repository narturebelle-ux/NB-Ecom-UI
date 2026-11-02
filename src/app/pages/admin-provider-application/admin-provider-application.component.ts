import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Observable } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { ProviderApplicationService } from '../../services/provider-application.service';
import {
  APPLICATION_STATUS_LABELS,
  ApplicationDocument,
  CARE_STAGE_OPTIONS,
  ChangeRequestForReview,
  FLAG_LABELS,
  MEDICAL_CHECKLIST,
  OPERATIONS_CHECKLIST,
  PROFESSION_LABELS,
  ReviewDetail
} from '../../models/provider-application.models';
import { PROVIDER_PAGE_STYLES, saveBlob } from '../provider-shared/provider-page.styles';

type Decision = 'PASS' | 'APPROVE' | 'CHANGES' | 'REJECT';

/** One application for staff: answers, documents, the checklist for their stage, and every decision after it. */
@Component({
  selector: 'app-admin-provider-application',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule],
  template: `
    <div class="provider-page">
      <div class="container wide">
        <a class="btn-link" routerLink="/admin/provider-applications"><mat-icon class="icon-sm">arrow_back</mat-icon> All applications</a>

        @if (loading()) {
          <p class="muted">Loading…</p>
        } @else if (!detail()) {
          <div class="error"><mat-icon class="icon-sm">error</mat-icon> {{ errorMsg() || 'We couldn’t load this application.' }}</div>
        } @else if (detail(); as d) {
          <header class="head">
            <span class="kicker">{{ professionLabel() }}</span>
            <h1>{{ applicantName() }}</h1>
            <p class="muted">{{ d.email }}@if (d.phone) { · {{ d.phone }} }@if (d.submittedAt) { · submitted {{ d.submittedAt | date:'d MMM y' }} }</p>
            <span class="badge-pill">{{ statusLabel() }}</span>
            @if (d.canPrescribe) { <span class="badge-pill blush">Can prescribe</span> }
          </header>

          @if (d.flags.length) {
            <div class="proto flags"><mat-icon class="icon-sm">flag</mat-icon> {{ flagLabels() }}</div>
          }

          <div class="grid">
            <div class="col">
              @for (s of d.sections; track s.title) {
                <section class="panel glass">
                  <div class="panel-head"><h3>{{ s.title }}</h3></div>
                  <dl>
                    @for (a of s.answers; track a.key) { <dt>{{ a.label }}</dt><dd>{{ a.value || '-' }}</dd> }
                  </dl>
                </section>
              }
            </div>

            <div class="col">
              <section class="panel glass">
                <div class="panel-head"><h3><mat-icon>folder</mat-icon> Documents</h3></div>
                @for (doc of d.documents; track doc.id) {
                  <button type="button" class="row-item doc" (click)="download(doc)">
                    <span class="row-main"><strong>{{ humanize(doc.questionKey) }}</strong><span>{{ doc.fileName }}</span></span>
                    <mat-icon class="icon-sm">download</mat-icon>
                  </button>
                } @empty { <p class="muted">No documents.</p> }
                <p class="muted">Each download is recorded.</p>
              </section>

              @if (canDecide()) {
                <section class="panel glass">
                  <div class="panel-head"><h3><mat-icon>fact_check</mat-icon> {{ d.status === 'OPERATIONS_REVIEW' ? 'Operations checklist' : 'Medical Reviewer checklist' }}</h3></div>
                  @if (sameReviewer()) {
                    <div class="error"><mat-icon class="icon-sm">error</mat-icon> You did the Operations check, so a different person must give the final decision.</div>
                  } @else {
                    @for (c of checklist(); track c.key) {
                      <label class="agree"><input type="checkbox" [(ngModel)]="checks[c.key]" /> {{ c.label }}</label>
                    }

                    @if (d.status === 'MEDICAL_REVIEW') {
                      <div class="field"><label for="yrs">Confirmed years of experience <span class="req">*</span></label>
                        <input id="yrs" type="number" min="0" class="form-control" [(ngModel)]="confirmedYears" /></div>
                      <fieldset>
                        <legend>Cleared care stages <span class="req">*</span></legend>
                        <div class="choice-row">
                          @for (o of stageOptions; track o.value) {
                            <button type="button" class="choice" [class.selected]="stages.includes(o.value)" (click)="toggleStage(o.value)">{{ o.label }}</button>
                          }
                        </div>
                      </fieldset>
                    }

                    <fieldset>
                      <legend>Decision <span class="req">*</span></legend>
                      <div class="choice-row">
                        <button type="button" class="choice" [class.selected]="decision() === positive()" (click)="decision.set(positive())">{{ d.status === 'OPERATIONS_REVIEW' ? 'Pass to Medical' : 'Approve' }}</button>
                        <button type="button" class="choice" [class.selected]="decision() === 'CHANGES'" (click)="decision.set('CHANGES')">Ask for changes</button>
                        <button type="button" class="choice" [class.selected]="decision() === 'REJECT'" (click)="decision.set('REJECT')">Reject</button>
                      </div>
                    </fieldset>

                    @if (decision() === 'CHANGES') {
                      <fieldset>
                        <legend>Which details need changing?</legend>
                        <div class="change-list">
                          @for (f of changeableFields(); track f.key) {
                            <label class="agree"><input type="checkbox" [checked]="changes[f.key] !== undefined" (change)="toggleChange(f.key)" /> {{ f.label }}</label>
                            @if (changes[f.key] !== undefined) {
                              <input class="form-control note" maxlength="500" placeholder="Note to the applicant" [(ngModel)]="changes[f.key]" />
                            }
                          }
                        </div>
                      </fieldset>
                    }

                    @if (decision() === 'REJECT') {
                      <label class="agree"><input type="checkbox" [(ngModel)]="fraud" /> This is a fake document or false information. Block this account permanently.</label>
                    }

                    <div class="field"><label for="reason">Reason @if (decision() === 'REJECT') { <span class="req">*</span> } @else { <span class="opt">optional</span> }</label>
                      <textarea id="reason" class="form-control" rows="3" [(ngModel)]="reason"></textarea>
                      @if (decision() === 'REJECT') { <span class="hint">The applicant sees this reason.</span> }
                    </div>

                    @if (errorMsg()) { <div class="error"><mat-icon class="icon-sm">error</mat-icon> {{ errorMsg() }}</div> }
                    <div class="actions"><button class="btn btn-primary" [disabled]="busy() || !decision()" (click)="submitDecision()">Record decision</button></div>
                  }
                </section>
              } @else if (d.status === 'OPERATIONS_REVIEW' || d.status === 'MEDICAL_REVIEW') {
                <section class="panel glass">
                  <p class="muted">This stage belongs to {{ d.status === 'OPERATIONS_REVIEW' ? 'Operations' : 'the Medical Reviewer' }}.</p>
                </section>
              }

              @if (d.setup; as setup) {
                <section class="panel glass">
                  <div class="panel-head"><h3><mat-icon>checklist</mat-icon> Setup</h3></div>
                  @if (d.status === 'VERIFIED') {
                    @if (setup.missing.length) {
                      <ul class="missing">@for (m of setup.missing; track m) { <li>{{ m }}</li> }</ul>
                    } @else {
                      <p class="muted">Everything is complete.</p>
                    }
                    @if (isOperations()) {
                      @if (d.recheckRequired) {
                        <div class="actions"><button class="btn btn-outline" [disabled]="busy()" (click)="act(applications.completeRecheck(d.id))">Mark re-check complete</button></div>
                      }
                      <div class="actions"><button class="btn btn-primary" [disabled]="busy() || !setup.readyForGoLive" (click)="goLive()">Set live</button></div>
                    }
                  } @else {
                    <p class="muted">Live since setup finished.</p>
                  }
                  @if (errorMsg() && !canDecide()) { <div class="error"><mat-icon class="icon-sm">error</mat-icon> {{ errorMsg() }}</div> }
                </section>
              }

              @if (d.bank; as b) {
                <section class="panel glass">
                  <div class="panel-head"><h3><mat-icon>account_balance</mat-icon> Bank details</h3><span class="badge-pill" [class.warn]="b.verificationStatus === 'PENDING'" [class.danger]="b.verificationStatus === 'FAILED'">{{ b.verificationStatus }}</span></div>
                  <dl>
                    <dt>Holder</dt><dd>{{ b.accountHolderName }}</dd>
                    <dt>Account</dt><dd>{{ b.accountNumber }}</dd>
                    <dt>IFSC</dt><dd>{{ b.ifsc }} ({{ b.accountType }})</dd>
                    <dt>GSTIN</dt><dd>{{ b.gstin || 'Not registered' }}</dd>
                  </dl>
                  @if (b.verificationStatus === 'PENDING') {
                    <p class="muted">No test-deposit service is connected yet. Send the deposit by hand, then record the result.</p>
                    <div class="actions">
                      <button class="btn btn-outline" [disabled]="busy()" (click)="act(applications.verifyBank(d.id, false, null))">Test deposit failed</button>
                      <button class="btn btn-primary" [disabled]="busy()" (click)="act(applications.verifyBank(d.id, true, null))">Test deposit passed</button>
                    </div>
                  }
                </section>
              }

              @if (isOperations() && (d.status === 'ACTIVE' || d.status === 'PAUSED' || d.status === 'SUSPENDED')) {
                <section class="panel glass">
                  <div class="panel-head"><h3><mat-icon>tune</mat-icon> Status</h3></div>
                  <div class="field"><label for="sr">Reason <span class="req">*</span></label>
                    <input id="sr" class="form-control" [(ngModel)]="statusReason" /></div>
                  <p class="muted">Suspending cancels upcoming sessions. Mothers aren’t told why, and no session is deducted.</p>
                  <div class="actions">
                    @if (d.status !== 'ACTIVE') { <button class="btn btn-outline" [disabled]="busy() || !statusReason.trim()" (click)="setStatus('ACTIVE')">Restore</button> }
                    @if (d.status === 'ACTIVE') { <button class="btn btn-outline" [disabled]="busy() || !statusReason.trim()" (click)="setStatus('PAUSED')">Pause</button> }
                    @if (d.status !== 'SUSPENDED') { <button class="btn btn-primary" [disabled]="busy() || !statusReason.trim()" (click)="setStatus('SUSPENDED')">Suspend</button> }
                  </div>
                  @if (errorMsg()) { <div class="error"><mat-icon class="icon-sm">error</mat-icon> {{ errorMsg() }}</div> }
                </section>
              }

              @if (pendingChanges().length) {
                <section class="panel glass">
                  <div class="panel-head"><h3><mat-icon>edit_note</mat-icon> Requested changes</h3></div>
                  @for (c of pendingChanges(); track c.id) {
                    <div class="change">
                      <strong>{{ c.type }}</strong>
                      <dl>@for (v of changeValues(c); track v.key) { <dt>{{ humanize(v.key) }}</dt><dd>{{ v.value }}</dd> }</dl>
                      @if (c.pendingDocumentId) {
                        <button class="btn-link" (click)="downloadById(c.pendingDocumentId, 'document')"><mat-icon class="icon-sm">download</mat-icon> Supporting document</button>
                      }
                      @if (c.type === 'LICENCE' || isOperations()) {
                        <div class="actions">
                          <button class="btn btn-outline btn-sm" [disabled]="busy()" (click)="decideChange(c, false)">Reject</button>
                          <button class="btn btn-primary btn-sm" [disabled]="busy()" (click)="decideChange(c, true)">Approve</button>
                        </div>
                      } @else {
                        <p class="muted">Operations decides this change.</p>
                      }
                    </div>
                  }
                </section>
              }

              @if (d.history.length) {
                <section class="panel glass">
                  <div class="panel-head"><h3><mat-icon>history</mat-icon> History</h3></div>
                  @for (h of d.history; track $index) {
                    <div class="row-item"><span class="row-main">
                      <strong>{{ h.stage === 'OPERATIONS' ? 'Operations' : 'Medical' }}: {{ h.decision }}</strong>
                      <span>Staff #{{ h.reviewerUserId }} · {{ h.createdAt | date:'d MMM y' }}@if (h.reason) { · {{ h.reason }} }</span>
                    </span></div>
                  }
                </section>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [PROVIDER_PAGE_STYLES, `
    .head { margin: 1rem 0 1.25rem; }
    .head h1 { font-size: clamp(1.7rem, 3.2vw, 2.2rem); color: var(--sage-900); margin: 0.4rem 0; }
    .head .badge-pill { margin-right: 0.4rem; }
    .flags { margin-bottom: 1.25rem; font-size: 0.86rem; }
    .grid { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 1.25rem; align-items: start; }
    .col { display: flex; flex-direction: column; gap: 1.25rem; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
    dl { display: grid; grid-template-columns: minmax(120px, 42%) 1fr; gap: 0.5rem 0.9rem; margin: 0; }
    dt { font-size: 0.8rem; color: var(--text-muted); }
    dd { margin: 0; font-size: 0.88rem; color: var(--sage-900); word-break: break-word; }
    .doc { width: 100%; text-align: left; cursor: pointer; }
    .note { margin: 0 0 0.75rem 1.5rem; width: calc(100% - 1.5rem); }
    .change-list { max-height: 320px; overflow-y: auto; }
    .missing { margin: 0 0 0.5rem 1.1rem; color: var(--text-secondary); font-size: 0.88rem; }
    .change { border-top: 1px solid var(--border-light); padding-top: 0.75rem; margin-top: 0.75rem; }
    .change:first-of-type { border-top: none; padding-top: 0; margin-top: 0; }
  `]
})
export class AdminProviderApplicationComponent implements OnInit {
  applications = inject(ProviderApplicationService);
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);

  stageOptions = CARE_STAGE_OPTIONS;
  loading = signal(true);
  busy = signal(false);
  errorMsg = signal<string | null>(null);
  detail = signal<ReviewDetail | null>(null);
  decision = signal<Decision | null>(null);

  checks: Record<string, boolean> = {};
  changes: Record<string, string> = {};
  reason = '';
  statusReason = '';
  fraud = false;
  confirmedYears: number | null = null;
  stages: string[] = [];

  private id = 0;

  isOperations = computed(() => !!this.api.currentUser()?.roles?.includes('OPERATIONS_ADMIN'));
  isMedical = computed(() => !!this.api.currentUser()?.roles?.includes('MEDICAL_REVIEWER'));
  canDecide = computed(() => {
    const status = this.detail()?.status;
    return (status === 'OPERATIONS_REVIEW' && this.isOperations()) || (status === 'MEDICAL_REVIEW' && this.isMedical());
  });
  sameReviewer = computed(() => {
    const d = this.detail();
    return d?.status === 'MEDICAL_REVIEW' && d.operationsReviewerId === this.api.currentUser()?.id;
  });
  checklist = computed(() => this.detail()?.status === 'OPERATIONS_REVIEW' ? OPERATIONS_CHECKLIST : MEDICAL_CHECKLIST);
  positive = computed<Decision>(() => this.detail()?.status === 'OPERATIONS_REVIEW' ? 'PASS' : 'APPROVE');
  pendingChanges = computed(() => (this.detail()?.changeRequests ?? []).filter(c => c.status === 'PENDING'));
  professionLabel = computed(() => {
    const d = this.detail();
    return d ? PROFESSION_LABELS[d.profession] ?? d.profession : '';
  });
  statusLabel = computed(() => {
    const d = this.detail();
    return d ? APPLICATION_STATUS_LABELS[d.status] : '';
  });
  applicantName = computed(() => this.detail()?.sections.flatMap(s => s.answers).find(a => a.key === 'legalName')?.value ?? 'Applicant');
  flagLabels = computed(() => (this.detail()?.flags ?? []).map(f => FLAG_LABELS[f] ?? f).join(' · '));
  changeableFields = computed(() => {
    const d = this.detail();
    if (!d) return [];
    const answers = d.sections.flatMap(s => s.answers).map(a => ({ key: a.key, label: a.label }));
    const documents = d.documents.map(doc => ({ key: doc.questionKey, label: `Document: ${this.humanize(doc.questionKey)}` }));
    return [...answers, ...documents];
  });

  ngOnInit() {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.applications.reviewDetail(this.id).subscribe({
      next: detail => { this.adopt(detail); this.loading.set(false); },
      error: err => { this.loading.set(false); this.errorMsg.set(err?.error?.message || null); }
    });
  }

  private adopt(detail: ReviewDetail) {
    this.detail.set(detail);
    this.confirmedYears = detail.sections.flatMap(s => s.answers).find(a => a.key === 'experienceYears')?.value as unknown as number ?? null;
    this.resetForm();
  }

  private resetForm() {
    this.decision.set(null);
    this.checks = {};
    this.changes = {};
    this.reason = '';
    this.fraud = false;
    this.stages = [];
  }

  humanize(key: string): string {
    const words = key.replace(/^pending-/, '').replace(/([A-Z])/g, ' $1').toLowerCase();
    return (words.charAt(0).toUpperCase() + words.slice(1)).replace(/\b(cv|pan|mbbs|id|pcpndt)\b/gi, match => match.toUpperCase());
  }

  toggleStage(value: string) {
    this.stages = this.stages.includes(value) ? this.stages.filter(s => s !== value) : [...this.stages, value];
  }

  toggleChange(key: string) {
    if (this.changes[key] !== undefined) delete this.changes[key];
    else this.changes[key] = '';
  }

  submitDecision() {
    const d = this.detail();
    const decision = this.decision();
    if (!d || !decision) return;
    const body = {
      decision,
      reason: this.reason.trim() || null,
      fraud: decision === 'REJECT' && this.fraud,
      checklist: this.checks,
      changes: decision === 'CHANGES' ? Object.entries(this.changes).map(([questionKey, note]) => ({ questionKey, note: note || null })) : null,
      confirmedExperienceYears: this.confirmedYears,
      clearedStages: this.stages
    };
    this.act(d.status === 'OPERATIONS_REVIEW' ? this.applications.operationsDecision(d.id, body) : this.applications.medicalDecision(d.id, body));
  }

  goLive() {
    const d = this.detail();
    if (d && window.confirm('Set this professional live? Mothers will be able to see and book them.')) {
      this.act(this.applications.goLive(d.id));
    }
  }

  setStatus(status: string) {
    const d = this.detail();
    if (!d) return;
    if (status === 'SUSPENDED' && !window.confirm('Suspend this professional and cancel their upcoming sessions?')) return;
    this.act(this.applications.changeStatus(d.id, status, this.statusReason.trim()));
    this.statusReason = '';
  }

  act(request: Observable<ReviewDetail>) {
    this.busy.set(true);
    this.errorMsg.set(null);
    request.subscribe({
      next: detail => {
        this.busy.set(false);
        this.adopt(detail);
        this.api.showToast('Saved.');
      },
      error: err => {
        this.busy.set(false);
        const missing: string[] | undefined = err?.error?.missing;
        this.errorMsg.set(missing?.length ? missing.join(' · ') : err?.error?.message || 'We couldn’t save that. Please try again.');
      }
    });
  }

  changeValues(change: ChangeRequestForReview): { key: string; value: string }[] {
    return Object.entries(change.values).map(([key, value]) => ({ key, value: Array.isArray(value) ? value.join(', ') : String(value) }));
  }

  decideChange(change: ChangeRequestForReview, approve: boolean) {
    this.busy.set(true);
    this.errorMsg.set(null);
    this.applications.decideChange(change.id, approve, null).subscribe({
      next: () => this.applications.reviewDetail(this.id).subscribe({
        next: detail => { this.busy.set(false); this.adopt(detail); },
        error: () => this.busy.set(false)
      }),
      error: err => { this.busy.set(false); this.errorMsg.set(err?.error?.message || 'We couldn’t save that decision.'); }
    });
  }

  download(doc: ApplicationDocument) {
    this.downloadById(doc.id, doc.fileName);
  }

  downloadById(id: number, fallback: string) {
    this.applications.downloadDocument(id, fallback).subscribe({
      next: ({ blob, filename }) => saveBlob(blob, filename),
      error: () => this.api.showToast('We couldn’t download that document.')
    });
  }
}
