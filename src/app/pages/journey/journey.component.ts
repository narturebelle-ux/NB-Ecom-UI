import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { CommerceService } from '../../services/commerce.service';
import { NotificationService } from '../../services/notification.service';
import {
  Journey,
  JourneyStatus,
  JOURNEY_STATUS_LABELS,
  NextAction,
  PROFESSIONAL_TYPE_LABELS
} from '../../models/maternal.models';
import { Entitlement, planDisplayName } from '../../models/commerce.models';

const ALL_STATUSES: JourneyStatus[] = [
  'PREGNANCY',
  'PRE_DELIVERY',
  'DELIVERY_COMPLETED',
  'POSTPARTUM',
  'CHILDCARE_0_7'
];

/**
 * Real "My Journey" dashboard (roadmap §Phase 1 UI, brief §1.4), now built against
 * GET /api/v1/me/dashboard (brief §1.3, shipped 2026-10-28) rather than the bare
 * /me/journeys list — gives the real next-actions timeline instead of a "coming soon" note.
 */
@Component({
  selector: 'app-journey',
  standalone: true,
  imports: [MatIconModule, CommonModule, RouterLink, FormsModule],
  template: `
    <div class="journey-page">
      <div class="journey-container">
        <h1>My Journey</h1>
        <p class="subtitle">Hi {{ firstName() }}, here's where you are right now.</p>

        @if (loading()) {
          <div class="card glass loading-card">Loading your journey…</div>
        } @else if (errorMsg()) {
          <div class="status-banner is-error">{{ errorMsg() }}</div>
        } @else if (journeySetupRequired() && !settingUp()) {
          <!-- No active journey: setup card -->
          <div class="card glass setup-card">
            <mat-icon class="hero-icon">eco</mat-icon>
            <h2>Set up your journey</h2>
            <p>Tell us where you are so we can tailor your timeline. You can change this anytime.</p>
            <button class="btn btn-primary" (click)="settingUp.set(true)">Set Up My Journey</button>
          </div>
        } @else if (settingUp() || editing()) {
          <!-- Create or edit form -->
          <div class="card glass form-card">
            <h2>{{ editing() ? 'Update your journey' : 'Set up your journey' }}</h2>

            <div class="form-group">
              <label class="form-label">Current Stage</label>
              <select class="form-control" [(ngModel)]="formStatus">
                @for (s of statuses; track s) {
                  <option [ngValue]="s">{{ statusLabel(s) }}</option>
                }
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Expected Delivery Date (optional)</label>
              <input type="date" class="form-control" [(ngModel)]="formEdd" />
              <span class="field-hint">Only relevant during pregnancy — leave blank if not applicable.</span>
            </div>

            @if (formError()) {
              <div class="status-banner is-error">{{ formError() }}</div>
            }

            <div class="form-actions">
              <button class="btn btn-primary" [disabled]="saving()" (click)="save()">
                {{ saving() ? 'Saving…' : (editing() ? 'Save Changes' : 'Start My Journey') }}
              </button>
              @if (editing()) {
                <button class="btn btn-outline" [disabled]="saving()" (click)="cancelEdit()">Cancel</button>
              }
            </div>
          </div>
        } @else if (activeJourney(); as journey) {
          <!-- Active journey dashboard -->
          <div class="card glass dashboard-card">
            <div class="stage-row">
              <span class="stage-badge">{{ statusLabel(journey.status) }}</span>
              @if (journey.trimester) {
                <span class="trimester-badge">Trimester {{ journey.trimester }}</span>
              }
            </div>

            @if (journey.gestationalWeek) {
              <h2>Week {{ journey.gestationalWeek }}</h2>
            } @else {
              <h2>{{ statusLabel(journey.status) }}</h2>
            }

            @if (journey.expectedDeliveryDate) {
              <p class="edd-line">Expected delivery: <strong>{{ journey.expectedDeliveryDate | date:'mediumDate' }}</strong></p>
            }

            <button class="btn btn-outline" (click)="startEdit(journey)">Edit Stage / EDD</button>
          </div>

          <!-- Session wallet (roadmap §Phase 2 UI) — GET /api/v1/entitlements, per professional type -->
          <div class="card glass wallet-card">
            <h3>My Care Plan</h3>
            @if (activeEntitlements().length === 0) {
              <p class="field-hint">No active care plan yet.</p>
              <a routerLink="/plans" class="btn btn-primary">Choose a Plan</a>
            } @else {
              <p class="field-hint wallet-sub">{{ planName(activeEntitlements()[0].planCode) }} plan · valid until {{ activeEntitlements()[0].expiresAt | date:'mediumDate' }}</p>
              <div class="wallet-list">
                @for (e of activeEntitlements(); track e.id) {
                  <div class="wallet-row">
                    <div class="wallet-head">
                      <strong>{{ professionalLabel(e.professionalType) }}</strong>
                      <span class="field-hint">{{ remaining(e) }} of {{ e.totalSessions }} left</span>
                    </div>
                    <div class="wallet-bar">
                      <div class="wallet-bar-fill" [style.width.%]="((e.totalSessions - remaining(e)) / e.totalSessions) * 100"></div>
                    </div>
                  </div>
                }
              </div>
              <a routerLink="/care" class="btn btn-outline wallet-cta">Book a session</a>
            }
          </div>

          <!-- Next actions timeline -->
          <div class="card glass timeline-card">
            <h3>Your Care Timeline</h3>
            <p class="clinical-disclaimer">
              <mat-icon class="icon-sm">info</mat-icon> This guidance is pending clinical review and isn't medical advice — always confirm with your own doctor.
            </p>

            @if (nextActions().length === 0) {
              <p class="field-hint">Nothing queued up for your current stage yet.</p>
            } @else {
              <div class="action-list">
                @for (action of nextActions(); track action.title) {
                  <div class="action-row">
                    <mat-icon class="action-icon">{{ action.optional ? 'lightbulb' : 'event_available' }}</mat-icon>
                    <div class="action-body">
                      <div class="action-head">
                        <strong>{{ action.title }}</strong>
                        @if (action.optional) {
                          <span class="optional-badge">Optional</span>
                        }
                      </div>
                      <p>{{ action.description }}</p>
                      <span class="professional-tag">{{ professionalLabel(action.professionalType) }}</span>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }

        <a routerLink="/profile" class="back-link">← Back to Profile &amp; Privacy</a>
      </div>
    </div>
  `,
  styles: [`
    .journey-page {
      min-height: calc(100vh - 160px);
      padding: 3rem 1rem;
      display: flex;
      justify-content: center;
    }
    .journey-container { max-width: 560px; width: 100%; }
    h1 { font-size: 1.85rem; color: var(--primary-deep); margin-bottom: 0.35rem; text-align: center; }
    .subtitle { font-size: 0.92rem; color: var(--text-secondary); text-align: center; margin-bottom: 1.75rem; }

    .card.glass {
      border-radius: var(--radius-xl);
      background: #fff;
      box-shadow: 0 20px 45px rgba(27, 51, 39, 0.08);
      border: 1px solid var(--border-light);
      margin-bottom: 1.5rem;
    }
    .loading-card { padding: 2.5rem; text-align: center; color: var(--text-muted); }

    .setup-card { padding: 2.5rem; text-align: center; }
    .setup-card .icon { font-size: 2.5rem; display: block; margin-bottom: 0.75rem; }
    .setup-card h2 { font-size: 1.3rem; color: var(--primary-deep); margin-bottom: 0.5rem; }
    .setup-card p { font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1.5rem; }

    .form-card { padding: 2rem; }
    .form-card h2 { font-size: 1.2rem; color: var(--primary-deep); margin-bottom: 1.25rem; }
    .form-group { margin-bottom: 1.1rem; }
    .form-label {
      display: block;
      font-size: 0.82rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-secondary);
      margin-bottom: 0.35rem;
    }
    .form-control {
      padding: 0.65rem 0.85rem;
      border: 1.5px solid var(--border-color);
      border-radius: var(--radius-md);
      font-size: 0.95rem;
      width: 100%;
      box-sizing: border-box;
    }
    .field-hint { display: block; margin-top: 0.3rem; font-size: 0.78rem; color: var(--text-muted); }
    .form-actions { display: flex; gap: 0.75rem; margin-top: 0.5rem; flex-wrap: wrap; }

    .dashboard-card { padding: 2.25rem; }
    .stage-row { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
    .stage-badge, .trimester-badge {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.3rem 0.75rem;
      border-radius: var(--radius-full);
    }
    .stage-badge { background: var(--sage-100); color: var(--sage-900); }
    .trimester-badge { background: var(--blush-100); color: var(--blush-700); }
    .dashboard-card h2 { font-size: 1.75rem; color: var(--sage-900); margin-bottom: 0.5rem; }
    .edd-line { font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem; }

    .wallet-card { padding: 2rem; }
    .wallet-card h3 { font-size: 1.15rem; color: var(--primary-deep); margin-bottom: 1rem; }
    .wallet-list { display: flex; flex-direction: column; gap: 1.25rem; }
    .wallet-row { display: flex; flex-direction: column; gap: 0.4rem; }
    .wallet-head { display: flex; justify-content: space-between; align-items: baseline; }
    .wallet-head strong { font-size: 0.95rem; color: var(--sage-900); }
    .wallet-bar { height: 8px; border-radius: var(--radius-full); background: var(--sage-50); overflow: hidden; }
    .wallet-bar-fill { height: 100%; background: linear-gradient(90deg, var(--sage-500), var(--sage-700)); border-radius: var(--radius-full); transition: width var(--transition-smooth); }
    .wallet-sub { margin: -0.5rem 0 1rem; }
    .wallet-cta { margin-top: 1.25rem; }

    .timeline-card { padding: 2rem; }
    .timeline-card h3 { font-size: 1.15rem; color: var(--primary-deep); margin-bottom: 0.5rem; }
    .clinical-disclaimer {
      font-size: 0.78rem;
      color: #92610a;
      background: #fff8eb;
      border: 1px solid #fbd38d;
      border-radius: var(--radius-md);
      padding: 0.6rem 0.85rem;
      margin-bottom: 1.25rem;
    }
    .action-list { display: flex; flex-direction: column; gap: 1rem; }
    .action-row { display: flex; gap: 0.85rem; align-items: flex-start; }
    .action-icon { font-size: 1.3rem; width: 1.3rem; height: 1.3rem; flex-shrink: 0; color: var(--sage-600); }
    .action-body { flex: 1; }
    .action-head { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .action-head strong { font-size: 0.95rem; color: var(--sage-900); }
    .optional-badge {
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--text-muted);
      background: var(--sage-50);
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-full);
    }
    .action-body p { font-size: 0.85rem; color: var(--text-secondary); margin: 0.25rem 0 0.4rem; line-height: 1.5; }
    .professional-tag {
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--blush-700);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .status-banner {
      padding: 0.75rem 1rem;
      border-radius: 10px;
      margin-bottom: 1.25rem;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .status-banner.is-error { background: #fdecea; color: #a0281c; border: 1px solid #f5b7b1; }

    .btn { padding: 0.75rem 1.25rem; border-radius: 10px; font-weight: 700; font-size: 0.92rem; cursor: pointer; border: none; transition: all 0.2s; }
    .btn-primary { background: #2e4f3e; color: #fff; }
    .btn-primary:hover:not(:disabled) { background: #1b3327; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-outline { background: transparent; border: 1.5px solid var(--border-color); color: var(--text-secondary); }
    .btn-outline:hover:not(:disabled) { background: var(--sage-50); }

    .back-link {
      display: block;
      text-align: center;
      margin-top: 0.5rem;
      font-size: 0.85rem;
      color: var(--text-muted);
    }
  `]
})
export class JourneyComponent implements OnInit {
  api = inject(ApiService);
  private commerce = inject(CommerceService);
  private notifications = inject(NotificationService);

