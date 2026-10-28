import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { Journey, JourneyStatus, JOURNEY_STATUS_LABELS } from '../../models/maternal.models';

const ALL_STATUSES: JourneyStatus[] = [
  'PREGNANCY',
  'PRE_DELIVERY',
  'DELIVERY_COMPLETED',
  'POSTPARTUM',
  'CHILDCARE_0_7'
];

/**
 * Real "My Journey" dashboard (roadmap §Phase 1 UI, brief §1.4) — built directly against
 * POST/GET/PATCH /me/journeys since GET /me/dashboard (brief §1.3) hasn't shipped yet.
 * Per the roadmap: "the user can join at any state and can correct the stage or EDD" —
 * so this lets them pick any JourneyStatus, not just PREGNANCY, when first setting up.
 */
@Component({
  selector: 'app-journey',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="journey-page">
      <div class="journey-container">
        <h1>My Journey</h1>
        <p class="subtitle">Hi {{ firstName() }}, here's where you are right now.</p>

        @if (loading()) {
          <div class="card glass loading-card">Loading your journey…</div>
        } @else if (errorMsg()) {
          <div class="status-banner is-error">{{ errorMsg() }}</div>
        } @else if (!activeJourney() && !settingUp()) {
          <!-- No active journey: setup card -->
          <div class="card glass setup-card">
            <span class="icon">🌱</span>
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

            <p class="next-actions-note">
              Personalised next actions and your care timeline are coming soon — this dashboard
              will grow to show them once that's ready.
            </p>

            <button class="btn btn-outline" (click)="startEdit(journey)">Edit Stage / EDD</button>
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
    .next-actions-note {
      font-size: 0.82rem;
      color: var(--text-muted);
      font-style: italic;
      background: var(--sage-50);
      padding: 0.85rem 1rem;
      border-radius: var(--radius-md);
      margin-bottom: 1.5rem;
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
      margin-top: 1.5rem;
      font-size: 0.85rem;
      color: var(--text-muted);
    }
  `]
})
export class JourneyComponent implements OnInit {
  api = inject(ApiService);

  statuses = ALL_STATUSES;

  loading = signal(true);
  errorMsg = signal<string | null>(null);
  activeJourney = signal<Journey | null>(null);
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

  ngOnInit() {
    this.api.getJourneys().subscribe({
      next: (journeys) => {
        this.loading.set(false);
        const active = journeys.find(j => j.status !== 'CLOSED') || null;
        this.activeJourney.set(active);
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
      next: (journey) => {
        this.saving.set(false);
        this.activeJourney.set(journey);
        this.settingUp.set(false);
        this.editing.set(false);
        this.api.showToast(active ? 'Journey updated.' : 'Your journey is set up!');
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
