import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../services/api.service';
import { HealthRuleReviewService, HealthRuleStatus, ProductHealthRule } from '../../services/health-rule-review.service';
import { RISK_FACTOR_LABELS, RiskFactor } from '../../models/onboarding.models';

/** Clinical review queue for product health rules (Part D). Rules only affect mothers once approved here. */
@Component({
  selector: 'app-health-rule-review',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="review-page">
      <div class="container narrow">
        <header>
          <span class="kicker">Clinical review</span>
          <h1>Product health rules</h1>
          <p>Each rule hides or promotes products for mothers with a health condition. A rule only takes effect once a verified professional or medical reviewer approves it. You can’t review a rule you created.</p>
        </header>

        <div class="tabs" role="tablist">
          @for (t of tabs; track t.label) {
            <button role="tab" class="tab" [class.on]="tab() === t.status" [attr.aria-selected]="tab() === t.status" (click)="setTab(t.status)">{{ t.label }}</button>
          }
        </div>

        @if (loading()) {
          <p class="hint">Loading…</p>
        } @else if (errorMsg()) {
          <div class="card empty"><p>{{ errorMsg() }}</p></div>
        } @else {
          @for (r of rules(); track r.id) {
            <article class="rule card">
              <div class="rule-head">
                <span class="effect" [class.avoid]="r.effect === 'AVOID'">{{ r.effect === 'AVOID' ? 'Avoid' : 'Prefer' }}</span>
                <strong>{{ riskLabel(r.riskFactor) }} → products tagged “{{ r.tag }}”</strong>
              </div>
              <p class="reason"><span class="label">Reason shown to mothers:</span> {{ r.reason }}</p>
              <p class="hint">Created {{ r.createdAt | date:'d MMM y, h:mm a' }}</p>
              @if (r.reviewedAt) {
                <p class="hint">
                  {{ r.status === 'APPROVED' ? 'Approved' : 'Rejected' }} by {{ r.reviewedByName || 'a reviewer' }} ({{ roleLabel(r.reviewedByRole) }}) on {{ r.reviewedAt | date:'d MMM y' }}
                  @if (r.rejectionReason) { — “{{ r.rejectionReason }}” }
                </p>
              }
              @if (r.status === 'PENDING_CLINICAL_REVIEW') {
                @if (rejectingId() === r.id) {
                  <div class="reject-box">
                    <label [for]="'rej' + r.id">Why are you rejecting it?</label>
                    <textarea [id]="'rej' + r.id" class="form-control" rows="2" maxlength="500" [(ngModel)]="rejectReason"></textarea>
                    <div class="actions">
                      <button class="btn btn-link btn-sm" (click)="rejectingId.set(null)">Cancel</button>
                      <button class="btn btn-outline btn-sm danger" [disabled]="!rejectReason.trim() || busy() === r.id" (click)="reject(r)">Reject rule</button>
                    </div>
                  </div>
                } @else {
                  <div class="actions">
                    <button class="btn btn-link btn-sm" (click)="startReject(r)">Reject…</button>
                    <button class="btn btn-primary btn-sm" [disabled]="busy() === r.id" (click)="approve(r)"><mat-icon class="icon-sm">verified</mat-icon> Approve</button>
                  </div>
                }
              }
            </article>
          } @empty {
            <div class="card empty"><p>{{ tab() ? 'No rules here yet.' : 'Nothing waiting for review.' }}</p></div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .review-page { padding: 3rem 0 5rem; }
    .narrow { max-width: 760px; }
    header { margin-bottom: 1.25rem; }
    .kicker { font-size: 0.78rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trust-700); }
    h1 { font-size: clamp(1.7rem, 3.2vw, 2.2rem); color: var(--sage-900); margin: 0.4rem 0; }
    header p { color: var(--text-secondary); font-size: 0.9rem; }
    .tabs { display: flex; gap: 0.4rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .tab { border: 1.5px solid var(--border-light); background: #fff; border-radius: var(--radius-full); padding: 0.4rem 0.9rem; font-weight: 600; font-size: 0.84rem; color: var(--text-secondary); cursor: pointer; }
    .tab.on { background: var(--sage-700); border-color: var(--sage-700); color: #fff; }
    .card { border-radius: var(--radius-lg, 14px); background: #fff; border: 1px solid var(--border-light); }
    .rule { padding: 1rem 1.15rem; margin-bottom: 0.75rem; display: flex; flex-direction: column; gap: 0.35rem; }
    .rule-head { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .rule-head strong { color: var(--sage-900); }
    .effect { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; padding: 0.15rem 0.55rem; border-radius: var(--radius-full); background: var(--sage-700); color: #fff; }
    .effect.avoid { background: #a0281c; }
    .reason { font-size: 0.86rem; color: var(--text-secondary); }
    .label { font-weight: 700; color: var(--sage-900); }
    .hint { font-size: 0.78rem; color: var(--text-muted); }
    .actions { display: flex; justify-content: flex-end; gap: 0.5rem; align-items: center; }
    .reject-box { display: flex; flex-direction: column; gap: 0.4rem; margin-top: 0.4rem; }
    .reject-box label { font-size: 0.82rem; font-weight: 600; color: var(--sage-900); }
    .danger { color: #a0281c; border-color: #a0281c; }
    .empty { padding: 1.5rem; text-align: center; color: var(--text-secondary); }
  `]
})
export class HealthRuleReviewComponent implements OnInit {
  private review = inject(HealthRuleReviewService);
  private api = inject(ApiService);

  tabs: { label: string; status: HealthRuleStatus | undefined }[] = [
    { label: 'Waiting for review', status: undefined },
    { label: 'Approved', status: 'APPROVED' },
    { label: 'Rejected', status: 'REJECTED' }
  ];
  tab = signal<HealthRuleStatus | undefined>(undefined);
  rules = signal<ProductHealthRule[]>([]);
  loading = signal(true);
  errorMsg = signal<string | null>(null);
  busy = signal<number | null>(null);
  rejectingId = signal<number | null>(null);
  rejectReason = '';

  ngOnInit() {
    this.load();
  }

  setTab(status: HealthRuleStatus | undefined) {
    this.tab.set(status);
    this.load();
  }

  load() {
    this.loading.set(true);
    this.errorMsg.set(null);
    this.review.list(this.tab()).subscribe({
      next: list => { this.rules.set(list); this.loading.set(false); },
      error: err => {
        this.loading.set(false);
        this.errorMsg.set(err?.status === 403
          ? 'Only medical reviewers and verified gynecologists, nutritionists or registered nurses can review rules.'
          : err?.status === 404 ? 'Rule review isn’t available on this server yet.' : 'We couldn’t load the rules. Please try again.');
      }
    });
  }

  approve(r: ProductHealthRule) {
    this.busy.set(r.id);
    this.review.approve(r.id).subscribe({
      next: () => { this.busy.set(null); this.api.showToast('Rule approved. It now applies to mothers with this condition.'); this.load(); },
      error: err => { this.busy.set(null); this.showError(err); }
    });
  }

  startReject(r: ProductHealthRule) {
    this.rejectReason = '';
    this.rejectingId.set(r.id);
  }

  reject(r: ProductHealthRule) {
    const reason = this.rejectReason.trim();
    if (!reason) return;
    this.busy.set(r.id);
    this.review.reject(r.id, reason).subscribe({
      next: () => { this.busy.set(null); this.rejectingId.set(null); this.api.showToast('Rule rejected.'); this.load(); },
      error: err => { this.busy.set(null); this.showError(err); }
    });
  }

  private showError(err: any) {
    const code = err?.error?.code;
    if (code === 'RULE_SELF_REVIEW_NOT_ALLOWED') this.api.showToast('You created this rule, so someone else needs to review it.');
    else if (code === 'RULE_ALREADY_REVIEWED') { this.api.showToast('Someone has already reviewed this rule.'); this.load(); }
    else if (code === 'PRODUCT_HEALTH_RULE_NOT_FOUND') { this.api.showToast('That rule no longer exists.'); this.load(); }
    else if (err?.status !== 401 && err?.status !== 403) this.api.showToast('That didn’t work. Please try again.');
  }

  riskLabel(r: RiskFactor): string {
    return RISK_FACTOR_LABELS[r] ?? r;
  }

  roleLabel(role: string | null): string {
    if (!role) return 'reviewer';
    if (role === 'MEDICAL_REVIEWER') return 'Medical reviewer';
    return role.charAt(0) + role.slice(1).toLowerCase().replace(/_/g, ' ');
  }
}