  statuses = ALL_STATUSES;
  // Non-expired entitlements from GET /entitlements; remaining() also subtracts the
  // UI's local booking overlay (see CommerceService) until the API consumes sessions itself.
  activeEntitlements = computed(() =>
    this.commerce.entitlements().filter((e: Entitlement) => !this.commerce.isExpired(e))
  );

  remaining(e: Entitlement): number {
    return this.commerce.effectiveRemaining(e);
  }

  planName(code: string): string {
    return planDisplayName(code);
  }

  loading = signal(true);
  errorMsg = signal<string | null>(null);
  journeySetupRequired = signal(true);
  activeJourney = signal<Journey | null>(null);
  nextActions = signal<NextAction[]>([]);

  settingUp = signal(false);
  editing = signal(false);
  saving = signal(false);
  formError = signal<string | null>(null);

  formStatus: JourneyStatus = 'PREGNANCY';
  formEdd = '';

  firstName(): string {
    const user = this.api.currentUser();
    return user?.firstName || user?.name?.split(' ')[0] || 'there';
  }

  statusLabel(status: JourneyStatus): string {
    return JOURNEY_STATUS_LABELS[status];
  }

  professionalLabel(type: string): string {
    return (PROFESSIONAL_TYPE_LABELS as Record<string, string>)[type] || type;
  }

  ngOnInit() {
    this.loadDashboard();
    this.commerce.loadEntitlements().subscribe({ error: () => { /* wallet just shows "no plan" */ } });
  }

  private loadDashboard() {
    this.loading.set(true);
    this.api.getDashboard().subscribe({
      next: (dashboard) => {
        this.loading.set(false);
        this.journeySetupRequired.set(dashboard.journeySetupRequired);
        this.activeJourney.set(dashboard.journey);
        this.nextActions.set(dashboard.nextActions || []);
        this.notifications.syncFromNextActions(dashboard.nextActions || []);
      },
      error: (err) => {
        this.loading.set(false);
        // 401/403 side effects (incl. CONSENT_REQUIRED → /auth/consent) are already
        // handled by the auth interceptor; only show a banner for anything else.
        if (err?.status !== 401 && err?.status !== 403) {
          this.errorMsg.set('Could not load your journey. Please try again.');
        }
      }
    });
  }

  startEdit(journey: Journey) {
    this.formStatus = journey.status;
    this.formEdd = journey.expectedDeliveryDate || '';
    this.formError.set(null);
    this.editing.set(true);
  }

  cancelEdit() {
    this.editing.set(false);
  }

  save() {
    this.saving.set(true);
    this.formError.set(null);
    const edd = this.formEdd || null;

    const active = this.activeJourney();
    const request = active
      ? this.api.updateJourney(active.id, { status: this.formStatus, expectedDeliveryDate: edd })
      : this.api.createJourney(this.formStatus, edd);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.settingUp.set(false);
        this.editing.set(false);
        this.api.showToast(active ? 'Journey updated.' : 'Your journey is set up!');
        this.loadDashboard();
      },
      error: (err) => {
        this.saving.set(false);
        if (err?.status === 409) {
          this.formError.set(err?.error?.message || 'An active journey already exists.');
        } else if (err?.status === 400) {
          this.formError.set(err?.error?.message || 'Please check the dates entered.');
        } else if (err?.status !== 401 && err?.status !== 403) {
          this.formError.set('Something went wrong. Please try again.');
        }
      }
    });
  }
}
